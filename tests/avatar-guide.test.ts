import { test } from "node:test";
import assert from "node:assert/strict";
import { EMOTIONS, GESTURES, VISEMES } from "../lib/avatar-guide/vocabulary";
import {
  BlinkDirector,
  IdleDirector,
  faceFor,
  mouthAt,
  noise,
  solveArm,
  validateVisemes,
} from "../lib/avatar-guide/motion";
import { EventDecoder } from "../lib/avatar-guide/stream";

test("pointing IK preserves both bone lengths and cannot overextend", () => {
  for (const target of [
    [100, 20, 0],
    [0.1, 0.2, 0.3],
    [0, 0, 0],
    [-4, 2, 1],
  ] as [number, number, number][]) {
    const { elbow, wrist } = solveArm(
      [0, 0, 0],
      target,
      0.32,
      0.28,
      [0, -1, 0.4],
    );
    assert.ok(Math.abs(Math.hypot(...elbow) - 0.32) < 0.000001);
    assert.ok(
      Math.abs(Math.hypot(...wrist.map((v, i) => v - elbow[i])) - 0.28) <
        0.000001,
    );
    assert.ok(Math.hypot(...wrist) < 0.6);
    assert.ok([...elbow, ...wrist].every(Number.isFinite));
  }
});
test("parallel elbow pole remains finite and both arms can point", () => {
  for (const x of [-1, 1]) {
    const pose = solveArm([0, 0, 0], [x, 0, 0], 0.3, 0.3, [x, 0, 0]);
    assert.ok(pose.elbow.every(Number.isFinite));
    assert.equal(Math.sign(pose.wrist[0]), x);
  }
});
test("idle director never picks the previous idle and bounds timing and speed", () => {
  const idle = new IdleDirector(125);
  let t = 0,
    old = -1;
  for (let i = 0; i < 200; i++) {
    assert.equal(idle.update(t), true);
    assert.notEqual(idle.current, old);
    assert.ok(idle.next - t >= 4 && idle.next - t <= 10);
    assert.ok(idle.speed >= 0.9 && idle.speed <= 1.1);
    old = idle.current;
    t = idle.next;
  }
});
test("all emotion and speech combinations stay bounded without overriding blinks", () => {
  for (const emotion of EMOTIONS)
    for (const intensity of [-10, 0, 0.3, 1, 10, NaN]) {
      const face = faceFor(emotion, intensity, { viseme_PP: 0.9 }, 0.65);
      assert.equal(face.eyeBlinkLeft, 0.65);
      assert.equal(face.viseme_PP, 0.9);
      assert.ok(
        Object.values(face).every(
          (v) => Number.isFinite(v) && v >= 0 && v <= 1,
        ),
      );
    }
});
test("aligned phonemes blend across boundaries and finish silently", () => {
  const cues = validateVisemes([
    { start: 0, end: 0.3, value: "PP" },
    { start: 0.3, end: 0.8, value: "aa" },
  ]);
  const blend = mouthAt(cues, 0.3);
  assert.ok(blend.viseme_PP > 0 && blend.viseme_aa > 0);
  assert.ok(Object.values(blend).reduce((a, b) => a + b, 0) <= 1);
  for (const t of [-1, NaN, Infinity, 0.8, 3])
    assert.deepEqual(mouthAt(cues, t), {});
  assert.throws(() => validateVisemes([{ start: -1, end: 1, value: "aa" }]));
  assert.throws(() =>
    validateVisemes([{ start: 0, end: Infinity, value: "aa" }]),
  );
  assert.equal(VISEMES.length, 15);
});
test("micro motion remains continuous across noise cells and random blinks are bounded", () => {
  const blink = new BlinkDirector(45);
  for (let t = 0; t < 240; t += 0.01) {
    const value = blink.sample(t);
    assert.ok(value >= 0 && value <= 1);
  }
  for (let t = 1; t < 100; t++) {
    assert.ok(Math.abs(noise(t - 0.0001) - noise(t + 0.0001)) < 0.00001);
    assert.ok(Math.abs(noise(t + 0.4)) <= 1);
  }
});
test("SSE decoder handles every byte split without losing ordered events", () => {
  const source =
    'data: {"type":"status"}\r\n\r\ndata: {"type":"action","action":{"type":"say","text":"Hi"}}\r\n\r\n';
  for (let n = 1; n < source.length; n++) {
    const decoder = new EventDecoder();
    const events = [
      ...decoder.push(source.slice(0, n)),
      ...decoder.push(source.slice(n)),
    ];
    assert.deepEqual(events, [
      { type: "status" },
      { type: "action", action: { type: "say", text: "Hi" } },
    ]);
  }
});

import { GuideController } from "../lib/avatar-guide/controller";
test("interrupt settles pending speech and clears caption, gesture and audio timing", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalCancel = Object.getOwnPropertyDescriptor(
    globalThis,
    "cancelAnimationFrame",
  );
  Object.defineProperty(globalThis, "window", {
    value: {},
    configurable: true,
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    value: () => {},
    configurable: true,
  });
  try {
    const controller = new GuideController();
    controller.setMuted(true);
    let resolved = false;
    const speech = controller
      .say(
        "A long sentence still speaking when the visitor changes their mind.",
      )
      .then(() => {
        resolved = true;
      });
    assert.equal(controller.snapshot.state, "speaking");
    controller.interrupt();
    await speech;
    assert.equal(resolved, true);
    assert.equal(controller.snapshot.state, "interrupted");
    assert.equal(controller.snapshot.caption, "");
    assert.equal(controller.snapshot.gesture, null);
    assert.equal(controller.snapshot.audioStartedAt, null);
    assert.deepEqual(controller.mouth(), {});
    assert.equal(controller.pointAt("body"), false);
    assert.equal(await controller.navigateTo("unlisted"), false);
    controller.dispose();
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalCancel)
      Object.defineProperty(globalThis, "cancelAnimationFrame", originalCancel);
    else Reflect.deleteProperty(globalThis, "cancelAnimationFrame");
  }
});

import { pcmWav } from "../lib/avatar-guide/audio";
test("microphone WAV uses exact mono 16 kHz PCM headers and saturates samples", () => {
  const bytes = pcmWav(new Float32Array([-2, -1, 0, 1, 2, NaN]));
  const view = new DataView(bytes.buffer);
  assert.equal(bytes.length, 56);
  assert.equal(view.getUint32(4, true) + 8, bytes.length);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 12);
  assert.deepEqual(
    Array.from({ length: 6 }, (_, i) => view.getInt16(44 + i * 2, true)),
    [-32768, -32768, 0, 32767, 32767, 0],
  );
});

import * as THREE from "three";
import { GuideRig } from "../lib/avatar-guide/rig";
function syntheticRig() {
  const root = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 1.8, 0.25),
    new THREE.MeshBasicMaterial(),
  );
  torso.position.y = 0.9;
  root.add(torso);
  const bone = (
    name: string,
    parent: THREE.Object3D,
    x: number,
    y: number,
    z = 0,
  ) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  };
  const hips = bone("spine05", root, 0, 0.9),
    spine = bone("spine03", hips, 0, 0.2),
    chest = bone("spine02", spine, 0, 0.2),
    neck = bone("neck01", chest, 0, 0.2),
    n2 = bone("neck02", neck, 0, 0.05),
    n3 = bone("neck03", n2, 0, 0.05);
  bone("head", n3, 0, 0.1);
  for (const side of ["L", "R"]) {
    const sign = side === "L" ? 1 : -1;
    const upper = bone(`upperarm01.${side}`, chest, sign * 0.23, 0.12),
      lower = bone(`lowerarm01.${side}`, upper, sign * 0.16, -0.25),
      wrist = bone(`wrist.${side}`, lower, sign * 0.12, -0.25);
    const finger = bone(`finger2-1.${side}`, wrist, sign * 0.02, -0.04);
    bone(`finger2-3.${side}`, finger, 0, -0.08);
  }
  root.updateMatrixWorld(true);
  return root;
}
test("MPFB wrist aliases bind and all procedural gestures keep bone transforms finite", () => {
  const model = syntheticRig(),
    rig = new GuideRig(model, []),
    controller = new GuideController();
  assert.ok(rig.bones.leftHand);
  assert.ok(rig.bones.rightHand);
  for (const emotion of EMOTIONS)
    for (const gesture of GESTURES) {
      controller.setEmotion(emotion, 1);
      controller.playGesture(gesture);
      for (let frame = 0; frame < 25; frame++)
        rig.update(
          frame / 60,
          1 / 60,
          controller,
          new THREE.Vector3(-3, 1, 0),
          new THREE.Vector3(-4, 3, 2),
          false,
        );
    }
  model.traverse((node) =>
    assert.ok(node.quaternion.toArray().every(Number.isFinite)),
  );
  rig.dispose();
});
test("authored constant arm tracks survive procedural layering across frames", () => {
  const model = syntheticRig(),
    quaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      0.25,
    );
  const clip = new THREE.AnimationClip("idle_test", 8, [
    new THREE.QuaternionKeyframeTrack(
      "upperarm01.L.quaternion",
      [0, 8],
      [...quaternion.toArray(), ...quaternion.toArray()],
    ),
  ]);
  const rig = new GuideRig(model, [clip]),
    controller = new GuideController();
  for (let frame = 0; frame < 100; frame++)
    rig.update(frame / 60, 1 / 60, controller, null, null, false);
  assert.ok(rig.bones.leftUpper!.quaternion.angleTo(quaternion) < 0.00001);
  rig.dispose();
});

test("interrupt fades an authored gesture out instead of leaving its clip running", () => {
  const model = syntheticRig(),
    q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      0.7,
    );
  const clip = new THREE.AnimationClip("wave_1", 8, [
    new THREE.QuaternionKeyframeTrack(
      "upperarm01.L.quaternion",
      [0, 8],
      [...q.toArray(), ...q.toArray()],
    ),
  ]);
  const rig = new GuideRig(model, [clip]),
    controller = new GuideController();
  controller.playGesture("wave");
  for (let i = 0; i < 60; i++)
    rig.update(i / 60, 1 / 60, controller, null, null, false);
  assert.ok(rig.bones.leftUpper!.quaternion.angleTo(q) < 0.001);
  controller.snapshot = {
    ...controller.snapshot,
    gesture: null,
    state: "interrupted",
  };
  for (let i = 60; i < 90; i++)
    rig.update(i / 60, 1 / 60, controller, null, null, false);
  assert.ok(rig.bones.leftUpper!.quaternion.angleTo(q) > 0.1);
  rig.dispose();
});

test("interrupt cancels route wait and cannot point at content mounted afterwards", async () => {
  const original = new Map(
    ["window", "document", "MutationObserver", "cancelAnimationFrame"].map(
      (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)],
    ),
  );
  let observerDisconnected = false;
  let inspect: (() => void) | undefined;
  let content: object | null = null;
  let scrolls = 0;
  const location = { pathname: "/" };
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location, matchMedia: () => ({ matches: true }) },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        body: {},
        querySelectorAll: () => [],
        querySelector: () => content,
      },
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: () => {},
    });
    Object.defineProperty(globalThis, "MutationObserver", {
      configurable: true,
      value: class {
        constructor(callback: () => void) {
          inspect = callback;
        }
        observe() {}
        disconnect() {
          observerDisconnected = true;
        }
      },
    });
    const controller = new GuideController();
    const routes: string[] = [];
    controller.configure(
      [
        {
          sectionId: "skills",
          selector: ".stack-list",
          title: "Skills",
          summary: "Skills",
          path: "/about",
        },
      ],
      (path) => {
        routes.push(path);
      },
    );
    const navigation = controller.navigateTo("skills");
    assert.deepEqual(routes, ["/about"]);
    assert.equal(controller.snapshot.state, "navigating");
    controller.interrupt();
    assert.equal(await navigation, false);
    assert.equal(observerDisconnected, true);
    location.pathname = "/about";
    content = { scrollIntoView: () => scrolls++ };
    inspect?.();
    assert.equal(scrolls, 0);
    assert.equal(controller.snapshot.target, null);
  } finally {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test("new speech cancels device voice and late callbacks cannot clear the replacement", async () => {
  const original = new Map(
    ["window", "SpeechSynthesisUtterance", "cancelAnimationFrame"].map(
      (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)],
    ),
  );
  type Take = {
    onstart: () => void;
    onend: () => void;
    onboundary: (e: { name: string; charIndex: number }) => void;
  };
  const takes: Take[] = [];
  let cancelled = 0;
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        speechSynthesis: {
          getVoices: () => [],
          speak: (take: Take) => takes.push(take),
          cancel: () => cancelled++,
        },
      },
    });
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {},
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: () => {},
    });
    const controller = new GuideController();
    const old = controller.say("The previous answer is still speaking.");
    const replacement = controller.say("This is the new answer.");
    await old;
    assert.equal(cancelled, 1);
    takes[0].onstart();
    takes[0].onboundary({ name: "word", charIndex: 20 });
    takes[0].onend();
    assert.equal(controller.snapshot.caption, "This is the new answer.");
    assert.equal(controller.snapshot.word, -1);
    assert.equal(controller.snapshot.audioStartedAt, null);
    assert.equal(controller.snapshot.state, "speaking");
    takes[1].onstart();
    assert.ok(controller.snapshot.audioStartedAt !== null);
    controller.interrupt();
    await replacement;
    assert.equal(cancelled, 2);
    assert.equal(controller.snapshot.state, "interrupted");
  } finally {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test("GLTFLoader-sanitized MPFB joint names bind the same arms and eyes", () => {
  const model = syntheticRig();
  model.traverse((node) => {
    node.name = THREE.PropertyBinding.sanitizeNodeName(node.name);
  });
  const rig = new GuideRig(model, []);
  for (const key of [
    "leftUpper",
    "rightUpper",
    "leftLower",
    "rightLower",
    "leftHand",
    "rightHand",
  ])
    assert.ok(rig.bones[key], key);
  assert.equal(rig.bones.leftHand?.name, "wristL");
  rig.dispose();
});

test("retriggering the only authored gesture does not fade its new playback away", () => {
  const model = syntheticRig();
  const q = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    0.6,
  );
  const clip = new THREE.AnimationClip("wave_1", 8, [
    new THREE.QuaternionKeyframeTrack(
      "upperarm01.L.quaternion",
      [0, 8],
      [...q.toArray(), ...q.toArray()],
    ),
  ]);
  const rig = new GuideRig(model, [clip]);
  const controller = new GuideController();
  controller.playGesture("wave");
  for (let i = 0; i < 60; i++)
    rig.update(i / 60, 1 / 60, controller, null, null, false);
  controller.playGesture("wave");
  for (let i = 60; i < 120; i++)
    rig.update(i / 60, 1 / 60, controller, null, null, false);
  assert.ok(rig.bones.leftUpper!.quaternion.angleTo(q) < 0.001);
  rig.dispose();
});

test("gesture reference poses add over the authored idle without halving the motion", () => {
  const model = syntheticRig();
  const base = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    0.2,
  );
  const peak = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    0.8,
  );
  const idle = new THREE.AnimationClip("idle_breathe", 8, [
    new THREE.QuaternionKeyframeTrack(
      "upperarm01.L.quaternion",
      [0, 8],
      [...base.toArray(), ...base.toArray()],
    ),
  ]);
  const gesture = new THREE.AnimationClip("wave_1", 4, [
    new THREE.QuaternionKeyframeTrack(
      "upperarm01.L.quaternion",
      [0, 1, 3, 4],
      [
        ...base.toArray(),
        ...peak.toArray(),
        ...peak.toArray(),
        ...base.toArray(),
      ],
    ),
  ]);
  const rig = new GuideRig(model, [idle, gesture]);
  const controller = new GuideController();
  for (let i = 0; i < 60; i++)
    rig.update(i / 60, 1 / 60, controller, null, null, false);
  controller.playGesture("wave");
  for (let i = 60; i < 150; i++)
    rig.update(i / 60, 1 / 60, controller, null, null, false);
  assert.ok(rig.bones.leftUpper!.quaternion.angleTo(peak) < 0.002);
  rig.dispose();
});
