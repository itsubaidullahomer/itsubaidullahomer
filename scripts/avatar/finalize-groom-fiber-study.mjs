/** Losslessly pack an isolated hair study and verify every exported position. */
import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import validator from 'gltf-validator';
const toolRoot=process.env.AVATAR_GLTF_TOOLS??'/tmp/ubaid-avatar-tools/gltf-transform/node_modules';
const fromTools=(path)=>import(pathToFileURL(resolve(toolRoot,path)).href);
const [{NodeIO},{ALL_EXTENSIONS,EXTMeshoptCompression},{MeshoptEncoder,MeshoptDecoder}]=await Promise.all([
  fromTools('@gltf-transform/core/dist/index.js'),fromTools('@gltf-transform/extensions/dist/index.js'),fromTools('meshoptimizer/index.js')
]);
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const source=resolve(process.argv[2]??'assets/avatar/identity-rebuild/facebuilder-study/groom-refinement/fiber-lod/true-fiber-lod-study.glb');
const output=resolve(process.argv[3]??source.replace('.glb','-packed.glb'));
assert.notEqual(source,output,'The uncompressed source stays unchanged');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(source);
const positions=d=>d.getRoot().listMeshes().map(m=>m.listPrimitives().map(p=>Array.from(p.getAttribute('POSITION').getArray())));
const original=positions(doc);
const validation=await validator.validateBytes(new Uint8Array(await readFile(source)),{uri:source,maxIssues:100});
assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues));
assert.equal(validation.issues.numWarnings,0,JSON.stringify(validation.issues));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
await io.write(output,doc);
const decoded=await io.read(output);
assert.deepEqual(positions(decoded),original,'Lossless packing must preserve every position exactly');
assert.equal(decoded.getRoot().listTextures().length,0,'Actual fiber geometry must not acquire an image impostor');
const report={source,output,triangles:validation.info.totalTriangleCount,images:0,rawBytes:(await stat(source)).size,packedBytes:(await stat(output)).size,vertexPositionsUnchangedExactly:true,validation:{errors:validation.issues.numErrors,warnings:validation.issues.numWarnings},status:'Unapproved desktop geometry study; final production triangle budget intentionally not met.'};
await writeFile(resolve(dirname(output),'fiber-portable-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
