"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { ConversationPose } from "@/lib/avatar/conversation";
import { AvatarPoster } from "./avatar-visual";
import {
  composeFace,
  type AvatarExpression,
  type FaceWeights,
} from "@/lib/avatar/rig";

export type RigStatus = {
  state: "loading" | "ready" | "error";
  shapes?: number;
  message?: string;
};
type Props = {
  expression?: AvatarExpression;
  intensity?: number;
  yaw?: number;
  idle?: boolean;
  readMouth?: () => FaceWeights;
  readPose?: () => ConversationPose | null;
  clay?: boolean;
  closeUp?: boolean;
  onStatus?: (status: RigStatus) => void;
};

function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const mat of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(mat);
      for (const value of Object.values(mat))
        if (value instanceof THREE.Texture) textures.add(value);
    }
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
  });
  textures.forEach((texture) => {
    const source = texture.source.data;
    texture.dispose();
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap)
      source.close();
  });
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

/** The same viewport can be passed to Avatar's visual prop after likeness approval. */
export default function AvatarRig(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const inputs = useRef(props);
  const [status, setStatus] = useState<RigStatus>({ state: "loading" });
  useEffect(() => {
    inputs.current = props;
  });

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer | undefined;
    let model: THREE.Group | undefined;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let intersection: IntersectionObserver | undefined;
    let inView = true;
    let restoreMaterials: (() => void) | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    const publish = (next: RigStatus) => {
      if (!disposed) {
        setStatus(next);
        inputs.current.onStatus?.(next);
      }
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      renderer?.setAnimationLoop(null);
      publish({
        state: "error",
        message:
          "3D rendering paused. Reload to try again; the portrait remains available.",
      });
    };

    async function start() {
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.toneMappingExposure = 1;
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        container!.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const ambient = new THREE.HemisphereLight(0xffffff, 0xffffff, 3.0);
        scene.add(ambient);
        const key = new THREE.DirectionalLight(0xfff3e8, 0.7);
        key.position.set(-2, 3, 4);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xdde5ff, 0.4);
        fill.position.set(2, 1, 2);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xb6bff5, 0.35);
        rim.position.set(1, 2, -3);
        scene.add(rim);
        const camera = new THREE.OrthographicCamera(
          -0.65,
          0.65,
          0.65,
          -0.65,
          0.01,
          20,
        );
        camera.position.set(0, 0.51, 3);
        camera.lookAt(0, 0.51, 0);
        const response = await fetch("/models/avatar/ubaid-conversation.glb", {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("The avatar model could not be loaded.");
        const gltf = await new GLTFLoader().parseAsync(
          await response.arrayBuffer(),
          "",
        );
        if (disposed) {
          disposeModel(gltf.scene);
          return;
        }
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const height = box.max.y - box.min.y;
        if (!Number.isFinite(height) || height <= 0)
          throw new Error("Invalid avatar dimensions.");
        const frame = new THREE.Group();
        model.scale.setScalar(1 / height);
        model.position.set(
          -(box.min.x + box.max.x) / (2 * height),
          -box.min.y / height,
          -(box.min.z + box.max.z) / (2 * height),
        );
        frame.add(model);
        scene.add(frame);
        const morphs: THREE.Mesh[] = [];
        const names = new Set<string>();
        model.traverse((object) => {
          if (
            object instanceof THREE.Mesh &&
            object.morphTargetDictionary &&
            object.morphTargetInfluences
          ) {
            morphs.push(object);
            Object.keys(object.morphTargetDictionary).forEach((name) =>
              names.add(name),
            );
          }
        });
        for (const required of [
          "eyeBlinkLeft",
          "eyeBlinkRight",
          "mouthSmileLeft",
          "jawOpen",
          "viseme_aa",
          "viseme_PP",
        ]) {
          if (!names.has(required))
            throw new Error(`The rig is missing ${required}.`);
        }
        const head = model.getObjectByName("head");
        const restHead = head?.quaternion.clone();
        const eyes = [
          model.getObjectByName("eye_0"),
          model.getObjectByName("eye_1"),
        ];
        const eyeRests = eyes.map((eye) => eye?.quaternion.clone());
        const clay = new THREE.MeshStandardMaterial({
          color: 0xb4b0a9,
          roughness: 0.8,
          side: THREE.DoubleSide,
        });
        const originals = new Map<
          THREE.Mesh,
          THREE.Material | THREE.Material[]
        >();
        model.traverse((o) => {
          if (o instanceof THREE.Mesh) originals.set(o, o.material);
        });
        let clayOn = false;
        let closeUp: boolean | undefined;
        restoreMaterials = () => {
          originals.forEach((material, mesh) => {
            mesh.material = material;
          });
          clay.dispose();
        };
        const idleRotation = new THREE.Quaternion();
        const resize = () => {
          const width = container!.clientWidth,
            height = container!.clientHeight;
          if (!width || !height || !renderer) return;
          const aspect = width / height;
          const vertical = Math.max(1.15, 1.3 / aspect);
          camera.left = (-vertical * aspect) / 2;
          camera.right = (vertical * aspect) / 2;
          camera.top = vertical / 2;
          camera.bottom = -vertical / 2;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        };
        observer = new ResizeObserver(resize);
        observer.observe(container!);
        resize();
        intersection = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
        });
        intersection.observe(container!);
        let previous = 0;
        renderer.setAnimationLoop((now) => {
          if (disposed || !renderer || !inView || document.hidden) {
            previous = now;
            return;
          }
          const dt = Math.min(
            0.05,
            Math.max(0, (now - (previous || now)) / 1000),
          );
          previous = now;
          const current = inputs.current;
          const moving = current.idle !== false && !reducedMotion.matches;
          const seconds = now / 1000;
          const blinkPhase = seconds % 4.7;
          const blink =
            moving && blinkPhase < 0.18
              ? Math.sin((blinkPhase / 0.18) * Math.PI)
              : 0;
          const performance = current.readPose?.();
          const target =
            performance?.face ??
            composeFace(
              current.expression ?? "neutral",
              current.intensity ?? 0.8,
              current.readMouth?.() ?? {},
              blink,
            );
          const alpha = 1 - Math.exp(-dt * 24);
          for (const mesh of morphs) {
            for (const [name, index] of Object.entries(
              mesh.morphTargetDictionary!,
            )) {
              const value = mesh.morphTargetInfluences![index];
              mesh.morphTargetInfluences![index] = THREE.MathUtils.lerp(
                value,
                target[name] ?? 0,
                alpha,
              );
            }
          }
          frame.rotation.y = THREE.MathUtils.lerp(
            frame.rotation.y,
            ((current.yaw ?? 0) * Math.PI) / 180,
            1 - Math.exp(-dt * 10),
          );
          if (head && restHead) {
            idleRotation.setFromEuler(
              new THREE.Euler(
                performance?.rotation[0] ??
                  (moving ? Math.sin(seconds * 0.8) * 0.012 : 0),
                performance?.rotation[1] ?? 0,
                performance?.rotation[2] ??
                  (moving ? Math.sin(seconds * 0.47) * 0.014 : 0),
              ),
            );
            head.quaternion.copy(restHead).multiply(idleRotation);
          }
          eyes.forEach((eye, i) => {
            const rest = eyeRests[i];
            if (eye && rest)
              eye.quaternion
                .copy(rest)
                .multiply(
                  new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(
                      performance?.gaze[1] ?? 0,
                      0,
                      performance?.gaze[0] ?? 0,
                    ),
                  ),
                );
          });
          if (clayOn !== !!current.clay) {
            clayOn = !!current.clay;
            ambient.intensity = clayOn ? 0.65 : 3;
            key.intensity = clayOn ? 3 : 0.7;
            fill.intensity = clayOn ? 0.6 : 0.4;
            originals.forEach((material, mesh) => {
              mesh.material = clayOn ? clay : material;
            });
          }
          if (closeUp !== !!current.closeUp) {
            closeUp = !!current.closeUp;
            camera.zoom = closeUp ? 1.6 : 1;
            camera.position.y = closeUp ? 0.66 : 0.51;
            camera.updateProjectionMatrix();
          }
          renderer.render(scene, camera);
        });
        publish({ state: "ready", shapes: names.size });
      } catch (error) {
        if (disposed) return;
        renderer?.setAnimationLoop(null);
        publish({
          state: "error",
          message:
            error instanceof Error
              ? error.message
              : "3D is unavailable on this device.",
        });
      }
    }
    void start();
    return () => {
      disposed = true;
      controller.abort();
      observer?.disconnect();
      intersection?.disconnect();
      renderer?.setAnimationLoop(null);
      renderer?.domElement.removeEventListener("webglcontextlost", contextLost);
      restoreMaterials?.();
      if (model) disposeModel(model);
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, []);

  return (
    <div className="rig-viewport" data-rig-state={status.state}>
      <div
        ref={host}
        className="rig-canvas"
        style={{ opacity: status.state === "ready" ? 1 : 0 }}
      />
      {status.state !== "ready" && <AvatarPoster />}
      {status.state === "error" && (
        <span className="rig-error" role="status">
          {status.message}
        </span>
      )}
    </div>
  );
}
