"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import * as THREE from "three";

const STUDIES = {
  "Fitted head": "/models/avatar/studies/facebuilder-head-facs.glb",
  "Anatomy study": "/models/avatar/studies/facebuilder-anatomy.glb?v=anatomy-2",
  "Baked skin draft": "/models/avatar/studies/facebuilder-baked-skin.glb?v=skin-2",
} as const;
type Study = keyof typeof STUDIES;
type FaceTest = {
  jaw: number;
  blink: number;
  smile: number;
  brow: number;
  viseme: "sil" | "PP" | "TH" | "aa";
};
const NEUTRAL: FaceTest = {
  jaw: 0,
  blink: 0,
  smile: 0,
  brow: 0,
  viseme: "sil",
};
type View = "Front" | "Three-quarter" | "Profile" | "Back";
const CAMERAS: Record<View, [number, number, number]> = {
  Front: [0, 0, 5.2],
  "Three-quarter": [-3.68, 0, 3.68],
  Profile: [-5.2, 0, 0],
  Back: [0, 0, -5.2],
};
type ModelReport = { shapes: number; triangles: number; missing: string[] };

class ModelBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="identity-error" role="alert">
        The head study could not load. The asset remains separate from the
        public hero.
      </div>
    ) : (
      this.props.children
    );
  }
}

function Head({
  url,
  face,
  clay,
  wireframe,
  onReport,
}: {
  url: string;
  face: FaceTest;
  clay: boolean;
  wireframe: boolean;
  onReport: (report: ModelReport) => void;
}) {
  const gltf = useGLTF(url, false, true);
  const invalidate = useThree((state) => state.invalidate);
  const data = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const meshes: THREE.Mesh[] = [];
    const materials: THREE.Material[] = [];
    const original = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const shapes = new Set<string>();
    let triangles = 0;
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const source = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const copied = source.map((material) => material.clone());
      materials.push(...copied);
      object.material = Array.isArray(object.material) ? copied : copied[0];
      original.set(object, object.material);
      meshes.push(object);
      Object.keys(object.morphTargetDictionary ?? {}).forEach((name) =>
        shapes.add(name),
      );
      triangles +=
        (object.geometry.index?.count ??
          object.geometry.attributes.position.count) / 3;
    });
    const box = new THREE.Box3().setFromObject(scene);
    const height = box.max.y - box.min.y;
    if (!Number.isFinite(height) || height <= 0)
      throw new Error("Invalid head bounds");
    return {
      scene,
      meshes,
      materials,
      original,
      center: box.getCenter(new THREE.Vector3()).negate(),
      scale: 2.8 / height,
      clayMaterial: new THREE.MeshStandardMaterial({
        color: "#c6b6a0",
        roughness: 0.88,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      report: {
        shapes: shapes.size,
        triangles: Math.round(triangles),
        missing: [
          "jawOpen",
          "eyeBlinkLeft",
          "eyeBlinkRight",
          "mouthSmileLeft",
          "mouthSmileRight",
        ].filter((name) => !shapes.has(name)),
      },
    };
  }, [gltf.scene]);
  useEffect(() => {
    onReport(data.report);
    return () => {
      data.materials.forEach((material) => material.dispose());
      data.clayMaterial.dispose();
    };
  }, [data, onReport]);
  useEffect(() => {
    const weights: Record<string, number> = {
      jawOpen: face.jaw,
      eyeBlinkLeft: face.blink,
      eyeBlinkRight: face.blink,
      mouthSmileLeft: face.smile,
      mouthSmileRight: face.smile,
      browInnerUp: face.brow,
      [`viseme_${face.viseme}`]: 1,
    };
    // Three materials are imperative renderer objects cloned for this viewer.
    // eslint-disable-next-line react-hooks/immutability
    data.clayMaterial.wireframe = wireframe;
    for (const material of data.materials)
      if ("wireframe" in material) material.wireframe = wireframe;
    for (const mesh of data.meshes) {
      mesh.material = clay ? data.clayMaterial : data.original.get(mesh)!;
      if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) continue;
      mesh.morphTargetInfluences.fill(0);
      for (const [name, weight] of Object.entries(weights)) {
        const index = mesh.morphTargetDictionary[name];
        if (index !== undefined) mesh.morphTargetInfluences[index] = weight;
      }
    }
    invalidate();
  }, [data, face, clay, wireframe, invalidate]);
  return (
    <group scale={data.scale}>
      <group position={data.center}>
        <primitive object={data.scene} dispose={null} />
      </group>
    </group>
  );
}

function Camera({ view, revision }: { view: View; revision: number }) {
  const controls = useRef<OrbitControlsType>(null);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    camera.position.set(...CAMERAS[view]);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [camera, view, revision, invalidate]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={2.7}
      maxDistance={8}
      enablePan={false}
    />
  );
}

export default function AvatarIdentityLab() {
  const [study, setStudy] = useState<Study>("Fitted head");
  const [face, setFace] = useState<FaceTest>(NEUTRAL);
  const [clay, setClay] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [view, setView] = useState<View>("Front");
  const [revision, setRevision] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [report, setReport] = useState<ModelReport | null>(null);
  return (
    <section
      className={`identity-lab${hidden ? " identity-panels-hidden" : ""}`}
      aria-label="Head fitting study"
    >
      <header className="identity-heading">
        <a href="/avatar-guide-lab">← Full-body guide lab</a>
        <h1>Head fitting study</h1>
        <p className="identity-status">Likeness not approved</p>
        <p>
          Photo-fitted 3D geometry. Inspect the shape and facial movement before
          materials, hair and the full-body rig are finalized.
        </p>
      </header>
      <div className="identity-workspace">
        <div
          className="identity-stage"
          role="region"
          aria-label="Interactive 3D head: drag to orbit, scroll to zoom"
        >
          <ModelBoundary>
            <Canvas
              frameloop="demand"
              dpr={[1, 1.7]}
              camera={{ position: CAMERAS.Front, fov: 38, near: 0.1, far: 30 }}
              gl={{ antialias: true, alpha: true }}
            >
              <ambientLight intensity={0.55} />
              <directionalLight
                position={[-3, 4, 5]}
                intensity={2.4}
                color="#fff6ea"
              />
              <directionalLight
                position={[3, 1, 3]}
                intensity={0.7}
                color="#e7f0ff"
              />
              <directionalLight position={[1, 3, -3]} intensity={1.8} />
              <Suspense fallback={null}>
                <Head
                  url={STUDIES[study]}
                  face={face}
                  clay={clay}
                  wireframe={wireframe}
                  onReport={setReport}
                />
              </Suspense>
              <Camera view={view} revision={revision} />
            </Canvas>
          </ModelBoundary>
          {!report && (
            <div className="identity-loading" role="status">
              Loading fitted geometry…
            </div>
          )}
          <div className="identity-stage-bar">
            <span>Drag to orbit · Scroll to zoom</span>
            <button onClick={() => setHidden(!hidden)}>
              {hidden ? "Show controls" : "Hide controls"}
            </button>
          </div>
          <div className="identity-angles" aria-label="Camera views">
            {(Object.keys(CAMERAS) as View[]).map((name) => (
              <button
                key={name}
                aria-pressed={view === name}
                onClick={() => {
                  setView(name);
                  setRevision((n) => n + 1);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <aside className="identity-controls" aria-label="Head study controls">
          <div className="identity-control-title">
            <h2>Inspect the mesh</h2>
            <button
              onClick={() => {
                setFace(NEUTRAL);
                setView("Front");
                setRevision((n) => n + 1);
              }}
            >
              Reset
            </button>
          </div>
          <label className="identity-study-select">
            Study asset
            <select
              value={study}
              onChange={(event) => {
                setStudy(event.target.value as Study);
                setFace(NEUTRAL);
                setReport(null);
              }}
            >
              {(Object.keys(STUDIES) as Study[]).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <div className="identity-toggle-row">
            <button aria-pressed={!clay} onClick={() => setClay(false)}>
              Asset shading
            </button>
            <button aria-pressed={clay} onClick={() => setClay(true)}>
              Matte clay
            </button>
          </div>
          <label className="identity-check">
            <input
              type="checkbox"
              checked={wireframe}
              onChange={(event) => setWireframe(event.target.checked)}
            />{" "}
            Show topology
          </label>
          <h2>Facial shapes</h2>
          {(
            [
              ["jaw", "Jaw open"],
              ["blink", "Blink"],
              ["smile", "Smile"],
              ["brow", "Inner brow raise"],
            ] as const
          ).map(([key, label]) => (
            <label className="identity-slider" key={key}>
              <span>
                {label}
                <output>{Math.round(face[key] * 100)}%</output>
              </span>
              <input
                aria-label={label}
                type="range"
                min="0"
                max="1"
                step=".01"
                value={face[key]}
                onChange={(event) =>
                  setFace((previous) => ({
                    ...previous,
                    viseme: "sil",
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
          <div className="identity-presets">
            <button onClick={() => setFace(NEUTRAL)}>Neutral</button>
            <button onClick={() => setFace({ ...NEUTRAL, blink: 1 })}>
              Hold blink
            </button>
            <button onClick={() => setFace({ ...NEUTRAL, jaw: 0.65 })}>
              Open jaw
            </button>
            <button onClick={() => setFace({ ...NEUTRAL, smile: 0.65 })}>
              Soft smile
            </button>
          </div>
          {study !== "Fitted head" && (
            <>
              <h2>Held speech shapes</h2>
              <div className="identity-presets">
                {(["PP", "TH", "aa"] as const).map((viseme) => (
                  <button
                    key={viseme}
                    aria-pressed={face.viseme === viseme}
                    onClick={() => setFace({ ...NEUTRAL, viseme })}
                  >
                    Hold {viseme}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="identity-mesh-report" role="status">
            {report
              ? `${report.shapes} facial shapes · ${report.triangles.toLocaleString()} triangles`
              : "Loading geometry…"}
          </p>
          {report?.missing.length ? (
            <p>Unavailable controls: {report.missing.join(", ")}</p>
          ) : null}
          <p className="identity-note">
            {study === "Fitted head"
              ? "A connected head mesh with native facial shapes. The eye and mouth interiors are unfinished."
              : study === "Baked skin draft"
                ? "Authored skin color and facial hair baked into UV textures, with geometric eyes and oral anatomy. Likeness, scalp hair and dental refinement remain unfinished."
                : "Separate geometric eyes, teeth, gums and tongue with solid-color materials. Anatomy and appearance remain under review."}{" "}
            Shading is diagnostic. This study does not replace the website’s
            hero or full-body avatar.
          </p>
        </aside>
      </div>
    </section>
  );
}
