"""Preserve a multi-photo FaceBuilder fit and export its own facial deformation study.

Runs the installed add-on's normal licensed operator. No old MPFB face targets,
remeshing, paid service, licensing changes, body/canonical overwrite, or final
likeness claim. The saved .blend retains native fitted units; the separate glTF
uses an explicit uniform 0.1 unit conversion for a provisional head-only study.

Blender --background --python scripts/avatar/export-facebuilder-head-study.py
Optional: -- --source /path/to/fitted-head.blend --render-rom
"""
import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import addon_utils
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/avatar/identity-rebuild/facebuilder-study'
TOOLS = Path(os.environ.get('AVATAR_TOOL_ROOT', '/tmp/ubaid-avatar-tools'))
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=OUT / 'fitted-head.blend')
parser.add_argument('--output-directory', type=Path, default=OUT / 'facs-export')
parser.add_argument('--render-rom', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
args.output_directory.mkdir(parents=True, exist_ok=True)
source_hash = hashlib.sha256(args.source.read_bytes()).hexdigest()
sys.path.insert(0, str(TOOLS / 'keentools-blender'))
addon_utils.enable('keentools', default_set=False, persistent=False)
from keentools.addon_config import fb_settings, get_operator
from keentools.facebuilder_config import FBConfig
from keentools.blender_independent_packages.pykeentools_loader import module

status, _ = module().FaceBuilder.license_manager().perform_license_and_trial_check()
license_state = {'trial': status.trial_status.status, 'license': status.license_status.status,
                 'trialDaysLeftAtGeneration': status.days_left}
if status.trial_status.status != 'succeed' and status.license_status.status != 'succeed':
    raise RuntimeError('FaceBuilder requires an active legitimate trial or license. No bypass attempted.')
bpy.ops.wm.open_mainfile(filepath=str(args.source))
settings = fb_settings()
settings.current_headnum = 0
head = settings.get_head(0)
settings.loader().load_model(0)
head.set_neutral_expression_view()
obj = head.headobj
if obj is None or obj.type != 'MESH':
    raise ValueError('Source has no editable FaceBuilder head')
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
basis_before = np.array([v.co[:] for v in obj.data.vertices])
result = get_operator(FBConfig.fb_create_blendshapes_idname)('EXEC_DEFAULT')
if result != {'FINISHED'} or obj.data.shape_keys is None:
    raise RuntimeError('The official Create ARKit Blendshapes operator did not finish')
keys = obj.data.shape_keys.key_blocks
if len(keys) != 52:
    raise ValueError(f'Expected Basis plus51 FaceBuilder targets, got {len(keys)}')
basis = np.array([v.co[:] for v in keys[0].data])
if not np.allclose(basis_before, basis, atol=1e-6):
    raise ValueError('Shape generation changed the accepted neutral topology')
checks = []
for key in keys[1:]:
    positions = np.array([v.co[:] for v in key.data])
    delta = np.linalg.norm(positions - basis, axis=1)
    if not np.isfinite(positions).all() or delta.max() < 1e-7:
        raise ValueError(f'Invalid or empty generated shape {key.name}')
    key.value = 0
    checks.append({'name': key.name, 'maximumNativeDisplacement': float(delta.max()),
                   'movingVertices': int(np.count_nonzero(delta > 1e-6))})
obj.name = obj.data.name = 'Ubaid_FaceBuilder_Head_Study'
obj.data.calc_loop_triangles()
material = bpy.data.materials.new('Neutral clay - fitted geometry and FACS study')
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.36, .34, .32, 1)
bsdf.inputs['Roughness'].default_value = .75
obj.data.materials.clear()
obj.data.materials.append(material)
for polygon in obj.data.polygons:
    polygon.material_index = 0
    polygon.use_smooth = True
for other in bpy.context.scene.objects:
    other.hide_render = other != obj
bpy.context.preferences.filepaths.save_version = 0
blend_path = args.output_directory / 'fitted-head-facs.blend'
if blend_path.resolve() == args.source.resolve():
    raise ValueError('Refusing to overwrite fitted source')
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
native_matrix = obj.matrix_world.copy()
obj.scale *= .1
bpy.context.view_layer.update()
raw_path = args.output_directory / 'head-facs-uncompressed.glb'
bpy.ops.export_scene.gltf(filepath=str(raw_path), export_format='GLB', use_selection=True,
                          export_animations=False, export_skins=False, export_morph=True,
                          export_morph_normal=True, export_yup=True, export_apply=False,
                          export_try_sparse_sk=True)
obj.matrix_world = native_matrix
output_path = args.output_directory / 'head-facs-study.glb'
optimizer = r"""const {createRequire}=await import('node:module');
const require=createRequire(process.argv[1]+'/package.json');
const {NodeIO}=require('@gltf-transform/core');const{ALL_EXTENSIONS}=require('@gltf-transform/extensions');
const{meshopt}=require('@gltf-transform/functions');const{MeshoptEncoder,MeshoptDecoder}=require('meshoptimizer');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(process.argv[2]);await doc.transform(meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:12}));
await io.write(process.argv[3],doc);const actual=await io.read(process.argv[3]);
if(actual.getRoot().listMeshes()[0].getExtras().targetNames.length!==51)throw new Error('Export lost FACS targets');
"""
subprocess.run(['node', '--input-type=module', '-e', optimizer, str(TOOLS / 'gltf-transform'),
                str(raw_path), str(output_path)], check=True)
report = {'stage': 'Fitted head-only neutral and FACS study; likeness/material/integration review pending',
          'source': str(args.source.relative_to(ROOT)) if args.source.is_relative_to(ROOT) else str(args.source),
          'sourceSha256': source_hash, 'licenseAtGeneration': license_state,
          'generation': 'Official FaceBuilder Create ARKit Blendshapes operator, original fitted topology',
          'neutralBasisMaximumChange': float(np.max(np.abs(basis_before - basis))),
          'vertices': len(obj.data.vertices), 'triangles': len(obj.data.loop_triangles),
          'shapeCount': len(checks), 'shapeChecks': checks,
          'glbBytes': output_path.stat().st_size, 'glbSha256': hashlib.sha256(output_path.read_bytes()).hexdigest(),
          'units': 'Saved Blender remains native fitting units; head-only glTF uniformly scales0.1, +Yup/+Zforward; body alignment is not final.',
          'visemes': 'Not fabricated from old face deltas. Dedicated jaw/lip/tongue/teeth study needed before adding15 authored speech poses.',
          'limits': ['No body connection or eyes/teeth replacement in this isolated study.',
                     '51 native FACS channels do not include a working tongueOut target.',
                     'Canonical fullbody asset and existing neutral sources untouched.',
                     'No photo texture in this geometry/FACS validation asset.'],
          'paidCalls': False}
(args.output_directory / 'head-facs-report.json').write_text(json.dumps(report, indent=2) + '\n')
print('FACS_STUDY_REPORT', json.dumps({key: report[key] for key in ['vertices','triangles','shapeCount','glbBytes','neutralBasisMaximumChange']}), flush=True)

if args.render_rom:
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 700
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    world = bpy.data.worlds.new('FACS review world')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.23, .25, .28, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .4
    scene.world = world
    def track(ob, target):
        ob.rotation_euler = (Vector(target) - ob.location).to_track_quat('-Z','Y').to_euler()
    for name, position, energy, size in [('FACS key',(-3,-4,5),550,4),('FACS fill',(3,-2,1),180,3),('FACS edge',(1,3,3),350,3)]:
        data = bpy.data.lights.new(name, 'AREA');data.energy=energy;data.size=size
        light = bpy.data.objects.new(name, data);scene.collection.objects.link(light);light.location=position;track(light,(0,0,.1))
    data = bpy.data.cameras.new('FACS review camera');data.type='ORTHO';data.ortho_scale=3.5
    camera = bpy.data.objects.new('FACS review camera',data);scene.collection.objects.link(camera);scene.camera=camera
    camera.location=(0,-7,-.05);track(camera,(0,-.1,-.05))
    poses = [('neutral',{}),('blink',{'eyeBlinkLeft':1,'eyeBlinkRight':1}),
             ('jaw-open',{'jawOpen':.75}),('smile',{'mouthSmileLeft':.7,'mouthSmileRight':.7}),
             ('pucker',{'mouthPucker':.8}),('brow-up',{'browInnerUp':.7,'browOuterUpLeft':.5,'browOuterUpRight':.5})]
    for label, values in poses:
        for key in keys[1:]:key.value=values.get(key.name,0.)
        scene.render.filepath=str(args.output_directory / f'facs-{label}.png')
        bpy.ops.render.render(write_still=True)
    for key in keys[1:]:key.value=0
