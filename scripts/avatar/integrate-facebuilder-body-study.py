"""Isolated fitted-head/body integration study; never publishes canonical assets.

Fits with one uniform scale from the existing rig's interocular distance, then
translates the eye midpoint. This is a documented provisional body alignment,
not a biometric claim. New skull/oral geometry uses only the fitted head's own
FACS. The old body head and every old face target are removed from this copy.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Quaternion, Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/avatar/identity-rebuild'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--head', type=Path, default=BASE / 'facebuilder-study/anatomy-detailed/head-anatomy-study.blend')
    parser.add_argument('--body', type=Path, default=BASE / 'identity-rig.blend')
    parser.add_argument('--output', type=Path, default=BASE / 'facebuilder-study/body-integration')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    args.output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.body))
    rig = bpy.data.objects['Ubaid_FullBody_Rig']
    body = bpy.data.objects['Ubaid_Body']
    tracks = [track.name for track in rig.animation_data.nla_tracks]
    rig.animation_data.action = None
    for track in rig.animation_data.nla_tracks:
        track.mute = True
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    target_eyes = {side: np.array(rig.data.bones['eye.' + side].head_local) for side in ('L', 'R')}
    removed = []
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH' and obj not in [body, bpy.data.objects.get('Ubaid_Outfit'), bpy.data.objects.get('Ubaid_Shoes')]:
            removed.append(obj.name)
            bpy.data.objects.remove(obj, do_unlink=True)
    original_body_vertices = len(body.data.vertices)
    body.shape_key_clear()
    body_world = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices])
    body_faces = [list(p.vertices) for p in body.data.polygons]
    body_group_names = {g.index: g.name for g in body.vertex_groups}
    body_weights = [{body_group_names[g.group]: g.weight for g in v.groups if body_group_names[g.group] in rig.data.bones} for v in body.data.vertices]
    body_surface = BVHTree.FromPolygons([Vector(v) for v in body_world], body_faces)
    # The fitted neck now extends through the shirt opening. Remove the old
    # chest patch below that opening too, avoiding intersecting skin surfaces.
    seam_z = 1.44
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if (body.matrix_world @ v.co).z > seam_z], context='VERTS')
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()

    with bpy.data.libraries.load(str(args.head), link=False) as (source, destination):
        destination.objects = [name for name in source.objects if name == 'Ubaid_FaceBuilder_Head_Study' or name.startswith(('Eye.', 'Upper tooth ', 'Lower tooth ', 'Upper gum', 'Lower gum', 'Tongue', 'Mouth cavity', 'Upper eyelashes.', 'Upper wetline.'))]
    added = []
    for obj in destination.objects:
        if obj and obj.type == 'MESH':
            bpy.context.collection.objects.link(obj)
            added.append(obj)
    head = next(obj for obj in added if obj.name.startswith('Ubaid_FaceBuilder_Head_Study'))
    source_eyes = {}
    for side in ('L', 'R'):
        obj = next(o for o in added if o.name == 'Eye.' + side)
        points = np.array([v.co[:] for v in obj.data.shape_keys.key_blocks[0].data])
        source_eyes[side] = (points.min(0) + points.max(0)) / 2
    source_distance = float(np.linalg.norm(source_eyes['L'] - source_eyes['R']))
    target_distance = float(np.linalg.norm(target_eyes['L'] - target_eyes['R']))
    scale = target_distance / source_distance
    translation = (target_eyes['L'] + target_eyes['R']) / 2 - scale * (source_eyes['L'] + source_eyes['R']) / 2
    material_units = []
    seen_materials = set()
    for obj in added:
        for slot in obj.material_slots:
            mat = slot.material
            if not mat or mat.name in seen_materials or not mat.use_nodes:
                continue
            seen_materials.add(mat.name)
            for shader in mat.node_tree.nodes:
                if shader.type == 'BSDF_PRINCIPLED' and shader.inputs['Subsurface Weight'].default_value > 0:
                    before = shader.inputs['Subsurface Scale'].default_value
                    shader.inputs['Subsurface Scale'].default_value *= scale
                    material_units.append({'material': mat.name, 'sourceSubsurfaceScale': before, 'meterSubsurfaceScale': shader.inputs['Subsurface Scale'].default_value})
    native_head = np.array([v.co[:] for v in head.data.shape_keys.key_blocks[0].data])
    neck_offsets = np.zeros_like(native_head)
    lower_neck_body_weights = {}
    for index, point in enumerate(native_head):
        t = max(0.0, min(1.0, (-1.0 - point[2]) / .32))
        t = t * t * (3 - 2 * t)
        if not t:
            continue
        world = point * scale + translation
        extended = world.copy()
        extended[2] -= .065 * t
        nearest, normal, face_index, _ = body_surface.find_nearest(Vector(extended))
        if nearest is not None:
            extended_z = extended[2]
            extended = extended * (1 - t) + (np.array(nearest) + np.array(normal) * .00035) * t
            # The clothing-masked source body has no polygons below the open
            # collar. Do not let nearest-surface fitting pull the lower edge
            # back upward into the visible V opening.
            extended[2] = extended_z
            ids = body_faces[face_index]
            distances = np.linalg.norm(body_world[ids] - np.array(nearest), axis=1)
            contributions = 1 / np.maximum(distances, .0001) ** 2
            contributions /= contributions.sum()
            weights = {}
            for source_index, amount in zip(ids, contributions):
                for name, weight in body_weights[source_index].items():
                    weights[name] = weights.get(name, 0) + weight * amount
            lower_neck_body_weights[index] = weights
        neck_offsets[index] = extended - world
    weight_reports = []
    for obj in added:
        native = np.array([v.co[:] for v in (obj.data.shape_keys.key_blocks[0].data if obj.data.shape_keys else obj.data.vertices)])
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                points = np.array([v.co[:] for v in key.data]) * scale + translation
                if obj == head:
                    points += neck_offsets
                key.data.foreach_set('co', points.ravel())
                key.value = 0
        else:
            obj.data.vertices.foreach_set('co', (native * scale + translation).ravel())
        obj.matrix_world.identity()
        obj.data.update()
        obj.vertex_groups.clear()
        groups = {}
        def assign(index, weights):
            for name, amount in weights.items():
                if amount <= 1e-8:
                    continue
                if name not in groups:
                    groups[name] = obj.vertex_groups.new(name=name)
                groups[name].add([index], amount, 'REPLACE')
        if obj == head:
            # Only the neck changes influence; every facial vertex remains a
            # rigid skull attachment before its own facial target is evaluated.
            knots = [(-1.40, 'neck01'), (-1.17, 'neck02'), (-.98, 'neck03'), (-.84, 'head')]
            for index, z in enumerate(native[:, 2]):
                if z <= knots[0][0]:
                    weights = {knots[0][1]: 1.0}
                elif z >= knots[-1][0]:
                    weights = {'head': 1.0}
                else:
                    for (a, name_a), (b, name_b) in zip(knots, knots[1:]):
                        if a <= z <= b:
                            t = (z - a) / (b - a)
                            t = t * t * (3 - 2 * t)
                            weights = {name_a: 1 - t, name_b: t}
                            break
                if index in lower_neck_body_weights:
                    blend = max(0.0, min(1.0, (-1.14 - z) / .24))
                    blend = blend * blend * (3 - 2 * blend)
                    weights = {name: weight * (1 - blend) for name, weight in weights.items()}
                    for name, weight in lower_neck_body_weights[index].items():
                        weights[name] = weights.get(name, 0) + weight * blend
                    weights = dict(sorted(weights.items(), key=lambda pair: pair[1], reverse=True)[:4])
                    total = sum(weights.values())
                    weights = {name: weight / total for name, weight in weights.items()}
                assign(index, weights)
        else:
            bone_name = 'eye.' + obj.name[-1] if obj.name in ('Eye.L', 'Eye.R') else 'head'
            # Lower jaw already deforms with fitted FACS; applying a jaw bone
            # as well would double its motion, so its skin attaches to skull.
            for index in range(len(native)):
                assign(index, {bone_name: 1.0})
        for modifier in list(obj.modifiers):
            if modifier.type == 'ARMATURE':
                obj.modifiers.remove(modifier)
        modifier = obj.modifiers.new('Fitted head skeletal binding', 'ARMATURE')
        modifier.object = rig
        obj.parent = rig
        obj.matrix_parent_inverse = rig.matrix_world.inverted()
        for vertex in obj.data.vertices:
            weights = [g.weight for g in vertex.groups]
            if abs(sum(weights) - 1) > 1e-6 or not 1 <= len(weights) <= 4:
                raise ValueError('Invalid fitted-head skin weights')
        weight_reports.append({'mesh': obj.name, 'vertices': len(native), 'groups': list(groups), 'morphs': len(obj.data.shape_keys.key_blocks) - 1 if obj.data.shape_keys else 0})

    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for side in ('L', 'R'):
        bone = rig.data.edit_bones['eye.' + side]
        delta = Vector(source_eyes[side] * scale + translation) - bone.head
        bone.head += delta
        bone.tail += delta
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 40
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = 'AgX'
    for obj in scene.objects:
        if obj.type in ('LIGHT', 'CAMERA'):
            obj.hide_render = True
    world = bpy.data.worlds.new('Body integration neutral studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.4, .42, .45, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .3
    scene.world = world
    def track(obj, target):
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    for name, location, power, size in [('Integration key', (-2, -3, 4), 550, 3), ('Integration fill', (2, -2, 2), 180, 2), ('Integration edge', (1, 2, 3), 300, 2), ('Integration eye catchlight', (-.2, -2, 2), 12, .15)]:
        light = bpy.data.lights.new(name, 'AREA')
        light.energy, light.size = power, size
        obj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(obj)
        obj.location = location
        track(obj, (0, 0, 1.4))
    camera_data = bpy.data.cameras.new('Integration review camera')
    camera_data.type = 'ORTHO'
    camera = bpy.data.objects.new('Integration review camera', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    def face(values):
        for obj in added:
            if obj.data.shape_keys:
                for key in obj.data.shape_keys.key_blocks[1:]:
                    key.value = values.get(key.name, 0)
        bpy.context.view_layer.update()

    def evaluated(obj):
        evaluated_obj = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated_obj.to_mesh()
        points = np.array([v.co[:] for v in mesh.vertices])
        evaluated_obj.to_mesh_clear()
        return points

    reference = {obj.name: evaluated(obj) for obj in added}
    checks = []
    for name, values in [('blink', {'eyeBlinkLeft': 1, 'eyeBlinkRight': 1}), ('jaw', {'jawOpen': .65}), ('TH', {'viseme_TH': 1})]:
        face(values)
        changes = {}
        for obj in added:
            posed = evaluated(obj)
            if not np.isfinite(posed).all():
                raise ValueError('Nonfinite deformation')
            changes[obj.name] = float(np.linalg.norm(posed - reference[obj.name], axis=1).max())
        if not 1e-5 < changes[head.name] < .10:
            raise ValueError('Missing or excessive head deformation')
        checks.append({'pose': name, 'maximumDisplacementsMeters': changes})
    face({})
    for image in bpy.data.images:
        if image.source == 'FILE' and image.filepath:
            image.pack()
    scene.frame_set(1)
    camera.location = (0, -4, 1.0)
    camera_data.ortho_scale = 2.08
    track(camera, (0, 0, .93))
    scene.render.resolution_x, scene.render.resolution_y = 900, 1100
    scene.render.resolution_percentage = 100
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output / 'fitted-head-body-study.blend'))

    # A preserved idle action provides a relaxed standing review pose. The saved
    # editable asset above remains in neutral/rest with all tracks muted.
    idle = next(track.strips[0].action for track in rig.animation_data.nla_tracks if track.name == 'idle_breathe')
    rig.animation_data.action = idle
    scene.frame_set(1)
    for name, values, location, target, ortho, resolution in [
        ('fullbody', {}, (0, -4, 1.0), (0, 0, .93), 2.08, (900, 1100)),
        ('neutral', {}, (0, -3, 1.70), (0, -.03, 1.665), .49, (900, 1000)),
        ('profile', {}, (3, 0, 1.70), (0, -.03, 1.665), .49, (900, 1000)),
        ('blink', {'eyeBlinkLeft': 1, 'eyeBlinkRight': 1}, (0, -3, 1.70), (0, -.03, 1.665), .49, (900, 1000)),
        ('jaw', {'jawOpen': .65}, (0, -3, 1.70), (0, -.03, 1.665), .49, (900, 1000)),
        ('head-turn', {}, (0, -3, 1.70), (0, -.03, 1.665), .49, (900, 1000)),
    ]:
        face(values)
        if name == 'head-turn':
            held_pose = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
            rig.animation_data.action = None
            for bone in rig.pose.bones:
                bone.matrix_basis = held_pose[bone.name]
            bpy.context.view_layer.update()
            before_turn = evaluated(head)
            for bone_name, angle in [('neck02', 8), ('head', 22)]:
                bone = rig.pose.bones[bone_name]
                basis = bone.matrix.to_quaternion().normalized()
                bone.rotation_mode = 'QUATERNION'
                bone.rotation_quaternion = (bone.rotation_quaternion @ basis.inverted() @ Quaternion(Vector((0, 0, 1)), math.radians(angle)) @ basis).normalized()
                bpy.context.view_layer.update()
            maximum_turn = float(np.linalg.norm(evaluated(head) - before_turn, axis=1).max())
            if not .005 < maximum_turn < .3:
                raise ValueError('Head-turn skinning did not move or exploded')
            checks.append({'pose': 'skeletal-head-turn', 'headMaxDisplacementMeters': maximum_turn})
        camera.location = location
        camera_data.ortho_scale = ortho
        track(camera, target)
        scene.render.resolution_x, scene.render.resolution_y = resolution
        scene.render.resolution_percentage = 100
        scene.render.filepath = str(args.output / ('integration-' + name + '.png'))
        bpy.ops.render.render(write_still=True)
    report = {
        'stage': 'Isolated integration study, visual acceptance pending',
        'sourceHead': str(args.head), 'sourceHeadSha256': digest(args.head),
        'sourceBody': str(args.body), 'sourceBodySha256': digest(args.body),
        'uniformScale': scale, 'translationMeters': translation.tolist(),
        'alignment': 'Match existing rig interocular distance, then translate eye midpoint; no head rotation or nonuniform face scaling.',
        'sourceEyeDistanceNative': source_distance, 'targetEyeDistanceMeters': target_distance,
        'materialUnitConversions': material_units,
        'eyeMidpointTargetMeters': ((target_eyes['L'] + target_eyes['R']) / 2).tolist(),
        'oldBodyCutPlaneMeters': seam_z,
        'neckSeam': 'Only lower neck (native Z < -1.0) extends up to 65 mm downward and conforms to source torso surface plus 0.35 mm normal offset; full contribution below native Z -1.32. All facial vertices and deltas remain unchanged. Lower edge lies beneath open shirt V. This is an overlap, not a welded final seam.',
        'lowerNeckAdjustedVertices': int((np.linalg.norm(neck_offsets, axis=1) > 0).sum()),
        'lowerNeckMaximumAdjustmentMeters': float(np.linalg.norm(neck_offsets, axis=1).max()),
        'lowerNeckWeights': 'Below native Z -1.14, neck skin smoothly blends to source torso surface weights, fully at -1.38, with normalized maximum four influences. This keeps the extended lower edge attached to chest during head movement.',
        'headBoundsMeters': {'min': (native_head * scale + translation + neck_offsets).min(0).tolist(), 'max': (native_head * scale + translation + neck_offsets).max(0).tolist()},
        'removedOldMeshes': removed, 'oldBodyVerticesBefore': original_body_vertices, 'oldBodyVerticesAfter': len(body.data.vertices),
        'oldFacialTargetsRetainedOnBody': 0, 'preservedBodyAnimations': tracks, 'binding': weight_reports, 'rom': checks,
        'limitations': ['Uniform scale is provisional, derived from existing rig rather than measured pupillary distance.', 'No final grooming/material match is included.', 'Neck seam is covered/overlapped rather than welded.', 'This output is not a production/public canonical replacement.'],
    }
    (args.output / 'integration-report.json').write_text(json.dumps(report, indent=2))
    print('INTEGRATION_REPORT', json.dumps({'scale': scale, 'translation': translation.tolist(), 'tracks': len(tracks), 'meshes': len(added)}))


if __name__ == '__main__':
    main()
