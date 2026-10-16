/** Morph/skin-aware reduction of one unquantized fitted-body study. */
import assert from "node:assert/strict";
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import validator from "gltf-validator";

const modules = process.env.AVATAR_GLTF_TOOLS ?? "/tmp/ubaid-avatar-tools/gltf-transform/node_modules";
const library = (path) => import(pathToFileURL(resolve(modules, path)).href);
const [{ NodeIO }, { ALL_EXTENSIONS, EXTMeshoptCompression }, { compactPrimitive, prune, quantize, resample }, { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier }] = await Promise.all([
  library("@gltf-transform/core/dist/index.js"), library("@gltf-transform/extensions/dist/index.js"), library("@gltf-transform/functions/dist/index.js"), library("meshoptimizer/index.js"),
]);
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const source = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
assert.notEqual(source, output);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(source);
assert.ok(!doc.getRoot().listExtensionsUsed().some((extension) => extension.extensionName === "KHR_mesh_quantization"), "Simplify the original float export, never re-quantize an existing optimized asset");
const allChannels = (document) => [...new Set(document.getRoot().listMeshes().flatMap((mesh) => mesh.getExtras().targetNames ?? []))].sort();
const expectedChannels = allChannels(doc);
assert.equal(expectedChannels.length, 67);
const expectedClips = doc.getRoot().listAnimations().map((animation) => animation.getName()).sort();
assert.equal(expectedClips.length, 34);
const meshes = doc.getRoot().listMeshes();
assert.equal(meshes.filter((mesh) => mesh.getName().startsWith("Ubaid_FaceBuilder_Head_Study")).length, 1);
assert.equal(meshes.find((mesh) => mesh.getName() === "Ubaid_Body").listPrimitives()[0].listTargets().length, 0);
const oral = (name) => /^(Upper tooth |Lower tooth |Upper gum|Lower gum|Tongue|Mouth cavity)/.test(name);
const triangleCount = (mesh) => mesh.listPrimitives().reduce((total, primitive) => total + primitive.getIndices().getCount() / 3, 0);
const oralTotal = meshes.filter((mesh) => oral(mesh.getName())).reduce((n, mesh) => n + triangleCount(mesh), 0);
const reports = [];
const important = ["jawOpen", "eyeBlinkLeft", "eyeBlinkRight", "mouthSmileLeft", "mouthSmileRight", "mouthPucker", "mouthFunnel", "browInnerUp", "viseme_PP"];
for (const mesh of meshes) {
  const name = mesh.getName();
  const total = triangleCount(mesh);
  let budget = total, errorLimit = .002;
  if (name.startsWith("Ubaid_FaceBuilder_Head_Study")) budget = 20000;
  else if (name === "Ubaid_Body") { budget = 8000; errorLimit = .005; }
  else if (name === "Ubaid_Outfit") { budget = 6000; errorLimit = .005; }
  else if (name === "Ubaid_Shoes") { budget = 1000; errorLimit = .005; }
  else if (/^Eye\./.test(name)) { budget = 900; errorLimit = .003; }
  else if (oral(name)) { budget = total * 4000 / oralTotal; errorLimit = .012; }
  if (budget >= total) continue;
  const names = mesh.getExtras().targetNames ?? [];
  for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute("POSITION"), normal = primitive.getAttribute("NORMAL");
    assert.equal(position.getComponentType(), 5126, "Raw float position required");
    const count = position.getCount(), positions = position.getArray(), normals = normal.getArray();
    const targets = primitive.listTargets();
    const selected = important.map((key) => targets[names.indexOf(key)]?.getAttribute("POSITION")?.getArray());
    const attributes = new Float32Array(count * 32), locks = new Uint8Array(count);
    const joints = primitive.getAttribute("JOINTS_0")?.getArray(), weights = primitive.getAttribute("WEIGHTS_0")?.getArray();
    for (let v = 0; v < count; v++) {
      attributes.set(normals.subarray(v * 3, v * 3 + 3), v * 32);
      for (let t = 0; t < 9; t++) if (selected[t]) for (let a = 0; a < 3; a++) attributes[v * 32 + 3 + t * 3 + a] = selected[t][v * 3 + a] * 50;
      if (weights) { attributes[v * 32 + 30] = weights[v * 4]; attributes[v * 32 + 31] = weights[v * 4 + 1]; }
    }
    const indices = primitive.getIndices(), sourceIndices = Uint32Array.from(indices.getArray());
    if (joints && weights) {
      const dominant = new Uint16Array(count);
      for (let v = 0; v < count; v++) {
        let best = 0; for (let j = 1; j < 4; j++) if (weights[v * 4 + j] > weights[v * 4 + best]) best = j;
        dominant[v] = joints[v * 4 + best];
      }
      for (let i = 0; i < sourceIndices.length; i += 3) {
        const [a, b, c] = sourceIndices.subarray(i, i + 3);
        if (dominant[a] !== dominant[b] || dominant[a] !== dominant[c]) locks[a] = locks[b] = locks[c] = 1;
      }
    }
    if (targets.length > 30) for (let v = 0; v < count; v++) {
      let chosen = 0, any = 0;
      for (const array of selected) if (array) chosen = Math.max(chosen, Math.hypot(...array.subarray(v * 3, v * 3 + 3)));
      for (const target of targets) {
        const array = target.getAttribute("POSITION")?.getArray();
        if (array) any = Math.max(any, Math.hypot(...array.subarray(v * 3, v * 3 + 3)));
      }
      if (any > .0005 && chosen < .0001) locks[v] = 1;
    }
    const requestedIndices = Math.floor(sourceIndices.length * budget / total / 3) * 3;
    const [result, error] = MeshoptSimplifier.simplifyWithAttributes(sourceIndices, positions, 3, attributes, 32, [.15, .15, .15, ...Array(27).fill(1), 2, 2], locks, requestedIndices, errorLimit, ["LockBorder"]);
    primitive.setIndices(doc.createAccessor().setType("SCALAR").setArray(result).setBuffer(indices.getBuffer()));
    compactPrimitive(primitive);
    reports.push({ mesh: name, beforeTriangles: sourceIndices.length / 3, afterTriangles: result.length / 3, protectedVertices: locks.reduce((n, value) => n + value, 0), relativeAttributeError: error, requestedTriangles: requestedIndices / 3 });
  }
}
// Normalize malformed tangent frames before the single quantization pass. The
// fallback is needed only at degenerate UV corners, never a position edit.
let tangentRepairs = 0;
for (const mesh of meshes) for (const primitive of mesh.listPrimitives()) {
  const tangent = primitive.getAttribute("TANGENT"), normal = primitive.getAttribute("NORMAL");
  if (!tangent) continue;
  if (!primitive.getMaterial()?.getNormalTexture()) { primitive.setAttribute("TANGENT", null); continue; }
  for (let i = 0; i < tangent.getCount(); i++) {
    const t = tangent.getElement(i, []), size = Math.hypot(...t.slice(0, 3));
    if (size > .5 && Number.isFinite(size)) continue;
    const n = normal.getElement(i, []), nl = Math.hypot(...n);
    assert.ok(nl > .5);
    const unit = n.map((value) => value / nl), abs = unit.map(Math.abs), axis = abs.indexOf(Math.min(...abs));
    const fallback = unit.map((value, j) => (j === axis ? 1 : 0) - unit[axis] * value), length = Math.hypot(...fallback);
    tangent.setElement(i, [...fallback.map((value) => value / length), t[3] < 0 ? -1 : 1]);
    tangentRepairs++;
  }
}
const beforeQuantizationPath = output.replace(/\.glb$/, "-reduced-float.glb");
const scene = doc.getRoot().getDefaultScene();
for (const node of doc.getRoot().listNodes()) if (node.getSkin() && node.getParentNode()) {
  const worldMatrix = node.getWorldMatrix();
  node.getParentNode().removeChild(node);
  scene.addChild(node);
  node.setMatrix(worldMatrix);
}
await doc.transform(resample({ tolerance: 1e-5 }), prune({ keepAttributes: true, keepLeaves: true }));
await io.write(beforeQuantizationPath, doc);
const reference = await io.read(beforeQuantizationPath);
await doc.transform(quantize({ quantizePosition: 16, quantizeNormal: 12, quantizeWeight: 16 }));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(output, doc);
const decoded = await io.read(output);
assert.deepEqual(allChannels(decoded), expectedChannels);
assert.deepEqual(decoded.getRoot().listAnimations().map((animation) => animation.getName()).sort(), expectedClips);
const clipChecks = decoded.getRoot().listAnimations().map((animation) => {
  let duration = 0, movingChannels = 0, maximumEndpointDifference = 0;
  for (const channel of animation.listChannels()) {
    const sampler = channel.getSampler(), times = sampler.getInput().getArray(), values = sampler.getOutput().getArray(), width = sampler.getOutput().getElementSize();
    assert.ok([...times, ...values].every(Number.isFinite));
    duration = Math.max(duration, times[times.length - 1] - times[0]);
    let movement = 0;
    for (let i = width; i < values.length; i++) movement = Math.max(movement, Math.abs(values[i] - values[i % width]));
    if (movement > 1e-5) movingChannels++;
    for (let j = 0; j < width; j++) maximumEndpointDifference = Math.max(maximumEndpointDifference, Math.abs(values[j] - values[values.length - width + j]));
  }
  assert.ok(duration >= 1 && movingChannels > 0 && maximumEndpointDifference < 1e-4, `Invalid motion clip ${animation.getName()}`);
  return { name: animation.getName(), duration, movingChannels, maximumEndpointDifference };
});
let maximumBasePositionError = 0, maximumMorphedPositionError = 0;
const multiply = (a, b) => Array.from({ length: 16 }, (_, i) => {
  const row = i % 4, col = Math.floor(i / 4);
  return [0, 1, 2, 3].reduce((sum, k) => sum + a[k * 4 + row] * b[col * 4 + k], 0);
});
const skinMatrices = (node) => {
  const skin = node.getSkin();
  return skin ? skin.listJoints().map((joint, j) => multiply(joint.getWorldMatrix(), skin.getInverseBindMatrices().getElement(j, []))) : null;
};
const vertexMatrix = (node, primitive, index, matrices) => {
  if (!matrices) return node.getWorldMatrix();
  const joints = primitive.getAttribute("JOINTS_0").getElement(index, []), weights = primitive.getAttribute("WEIGHTS_0").getElement(index, []);
  return Array.from({ length: 16 }, (_, i) => [0, 1, 2, 3].reduce((sum, j) => sum + weights[j] * matrices[joints[j]][i], 0));
};
for (const node of reference.getRoot().listNodes()) {
  if (!node.getMesh()) continue;
  const actual = decoded.getRoot().listNodes().find((candidate) => candidate.getName() === node.getName());
  assert.ok(actual?.getMesh());
  const sa = skinMatrices(node), sb = skinMatrices(actual);
  const world = (m, point) => [0, 1, 2].map((j) => m[j] * point[0] + m[j + 4] * point[1] + m[j + 8] * point[2] + m[j + 12]);
  node.getMesh().listPrimitives().forEach((primitive, p) => {
    const other = actual.getMesh().listPrimitives()[p];
    const pa = primitive.getAttribute("POSITION"), pb = other.getAttribute("POSITION");
    const ta = primitive.listTargets(), tb = other.listTargets();
    assert.equal(pa.getCount(), pb.getCount());
    assert.equal(ta.length, tb.length);
    for (let i = 0; i < pa.getCount(); i++) {
      const ma = vertexMatrix(node, primitive, i, sa), mb = vertexMatrix(actual, other, i, sb);
      const a = pa.getElement(i, []), b = pb.getElement(i, []), wa = world(ma, a), wb = world(mb, b);
      maximumBasePositionError = Math.max(maximumBasePositionError, Math.hypot(...wa.map((value, j) => value - wb[j])));
      for (let t = 0; t < ta.length; t++) {
        const da = ta[t].getAttribute("POSITION")?.getElement(i, []) ?? [0, 0, 0], db = tb[t].getAttribute("POSITION")?.getElement(i, []) ?? [0, 0, 0];
        const xa = world(ma, a.map((value, j) => value + da[j])), xb = world(mb, b.map((value, j) => value + db[j]));
        maximumMorphedPositionError = Math.max(maximumMorphedPositionError, Math.hypot(...xa.map((value, j) => value - xb[j])));
      }
    }
  });
}
assert.ok(maximumBasePositionError < .0001, `Quantization changed base geometry by ${maximumBasePositionError}m`);
assert.ok(maximumMorphedPositionError < .0001, `Quantization changed facial extremes by ${maximumMorphedPositionError}m`);
for (const mesh of decoded.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
  for (const target of primitive.listTargets()) for (const attribute of target.listAttributes()) {
    assert.equal(attribute.getCount(), primitive.getAttribute("POSITION").getCount());
    assert.ok([...attribute.getArray()].every(Number.isFinite));
  }
}
decoded.getRoot().listExtensionsUsed().find((extension) => extension.extensionName === "EXT_meshopt_compression")?.dispose();
const decodedPath = output.replace(/\.glb$/, "-decoded.glb");
await io.write(decodedPath, decoded);
const validation = await validator.validateBytes(new Uint8Array(await readFile(decodedPath)), { uri: decodedPath, maxIssues: 100 });
const triangles = decoded.getRoot().listMeshes().reduce((n, mesh) => n + triangleCount(mesh), 0), bytes = (await stat(output)).size;
const report = { source, output, triangles, bytes, withinTriangleBudget: triangles <= 60000, withinByteBudget: bytes < 10000000, facialChannels: expectedChannels, clips: expectedClips, clipChecks, tangentRepairs, maximumBasePositionError, maximumMorphedPositionError, meshes: reports, decodedErrors: validation.issues.numErrors, decodedWarnings: validation.issues.numWarnings, method: "Morph/skin attribute-aware simplification with boundary and dominant-joint locks, one quantization pass, lossless Meshopt encoding", status: "Technical study requiring actual browser and pose review; not approved likeness" };
await writeFile(resolve(dirname(output), "optimization-report.json"), JSON.stringify(report, null, 2));
await writeFile(resolve(dirname(output), "decoded-validation.json"), JSON.stringify(validation, null, 2));
assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues.messages));
console.log(JSON.stringify({ ...report, facialChannels: expectedChannels.length, clips: expectedClips.length }, null, 2));
