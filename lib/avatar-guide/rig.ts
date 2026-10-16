import * as THREE from "three";
import {
  BlinkDirector,
  IdleDirector,
  clamp,
  damp,
  faceFor,
  noise,
  smooth,
  solveArm,
} from "./motion";
import type { GuideController } from "./controller";
import {
  GESTURES,
  type FaceWeights,
  type Gesture,
  type GuideStatus,
  type Vec3,
} from "./vocabulary";

const ALIASES: Record<string, string[]> = {
  hips: ["hips", "pelvis", "spine05", "mixamorigHips"],
  spine: ["spine03", "spine", "spine_01", "mixamorigSpine"],
  chest: ["spine02", "chest", "spine_02", "mixamorigSpine1"],
  upperChest: ["spine01", "upperChest", "spine_03", "mixamorigSpine2"],
  neck: ["neck01", "neck", "mixamorigNeck"],
  neck2: ["neck02", "neck_02"],
  neck3: ["neck03"],
  head: ["head", "mixamorigHead"],
  leftEye: ["eye.L", "eyeL", "eye_0", "LeftEye", "mixamorigLeftEye"],
  rightEye: ["eye.R", "eyeR", "eye_1", "RightEye", "mixamorigRightEye"],
  leftUpper: ["upperarm01.L", "upper_arm.L", "LeftArm", "mixamorigLeftArm"],
  rightUpper: ["upperarm01.R", "upper_arm.R", "RightArm", "mixamorigRightArm"],
  leftLower: [
    "lowerarm01.L",
    "forearm.L",
    "LeftForeArm",
    "mixamorigLeftForeArm",
  ],
  rightLower: [
    "lowerarm01.R",
    "forearm.R",
    "RightForeArm",
    "mixamorigRightForeArm",
  ],
  leftHand: ["wrist.L", "hand.L", "LeftHand", "mixamorigLeftHand"],
  rightHand: ["wrist.R", "hand.R", "RightHand", "mixamorigRightHand"],
};
const tempQ = new THREE.Quaternion(),
  parentQ = new THREE.Quaternion(),
  tempEuler = new THREE.Euler();
// GLTFLoader removes dots/colons from node names; Blender authoring names retain them.
function findBone(root: THREE.Object3D, name: string) {
  return (
    root.getObjectByName(name) ??
    root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name))
  );
}
function rotateWorld(
  bone: THREE.Object3D | undefined,
  x: number,
  y: number,
  z: number,
) {
  if (!bone) return;
  bone.parent?.getWorldQuaternion(parentQ);
  if (!bone.parent) parentQ.identity();
  tempQ.setFromEuler(tempEuler.set(x, y, z));
  tempQ.premultiply(parentQ.clone().invert()).multiply(parentQ);
  bone.quaternion.premultiply(tempQ);
  bone.updateMatrixWorld(true);
}
function aimBone(
  bone: THREE.Object3D,
  child: THREE.Object3D,
  target: THREE.Vector3,
  blend: number,
) {
  const start = bone.getWorldPosition(new THREE.Vector3());
  const oldDirection = child
    .getWorldPosition(new THREE.Vector3())
    .sub(start)
    .normalize();
  const newDirection = target.clone().sub(start).normalize();
  if (oldDirection.lengthSq() < 0.5 || newDirection.lengthSq() < 0.5) return;
  const delta = new THREE.Quaternion().setFromUnitVectors(
    oldDirection,
    newDirection,
  );
  const parent =
    bone.parent?.getWorldQuaternion(new THREE.Quaternion()) ??
    new THREE.Quaternion();
  delta.premultiply(parent.clone().invert()).multiply(parent);
  bone.quaternion.slerp(delta.multiply(bone.quaternion.clone()), clamp(blend));
  bone.updateMatrixWorld(true);
}
export class GuideRig {
  readonly bones: Record<string, THREE.Object3D | undefined> = {};
  readonly report: GuideStatus;
  private bases = new Map<THREE.Object3D, THREE.Quaternion>();
  private morphs: THREE.Mesh[] = [];
  private face: FaceWeights = {};
  private blink = new BlinkDirector();
  private idle = new IdleDirector();
  private mixer: THREE.AnimationMixer;
  private clips: THREE.AnimationClip[];
  private activeIdle: THREE.AnimationAction | null = null;
  private gestureAction: THREE.AnimationAction | null = null;
  private lastGesture = -1;
  private gestureBegin = 0;
  private gestureCancelled = false;
  private clipGesture = false;
  private lastPoint: THREE.Vector3 | null = null;
  private yaw = 0;
  private pitch = 0;
  private eyeYaw = 0;
  private eyePitch = 0;
  private gazeHistory: { time: number; yaw: number; pitch: number }[] = [];
  private pointWeight = 0;
  private modelHeight = 1;
  private posture = { tilt: 0, back: 0, lean: 0 };
  constructor(
    readonly root: THREE.Object3D,
    clips: THREE.AnimationClip[],
  ) {
    // The authored set shares a relaxed first-frame pose. Converting only its
    // gesture tracks to additive deltas keeps the idle underneath at full weight.
    // Standalone imported gesture clips remain usable without assuming a base idle.
    const hasAuthoredBase = clips.some((clip) =>
      /^idle(?:_|$)/i.test(clip.name),
    );
    this.clips = clips.map((clip) =>
      hasAuthoredBase &&
      GESTURES.some(
        (name) => clip.name === name || clip.name.startsWith(`${name}_`),
      )
        ? THREE.AnimationUtils.makeClipAdditive(clip.clone(), 0, clip, 30)
        : clip,
    );
    this.mixer = new THREE.AnimationMixer(root);
    this.modelHeight = new THREE.Box3()
      .setFromObject(root)
      .getSize(new THREE.Vector3()).y;
    let totalBones = 0;
    const shapes = new Set<string>();
    root.traverse((object) => {
      if (object instanceof THREE.Bone) {
        this.bases.set(object, object.quaternion.clone());
        totalBones++;
      }
      if (
        object instanceof THREE.Mesh &&
        object.morphTargetDictionary &&
        object.morphTargetInfluences
      ) {
        this.morphs.push(object);
        Object.keys(object.morphTargetDictionary).forEach((n) => shapes.add(n));
      }
    });
    for (const [key, names] of Object.entries(ALIASES))
      this.bones[key] = names.map((name) => findBone(root, name)).find(Boolean);
    const required = [
      "head",
      "neck",
      "leftUpper",
      "rightUpper",
      "leftLower",
      "rightLower",
      "leftHand",
      "rightHand",
    ];
    const missing = [
      ...required.filter((key) => !this.bones[key]).map((key) => `bone:${key}`),
      ...["eyeBlinkLeft", "eyeBlinkRight", "jawOpen", "viseme_aa", "viseme_PP"]
        .filter((key) => !shapes.has(key))
        .map((key) => `shape:${key}`),
    ];
    this.report = {
      state: "ready",
      message: missing.length
        ? "Model loaded; some animation channels are unavailable."
        : "Model study loaded; likeness is not approved.",
      bones: totalBones,
      shapes: shapes.size,
      clips: clips.length,
      missing,
    };
  }
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
  private arm(
    side: "left" | "right",
    target: THREE.Vector3,
    blend: number,
    pointing = false,
  ) {
    const upper = this.bones[`${side}Upper`],
      lower = this.bones[`${side}Lower`],
      hand = this.bones[`${side}Hand`];
    if (!upper || !lower || !hand) return;
    const shoulder = upper.getWorldPosition(new THREE.Vector3()),
      elbow = lower.getWorldPosition(new THREE.Vector3()),
      wrist = hand.getWorldPosition(new THREE.Vector3());
    const a = shoulder.distanceTo(elbow),
      b = elbow.distanceTo(wrist);
    if (Math.min(a, b) < 0.001) return;
    const result = solveArm(
      shoulder.toArray() as Vec3,
      target.toArray() as Vec3,
      a,
      b,
      [side === "left" ? 1 : -1, -0.4, 0.6],
    );
    aimBone(upper, lower, new THREE.Vector3(...result.elbow), blend);
    aimBone(lower, hand, new THREE.Vector3(...result.wrist), blend);
    if (pointing) {
      const suffix = side === "left" ? "L" : "R";
      const index =
        findBone(this.root, `finger2-1.${suffix}`) ??
        findBone(this.root, `${side}Index1`);
      const indexTip =
        findBone(this.root, `finger2-3.${suffix}`) ??
        findBone(this.root, `${side}Index3`);
      if (index && indexTip) {
        // The wrist rotates the entire hand so the straight index ray, rather than just
        // the wrist location, faces the point. The index rest pose is kept extended.
        const direction = indexTip
          .getWorldPosition(new THREE.Vector3())
          .sub(index.getWorldPosition(new THREE.Vector3()))
          .normalize();
        const handPosition = hand.getWorldPosition(new THREE.Vector3());
        const desired = target.clone().sub(handPosition).normalize();
        if (desired.lengthSq() > 0.5 && direction.lengthSq() > 0.5) {
          const delta = new THREE.Quaternion().setFromUnitVectors(
            direction,
            desired,
          );
          const parent =
            hand.parent?.getWorldQuaternion(new THREE.Quaternion()) ??
            new THREE.Quaternion();
          delta.premultiply(parent.clone().invert()).multiply(parent);
          hand.quaternion.slerp(delta.multiply(hand.quaternion.clone()), blend);
          hand.updateMatrixWorld(true);
        }
      }
    }
    // Finger curls are only applied when the matching rig actually contains finger bones.
    const suffix = side === "left" ? "L" : "R";
    for (const finger of ["middle", "ring", "pinky"])
      for (const segment of [1, 2, 3]) {
        const joint =
          findBone(this.root, `${finger}0${segment}.${suffix}`) ??
          findBone(
            this.root,
            `finger${({ middle: 3, ring: 4, pinky: 5 } as Record<string, number>)[finger]}-${segment}.${suffix}`,
          ) ??
          findBone(
            this.root,
            `${side}${finger[0].toUpperCase() + finger.slice(1)}${segment}`,
          );
        if (joint) joint.rotateX((pointing ? 0.6 : 0.12) * blend);
      }
  }
  update(
    seconds: number,
    dt: number,
    controller: GuideController,
    target: THREE.Vector3 | null,
    gaze: THREE.Vector3 | null,
    reduced: boolean,
  ) {
    dt = clamp(dt, 0, 0.05);
    for (const [bone, base] of this.bases) bone.quaternion.copy(base);
    const snapshot = controller.snapshot;
    const idleClips = this.clips.filter((clip) =>
      /^idle(?:_|$)/i.test(clip.name),
    );
    if (
      !reduced &&
      this.idle.update(seconds, idleClips.length || 6) &&
      idleClips.length
    ) {
      const clip = idleClips[this.idle.current % idleClips.length];
      const action = this.mixer.clipAction(clip);
      action
        .reset()
        .setEffectiveTimeScale(this.idle.speed)
        .setEffectiveWeight(1)
        .fadeIn(0.5)
        .play();
      if (this.activeIdle !== action) this.activeIdle?.fadeOut(0.5);
      this.activeIdle = action;
    }
    if (controller.gestureRevision !== this.lastGesture && snapshot.gesture) {
      this.lastGesture = controller.gestureRevision;
      this.gestureBegin = seconds;
      this.gestureCancelled = false;
      const variants = this.clips.filter(
        (clip) =>
          clip.name === snapshot.gesture ||
          clip.name.startsWith(`${snapshot.gesture}_`),
      );
      this.clipGesture = variants.length > 0;
      if (variants.length) {
        const action = this.mixer.clipAction(
          variants[this.lastGesture % variants.length],
        );
        action.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.3).play();
        action.clampWhenFinished = false;
        if (this.gestureAction !== action) this.gestureAction?.fadeOut(0.3);
        this.gestureAction = action;
      }
    }
    if (
      (!snapshot.gesture || reduced) &&
      this.gestureAction &&
      !this.gestureCancelled
    ) {
      this.gestureAction.fadeOut(0.2);
      this.gestureCancelled = true;
    }
    if (!reduced) this.mixer.update(dt);
    else {
      this.mixer.stopAllAction();
      this.activeIdle = null;
      this.gestureAction = null;
    }
    if (
      this.gestureAction &&
      (!this.gestureAction.isRunning() ||
        (this.gestureCancelled &&
          this.gestureAction.getEffectiveWeight() < 0.001))
    ) {
      this.gestureAction.stop();
      this.gestureAction = null;
    }
    const authoredArmWeight = clamp(
      (this.activeIdle?.getEffectiveWeight() ?? 0) +
        (this.gestureAction?.getEffectiveWeight() ?? 0),
    );
    // Preserve the mixer result before adding procedural offsets. Restoring bind pose
    // each frame would erase constant tracks because PropertyMixer skips unchanged writes.
    for (const [bone, base] of this.bases) base.copy(bone.quaternion);
    this.root.updateMatrixWorld(true);
    const head =
      this.bones.head?.getWorldPosition(new THREE.Vector3()) ??
      this.root.getWorldPosition(new THREE.Vector3());
    let targetYaw = 0,
      targetPitch = 0;
    if (gaze) {
      const direction = gaze.clone().sub(head);
      targetYaw = Math.atan2(direction.x, Math.max(0.8, direction.z));
      targetPitch = -Math.atan2(
        direction.y,
        Math.hypot(direction.x, Math.max(0.8, direction.z)),
      );
    }
    if (snapshot.state === "thinking") {
      targetYaw = -0.26;
      targetPitch = -0.12;
    }
    if (!reduced) {
      targetYaw += noise(seconds * 0.71, 51) * 0.012;
      targetPitch += noise(seconds * 0.83, 61) * 0.01;
    }
    this.eyeYaw = damp(
      this.eyeYaw,
      clamp(targetYaw - this.yaw, -0.48, 0.48),
      dt,
      18,
    );
    this.eyePitch = damp(
      this.eyePitch,
      clamp(targetPitch - this.pitch, -0.25, 0.25),
      dt,
      18,
    );
    this.gazeHistory.push({
      time: seconds,
      yaw: targetYaw,
      pitch: targetPitch,
    });
    while (
      this.gazeHistory.length > 1 &&
      this.gazeHistory[1].time < seconds - 0.15
    )
      this.gazeHistory.shift();
    const delayed = this.gazeHistory[0];
    this.yaw = damp(this.yaw, clamp(delayed.yaw, -1.22, 1.22), dt, 7);
    this.pitch = damp(this.pitch, clamp(delayed.pitch, -0.61, 0.7), dt, 7);
    const bodyTurn = clamp(
      targetYaw - clamp(targetYaw, -1.22, 1.22),
      -0.4,
      0.4,
    );
    const moving = !reduced,
      strength = snapshot.intensity;
    const headTilt =
      snapshot.emotion === "curious"
        ? -0.06 * strength
        : snapshot.emotion === "embarrassed"
          ? 0.08 * strength
          : 0;
    const headBack =
      snapshot.emotion === "big_laugh"
        ? -0.13 * strength
        : snapshot.emotion === "proud"
          ? -0.04 * strength
          : snapshot.emotion === "sad"
            ? 0.12 * strength
            : 0;
    const lean =
      snapshot.emotion === "serious"
        ? 0.055 * strength
        : snapshot.emotion === "sad"
          ? 0.07 * strength
          : 0;
    this.posture.tilt = damp(this.posture.tilt, headTilt, dt, 8);
    this.posture.back = damp(this.posture.back, headBack, dt, 8);
    this.posture.lean = damp(this.posture.lean, lean, dt, 8);
    rotateWorld(
      this.bones.spine,
      this.posture.lean +
        this.pitch * 0.1 +
        (moving ? noise(seconds * 0.3, 13) * 0.007 : 0),
      this.yaw * 0.1 + bodyTurn * 0.45,
      moving ? noise(seconds * 0.24, 24) * 0.008 : 0,
    );
    rotateWorld(
      this.bones.chest,
      moving ? Math.sin(seconds * 1.33) * 0.0035 : 0,
      0,
      moving ? noise(seconds * 0.19, 91) * 0.006 : 0,
    );
    const necks = [this.bones.neck, this.bones.neck2, this.bones.neck3].filter(
      Boolean,
    );
    for (const neck of necks)
      rotateWorld(
        neck,
        (this.pitch * 0.4) / necks.length,
        (this.yaw * 0.4) / necks.length,
        (this.posture.tilt * 0.4) / necks.length,
      );
    rotateWorld(
      this.bones.head,
      this.pitch * (necks.length ? 0.5 : 0.9) +
        this.posture.back +
        (moving ? noise(seconds * 0.4, 31) * 0.009 : 0),
      this.yaw * (necks.length ? 0.5 : 0.9),
      this.posture.tilt * 0.6,
    );
    for (const eye of [this.bones.leftEye, this.bones.rightEye])
      rotateWorld(eye, this.eyePitch, this.eyeYaw, 0);
    if (snapshot.emotion === "big_laugh" && moving)
      rotateWorld(
        this.bones.chest,
        Math.sin(seconds * 12) * 0.015 * strength,
        0,
        Math.sin(seconds * 10.7) * 0.006 * strength,
      );
    const gestureAge = seconds - this.gestureBegin;
    const gestureEnvelope =
      smooth(gestureAge / 0.3) * smooth((3.0 - gestureAge) / 0.5);
    const gesturing =
      snapshot.gesture && gestureEnvelope > 0 && !reduced && !this.clipGesture;
    const bodyHeight =
      this.modelHeight * this.root.getWorldScale(new THREE.Vector3()).y;
    const factor = Math.max(0.5, bodyHeight);
    const hip =
      this.bones.hips?.getWorldPosition(new THREE.Vector3()) ??
      head.clone().add(new THREE.Vector3(0, -factor * 0.48, 0));
    const shoulder = (side: "left" | "right") =>
      this.bones[`${side}Upper`]?.getWorldPosition(new THREE.Vector3());
    const resting = (side: "left" | "right") => {
      const origin = shoulder(side);
      if (!origin) return null;
      return new THREE.Vector3(
        origin.x + (side === "left" ? 1 : -1) * factor * 0.055,
        hip.y - factor * 0.04,
        origin.z + factor * 0.018,
      );
    };
    const left = resting("left"),
      right = resting("right");
    if (gesturing) {
      const variant = ((controller.gestureRevision % 3) - 1) * 0.04;
      const wave = Math.sin(gestureAge * (7 + variant));
      const mutate = (
        side: "left" | "right",
        x: number,
        y: number,
        z: number,
      ) => {
        const origin = shoulder(side),
          destination = side === "left" ? left : right;
        if (origin && destination)
          destination.lerp(
            origin
              .clone()
              .add(new THREE.Vector3(x, y, z).multiplyScalar(factor)),
            gestureEnvelope,
          );
      };
      const both = (x: number, y: number, z: number) => {
        mutate("left", x, y, z);
        mutate("right", -x, y, z);
      };
      switch (snapshot.gesture as Gesture) {
        case "wave":
          mutate("right", -0.12 + wave * 0.035, 0.12 + variant, 0.14);
          break;
        case "open_palm_present":
          mutate("left", 0.22, -0.08, 0.18);
          break;
        case "welcome_open_arms":
          both(0.24, -0.04, 0.16);
          break;
        case "shrug":
          both(0.18, 0.015, 0.16);
          rotateWorld(this.bones.head, 0, 0, 0.04 * gestureEnvelope);
          break;
        case "count_on_fingers":
          mutate("left", 0.09, -0.06, 0.24);
          mutate("right", 0.05, -0.06, 0.26);
          break;
        case "beat_small":
          mutate("right", -0.05, -0.18 + wave * 0.025, 0.18);
          break;
        case "beat_big":
          both(0.14, -0.06 + wave * 0.055, 0.22);
          break;
        case "hand_to_chin":
          if (right)
            right.lerp(
              head
                .clone()
                .add(
                  new THREE.Vector3(
                    -factor * 0.025,
                    -factor * 0.08,
                    factor * 0.07,
                  ),
                ),
              gestureEnvelope,
            );
          break;
        case "arms_crossed":
          mutate("left", -0.16, -0.2, 0.18);
          mutate("right", 0.16, -0.18, 0.2);
          break;
        case "thumbs_up":
          mutate("right", -0.09, -0.03, 0.2);
          break;
        case "nod":
          rotateWorld(
            this.bones.head,
            Math.sin(gestureAge * 7) * 0.095 * gestureEnvelope,
            0,
            0,
          );
          break;
        case "head_shake":
          rotateWorld(
            this.bones.head,
            0,
            Math.sin(gestureAge * 7) * 0.13 * gestureEnvelope,
            0,
          );
          break;
        case "head_tilt":
          rotateWorld(this.bones.head, 0, 0, 0.13 * gestureEnvelope);
          break;
        case "laugh_body":
          rotateWorld(this.bones.head, -0.14 * gestureEnvelope, 0, 0);
          rotateWorld(
            this.bones.chest,
            Math.sin(gestureAge * 12) * 0.025 * gestureEnvelope,
            0,
            0,
          );
          both(0.12, -0.18, 0.1);
          break;
      }
    }
    const fallbackArmWeight = gesturing
      ? gestureEnvelope
      : 1 - authoredArmWeight;
    if (left && fallbackArmWeight > 0.001)
      this.arm("left", left, fallbackArmWeight);
    if (right && fallbackArmWeight > 0.001)
      this.arm("right", right, fallbackArmWeight);
    this.pointWeight = damp(this.pointWeight, target ? 1 : 0, dt, 10);
    if (target) {
      if (!this.lastPoint) this.lastPoint = target.clone();
      else this.lastPoint.lerp(target, 1 - Math.exp(-dt * 12));
    }
    if (this.lastPoint && this.pointWeight > 0.001) {
      const origin = this.root.getWorldPosition(new THREE.Vector3());
      const side = this.lastPoint.x >= origin.x ? "left" : "right";
      this.arm(side, this.lastPoint, this.pointWeight, true);
    } else if (!target) this.lastPoint = null;
    const targetFace = {
      ...faceFor(
        snapshot.emotion,
        strength,
        controller.mouth(),
        moving ? this.blink.sample(seconds) : 0,
      ),
      ...controller.faceOverrides,
    };
    for (const name of new Set([
      ...Object.keys(this.face),
      ...Object.keys(targetFace),
    ]))
      this.face[name] = damp(
        this.face[name] ?? 0,
        targetFace[name] ?? 0,
        dt,
        name.startsWith("viseme") ? 24 : 12,
      );
    for (const mesh of this.morphs)
      for (const [name, index] of Object.entries(mesh.morphTargetDictionary!))
        mesh.morphTargetInfluences![index] = clamp(this.face[name] ?? 0);
  }
}
