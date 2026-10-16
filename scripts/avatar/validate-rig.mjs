import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import validator from "gltf-validator";

const revision = process.argv[2] ?? "ubaid-v2";
assert.match(revision, /^ubaid-[a-z0-9-]+$/);
const file = new URL(
  `../../public/models/avatar/${revision}.glb`,
  import.meta.url,
);
const bytes = await readFile(file);
const result = await validator.validateBytes(new Uint8Array(bytes), {
  uri: `${revision}.glb`,
  maxIssues: 100,
});
assert.equal(
  result.issues.numErrors,
  0,
  JSON.stringify(result.issues.messages, null, 2),
);
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
assert.ok(gltf.skins?.length, "The export must contain real skinning.");
const shapes = new Set(
  gltf.meshes.flatMap((mesh) => mesh.extras?.targetNames ?? []),
);
const required = [
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "mouthSmileLeft",
  "mouthSmileRight",
  "browOuterUpLeft",
  "jawOpen",
  ...[
    "PP",
    "FF",
    "TH",
    "DD",
    "kk",
    "CH",
    "SS",
    "nn",
    "RR",
    "aa",
    "E",
    "ih",
    "oh",
    "ou",
  ].map((name) => `viseme_${name}`),
];
required.forEach((name) =>
  assert.ok(shapes.has(name), `Missing deformation: ${name}`),
);
for (const mesh of gltf.meshes) {
  for (const primitive of mesh.primitives) {
    for (const target of primitive.targets ?? []) {
      const accessor = gltf.accessors[target.POSITION];
      assert.ok(
        accessor &&
          accessor.count ===
            gltf.accessors[primitive.attributes.POSITION].count,
        "Morph topology must match the base mesh.",
      );
    }
  }
}
const summary = {
  bytes: bytes.length,
  meshes: gltf.meshes.length,
  skins: gltf.skins.length,
  facialShapes: shapes.size,
  errors: result.issues.numErrors,
  warnings: result.issues.numWarnings,
  messages: result.issues.messages,
};
await writeFile(
  new URL(`../../assets/avatar/${revision}/validation.json`, import.meta.url),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify({ ...summary, messages: undefined }, null, 2));
