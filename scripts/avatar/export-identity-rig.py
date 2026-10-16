"""Export the current full-body identity cage using free MPFB deformation data.

Blender --background --python scripts/avatar/export-identity-rig.py -- --render-rom
Always reopens the neutral cage, never overwrites it, and never projects a portrait.
The optional matching neutral review contributes facial-hair curves only. The
export is a rigging study until its generated ROM renders have been reviewed.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import addon_utils
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
TOOLS = Path(os.getenv('AVATAR_TOOL_ROOT', '/tmp/ubaid-avatar-tools'))
OUT = ROOT / 'assets/avatar/identity-rebuild'
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=OUT / 'identity-cage.blend')
parser.add_argument('--details', type=Path, default=OUT / 'identity-neutral.blend')
parser.add_argument('--output', type=Path, default=ROOT / 'public/models/avatar/ubaid-fullbody.glb')
parser.add_argument('--render-rom', action='store_true')
parser.add_argument('--uncompressed', action='store_true', help='Skip optional meshopt packaging for a raw inspection export')
parser.add_argument('--skip-ktx2', action='store_true', help='Keep portable PNG textures for inspection instead of GPU-compressed KTX2')
parser.add_argument('--toktx-bin', type=Path, default=TOOLS / 'ktx-software-4.4.2/KTX-Software-4.4.2-Darwin-arm64-tools.pkg/Payload/usr/local/bin/toktx')
parser.add_argument('--meshopt-bin', type=Path,
                    default=TOOLS / 'gltf-transform/node_modules/.bin/gltf-transform')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
if args.output.resolve() == args.source.resolve():
    raise ValueError('The neutral source must never be overwritten')
for path in [args.source, TOOLS / 'mpfb2/src/mpfb']:
    if not path.exists():
        raise FileNotFoundError(path)
if not args.uncompressed and not args.meshopt_bin.exists():
    raise FileNotFoundError('Install free @gltf-transform/cli@4.5.0 in AVATAR_TOOL_ROOT/gltf-transform, or use --uncompressed')
args.output.parent.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(TOOLS / 'mpfb2/src'))
bpy.utils.extension_path_user = lambda *a, **k: str(TOOLS / 'mpfb-user')
addon_utils.enable('mpfb', default_set=True, persistent=False)
from mpfb.services.humanservice import HumanService
from mpfb.services.faceservice import FaceService, ARKIT_FACEUNITS, META_VISEMES
from mpfb.services.exportservice import ExportService
from mpfb.services.clothesservice import ClothesService
from mpfb.services.rigservice import RigService
from mpfb.entities.clothes.mhclo import Mhclo

source_hash = hashlib.sha256(args.source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(args.source))
body = bpy.data.objects.get('Ubaid_Body')
if body is None or body.type != 'MESH' or 'joint-head' not in body.vertex_groups:
    raise ValueError('Expected the editable MPFB full-body identity cage with joint helpers')
if any(o.type == 'ARMATURE' for o in bpy.context.scene.objects):
    raise ValueError('Input must be the neutral cage, not an already rigged export')
if len(body.data.vertices) < 18000:
    raise ValueError('The cage has already lost its original helper topology')
notes = []
report = {
    'stage': 'full-body rigging study, visual ROM review required',
    'source': str(args.source.relative_to(ROOT)) if args.source.is_relative_to(ROOT) else str(args.source),
    'sourceSha256': source_hash,
    'blender': bpy.app.version_string,
    'portraitProjection': False,
    'paidServices': False,
    'coordinateSystem': 'glTF meters, +Y up, +Z forward; Blender source +Z up, -Y forward',
    'notes': notes,
}

# The review file is saved after grooming. Append only its physical fibers, not
# any replacement face, camera, environment, texture projection or old bust.
has_fibers = any(o.name.startswith(('Mustache', 'Chin fiber', 'FacialHair')) for o in bpy.context.scene.objects)
deferred_fibers = []
if not has_fibers and args.details.exists():
    if args.details.stat().st_mtime < args.source.stat().st_mtime:
        notes.append('Skipped older neutral grooming: rerun export after the matching review is saved.')
    else:
        with bpy.data.libraries.load(str(args.details), link=False) as (source, destination):
            destination.objects = [name for name in source.objects if name.startswith(('Mustache fiber', 'Chin fiber'))]
        deferred_fibers = [ob for ob in destination.objects if ob]
        report['groomSourceSha256'] = hashlib.sha256(args.details.read_bytes()).hexdigest()
        report['appendedFiberObjects'] = len(destination.objects)

# Never carry the previous portrait-projected material into the new identity.
for ob in bpy.context.scene.objects:
    for slot in ob.material_slots:
        if not slot.material or not slot.material.use_nodes:
            continue
        for node in slot.material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                location = str(node.image.filepath).lower()
                if any(fragment in location for fragment in ('ubaid-v1/master', 'face-albedo', 'reference-projection')):
                    raise ValueError(f'Projected portrait texture is not permitted: {location}')

# Keep all anatomical helper indices intact while fitting skeleton, weights and
# facial target correspondences. All operations below are on this export copy.
rig = HumanService.add_builtin_rig(body, 'default')
rig.name = rig.data.name = 'Ubaid_FullBody_Rig'
rig.show_in_front = True
bone_names = {bone.name for bone in rig.data.bones}
required_bones = {'head', 'neck01', 'eye.L', 'eye.R', 'upperarm01.L', 'upperarm01.R',
                  'lowerarm01.L', 'lowerarm01.R', 'wrist.L', 'wrist.R'}
if not required_bones.issubset(bone_names):
    raise ValueError(f'Missing required bones: {sorted(required_bones - bone_names)}')

mhclo_assets = []
for ob in list(bpy.context.scene.objects):
    if ob.type != 'MESH' or ob == body:
        continue
    path = ClothesService.find_clothes_absolute_path(ob)
    if not path:
        continue
    mhclo = Mhclo()
    mhclo.load(path)
    matrix = ob.matrix_world.copy()
    ClothesService.set_up_rigging(body, ob, rig, mhclo, import_subrig=False)
    ob.matrix_world = matrix
    mhclo_assets.append(ob)

FaceService.load_targets(body, load_microsoft_visemes=False,
                         load_meta_visemes=True, load_arkit_faceunits=True)
FaceService.interpolate_targets(body)
subdivision = body.modifiers.new('Export identity surface', 'SUBSURF')
subdivision.levels = subdivision.render_levels = 1
# Mask removal preserves every shape-key vertex correspondence. No bust crop.
ExportService.bake_modifiers_remove_helpers(body, bake_masks=True,
                                            bake_subdiv=True, remove_helpers=True)
for ob in deferred_fibers:
    bpy.context.collection.objects.link(ob)

# Convert groom curves, combine fibers into two draw calls, and transfer their
# deformation through closest-surface barycentric weights on the genuine face.
def activate(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob

for ob in list(bpy.context.scene.objects):
    if ob.type == 'CURVE':
        if ob.name.startswith(('Mustache fiber', 'Chin fiber')):
            # Sub-pixel strands need a four-sided cross-section, not six;
            # their paths, taper, pigmentation and actual depth are unchanged.
            ob.data.bevel_resolution = 0
        activate(ob)
        bpy.ops.object.convert(target='MESH')
for prefix, name in [('Mustache fiber', 'FacialHair_Mustache'), ('Chin fiber', 'FacialHair_Chin')]:
    group = [ob for ob in bpy.context.scene.objects if ob.type == 'MESH' and ob.name.startswith(prefix)]
    if group:
        activate(group[0])
        for ob in group:
            ob.select_set(True)
        bpy.ops.object.join()
        bpy.context.object.name = name

# Bake genuine mesh pigmentation into its original UVs, including the physically
# modeled facial fibers. This is selected-to-active texture baking, not a photo
# projection. Bake arbitrary shader networks before replacing them with glTF PBR.
def bake_pbr(ob, additional_sources=()):
    if not ob.data.uv_layers:
        raise ValueError(f'Cannot bake {ob.name} without its original UV atlas')
    original = list(ob.data.materials)
    original_bsdf = next((mat.node_tree.nodes.get('Principled BSDF') for mat in original
                          if mat and mat.use_nodes and mat.node_tree.nodes.get('Principled BSDF')), None)
    if original_bsdf is None:
        return
    alpha_needed = any(mat and mat.use_nodes and any(node.type == 'BSDF_PRINCIPLED' and
                      (node.inputs['Alpha'].is_linked or node.inputs['Alpha'].default_value < .999)
                      for node in mat.node_tree.nodes) for mat in original)
    normal_needed = bool(additional_sources) or any(mat and mat.use_nodes and any(
        node.type == 'BSDF_PRINCIPLED' and node.inputs['Normal'].is_linked
        for node in mat.node_tree.nodes) for mat in original)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 8
    scene.render.bake.margin = 12
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.cage_extrusion = .003
    scene.render.bake.max_ray_distance = .006
    bpy.context.view_layer.update()
    evaluated = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    source_mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=bpy.context.evaluated_depsgraph_get())
    source = bpy.data.objects.new(ob.name + '_UVBakeSource', source_mesh)
    bpy.context.collection.objects.link(source)
    source.matrix_world = ob.matrix_world.copy()
    sources = [source, *additional_sources]
    source_materials = {s: list(s.data.materials) for s in sources}
    target_material = bpy.data.materials.new(ob.name + '_PBR')
    target_material.use_nodes = True
    target_bsdf = target_material.node_tree.nodes.get('Principled BSDF')
    for name in ['Base Color', 'Roughness', 'Metallic', 'IOR', 'Specular IOR Level', 'Subsurface Weight', 'Subsurface Scale']:
        if name in original_bsdf.inputs:
            target_bsdf.inputs[name].default_value = original_bsdf.inputs[name].default_value
    # Blender-only subsurface remains in the editable source; portable glTF uses
    # the correctly baked baseColor/normal/roughness rather than frozen lighting.
    ob.data.materials.clear()
    ob.data.materials.append(target_material)
    for polygon in ob.data.polygons:
        polygon.material_index = 0
    images = {}
    channels = ['Base Color', 'Roughness'] + (['Alpha'] if alpha_needed else []) + (['Normal'] if normal_needed else [])
    for channel in channels:
        temporary_materials = []
        for s in sources:
            s.data.materials.clear()
            for original_material in source_materials[s]:
                mat = original_material.copy()
                temporary_materials.append(mat)
                s.data.materials.append(mat)
                if channel == 'Normal':
                    continue
                nodes, links = mat.node_tree.nodes, mat.node_tree.links
                bsdf = nodes.get('Principled BSDF')
                output = next(node for node in nodes if node.type == 'OUTPUT_MATERIAL')
                emitter = nodes.new('ShaderNodeEmission')
                socket = bsdf.inputs[channel]
                if socket.is_linked:
                    links.new(socket.links[0].from_socket, emitter.inputs['Color'])
                else:
                    value = socket.default_value
                    emitter.inputs['Color'].default_value = value if channel == 'Base Color' else (value, value, value, 1.)
                links.new(emitter.outputs['Emission'], output.inputs['Surface'])
        resolution = 2048 if channel in ('Base Color', 'Normal', 'Alpha') else 1024
        image = bpy.data.images.new(ob.name + '_' + channel.replace(' ', ''), width=resolution,
                                    height=resolution, alpha=channel == 'Base Color')
        image.colorspace_settings.name = 'sRGB' if channel == 'Base Color' else 'Non-Color'
        image.generated_color = (0., 0., 0., 0.) if channel == 'Base Color' else (0., 0., 0., 1.)
        texture = target_material.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        target_material.node_tree.nodes.active = texture
        activate(ob)
        for s in sources:
            s.select_set(True)
        bpy.ops.object.bake(type='NORMAL' if channel == 'Normal' else 'EMIT', normal_space='TANGENT')
        images[channel] = (image, texture)
        for s in sources:
            s.data.materials.clear()
            for mat in source_materials[s]:
                s.data.materials.append(mat)
        for mat in temporary_materials:
            bpy.data.materials.remove(mat)
    color, color_node = images['Base Color']
    if alpha_needed:
        alpha_image, alpha_node = images['Alpha']
        color_pixels = np.empty(len(color.pixels), dtype=np.float32)
        alpha_pixels = np.empty(len(alpha_image.pixels), dtype=np.float32)
        color.pixels.foreach_get(color_pixels)
        alpha_image.pixels.foreach_get(alpha_pixels)
        color_pixels[3::4] = alpha_pixels[0::4]
        color.pixels.foreach_set(color_pixels)
        color.update()
        target_material.node_tree.nodes.remove(alpha_node)
        target_material.surface_render_method = 'DITHERED'
        target_material.node_tree.links.new(color_node.outputs['Alpha'], target_bsdf.inputs['Alpha'])
    target_material.node_tree.links.new(color_node.outputs['Color'], target_bsdf.inputs['Base Color'])
    target_material.node_tree.links.new(images['Roughness'][1].outputs['Color'], target_bsdf.inputs['Roughness'])
    if normal_needed:
        normal_map = target_material.node_tree.nodes.new('ShaderNodeNormalMap')
        normal_map.inputs['Strength'].default_value = .65 if additional_sources else 1.
        target_material.node_tree.links.new(images['Normal'][1].outputs['Color'], normal_map.inputs['Color'])
        target_material.node_tree.links.new(normal_map.outputs['Normal'], target_bsdf.inputs['Normal'])
    baked = []
    for channel, (image, _) in images.items():
        if channel == 'Alpha':
            bpy.data.images.remove(image)
            continue
        image.filepath_raw = str(OUT / f'{ob.name}-{channel.replace(" ", "-").lower()}.png')
        image.file_format = 'PNG'
        image.save()
        image.pack()
        baked.append(str(Path(image.filepath_raw).relative_to(ROOT)))
    report.setdefault('bakedAtlases', {})[ob.name] = baked
    bpy.data.objects.remove(source, do_unlink=True)
    bpy.data.meshes.remove(source_mesh)
    scene.render.bake.use_selected_to_active = False

facial_fibers = [ob for ob in bpy.context.scene.objects if ob.type == 'MESH' and
                ob.name.startswith(('FacialHair', 'Mustache', 'Chin fiber'))]
bake_pbr(body, facial_fibers)
for ob in facial_fibers:
    data = ob.data
    bpy.data.objects.remove(ob, do_unlink=True)
    if data.users == 0:
        bpy.data.meshes.remove(data)
report['facialHair'] = 'Physical source fibers baked to existing body UV albedo/normal/roughness; no portrait projection; no separate export fiber geometry.'
for ob in list(bpy.context.scene.objects):
    if ob.type != 'MESH' or ob == body:
        continue
    procedural = any(mat and mat.use_nodes and any(node.type == 'BSDF_PRINCIPLED' and any(
        node.inputs[channel].is_linked for channel in ['Base Color', 'Alpha', 'Roughness', 'Normal'])
        for node in mat.node_tree.nodes) for mat in ob.data.materials)
    if procedural:
        bake_pbr(ob)

body.data.calc_loop_triangles()
triangles = [tuple(t.vertices) for t in body.data.loop_triangles]
coords = [v.co.copy() for v in body.data.vertices]
surface = BVHTree.FromPolygons(coords, triangles, all_triangles=True)
body_to_world = body.matrix_world.copy()
body_weights = []
for vertex in body.data.vertices:
    body_weights.append({body.vertex_groups[g.group].name: g.weight for g in vertex.groups
                         if body.vertex_groups[g.group].name in bone_names and g.weight > 1e-8})

def mapping(ob):
    transform = body_to_world.inverted() @ ob.matrix_world
    result = []
    for vertex in ob.data.vertices:
        point = transform @ vertex.co
        hit, _, index, _ = surface.find_nearest(point)
        if index is None:
            raise ValueError(f'Could not map {ob.name} vertex {vertex.index}')
        ids = triangles[index]
        a, b, c = [coords[i] for i in ids]
        ab, ac, aq = b - a, c - a, hit - a
        aa, cc, bb = ab.dot(ab), ac.dot(ac), ab.dot(ac)
        denominator = aa * cc - bb * bb
        if abs(denominator) < 1e-16:
            weights = [1., 0., 0.]
        else:
            v = (cc * aq.dot(ab) - bb * aq.dot(ac)) / denominator
            w = (aa * aq.dot(ac) - bb * aq.dot(ab)) / denominator
            weights = [max(0., min(1., q)) for q in [1 - v - w, v, w]]
            total = sum(weights)
            weights = [q / total for q in weights]
        result.append((ids, weights))
    return result

def bind(ob, weights):
    matrix = ob.matrix_world.copy()
    ob.parent = rig
    ob.matrix_world = matrix
    for name in sorted({name for groups in weights for name in groups}):
        group = ob.vertex_groups.get(name) or ob.vertex_groups.new(name=name)
        for index, groups in enumerate(weights):
            if name in groups:
                group.add([index], groups[name], 'REPLACE')
    RigService.ensure_armature_modifier(ob, rig)

def surface_bind(ob, morphs=False):
    correspondence = mapping(ob)
    weights = []
    for ids, factors in correspondence:
        groups = {}
        for source_index, factor in zip(ids, factors):
            for name, amount in body_weights[source_index].items():
                groups[name] = groups.get(name, 0.) + amount * factor
        weights.append(groups)
    bind(ob, weights)
    if not morphs:
        return
    if ob.data.shape_keys:
        raise ValueError(f'Unexpected existing shapes on custom fiber {ob.name}')
    basis = ob.shape_key_add(name='Basis', from_mix=False)
    transform = ob.matrix_world.inverted().to_3x3() @ body_to_world.to_3x3()
    for source in list(body.data.shape_keys.key_blocks)[1:]:
        offsets = []
        for ids, factors in correspondence:
            delta = sum(((source.data[i].co - coords[i]) * w for i, w in zip(ids, factors)), Vector())
            offsets.append(transform @ delta)
        if not any(delta.length > 1e-7 for delta in offsets):
            continue
        target = ob.shape_key_add(name=source.name, from_mix=False)
        for index, delta in enumerate(offsets):
            target.data[index].co = basis.data[index].co + delta

# Scalp hair follows the cranium. Facial-expression deltas interpolated from
# MHCLO forehead helpers should not squash the hairstyle or inflate the GLB.
for ob in mhclo_assets:
    if 'hair' in ob.name.lower():
        if ob.data.shape_keys:
            ob.shape_key_clear()
        ob.vertex_groups.clear()
        bind(ob, [{'head': 1.}] * len(ob.data.vertices))

for ob in list(bpy.context.scene.objects):
    if ob.type != 'MESH' or ob == body or ob in mhclo_assets:
        continue
    if ob.name.startswith(('Eye.', 'Iris.', 'Pupil.')):
        bone = 'eye.' + ob.name.split('.')[1]
        if bone not in bone_names:
            raise ValueError(f'Unknown eye detail: {ob.name}')
        bind(ob, [{bone: 1.}] * len(ob.data.vertices))
        # Eye rotation remains independently controllable through bones at
        # runtime, and all ARKit eye-look targets also move the actual globe.
        if not ob.data.shape_keys:
            basis = ob.shape_key_add(name='Basis', from_mix=False)
            center = ob.matrix_world.inverted() @ rig.matrix_world @ rig.data.bones[bone].head_local
            suffix = 'Left' if bone.endswith('.L') else 'Right'
            outward = 1 if suffix == 'Left' else -1
            for direction, axis, degrees in [('Up', 'X', -25), ('Down', 'X', 20),
                                             ('Out', 'Z', 25 * outward), ('In', 'Z', -25 * outward)]:
                target = ob.shape_key_add(name=f'eyeLook{direction}{suffix}', from_mix=False)
                rotation = Matrix.Rotation(math.radians(degrees), 3, axis)
                for index, vertex in enumerate(basis.data):
                    target.data[index].co = center + rotation @ (vertex.co - center)
    elif ob.name.startswith(('FacialHair', 'Mustache', 'Chin fiber')):
        surface_bind(ob, morphs=True)
    elif any(word in ob.name.lower() for word in ('hair', 'wave', 'lock', 'crest', 'temple')):
        bind(ob, [{'head': 1.}] * len(ob.data.vertices))
    else:
        surface_bind(ob)
        notes.append(f'Custom mesh {ob.name} uses nearest-surface weight transfer; inspect its ROM.')

# Standardize only public target names. Keep all 52+15 on the body (silence is
# correctly a zero delta); remove genuinely unused shapes from accessories.
required_shapes = set(ARKIT_FACEUNITS + META_VISEMES)
for ob in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    ob.data.name = ob.name
    for polygon in ob.data.polygons:
        polygon.use_smooth = True
    for modifier in list(ob.modifiers):
        if modifier.type == 'SUBSURF':
            ob.modifiers.remove(modifier)
    keys = ob.data.shape_keys
    if keys:
        keys.animation_data_clear()
        basis = keys.key_blocks[0]
        for key in list(keys.key_blocks)[1:]:
            key.name = key.name.removeprefix('!ex-')
            key.value = 0.
            key.slider_min, key.slider_max = 0., 1.
            if ob != body and not any((a.co - b.co).length > 1e-7 for a, b in zip(key.data, basis.data)):
                ob.shape_key_remove(key)
    # Limit and normalize every exported vertex to four real deform bones.
    group_names = {group.index: group.name for group in ob.vertex_groups}
    final = []
    for vertex in ob.data.vertices:
        weights = [(group_names[g.group], g.weight) for g in vertex.groups
                   if group_names[g.group] in bone_names and g.weight > 1e-7]
        weights = sorted(weights, key=lambda item: item[1], reverse=True)[:4]
        if not weights:
            raise ValueError(f'Unweighted vertex: {ob.name}[{vertex.index}]')
        total = sum(w for _, w in weights)
        final.append({name: w / total for name, w in weights})
    ob.vertex_groups.clear()
    bind(ob, final)
    ob.animation_data_clear()

shape_names = {key.name for key in body.data.shape_keys.key_blocks[1:]}
if not required_shapes.issubset(shape_names):
    raise ValueError(f'Missing face targets: {sorted(required_shapes - shape_names)}')
rig.animation_data_clear()
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
bpy.context.view_layer.update()
channel_checks = {}
for name in sorted(required_shapes):
    changed, largest = 0, 0.
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH' or not ob.data.shape_keys:
            continue
        keys = ob.data.shape_keys.key_blocks
        key = keys.get(name)
        if key is None:
            continue
        for vertex, basis in zip(key.data, keys[0].data):
            distance = (vertex.co - basis.co).length
            if not math.isfinite(distance):
                raise ValueError(f'Non-finite morph {name} on {ob.name}')
            changed += distance > 1e-7
            largest = max(largest, distance)
    channel_checks[name] = {'changedVertices': int(changed), 'maxDeltaMeters': largest}
    if not changed and name != 'viseme_sil':
        notes.append(f'Channel {name} is present but has no visible delta; needs artist review.')

# Numeric ROM checks catch vanished, non-finite or static channels before export.
# They are not a substitute for reviewing the corresponding rendered frames.
def evaluated_positions(ob):
    evaluated = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    values = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get('co', values)
    evaluated.to_mesh_clear()
    return values.reshape(-1, 3)

def face_pose(values):
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH' and ob.data.shape_keys:
            for key in ob.data.shape_keys.key_blocks[1:]:
                key.value = values.get(key.name, 0.)
    bpy.context.view_layer.update()

rest = evaluated_positions(body)
outfit = bpy.data.objects.get('Ubaid_Outfit')
outfit_rest = evaluated_positions(outfit) if outfit else None
checks = []
for label, values in [
    ('blink', {'eyeBlinkLeft': 1., 'eyeBlinkRight': 1.}),
    ('smile', {'mouthSmileLeft': .7, 'mouthSmileRight': .7, 'cheekSquintLeft': .3, 'cheekSquintRight': .3}),
    ('open', {'viseme_aa': .8}),
    ('pucker', {'viseme_U': .8}),
]:
    face_pose(values)
    posed = evaluated_positions(body)
    distances = np.linalg.norm(posed - rest, axis=1)
    if not np.isfinite(posed).all() or distances.max() < 1e-5 or distances.max() > .2:
        raise ValueError(f'Invalid facial deformation: {label}')
    checks.append({'pose': label, 'changedVertices': int((distances > 1e-6).sum()),
                   'maxDisplacementMeters': float(distances.max())})
face_pose({})
for label, bone_name, axis, angle in [
    ('head_turn', 'head', 1, 25), ('elbow_bend', 'lowerarm01.L', 0, -60),
    ('knee_bend', 'lowerleg01.L', 0, 45),
]:
    bone = rig.pose.bones.get(bone_name)
    if not bone:
        raise ValueError(f'Missing ROM bone {bone_name}')
    bone.rotation_mode = 'XYZ'
    bone.rotation_euler[axis] = math.radians(angle)
    bpy.context.view_layer.update()
    posed = evaluated_positions(body)
    distances = np.linalg.norm(posed - rest, axis=1)
    if not np.isfinite(posed).all():
        raise ValueError(f'Non-finite skeletal deformation: {label}')
    # Clothing masks remove most legs from the body, so test the visible outfit too.
    outfit_change = 0.
    if outfit is not None:
        outfit_posed = evaluated_positions(outfit)
        if not np.isfinite(outfit_posed).all():
            raise ValueError(f'Non-finite clothing deformation: {label}')
        outfit_change = float(np.linalg.norm(outfit_posed - outfit_rest, axis=1).max())
    largest = max(float(distances.max()), outfit_change)
    if largest < .005 or largest > 2.:
        raise ValueError(f'Missing or explosive skeletal deformation: {label}')
    checks.append({'pose': label, 'bodyMaxDisplacementMeters': float(distances.max()),
                   'outfitMaxDisplacementMeters': outfit_change})
    bone.matrix_basis.identity()
    bpy.context.view_layer.update()

for image in bpy.data.images:
    if image.source == 'FILE' and image.filepath:
        image.pack()
actions_path = ROOT / 'scripts/avatar/author-identity-actions.py'
actions_spec = importlib.util.spec_from_file_location('identity_actions', actions_path)
actions_module = importlib.util.module_from_spec(actions_spec)
actions_spec.loader.exec_module(actions_module)
action_report = actions_module.apply_actions(rig)
report['authoredMotion'] = action_report
bpy.context.preferences.filepaths.save_version = 0
blend_path = OUT / 'identity-rig.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
# Export skinned meshes as scene roots. Skinning references the same rig bones;
# this avoids ambiguous non-root skinned-node transforms in other glTF engines.
for ob in bpy.context.scene.objects:
    if ob.type == 'MESH':
        matrix = ob.matrix_world.copy()
        ob.parent = None
        ob.matrix_world = matrix
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:
    if ob.type in ('MESH', 'ARMATURE'):
        ob.select_set(True)
bpy.context.view_layer.objects.active = rig
raw_path = OUT / 'identity-rig-uncompressed.glb'
for track in rig.animation_data.nla_tracks:
    track.mute = False
bpy.ops.export_scene.gltf(
    filepath=str(raw_path), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='NLA_TRACKS',
    export_anim_slide_to_zero=True,
    export_morph=True, export_morph_normal=True,
    export_skins=True, export_yup=True, export_image_format='AUTO',
    export_apply=False, export_all_influences=False, export_try_sparse_sk=True,
    export_tangents=True,
)
for track in rig.animation_data.nla_tracks:
    track.mute = True
rig.animation_data.action = None
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
bpy.context.scene.frame_set(1)
optimized_source = raw_path
if not args.uncompressed and not args.skip_ktx2:
    if not args.toktx_bin.exists():
        raise FileNotFoundError('Free KTX Software toktx is required; pass --toktx-bin or --skip-ktx2 for an inspection export')
    optimized_source = OUT / 'identity-rig-ktx2-uncompressed.glb'
    environment = dict(os.environ, PATH=str(args.toktx_bin.parent) + os.pathsep + os.environ.get('PATH', ''))
    subprocess.run([str(args.meshopt_bin), 'uastc', str(raw_path), str(optimized_source),
                    '--level', '2', '--rdo', '--rdo-lambda', '0.5', '--zstd', '18', '--jobs', '4'],
                   env=environment, check=True)
    report['textures'] = 'KTX2 UASTC level2, RDO 0.5, Zstandard18, full mip chain; GPU loader required.'
if args.uncompressed:
    args.output.write_bytes(raw_path.read_bytes())
else:
    # Meshopt preserves the morph/skin structure; retain fine positional and
    # weight precision for facial fibers and fingers. The raw asset stays editable.
    temporary = args.output.with_name(args.output.stem + '.pending.glb')
    optimizer = r"""const {createRequire} = await import('node:module');
const {writeFile} = await import('node:fs/promises');
const require = createRequire(process.argv[1] + '/package.json');
const {NodeIO} = require('@gltf-transform/core');
const {ALL_EXTENSIONS} = require('@gltf-transform/extensions');
const {compactPrimitive, meshopt, prune} = require('@gltf-transform/functions');
const {MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier} = require('meshoptimizer');
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
 'meshopt.decoder':MeshoptDecoder, 'meshopt.encoder':MeshoptEncoder
});
const doc = await io.read(process.argv[2]);
const report = [];
const clipChecks = [];
for(const animation of doc.getRoot().listAnimations()) {
 let movingChannels=0, maximumEndpointDifference=0, duration=0;
 for(const channel of animation.listChannels()) {
  const sampler=channel.getSampler(),input=sampler.getInput(),output=sampler.getOutput();
  const times=input.getArray(),values=output.getArray(),width=output.getElementSize();
  if(!Array.from(times).every(Number.isFinite)||!Array.from(values).every(Number.isFinite))
   throw new Error('Non-finite animation: '+animation.getName());
  duration=Math.max(duration,times[times.length-1]-times[0]);
  let movement=0;
  for(let i=width;i<values.length;i++)movement=Math.max(movement,Math.abs(values[i]-values[i%width]));
  if(movement>1e-5)movingChannels++;
  for(let i=0;i<width;i++)maximumEndpointDifference=Math.max(maximumEndpointDifference,Math.abs(values[i]-values[values.length-width+i]));
 }
 if(duration<1||movingChannels===0||maximumEndpointDifference>1e-4)
  throw new Error('Clip failed duration/motion/neutral endpoint audit: '+animation.getName());
 clipChecks.push({name:animation.getName(),duration,movingChannels,maximumEndpointDifference});
}
const important = ['jawOpen','eyeBlinkLeft','eyeBlinkRight','mouthSmileLeft','mouthSmileRight',
 'mouthPucker','mouthFunnel','browInnerUp','viseme_PP'];
for(const mesh of doc.getRoot().listMeshes()) {
 const meshIndices = mesh.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||0),0);
 if(mesh.getName() !== 'Ubaid_Body') continue;
 const names = mesh.getExtras().targetNames || [];
 for(const prim of mesh.listPrimitives()) {
  const position=prim.getAttribute('POSITION'), normal=prim.getAttribute('NORMAL');
  const indices=prim.getIndices(), count=position.getCount();
  const positions=position.getArray(), normals=normal.getArray();
  const targets=prim.listTargets();
  const chosen=important.map(name=>targets[names.indexOf(name)]?.getAttribute('POSITION')?.getArray());
  const attributes=new Float32Array(count*32), locks=new Uint8Array(count);
  const joints=prim.getAttribute('JOINTS_0')?.getArray();
  const weights=prim.getAttribute('WEIGHTS_0')?.getArray();
  for(let v=0;v<count;v++) {
   attributes.set(normals.subarray(v*3,v*3+3),v*32);
   for(let t=0;t<9;t++) if(chosen[t])
    for(let a=0;a<3;a++) attributes[v*32+3+t*3+a]=chosen[t][v*3+a]*50;
   if(weights) {attributes[v*32+30]=weights[v*4];attributes[v*32+31]=weights[v*4+1];}
  }
  const sourceIndices=Uint32Array.from(indices.getArray());
  // Lock skeleton boundaries: simplification must never cross a dominant-joint
  // transition, even where the neutral surface happens to be geometrically flat.
  if(joints&&weights) {
   const dominant=new Uint16Array(count);
   for(let v=0;v<count;v++) {
    let top=0;for(let a=1;a<4;a++)if(weights[v*4+a]>weights[v*4+top])top=a;
    dominant[v]=joints[v*4+top];
   }
   for(let i=0;i<sourceIndices.length;i+=3) {
    const a=sourceIndices[i],b=sourceIndices[i+1],c=sourceIndices[i+2];
    if(dominant[a]!==dominant[b]||dominant[a]!==dominant[c])locks[a]=locks[b]=locks[c]=1;
   }
  }
  // Protect motion unique to the other 58 channels rather than assuming the
  // selected facial extremes cover every deformation in the identity rig.
  for(let v=0;v<count;v++) {
   let selected=0, maximum=0;
   for(const target of chosen)if(target)selected=Math.max(selected,Math.hypot(...target.subarray(v*3,v*3+3)));
   for(const target of targets) {
    const array=target.getAttribute('POSITION')?.getArray();
    if(array) maximum=Math.max(maximum,Math.hypot(...array.subarray(v*3,v*3+3)));
   }
   if(maximum>.0005&&selected<.0001)locks[v]=1;
  }
  const ratio=Math.min(1,22000*3/meshIndices);
  const [result,error]=MeshoptSimplifier.simplifyWithAttributes(sourceIndices,positions,3,
   attributes,32,[.5,.5,.5,...Array(27).fill(1),2,2],locks,
   Math.floor(sourceIndices.length*ratio/3)*3,.001,['LockBorder']);
  const replacement=doc.createAccessor().setType('SCALAR').setArray(result).setBuffer(indices.getBuffer());
  prim.setIndices(replacement);
  compactPrimitive(prim);
  report.push({mesh:mesh.getName(),beforeTriangles:sourceIndices.length/3,afterTriangles:result.length/3,
   protectedVertices:locks.reduce((a,b)=>a+b,0),positionAttributeError:error});
 }
}
await doc.transform(prune({keepAttributes:true,keepIndices:true,keepLeaves:true}),
 meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:12,quantizeWeight:12}));
await io.write(process.argv[3],doc);
const triangles=doc.getRoot().listMeshes().reduce((sum,mesh)=>sum+mesh.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||0)/3,0),0);
await writeFile(process.argv[4],JSON.stringify({triangles,meshes:report,clips:clipChecks,method:'Attribute-aware simplification of body; 9 facial extremes, all-channel unique-motion locks, dominant-joint boundary locks. Morph and skin data remapped together. Requires visual ROM verification.'},null,2));
"""
    optimization_report = OUT / 'optimization-report.json'
    tool_root = args.meshopt_bin.parents[2]
    subprocess.run(['node', '--input-type=module', '-e', optimizer, str(tool_root),
                    str(optimized_source), str(temporary), str(optimization_report)], check=True)
    report['optimization'] = json.loads(optimization_report.read_text())
    # Validate the actual packaged container, not just the source scene. The
    # older glTF validator cannot inspect KTX2; Khronos' KTX validator can.
    container = temporary.read_bytes()
    json_length = int.from_bytes(container[12:16], 'little')
    manifest = json.loads(container[20:20 + json_length])
    expected_clips = {clip['name'] for clip in action_report['clips']}
    if {clip['name'] for clip in manifest.get('animations', [])} != expected_clips:
        raise ValueError('Packaged GLB lost or renamed authored clips')
    exported_body = next(mesh for mesh in manifest['meshes'] if mesh['name'] == 'Ubaid_Body')
    if set(exported_body.get('extras', {}).get('targetNames', [])) != set(shape_names):
        raise ValueError('Packaged GLB lost or renamed facial targets')
    if not args.skip_ktx2:
        texture_checks = []
        binary_offset = 20 + json_length + 8
        with tempfile.TemporaryDirectory(prefix='avatar-ktx-validation-') as directory:
            for index, image in enumerate(manifest.get('images', [])):
                if image['mimeType'] != 'image/ktx2':
                    raise ValueError('Unexpected uncompressed image in GPU texture export')
                view = manifest['bufferViews'][image['bufferView']]
                offset = binary_offset + view.get('byteOffset', 0)
                texture_path = Path(directory) / f'{index}.ktx2'
                texture_path.write_bytes(container[offset:offset + view['byteLength']])
                result = subprocess.run([str(args.toktx_bin.with_name('ktx')), 'validate',
                                         '-g', '-e', '-f', 'mini-json', str(texture_path)],
                                        check=True, capture_output=True, text=True)
                texture_checks.append({'image': index, **json.loads(result.stdout)})
        report['gpuTextureValidation'] = texture_checks
    os.replace(temporary, args.output)
    report['compression'] = 'glTF Transform 4.5.0 meshopt; position16/normal12/weight12; attribute-aware body simplification'
meshes = []
for ob in bpy.context.scene.objects:
    if ob.type == 'MESH':
        ob.data.calc_loop_triangles()
        meshes.append({'name': ob.name, 'vertices': len(ob.data.vertices),
                       'triangles': len(ob.data.loop_triangles),
                       'morphs': [key.name for key in ob.data.shape_keys.key_blocks[1:]] if ob.data.shape_keys else [],
                       'boneGroups': [g.name for g in ob.vertex_groups],
                       'maximumInfluences': max(len(v.groups) for v in ob.data.vertices)})
report.update(bones=sorted(bone_names), boneCount=len(bone_names), meshes=meshes,
              triangleCount=sum(mesh['triangles'] for mesh in meshes),
              arkitCount=len(ARKIT_FACEUNITS), visemeCount=len(META_VISEMES),
              morphCount=len(shape_names), morphChannelChecks=channel_checks, romChecks=checks,
              rawGlbBytes=raw_path.stat().st_size,
              glbBytes=args.output.stat().st_size,
              glbSha256=hashlib.sha256(args.output.read_bytes()).hexdigest(),
              exportTriangleCount=report.get('optimization', {}).get('triangles', sum(mesh['triangles'] for mesh in meshes)),
              clips=[clip['name'] for clip in action_report['clips']],
              generatedMotion='34 authored skeletal motion studies in NLA clips. Facial and speech layers remain runtime-driven; visual acceptance pending.')
(OUT / 'rig-report.json').write_text(json.dumps(report, indent=2) + '\n')

if args.render_rom:
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = int(os.getenv('AVATAR_SAMPLES', '12'))
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 700
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    world = bpy.data.worlds.new('Rig ROM studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.6, .63, .67, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .3
    scene.world = world
    def track(ob, point):
        ob.rotation_euler = (Vector(point) - ob.location).to_track_quat('-Z', 'Y').to_euler()
    for name, location, power, color in [
        ('ROM key', (-1.8, -2.8, 3.3), 220, (1., .94, .88)),
        ('ROM fill', (2., -1.8, 2.), 120, (.86, .92, 1.)),
        ('ROM rim', (1.2, 1.6, 2.9), 230, (.9, .94, 1.)),
    ]:
        data = bpy.data.lights.new(name, 'AREA')
        data.energy, data.size = power, 2.5
        data.color = color
        ob = bpy.data.objects.new(name, data)
        scene.collection.objects.link(ob)
        ob.location = location
        track(ob, (0, 0, 1.4))
    data = bpy.data.cameras.new('Rig ROM camera')
    camera = bpy.data.objects.new('Rig ROM camera', data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    data.type = 'ORTHO'
    head = rig.data.bones['head']
    z = (head.head_local.z + head.tail_local.z) / 2
    data.ortho_scale = .39
    camera.location = (0, -2, z)
    track(camera, (0, -.04, z))
    for label, values in [
        ('neutral', {}),
        ('blink', {'eyeBlinkLeft': 1., 'eyeBlinkRight': 1.}),
        ('smile', {'mouthSmileLeft': .7, 'mouthSmileRight': .7, 'cheekSquintLeft': .3, 'cheekSquintRight': .3}),
        ('speak', {'viseme_aa': .8}),
        ('pucker', {'viseme_U': .8}),
    ]:
        face_pose(values)
        scene.render.filepath = str(OUT / f'rig-rom-{label}.png')
        bpy.ops.render.render(write_still=True)
    face_pose({})
    data.ortho_scale = 2.15
    camera.location = (0, -3, .95)
    track(camera, (0, 0, .95))
    for label, rotations in [
        ('fullbody', {}),
        ('range', {'lowerarm01.L': (0, -65), 'lowerarm01.R': (0, -45),
                   'lowerleg01.L': (0, 35), 'head': (1, 20)}),
    ]:
        for bone_name, (axis, degrees) in rotations.items():
            bone = rig.pose.bones[bone_name]
            bone.rotation_mode = 'XYZ'
            bone.rotation_euler[axis] = math.radians(degrees)
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f'rig-rom-{label}.png')
        bpy.ops.render.render(write_still=True)
        for bone in rig.pose.bones:
            bone.matrix_basis.identity()
    face_pose({})
print('IDENTITY_RIG_REPORT', json.dumps({k: report[k] for k in ['boneCount', 'triangleCount', 'morphCount', 'glbBytes', 'notes']}))
