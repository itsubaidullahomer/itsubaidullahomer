"use client";

import {
  Component,
  Suspense,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from "react";
import Image from "next/image";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { KTX2Loader } from "three-stdlib";
import * as THREE from "three";
import { GuideController } from "@/lib/avatar-guide/controller";
import { GuideRig } from "@/lib/avatar-guide/rig";
import { damp, noise } from "@/lib/avatar-guide/motion";
import type {
  AvatarGuideHandle,
  GuideStatus,
  Target,
} from "@/lib/avatar-guide/vocabulary";

export type AvatarGuideProps = {
  ref?: Ref<AvatarGuideHandle>;
  targets: Target[];
  assetUrl?: string;
  mobileAssetUrl?: string;
  mobileBottomOffset?: number;
  avoidPanelSelector?: string;
  framing?: "floating" | "fullbody" | "face";
  onStatus?: (status: GuideStatus) => void;
  onInterrupt?: () => void;
  onNavigate?: (path: string) => void;
  onSnapshot?: (snapshot: ReturnType<GuideController["getSnapshot"]>) => void;
};
class RenderBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function Model({
  url,
  controller,
  reduced,
  onStatus,
  mobileBottomOffset,
  avoidPanelSelector,
  framing,
}: {
  url: string;
  controller: GuideController;
  reduced: boolean;
  onStatus: (s: GuideStatus) => void;
  mobileBottomOffset: number;
  avoidPanelSelector?: string;
  framing: "floating" | "fullbody" | "face";
}) {
  const renderer = useThree((state) => state.gl);
  const textureLoader = useMemo(
    () =>
      new KTX2Loader()
        .setTranscoderPath("/decoders/basis/")
        .detectSupport(renderer),
    [renderer],
  );
  const gltf = useGLTF(url, false, true, (loader) =>
    loader.setKTX2Loader(textureLoader),
  );
  useEffect(
    () => () => {
      textureLoader.dispose();
    },
    [textureLoader],
  );
  const model = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const data = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    if (!Number.isFinite(height) || height <= 0)
      throw new Error("Invalid model bounds.");
    const offset = new THREE.Vector3(
      -(box.min.x + box.max.x) / 2,
      -box.min.y,
      -(box.min.z + box.max.z) / 2,
    );
    return { height, offset, rig: new GuideRig(model, gltf.animations) };
  }, [model, gltf.animations]);
  const group = useRef<THREE.Group>(null);
  const cursor = useRef(new THREE.Vector2());
  const elapsed = useRef(0);
  const { camera, viewport, size } = useThree();
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    [],
  );
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  useEffect(() => {
    onStatus(data.rig.report);
    return () => data.rig.dispose();
  }, [data, onStatus]);
  useEffect(() => {
    const move = (event: PointerEvent) =>
      cursor.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        (-event.clientY / window.innerHeight) * 2 + 1,
      );
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    const time = elapsed.current;
    const mobile = size.width < 760;
    const pixelsPerUnit = size.height / viewport.height;
    const panelBottom = avoidPanelSelector
      ? (document.querySelector(avoidPanelSelector)?.getBoundingClientRect()
          .bottom ?? 0)
      : 0;
    const captionTop =
      document.querySelector(".guide-caption")?.getBoundingClientRect().top ??
      size.height - 30;
    const upperBound = Math.max(90, panelBottom + 14);
    const lowerBound = captionTop - 14;
    const floatingPixels = mobile
      ? mobileBottomOffset > 0
        ? 140
        : 190
      : Math.max(150, Math.min(430, lowerBound - upperBound));
    const bodyPixels =
      framing === "fullbody"
        ? size.height * 0.82
        : framing === "face"
          ? size.height * 3.1
          : floatingPixels;
    const bodyHeight = bodyPixels / pixelsPerUnit;
    const target =
      controller.snapshot.target &&
      controller.targetElement(controller.snapshot.target);
    const rect = target ? target.getBoundingClientRect() : null;
    const desiredY = mobile
      ? size.height - bodyPixels / 2 - 65 - mobileBottomOffset
      : Math.max(
          bodyPixels / 2 + upperBound,
          Math.min(
            lowerBound - bodyPixels / 2,
            rect ? rect.top + rect.height / 2 : size.height * 0.54,
          ),
        );
    const x =
      framing !== "floating"
        ? 0
        : mobile
          ? -viewport.width / 2 + 75 / pixelsPerUnit
          : viewport.width / 2 - 165 / pixelsPerUnit;
    const y =
      framing === "fullbody"
        ? -bodyHeight / 2 - 0.15
        : framing === "face"
          ? -bodyHeight * 0.91
          : viewport.height / 2 - desiredY / pixelsPerUnit - bodyHeight / 2;
    group.current.position.x = damp(group.current.position.x, x, dt, 5);
    group.current.position.y = damp(
      group.current.position.y,
      y +
        (reduced
          ? 0
          : noise(time * 0.35, 72) *
            (controller.snapshot.emotion === "excited"
              ? 0.025
              : controller.snapshot.emotion === "serious"
                ? 0
                : 0.008)),
      dt,
      5,
    );
    group.current.scale.setScalar(
      damp(group.current.scale.x, bodyHeight / data.height, dt, 5),
    );
    const screenPoint = (ndc: THREE.Vector2, z = 0) => {
      raycaster.setFromCamera(ndc, camera);
      const result = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(plane, result);
      if (hit) result.z = z;
      return hit ? result : null;
    };
    const point = rect
      ? screenPoint(
          new THREE.Vector2(
            ((rect.left + rect.width / 2) / size.width) * 2 - 1,
            (-(rect.top + rect.height / 2) / size.height) * 2 + 1,
          ),
        )
      : null;
    let gaze: THREE.Vector3 | null = null;
    if (controller.gaze === "cursor")
      gaze = screenPoint(cursor.current, bodyHeight * 0.55);
    else if (controller.gaze !== "viewer") {
      const element = controller.targetElement(controller.gaze);
      const bounds = element?.getBoundingClientRect();
      if (bounds)
        gaze = screenPoint(
          new THREE.Vector2(
            ((bounds.left + bounds.width / 2) / size.width) * 2 - 1,
            (-(bounds.top + bounds.height / 2) / size.height) * 2 + 1,
          ),
          bodyHeight * 0.3,
        );
      if (
        controller.snapshot.state === "speaking" &&
        performance.now() / 1000 - controller.pointStarted > 1.4
      )
        gaze = null;
    }
    model.updateMatrixWorld(true);
    // Active elapsed time pauses animation phases while the canvas is hidden.
    data.rig.update(time, dt, controller, point, gaze, reduced);
  });
  return (
    <group ref={group}>
      <group position={data.offset.toArray()}>
        <primitive object={model} dispose={null} />
      </group>
    </group>
  );
}
function FrameDriver({ active, mobile }: { active: boolean; mobile: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    let frame = 0,
      previous = 0;
    const tick = (now: number) => {
      if (now - previous >= (mobile ? 1000 / 30 : 1000 / 60)) {
        invalidate();
        previous = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, mobile, invalidate]);
  return null;
}

export default function AvatarGuide({
  ref,
  targets,
  assetUrl = "/models/avatar/ubaid-fullbody.glb",
  mobileAssetUrl,
  mobileBottomOffset = 0,
  avoidPanelSelector,
  framing = "floating",
  onStatus,
  onSnapshot,
  onInterrupt,
  onNavigate,
}: AvatarGuideProps) {
  const [controller] = useState(() => new GuideController());
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [status, setStatus] = useState<GuideStatus>({
    state: "loading",
    message: "Loading the full-body avatar…",
  });
  const [available, setAvailable] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const callbacks = useRef({ onStatus, onSnapshot });
  useEffect(() => {
    callbacks.current = { onStatus, onSnapshot };
  });
  useImperativeHandle(ref, () => controller, [controller]);
  useEffect(() => {
    controller.configure(targets, onNavigate);
  }, [controller, targets, onNavigate]);
  useEffect(() => {
    callbacks.current.onSnapshot?.(snapshot);
  }, [snapshot]);
  useEffect(() => {
    controller.setState("idle");
    return () => controller.dispose();
  }, [controller]);
  const publish = useMemo(
    () => (next: GuideStatus) => {
      setStatus(next);
      callbacks.current.onStatus?.(next);
    },
    [],
  );
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)"),
      small = window.matchMedia("(max-width: 759px)");
    const sync = () => {
      setReduced(motion.matches);
      setMobile(small.matches);
    };
    const visibility = () => setVisible(!document.hidden);
    sync();
    visibility();
    motion.addEventListener("change", sync);
    small.addEventListener("change", sync);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      motion.removeEventListener("change", sync);
      small.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const url = mobile && mobileAssetUrl ? mobileAssetUrl : assetUrl;
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    fetch(url, { method: "HEAD", signal: abort.signal })
      .then((response) => {
        if (!response.ok)
          throw new Error("Full-body asset is not available yet.");
        if (active) setAvailable(true);
      })
      .catch((error) => {
        if (active && error.name !== "AbortError") {
          setAvailable(false);
          publish({
            state: "error",
            message:
              "Showing the approved portrait while the full-body model is being prepared.",
          });
        }
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [url, publish]);
  const poster = (
    <div className="guide-poster">
      <Image
        src="/images/avatar/ubaid-v1.webp"
        alt="Approved stylized portrait of Ubaidullah Omer; full-body model pending"
        fill
        sizes="(max-width:760px) 130px, 260px"
        loading="eager"
      />
    </div>
  );
  return (
    <>
      <div className="guide-overlay" aria-hidden="true">
        {available ? (
          <RenderBoundary
            fallback={poster}
            onError={() =>
              publish({
                state: "error",
                message:
                  "The 3D renderer is unavailable. The approved portrait remains visible.",
              })
            }
          >
            <Canvas
              orthographic
              camera={{ position: [0, 0, 10], zoom: 100, near: 0.01, far: 100 }}
              frameloop="demand"
              dpr={[1, mobile ? 1.25 : 1.6]}
              gl={{
                alpha: true,
                antialias: true,
                powerPreference: "low-power",
              }}
              fallback={poster}
            >
              <hemisphereLight args={[0xffffff, 0x6d7488, 2.2]} />
              <directionalLight position={[-4, 7, 6]} intensity={2.8} />
              <directionalLight
                position={[5, 4, -3]}
                color="#cddcff"
                intensity={2}
              />
              <Suspense fallback={null}>
                <Model
                  url={url}
                  controller={controller}
                  reduced={reduced}
                  onStatus={publish}
                  mobileBottomOffset={mobileBottomOffset}
                  avoidPanelSelector={avoidPanelSelector}
                  framing={framing}
                />
              </Suspense>
              <FrameDriver active={visible} mobile={mobile} />
            </Canvas>
          </RenderBoundary>
        ) : (
          poster
        )}
      </div>
      <aside className="guide-caption" aria-label="Avatar speech and controls">
        <div className="guide-caption-top">
          <span className={`guide-dot ${snapshot.state}`} />
          <span>{snapshot.state}</span>
          <button
            type="button"
            onClick={() => controller.setMuted(!snapshot.muted)}
            aria-pressed={snapshot.muted}
          >
            {snapshot.muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={() =>
              onInterrupt ? onInterrupt() : controller.interrupt()
            }
          >
            Stop
          </button>
        </div>
        {snapshot.caption ? (
          <p aria-live="polite">
            {snapshot.caption.split(/\s+/).map((word, i) => (
              <span
                key={i}
                className={snapshot.word === i ? "guide-spoken-word" : ""}
              >
                {word}{" "}
              </span>
            ))}
          </p>
        ) : (
          <p className="guide-caption-hint">
            Ask a question or try the guided tour.
          </p>
        )}
        <small>
          {snapshot.speechKind === "browser-demo"
            ? "Device voice preview · no phoneme timing"
            : snapshot.speechKind === "audio"
              ? snapshot.timingQuality === "aligned"
                ? "Recorded audio · aligned mouth cues"
                : "Generated audio · estimated mouth timing"
              : status.state === "ready"
                ? "Model study · likeness not approved"
                : "Portrait fallback · full-body asset pending"}
        </small>
      </aside>
    </>
  );
}
