"""Non-destructive material/light study on the genuine fitted, rigged mesh.

The skin colors are authored albedo, not photographs or projected lighting.
This deliberately leaves the fitted facial geometry and all expressions alone.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/avatar/identity-rebuild/facebuilder-study'
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=BASE / 'body-portrait-v15/clothed-avatar-study.blend')
parser.add_argument('--out', default='material-light-study')
parser.add_argument('--variant', choices=['warm', 'deep', 'soft'], default='warm')
parser.add_argument('--expressions', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
out = BASE / args.out
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.source))
scene = bpy.context.scene
head = next(o for o in scene.objects if o.name.startswith('Ubaid_FaceBuilder_Head_Study') and o.type == 'MESH')
factors = {'warm': (.70, .63, .58), 'deep': (.52, .46, .42), 'soft': (.80, .77, .71)}[args.variant]
colors = head.data.color_attributes['AuthoredSkinPigment']
values = np.zeros(len(colors.data) * 4)
colors.data.foreach_get('color', values)
values = values.reshape(-1, 4)
values[:, :3] *= factors
colors.data.foreach_set('color', values.ravel())
for mat in head.data.materials:
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = .60
    bsdf.inputs['Specular IOR Level'].default_value = .22
    bsdf.inputs['Subsurface Weight'].default_value = .065
body = bpy.data.objects.get('Ubaid_Body')
if body:
    for mat in body.data.materials:
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        color = bsdf.inputs['Base Color'].default_value
        bsdf.inputs['Base Color'].default_value = (*(np.array(color[:3]) * factors), 1)

# More directional soft light makes actual eyelids/cheek/nose volumes legible.
lights = {
    'Integration key': ((-1.8, -2.6, 3.2), 340, 1.8),
    'Integration fill': ((2, -2, 2), 65, 2.2),
    'Integration edge': ((1, 2, 3), 180, 2),
    'Integration eye catchlight': ((-.2, -2, 2), 4, .20),
}
for name, (position, energy, size) in lights.items():
    ob = bpy.data.objects.get(name)
    if not ob:
        continue
    ob.location = position
    ob.rotation_euler = (Vector((0, -.05, 1.68)) - ob.location).to_track_quat('-Z', 'Y').to_euler()
    ob.data.energy = energy
    ob.data.size = size
world = scene.world.node_tree.nodes['Background']
world.inputs[0].default_value = (.24, .25, .27, 1)
world.inputs[1].default_value = .18
scene.view_settings.exposure = -.2
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.cycles.samples = 80
camera = scene.camera
camera.data.type = 'PERSP'
camera.data.lens = 85
scene.render.resolution_x = 1000
scene.render.resolution_y = 1100
for name, position in [('front', (0, -1.55, 1.68)), ('three-quarter', (.70, -1.37, 1.68))]:
    camera.location = position
    camera.rotation_euler = (Vector((0, -.04, 1.64)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(out / (args.variant + '-' + name + '.png'))
    bpy.ops.render.render(write_still=True)
if args.expressions:
    camera.location = (.10, -1.5, 1.70)
    camera.rotation_euler = (Vector((0, -.04, 1.65)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    resting = {'eyeBlinkLeft': .08, 'eyeBlinkRight': .08, 'eyeLookDownLeft': .025, 'eyeLookDownRight': .025}
    poses = [('resting', resting), ('friendly', {**resting, 'mouthSmileLeft': .18, 'mouthSmileRight': .24, 'cheekSquintLeft': .08, 'cheekSquintRight': .08}), ('speaking', {**resting, 'viseme_aa': .52})]
    for label, pose in poses:
        for ob in scene.objects:
            if ob.type in ('MESH', 'CURVE') and ob.data.shape_keys:
                for key in ob.data.shape_keys.key_blocks[1:]:
                    key.value = pose.get(key.name, 0)
        scene.render.filepath = str(out / (args.variant + '-' + label + '.png'))
        bpy.ops.render.render(write_still=True)
    for ob in scene.objects:
        if ob.type in ('MESH', 'CURVE') and ob.data.shape_keys:
            for key in ob.data.shape_keys.key_blocks[1:]:
                key.value = 0
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(out / (args.variant + '-portrait.blend')))
(out / (args.variant + '-report.json')).write_text(json.dumps({
    'source': str(args.source), 'variant': args.variant, 'albedoFactors': factors,
    'geometryChanged': False, 'photoTexture': False, 'likenessApproved': False,
}, indent=2))
