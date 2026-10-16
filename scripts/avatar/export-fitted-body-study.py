"""Bake/export an isolated fitted-head full-body study; never touch the source.

The source contains the fitted head, reviewed oral study, rig, clothed body, and
editable dense fibers. This export copy bakes only facial fibers to the head UVs.
An optional hair-card Blender study replaces the dense scalp fibers separately.
"""
import argparse
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/avatar/identity-rebuild/facebuilder-study'


def activate(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def bake_head(head, fibers, out, scale):
    if not head.data.uv_layers:
        raise ValueError('Fitted head must retain its native UV map')
    if any(node.type == 'TEX_IMAGE' for mat in head.data.materials if mat.use_nodes for node in mat.node_tree.nodes):
        raise ValueError('This UV redistribution is for authored vertex/procedural skin, not an existing image atlas')
    # The fitted UV atlas devotes only ~20% width / 26% height to the face.
    # Expand that central rectangle monotonically, retaining a unique mapping
    # for the mostly uniform scalp/neck. The original editable source is intact.
    # This gives directional facial fibers useful texel density at 2k rather
    # than allocating an 8k atlas mostly to empty or uniform-color space.
    for loop in head.data.uv_layers.active.data:
        u, v = loop.uv
        loop.uv = (np.interp(u, [0, .40, .60, 1], [0, .08, .92, 1]), np.interp(v, [0, .35, .615, 1], [0, .10, .90, 1]))
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.cage_extrusion = .012 * scale
    scene.render.bake.max_ray_distance = .024 * scale
    scene.render.bake.margin = 12
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    sources = []
    for obj in [head, *fibers]:
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(deps), depsgraph=deps)
        source = bpy.data.objects.new(obj.name + '__bake_source', mesh)
        bpy.context.collection.objects.link(source)
        source.matrix_world = obj.matrix_world.copy()
        sources.append(source)
    source_mats = {obj: list(obj.data.materials) for obj in sources}
    mat = bpy.data.materials.new('Fitted skin and physical facial fibers — portable PBR')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = .57
    bsdf.inputs['Specular IOR Level'].default_value = .30
    head.data.materials.clear()
    head.data.materials.append(mat)
    for polygon in head.data.polygons:
        polygon.material_index = 0
    maps = {}
    for channel in ('Base Color', 'Roughness', 'Normal'):
        temporary = []
        for obj in sources:
            obj.data.materials.clear()
            for original in source_mats[obj]:
                source_mat = original.copy()
                temporary.append(source_mat)
                obj.data.materials.append(source_mat)
                if channel == 'Normal':
                    continue
                nodes, links = source_mat.node_tree.nodes, source_mat.node_tree.links
                shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
                output = next(node for node in nodes if node.type == 'OUTPUT_MATERIAL')
                emission = nodes.new('ShaderNodeEmission')
                socket = shader.inputs[channel]
                if socket.is_linked:
                    links.new(socket.links[0].from_socket, emission.inputs['Color'])
                else:
                    value = socket.default_value
                    emission.inputs['Color'].default_value = value if channel == 'Base Color' else (value, value, value, 1)
                links.new(emission.outputs[0], output.inputs['Surface'])
        resolution = 1024 if channel == 'Roughness' else 2048
        image = bpy.data.images.new('Fitted head ' + channel, width=resolution, height=resolution, alpha=False)
        image.colorspace_settings.name = 'sRGB' if channel == 'Base Color' else 'Non-Color'
        image.generated_color = (.43, .235, .145, 1) if channel == 'Base Color' else ((.5, .5, 1, 1) if channel == 'Normal' else (.57, .57, .57, 1))
        texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        mat.node_tree.nodes.active = texture
        activate(head)
        for source in sources:
            source.select_set(True)
        bpy.ops.object.bake(type='NORMAL' if channel == 'Normal' else 'EMIT', normal_space='TANGENT')
        image.filepath_raw = str(out / (channel.lower().replace(' ', '-') + '.png'))
        image.file_format = 'PNG'
        image.save()
        image.pack()
        maps[channel] = image.filepath_raw
        if channel == 'Normal':
            normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = .38
            mat.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
            mat.node_tree.links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
        else:
            mat.node_tree.links.new(texture.outputs['Color'], bsdf.inputs[channel])
        for source in sources:
            source.data.materials.clear()
            for original in source_mats[source]:
                source.data.materials.append(original)
        for source_mat in temporary:
            bpy.data.materials.remove(source_mat)
    for obj in [*sources, *fibers]:
        bpy.data.objects.remove(obj, do_unlink=True)
    scene.render.bake.use_selected_to_active = False
    return {'method': 'PBR baking of authored skin and actual facial fibers, no photo projection', 'uvRemap': 'Monotonic face-focused atlas: original U .40–.60 to .08–.92; V .35–.615 to .10–.90. Geometry and vertex order unchanged.', 'maps': maps, 'cageMeters': scene.render.bake.cage_extrusion, 'rayDistanceMeters': scene.render.bake.max_ray_distance, 'removedFacialFiberObjects': len(fibers)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--hair', type=Path)
    parser.add_argument('--geometry-only', action='store_true', help='Untextured isolated budget probe; never a deliverable material export')
    parser.add_argument('--reuse-bake', action='store_true', help='Use only on this script\'s baked browser-source-study.blend when integrating a later hair LOD')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.out.mkdir(parents=True, exist_ok=True)
    if args.source.resolve() == (args.out / 'browser-source-study.blend').resolve():
        raise ValueError('Preserve the native source')
    original_hash = hashlib.sha256(args.source.read_bytes()).hexdigest()
    fitting = json.loads((BASE / 'body-integration/integration-report.json').read_text())
    scale, translation = fitting['uniformScale'], np.array(fitting['translationMeters'])
    bpy.ops.wm.open_mainfile(filepath=str(args.source))
    rigs = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
    heads = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.name.startswith('Ubaid_FaceBuilder_Head_Study')]
    if len(rigs) != 1 or len(heads) != 1:
        raise ValueError('Require exactly one fitted head and full-body rig')
    rig, head = rigs[0], heads[0]
    if bpy.data.objects['Ubaid_Body'].data.shape_keys:
        raise ValueError('Old avatar facial targets must not survive on body')
    if rig.animation_data:
        rig.animation_data.action = None
        for track in rig.animation_data.nla_tracks:
            track.mute = True
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    for obj in bpy.context.scene.objects:
        if obj.type in ('MESH', 'CURVE') and obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                key.value = 0
            if obj.type == 'MESH':
                obj.data.vertices.foreach_set('co', np.array([v.co[:] for v in obj.data.shape_keys.key_blocks[0].data]).ravel())
    bpy.context.scene.frame_set(1)
    head_hash = hashlib.sha256(b''.join(np.array([v.co[:] for v in key.data], dtype=np.float32).tobytes() for key in head.data.shape_keys.key_blocks)).hexdigest()
    facial = [obj for obj in bpy.context.scene.objects if obj.type == 'CURVE' and obj.name.startswith(('Brow ', 'Moustache ', 'Chin beard '))]
    if args.reuse_bake:
        if facial or not head.data.materials or 'portable PBR' not in head.data.materials[0].name:
            raise ValueError('Reuse requires this pipeline\'s baked head with no remaining facial fibers')
        baking = {'reusedFrom': str(args.source), 'method': 'Preserved existing head UV PBR bake without resampling'}
    else:
        baking = {'pending': True, 'method': 'Untextured budget probe only'} if args.geometry_only else bake_head(head, facial, args.out, scale)
    omitted = []
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'CURVE' or (args.hair and obj.name == 'Continuous scalp substrate'):
            omitted.append(obj.name)
            bpy.data.objects.remove(obj, do_unlink=True)
    imported_hair = []
    if args.hair:
        with bpy.data.libraries.load(str(args.hair), link=False) as (source, destination):
            destination.objects = [name for name in source.objects if name in ('Continuous scalp substrate', 'Root-stratified true-fiber LOD') or name.startswith('Portable groom cards')]
        for obj in destination.objects:
            if obj is None or obj.type != 'MESH':
                raise ValueError('Hair source must contain actual card/cap meshes')
            bpy.context.collection.objects.link(obj)
            coords = np.array([vertex.co[:] for vertex in obj.data.vertices]) * scale + translation
            obj.data.vertices.foreach_set('co', coords.ravel())
            obj.matrix_world = Matrix.Identity(4)
            obj.hide_render = False
            obj.hide_set(False)
            obj.vertex_groups.clear()
            group = obj.vertex_groups.new(name='head')
            group.add(list(range(len(coords))), 1., 'REPLACE')
            armature = obj.modifiers.new('Rigid cranium binding', 'ARMATURE')
            armature.object = rig
            obj.parent = rig
            obj.matrix_parent_inverse = rig.matrix_world.inverted()
            imported_hair.append(obj.name)
        if len(imported_hair) < 2:
            raise ValueError('Hair study needs both scalp substrate and cards')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.data.name = obj.name
            for modifier in list(obj.modifiers):
                if modifier.type != 'ARMATURE':
                    raise ValueError(f'Unbaked modifier {modifier.type} on {obj.name}')
            if obj.data.shape_keys:
                obj.data.shape_keys.animation_data_clear()
    after_hash = hashlib.sha256(b''.join(np.array([v.co[:] for v in key.data], dtype=np.float32).tobytes() for key in head.data.shape_keys.key_blocks)).hexdigest()
    if head_hash != after_hash:
        raise ValueError('Skin bake changed fitted geometry')
    action_spec = importlib.util.spec_from_file_location('identity_actions', ROOT / 'scripts/avatar/author-identity-actions.py')
    action_module = importlib.util.module_from_spec(action_spec)
    action_spec.loader.exec_module(action_module)
    motion = action_module.apply_actions(rig)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out / 'browser-source-study.blend'))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type in ('MESH', 'ARMATURE'):
            obj.hide_set(False)
            obj.select_set(True)
    for track in rig.animation_data.nla_tracks:
        track.mute = False
    bpy.ops.export_scene.gltf(filepath=str(args.out / 'fitted-body-raw.glb'), export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS', export_anim_slide_to_zero=True, export_morph=True, export_morph_normal=True, export_skins=True, export_yup=True, export_apply=False, export_all_influences=False, export_try_sparse_sk=True, export_tangents=not args.geometry_only, export_materials='NONE' if args.geometry_only else 'EXPORT')
    if hashlib.sha256(args.source.read_bytes()).hexdigest() != original_hash:
        raise ValueError('Native source was unexpectedly changed')
    report = {'source': str(args.source), 'sourceSha256': original_hash, 'fittedHeadGeometrySha256': head_hash, 'headTargets': len(head.data.shape_keys.key_blocks) - 1, 'baking': baking, 'omittedDenseScalp': omitted, 'hairStudy': str(args.hair) if args.hair else None, 'hairPending': not bool(args.hair), 'importedHairMeshes': imported_hair, 'motion': motion, 'status': 'Unapproved isolated export study; optimized mesh and browser ROM still require validation'}
    (args.out / 'source-report.json').write_text(json.dumps(report, indent=2))
    print('FITTED_BODY_SOURCE', json.dumps({'headTargets': report['headTargets'], 'clips': len(motion['clips']), 'hairPending': report['hairPending']}))


if __name__ == '__main__':
    main()
