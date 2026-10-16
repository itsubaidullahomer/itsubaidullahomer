/** Repair degenerate-UV tangent frames and validate an isolated browser study. */
import assert from "node:assert/strict";
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import validator from "gltf-validator";

const toolRoot = process.env.AVATAR_GLTF_TOOLS ?? "/tmp/ubaid-avatar-tools/gltf-transform/node_modules";
const fromTools = (path) => import(pathToFileURL(resolve(toolRoot, path)).href);
const [{ NodeIO }, { ALL_EXTENSIONS, EXTMeshoptCompression }, { prune }, { MeshoptEncoder, MeshoptDecoder }] = await Promise.all([
  fromTools("@gltf-transform/core/dist/index.js"),
  fromTools("@gltf-transform/extensions/dist/index.js"),
  fromTools("@gltf-transform/functions/dist/index.js"),
  fromTools("meshoptimizer/index.js"),
]);
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const source = resolve(process.argv[2] ?? "assets/avatar/identity-rebuild/facebuilder-study/baked-skin-study/head-groomed-tangents-clean.glb");
const destination = resolve(process.argv[3] ?? "assets/avatar/identity-rebuild/facebuilder-study/baked-skin-study/head-groomed-validated.glb");
assert.notEqual(source, destination, "Preserve the source study");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(source);
const channelNames = (document) => [...new Set(document.getRoot().listMeshes().flatMap((mesh) => mesh.getExtras().targetNames ?? []))].sort();
const beforeNames = channelNames(doc);
const worldPoints = (document) => Object.fromEntries(document.getRoot().listNodes().filter((node) => node.getMesh()).map((node) => {
  const m = node.getWorldMatrix();
  const points = node.getMesh().listPrimitives().map((primitive) => {
    const position = primitive.getAttribute("POSITION");
    return Array.from({ length: position.getCount() }, (_, i) => {
      const v = position.getElement(i, []);
      return [0, 1, 2].map((j) => m[j] * v[0] + m[4 + j] * v[1] + m[8 + j] * v[2] + m[12 + j]);
    });
  });
  return [node.getName(), points];
}));
const beforePoints = worldPoints(doc);
let repaired = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    const tangent = primitive.getAttribute("TANGENT");
    if (!tangent) continue;
    const normal = primitive.getAttribute("NORMAL");
    assert.ok(normal);
    for (let i = 0; i < tangent.getCount(); i++) {
      const t = tangent.getElement(i, []);
      if (Number.isFinite(Math.hypot(...t.slice(0, 3))) && Math.hypot(...t.slice(0, 3)) > .5) continue;
      const n = normal.getElement(i, []);
      const length = Math.hypot(...n);
      assert.ok(length > .5 && Number.isFinite(length), "A valid normal is required for tangent repair");
      const unit = n.map((v) => v / length);
      const smallestAxis = unit.map(Math.abs).indexOf(Math.min(...unit.map(Math.abs)));
      const axis = [0, 0, 0];
      axis[smallestAxis] = 1;
      const dot = unit[smallestAxis];
      const fallback = axis.map((v, j) => v - dot * unit[j]);
      const magnitude = Math.hypot(...fallback);
      tangent.setElement(i, [...fallback.map((v) => v / magnitude), t[3] < 0 ? -1 : 1]);
      repaired++;
    }
  }
}
// No simplify, weld, remesh, or target editing: all authored facial channels stay.
await doc.transform(prune({ keepAttributes: true, keepSolidTextures: true }));
// The source is already quantized. Running meshopt() again re-quantizes its
// morph-dependent bounds and changed eye transforms in the first trial. Encode
// the existing arrays losslessly instead, then verify every world-space point.
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(destination, doc);
const decoded = await io.read(destination);
assert.deepEqual(channelNames(decoded), beforeNames);
const afterPoints = worldPoints(decoded);
let maximumWorldPositionError = 0;
for (const [name, primitives] of Object.entries(beforePoints)) {
  assert.equal(primitives.length, afterPoints[name].length);
  primitives.forEach((points, p) => {
    assert.equal(points.length, afterPoints[name][p].length);
    points.forEach((point, v) => point.forEach((value, j) => {
      maximumWorldPositionError = Math.max(maximumWorldPositionError, Math.abs(value - afterPoints[name][p][v][j]));
    }));
  });
}
assert.ok(maximumWorldPositionError < 1e-8, `Compression changed geometry by ${maximumWorldPositionError}`);
for (const name of ["jawOpen", "eyeBlinkLeft", "eyeBlinkRight", "mouthSmileLeft", "mouthSmileRight", ...["sil", "PP", "FF", "TH", "DD", "kk", "CH", "SS", "nn", "RR", "aa", "E", "I", "O", "U"].map((v) => `viseme_${v}`)]) {
  assert.ok(beforeNames.includes(name), `Missing channel ${name}`);
}
for (const mesh of decoded.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    for (const target of primitive.listTargets()) {
      for (const accessor of target.listAttributes()) {
        assert.ok([...accessor.getArray()].every(Number.isFinite), "Nonfinite morph data");
        assert.equal(accessor.getCount(), primitive.getAttribute("POSITION").getCount());
      }
    }
  }
}
decoded.getRoot().listExtensionsUsed().find((extension) => extension.extensionName === "EXT_meshopt_compression")?.dispose();
const decodedPath = destination.replace(/\.glb$/, "-decoded.glb");
await io.write(decodedPath, decoded);
const validation = await validator.validateBytes(new Uint8Array(await readFile(decodedPath)), { uri: decodedPath, maxIssues: 100 });
await writeFile(resolve(dirname(destination), "validated-decoded-report.json"), JSON.stringify(validation, null, 2));
assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues.messages));
assert.equal(validation.issues.numWarnings, 0, JSON.stringify(validation.issues.messages));
const report = { source, destination, degenerateTangentsRepaired: repaired, maximumWorldPositionError, bytes: (await stat(destination)).size, facialChannels: beforeNames.length, channelNames: beforeNames, triangles: validation.info.totalTriangleCount, meshes: decoded.getRoot().listMeshes().length, decodedValidation: { errors: validation.issues.numErrors, warnings: validation.issues.numWarnings, infos: validation.issues.numInfos }, status: "Isolated likeness draft, not a production replacement" };
await writeFile(resolve(dirname(destination), "portable-final-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
