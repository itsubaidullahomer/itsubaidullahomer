"""Isolated, unaccepted hair topology study; never overwrites the source neutral.

Source: Elvaerwyn, elvs_maxwell_hair / maxwell_hair_mh, MakeHuman Hair02 CC-BY.
https://static.makehumancommunity.org/assets/assetpacks/hair02.html
The source listing specifies CC-BY without a version. Preserve attribution.
"""
import sys
import math
import json
from pathlib import Path
import bpy
import addon_utils
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/avatar/identity-rebuild'
TOOLS = Path('/tmp/ubaid-avatar-tools')
SOURCE = TOOLS / 'hair-candidates/selected/hair/elvs_maxwell_hair'
PREFIX = 'hair-maxwell-study'
sys.path.insert(0, str(TOOLS / 'mpfb2/src'))
bpy.utils.extension_path_user = lambda *a, **k: str(TOOLS / 'mpfb-user')
addon_utils.enable('mpfb', default_set=True, persistent=False)
from mpfb.services.humanservice import HumanService

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
variant = args[0] if args else 'base'
if variant not in ['base', 'wavy', 'curved']:
    raise ValueError('Only isolated base, wavy and curved studies are supported')

bpy.ops.wm.open_mainfile(filepath=str(OUT / 'identity-cage.blend'))
body = bpy.data.objects['Ubaid_Body']
hair = HumanService.add_mhclo_asset(
    str(SOURCE / 'elvs_maxwell_hair.mhclo'), body,
    asset_type='Hair', subdiv_levels=0, material_type='MAKESKIN',
    set_up_rigging=False, import_subrig=False, import_weights=False,
)
hair.name = 'Hair_Maxwell_Study'
hair.parent = None
for modifier in list(hair.modifiers):
    if modifier.type not in ['SUBSURF']:
        hair.modifiers.remove(modifier)

material = bpy.data.materials.new('Maxwell study — near black, original alpha')
material.use_nodes = True
material.diffuse_color = (.008, .006, .005, 1.)
material.use_backface_culling = False
nodes = material.node_tree.nodes
links = material.node_tree.links
bsdf = nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.008, .006, .005, 1.)
bsdf.inputs['Roughness'].default_value = .66
bsdf.inputs['Metallic'].default_value = 0.
bsdf.inputs['Specular IOR Level'].default_value = .13
texture = nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(SOURCE / 'maxhairtex6.png'))
texture.image.pack()
links.new(texture.outputs['Alpha'], bsdf.inputs['Alpha'])
# The original pigment is red and emissive. Its luminance preserves strand
# contrast without carrying that pigment into the neutral black hair.
gray = nodes.new('ShaderNodeRGBToBW')
links.new(texture.outputs['Color'], gray.inputs[0])
contrast = nodes.new('ShaderNodeMath')
contrast.operation = 'MULTIPLY'
contrast.inputs[1].default_value = 5.5
links.new(gray.outputs[0], contrast.inputs[0])
ramp = nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color = (.0018, .0014, .0012, 1.)
ramp.color_ramp.elements[1].color = (.026, .021, .019, 1.)
links.new(contrast.outputs[0], ramp.inputs[0])
links.new(ramp.outputs[0], bsdf.inputs['Base Color'])
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .32
bump.inputs['Distance'].default_value = .0005
links.new(gray.outputs[0], bump.inputs['Height'])
links.new(bump.outputs[0], bsdf.inputs['Normal'])
hair.data.materials.clear()
hair.data.materials.append(material)
for face in hair.data.polygons:
    face.use_smooth = True

coords = [hair.matrix_world @ v.co for v in hair.data.vertices]
bounds = {axis: [min(p[i] for p in coords), max(p[i] for p in coords)]
          for i, axis in enumerate('xyz')}
print('MAXWELL_BOUNDS', bounds)

if variant in ['wavy', 'curved']:
    # A broad deformation on the supplied card mesh, rather than an unrelated
    # stock swap. Kept separate and labeled draft until inspected in all views.
    for vertex in hair.data.vertices:
        x, y, z = vertex.co
        if variant == 'curved':
            # Root-stable arc: rotate each point according to its distance
            # above the front lock roots. The tip grows forward, then down;
            # a translation alone cannot turn a vertical spike into a curl.
            root_z = 1.800
            height = max(0., z - root_z)
            front_blend = max(0., min(1., (-y - .070) / .075))
            front_blend = front_blend * front_blend * (3 - 2 * front_blend)
            radius = .020 + .004 * max(0., min(1., (x + .015) / .075))
            angle = min(math.pi, height / radius)
            curved_z = root_z + radius * math.sin(angle)
            vertex.co.z += front_blend * (curved_z - z) if height else 0.
            vertex.co.y -= front_blend * radius * (1 - math.cos(angle))
            vertex.co.x -= .020 * front_blend * math.sin(angle * .5)
            continue
        upper = max(0., min(1., (z - 1.778) / .076))
        upper = upper * upper * (3 - 2 * upper)
        front = math.exp(-((y + .130) / .060) ** 2)
        vertex.co.x -= .024 * upper * front
        vertex.co.z -= .005 * upper * front
        vertex.co.y -= .006 * upper * front
        # Lower the image-left frontal lock into a loose curved fringe. The
        # image-right area keeps lift, so the silhouette is not another dome.
        fringe = math.exp(-((x + .025) / .045) ** 2) * front * upper
        vertex.co.z -= .012 * fringe
        vertex.co.y -= .010 * fringe
        vertex.co.z += .0025 * upper * math.sin(66. * x + 26. * y)
        # Taper short sides and nape rather than inflating the entire head.
        lower = max(0., min(1., (1.79 - z) / .060))
        vertex.co.x *= 1 - .015 * lower
        if y > -.008:
            vertex.co.y -= .005 * lower
    subdivision = hair.modifiers.new('Soften coarse source hair cards', 'SUBSURF')
    subdivision.levels = 1
    subdivision.render_levels = 1
    bpy.context.view_layer.objects.active = hair
    bpy.ops.object.modifier_apply(modifier=subdivision.name)
    # Surface clearance is mandatory after smoothing or bending cards. This
    # fixes the scalp/sideburn intersections exposed by the first draft render.
    from mathutils.bvhtree import BVHTree
    bpy.context.view_layer.update()
    scalp = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
    for vertex in hair.data.vertices:
        nearest = scalp.find_nearest(vertex.co)
        if nearest[0] is not None:
            point, normal, _, distance = nearest
            clearance = (vertex.co - point).dot(normal)
            if clearance < .0028 and distance < .04:
                vertex.co += normal * (.0028 - clearance)

hair['source_author'] = 'Elvaerwyn'
hair['source_license'] = 'CC-BY (version unspecified by source listing)'
hair['source_url'] = 'https://static.makehumancommunity.org/assets/assetpacks/hair02.html'
hair['review_status'] = 'Unaccepted isolated draft hair study'
library = OUT / f'{PREFIX}-{variant}-fitted.blend'
bpy.data.libraries.write(str(library), {hair}, path_remap='ABSOLUTE', fake_user=True)

# Keep the current face, eyes, lighting and camera. Only hide the original hair
# inside this process; opening the source is read-only and its file is not saved.
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'identity-neutral.blend'))
old_hair = bpy.data.objects.get('Ubaid_Hair')
if old_hair:
    old_hair.hide_render = True
    old_hair.hide_viewport = True
with bpy.data.libraries.load(str(library), link=False) as (available, appended):
    appended.objects = ['Hair_Maxwell_Study']
hair = appended.objects[0]
bpy.context.collection.objects.link(hair)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 20
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
scene.render.resolution_x = 780
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.camera.data.type = 'ORTHO'
scene.camera.data.ortho_scale = .365
target = Vector((0., -.038, 1.711))

for angle in [0, 45, 90, 180]:
    radians = math.radians(angle)
    scene.camera.location = target + Vector((2 * math.sin(radians), -2 * math.cos(radians), 0))
    scene.camera.rotation_euler = (target - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(OUT / f'{PREFIX}-{variant}-{angle:03d}.png')
    bpy.ops.render.render(write_still=True)

scene.camera.location = target + Vector((0., -2., 0.))
scene.camera.rotation_euler = (target - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.render.filepath = str(OUT / f'{PREFIX}-{variant}-000.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f'{PREFIX}-{variant}.blend'))
(OUT / f'{PREFIX}-{variant}-metadata.json').write_text(json.dumps({
    'source': str(SOURCE), 'author': 'Elvaerwyn', 'license': 'CC-BY, version unspecified',
    'vertices': len(hair.data.vertices), 'triangles': sum(len(p.vertices)-2 for p in hair.data.polygons),
    'source_fitted_bounds': bounds, 'variant': variant, 'accepted': False,
}, indent=2))
