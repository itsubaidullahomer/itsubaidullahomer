"""Portable hair-card study derived from the preserved dense Blender groom.

Run in Blender background mode. Uses Blender core only: the alpha atlas is an
actual local render of fine curves, and card paths are resampled dense strands.
No photograph, paid service, trial add-on, or external hair asset is required.
This is an isolated technical study, not an approved likeness or final hair LOD.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/avatar/identity-rebuild/facebuilder-study/groom-refinement'
OUT = BASE / 'cards'; OUT.mkdir(exist_ok=True)
SOURCE = BASE / 'fiber-groom-refined-v19.blend'
ATLAS = OUT / 'hair-alpha-atlas-v4.png'
NORMAL = OUT / 'hair-normal-atlas-v4.png'
rng = random.Random(23062005)


def atlas():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 16
    sc.render.resolution_x = sc.render.resolution_y = 2048
    sc.render.resolution_percentage = 100; sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    material = bpy.data.materials.new('Atlas white emission'); material.use_nodes = True
    nodes = material.node_tree.nodes; nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial'); emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = (1, 1, 1, 1)
    material.node_tree.links.new(emission.outputs[0], out.inputs['Surface'])
    curve = bpy.data.curves.new('Rendered fine strand atlas', 'CURVE')
    curve.dimensions = '3D'; curve.bevel_depth = .0034; curve.bevel_resolution = 2
    obj = bpy.data.objects.new(curve.name, curve); sc.collection.objects.link(obj)
    curve.materials.append(material)
    # Four variations occupy equal quarters. Gaps at every tile boundary prevent
    # cross-tile sampling; roots/tips taper physically before the camera render.
    for tile in range(4):
        for n in range(24):
            x = -.75 + tile * .5 + rng.uniform(-.217, .217)
            end = rng.uniform(.72, .985)
            start = rng.uniform(-.985, -.945)
            phase = rng.random() * 6.283
            amplitude = rng.uniform(.001, .010)
            spline = curve.splines.new('POLY'); spline.points.add(39)
            for j, p in enumerate(spline.points):
                t = j / 39
                xx = x + amplitude * math.sin(8*t+phase) * math.sin(math.pi*t)
                yy = start + (end-start)*t
                p.co = (xx, yy, 0, 1)
                p.radius = rng.uniform(.8, 1.2) * min(1, t*15+.05) * max(.035, 1-t**5)
    camera_data = bpy.data.cameras.new('Atlas camera')
    camera = bpy.data.objects.new('Atlas camera', camera_data); sc.collection.objects.link(camera)
    camera.location = (0, 0, 3); camera.rotation_euler = (0, 0, 0)
    camera_data.type = 'ORTHO'; camera_data.ortho_scale = 2; sc.camera = camera
    sc.render.filepath = str(ATLAS); bpy.ops.render.render(write_still=True)
    geometry = nodes.new('ShaderNodeNewGeometry'); remap = nodes.new('ShaderNodeVectorMath'); remap.operation = 'MULTIPLY_ADD'
    remap.inputs[1].default_value = (.5,.5,.5); remap.inputs[2].default_value = (.5,.5,.5)
    material.node_tree.links.new(geometry.outputs['Normal'], remap.inputs[0]); material.node_tree.links.new(remap.outputs['Vector'], emission.inputs['Color'])
    sc.view_settings.view_transform = 'Raw'
    sc.render.filepath = str(NORMAL); bpy.ops.render.render(write_still=True)


if not ATLAS.exists() or not NORMAL.exists(): atlas()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
head = bpy.data.objects.get('FBHead')
if not head: raise RuntimeError('Fitted FBHead missing from preserved study')
cap = bpy.data.objects['Continuous scalp substrate']
dense = bpy.data.objects['Refined asymmetric wave fibers']
head_bvh = BVHTree.FromPolygons([v.co for v in head.data.vertices], [list(p.vertices) for p in head.data.polygons])
image = bpy.data.images.load(str(ATLAS), check_existing=True)
material = bpy.data.materials.new('Portable strand cards - alpha mask'); material.use_nodes = True
material.use_backface_culling = False
nodes = material.node_tree.nodes; links = material.node_tree.links
bsdf = nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value = (.006, .0048, .0038, 1)
bsdf.inputs['Roughness'].default_value = .8; bsdf.inputs['Specular IOR Level'].default_value = .09
tex = nodes.new('ShaderNodeTexImage'); tex.image = image; tex.extension = 'CLIP'
threshold = nodes.new('ShaderNodeMath'); threshold.operation = 'GREATER_THAN'; threshold.inputs[1].default_value = .14
links.new(tex.outputs['Alpha'], threshold.inputs[0]); links.new(threshold.outputs[0], bsdf.inputs['Alpha'])
normal_image = bpy.data.images.load(str(NORMAL), check_existing=True); normal_image.colorspace_settings.name = 'Non-Color'; normal_image.pack()
normal_tex = nodes.new('ShaderNodeTexImage'); normal_tex.image = normal_image
normal_map = nodes.new('ShaderNodeNormalMap'); normal_map.inputs['Strength'].default_value = .65
links.new(normal_tex.outputs['Color'], normal_map.inputs['Color']); links.new(normal_map.outputs['Normal'], bsdf.inputs['Normal'])
material.surface_render_method = 'DITHERED'
vertices = []; faces = []; uv_faces = []


def sample(points, t):
    f = min(t, 1) * (len(points)-1); a = min(int(f), len(points)-2)
    return points[a].lerp(points[a+1], f-a)


def ribbon(points, half_width, segments, tile, rotation=0):
    offset = len(vertices); prev_side = None
    for j in range(segments+1):
        t = j / segments; center = sample(points, t)
        tangent = (sample(points, min(1, t+.002)) - sample(points, max(0, t-.002))).normalized()
        closest, scalp_normal, _, _ = head_bvh.find_nearest(center)
        if prev_side is None:
            side = tangent.cross(scalp_normal).normalized()
        else:
            side = prev_side - tangent * prev_side.dot(tangent)
            if side.length < .01: side = tangent.cross(scalp_normal)
            side.normalize()
        prev_side = side.copy()
        normal = tangent.cross(side).normalized()
        side = side*math.cos(rotation) + normal*math.sin(rotation)
        width = half_width * (.8 + .2*math.sin(math.pi*t)) * max(.08, 1-t**6)
        for sign in [-1, 1]:
            p = center + side*width*sign
            hit, n, _, _ = head_bvh.find_nearest(p)
            if hit is not None and (p-hit).dot(n) < .010: p = hit+n*.010
            vertices.append(tuple(p))
    for j in range(segments):
        faces.append((offset+j*2, offset+j*2+1, offset+j*2+3, offset+j*2+2))
        # Root is bottom of the physically rendered strand atlas.
        u0 = tile*.25+.004; u1 = (tile+1)*.25-.004
        uv_faces.append(((u0,j/segments), (u1,j/segments), (u1,(j+1)/segments), (u0,(j+1)/segments)))


groups = {'guides': [], 'undercoat': [], 'short': []}
for spline in dense.data.splines:
    points = [Vector(p.co[:3]) for p in spline.points]
    category = 'guides' if len(points)==49 else ('short' if len(points)==3 else 'undercoat')
    groups[category].append(points)
counts = {'guides': 200, 'undercoat': 120, 'short': 360}
for category, amount in counts.items():
    pool = groups[category]
    # Uniform stratified indices retain every long-wave cluster in source order.
    for i in range(min(amount, len(pool))):
        index = min(len(pool)-1, int((i+rng.random())*len(pool)/amount))
        points = pool[index]
        if category == 'guides': width = rng.uniform(.026,.043); segments = 16
        elif category == 'undercoat': width = rng.uniform(.015,.032); segments = 6
        else: width = rng.uniform(.014,.030); segments = 2
        ribbon(points, width, segments, rng.randrange(4), rng.uniform(-.35,.35))
mesh = bpy.data.meshes.new('Portable groom card geometry'); mesh.from_pydata(vertices, [], faces); mesh.update()
uv = mesh.uv_layers.new(name='StrandAtlas')
for poly, coords in zip(mesh.polygons, uv_faces):
    poly.use_smooth = True
    for loop, co in zip(poly.loop_indices, coords): uv.data[loop].uv = co
cards = bpy.data.objects.new('Portable groom cards study', mesh); bpy.context.collection.objects.link(cards)
mesh.materials.append(material)
# Dense master remains inside this .blend for direct comparison but is hidden.
dense.hide_render = True; dense.hide_set(True)
image.pack()
bpy.context.view_layer.objects.active = cap
modifier = cap.modifiers.new('Portable cap topology reduction', 'DECIMATE'); modifier.ratio = .32
bpy.ops.object.modifier_apply(modifier=modifier.name)
scene = bpy.context.scene; scene.render.engine = 'CYCLES'; scene.cycles.samples = 48
scene.render.resolution_x = 800; scene.render.resolution_y = 900; scene.render.resolution_percentage = 100
cam = scene.camera; cam.data.ortho_scale = 3.7
for angle in [0,30,90]:
    a = math.radians(angle); cam.location=(7*math.sin(a),-7*math.cos(a),.08)
    cam.rotation_euler = (Vector((0,-.1,.08))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = str(OUT/f'cards-v5-{angle:03}.png'); bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'hair-cards-study.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in [cards, cap]: obj.hide_set(False); obj.select_set(True)
bpy.context.view_layer.objects.active = cards
bpy.ops.export_scene.gltf(filepath=str(OUT/'hair-cards-study.glb'), export_format='GLB', use_selection=True,
    export_animations=False, export_materials='EXPORT', export_extras=True, export_yup=True, export_tangents=True)
report = {'source': str(SOURCE.relative_to(ROOT)), 'cards': counts,
    'cardTriangles':len(faces)*2, 'capTriangles':sum(len(p.vertices)-2 for p in cap.data.polygons),
    'atlas':str(ATLAS.relative_to(ROOT)), 'alphaMode':'MASK',
    'coordinateSystem':'native FaceBuilder coordinates, exported +Y up/+Z forward; integration must apply head transform',
    'status':'Unapproved technical study; visual silhouette and alpha behavior require browser QA.'}
(OUT/'hair-cards-report.json').write_text(json.dumps(report,indent=2))
print('HAIR_CARDS_REPORT', json.dumps(report))
