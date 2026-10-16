"""An isolated, editable dentition/oral study for the native fitted head.

apply_dentition(head) replaces only mouth interior objects and leaves every
fitted face coordinate/target untouched. Tooth proportions are an artistic
approximation informed by the supplied smiles, not a dental scan. New lower
parts follow the head's own mandibular targets; no prior avatar face is used.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/avatar/identity-rebuild/facebuilder-study'


def material(name, color, roughness=.42, coat=.15):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Coat Weight'].default_value = coat
    shader.inputs['Coat Roughness'].default_value = .18
    return mat


def apply_dentition(head):
    keys = head.data.shape_keys.key_blocks
    basis = np.array([v.co[:] for v in keys[0].data])
    region = (basis[:, 2] < -.42) & (basis[:, 2] > -.80) & (np.abs(basis[:, 0]) < .40) & (basis[:, 1] < -.75)
    reference = basis[region]
    if len(reference) < 10:
        raise ValueError('apply_dentition requires the native fitted head before body-scale transformation')
    transforms = {}
    for name in ('jawOpen', 'jawLeft', 'jawRight', 'jawForward'):
        target = np.array([v.co[:] for v in keys[name].data])[region]
        a, b = reference - reference.mean(0), target - target.mean(0)
        u, _, vh = np.linalg.svd(a.T @ b)
        rotation = vh.T @ u.T
        if np.linalg.det(rotation) < 0:
            vh[-1] *= -1
            rotation = vh.T @ u.T
        transforms[name] = (rotation, target.mean(0) - rotation @ reference.mean(0))
    old = []
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH' and obj.name.startswith(('Upper tooth ', 'Lower tooth ', 'Upper gum', 'Lower gum', 'Tongue', 'Mouth cavity')):
            old.append(obj.name)
            bpy.data.objects.remove(obj, do_unlink=True)
    created = []
    gum = material('Recessed natural gum', (.135, .026, .02), .48, .23)
    lining = material('Warm oral mucosa', (.12, .024, .018), .57, .10)
    palate_mat = material('Palate soft tissue', (.16, .035, .025), .58, .10)
    tongue_mat = material('Natural tongue tissue', (.205, .049, .039), .55, .18)
    # A very small portable ambient floor preserves dark oral contours when the
    # web renderer has no subsurface/bounced-light model. It remains deliberately
    # far below skin/enamel luminance; this is an artistic rendering approximation.
    for mat, ambient in [(lining, .012), (palate_mat, .016), (tongue_mat, .028)]:
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Emission Color'].default_value = shader.inputs['Base Color'].default_value
        shader.inputs['Emission Strength'].default_value = ambient
    enamel = [material('Warm enamel variation ' + str(i), color, .28, .20) for i, color in enumerate([(.61, .58, .515), (.595, .557, .49), (.63, .598, .53), (.575, .538, .465)])]

    def make_mesh(name, points, faces, mat):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(points, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        mesh.materials.append(mat)
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        created.append(obj)
        return obj

    def add_jaw(obj, influence=None):
        neutral = obj.shape_key_add(name='Basis', from_mix=False)
        points = np.array([v.co[:] for v in neutral.data])
        weights = np.ones(len(points)) if influence is None else influence(points)
        for name, (rotation, translation) in transforms.items():
            delta = (points @ rotation.T + translation - points) * weights[:, None]
            target = obj.shape_key_add(name=name, from_mix=False)
            target.data.foreach_set('co', (points + delta).ravel())
            target.value = 0

    # Individual crowns have a cervical taper, convex face, thin rounded biting
    # edge, and tooth-specific proportions. Arc orientation avoids a flat rail.
    for lower in (False, True):
        if lower:
            specs = [(.0255, -.982, .050, .082, -.367, .015), (.076, -.967, .050, .079, -.369, .17), (.127, -.935, .051, .091, -.363, .40), (.178, -.89, .056, .080, -.370, .68)]
        else:
            specs = [(.037, -1.011, .073, .105, -.364, .03), (.102, -.991, .057, .094, -.356, .17), (.160, -.954, .057, .111, -.367, .42), (.213, -.903, .059, .094, -.355, .72)]
        for side, sign in [('L', 1), ('R', -1)]:
            for tooth, (x, y, width, height, edge, yaw) in enumerate(specs):
                points, faces = [], []
                # Root to biting edge. The last ring is narrow in depth while
                # retaining a broad incisal edge rather than a spherical bead.
                rings = [(0, .65, .036), (.14, .87, .050), (.33, 1., .056), (.60, 1., .046), (.83, 1., .030), (.96, .99, .014), (1., .96, .006)]
                segments = 20
                for progress, breadth, depth in rings:
                    for step in range(segments):
                        angle = step * math.tau / segments
                        c, s = math.cos(angle), math.sin(angle)
                        u = math.copysign(abs(c) ** .60, c)
                        v = math.copysign(abs(s) ** .70, s)
                        local_x = width * .5 * breadth * u
                        local_y = depth * .5 * v
                        z = edge + (height * (1 - progress)) * (-1 if lower else 1)
                        # Rounded corners and a restrained canine cusp.
                        corner = .0025 * abs(u) ** 5 * progress ** 5
                        cusp = .006 * (1 - abs(u)) * progress ** 7 if tooth == 2 else 0
                        z += (corner - cusp) * (-1 if lower else 1)
                        z += (.0009 if side == 'R' else -.0004) * progress
                        if lower:
                            z += .021
                        else:
                            # Recess the upper crowns behind the fitted upper
                            # lip without shrinking their actual dimensions.
                            z += .012
                        rotation = sign * yaw
                        points.append((sign * x + local_x * math.cos(rotation) - local_y * math.sin(rotation), y + local_x * math.sin(rotation) + local_y * math.cos(rotation), z))
                for row in range(len(rings) - 1):
                    for step in range(segments):
                        face = (row * segments + step, row * segments + (step + 1) % segments, (row + 1) * segments + (step + 1) % segments, (row + 1) * segments + step)
                        faces.append(face if lower else tuple(reversed(face)))
                faces.append(tuple(reversed(range(segments))) if lower else tuple(range(segments)))
                last = (len(rings) - 1) * segments
                faces.append(tuple(range(last, last + segments)) if lower else tuple(reversed(range(last, last + segments))))
                obj = make_mesh(('Lower' if lower else 'Upper') + ' tooth ' + side + str(tooth + 1), points, faces, enamel[(tooth + (1 if lower else 0)) % len(enamel)])
                if lower:
                    add_jaw(obj)

    def arch_gum(name, lower):
        points, faces = [], []
        count, ring_count = 33, 10
        for row in range(count):
            angle = -1.37 + 2.74 * row / (count - 1)
            center = np.array((.25 * math.sin(angle), -.974 + .19 * (1 - math.cos(angle)), -.453 if lower else -.236))
            tangent = np.array((.25 * math.cos(angle), .19 * math.sin(angle), 0.))
            tangent /= np.linalg.norm(tangent)
            normal = np.array((tangent[1], -tangent[0], 0.))
            for step in range(ring_count):
                a = math.tau * step / ring_count
                points.append((center + normal * .021 * math.cos(a) + np.array((0, 0, (.025 if lower else .037) * math.sin(a)))).tolist())
            if row:
                for step in range(ring_count):
                    faces.append(((row - 1) * ring_count + step, row * ring_count + step, row * ring_count + (step + 1) % ring_count, (row - 1) * ring_count + (step + 1) % ring_count))
        obj = make_mesh(name, points, faces, gum)
        if lower:
            add_jaw(obj)
        return obj
    arch_gum('Upper gum arch', False)
    arch_gum('Lower gum arch', True)

    def ellipsoid(name, center, radii, mat, jaw=False, cavity=False):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20)
        obj = bpy.context.object
        obj.name = obj.data.name = name
        for vertex in obj.data.vertices:
            vertex.co = Vector(np.array(vertex.co) * radii + center)
        if cavity:
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.delete(bm, geom=[p for p in bm.faces if p.calc_center_median().y < -.87], context='FACES_ONLY')
            for face in bm.faces:
                face.normal_flip()
            bm.to_mesh(obj.data)
            bm.free()
        obj.data.materials.append(mat)
        for face in obj.data.polygons:
            face.use_smooth = True
        created.append(obj)
        if jaw:
            add_jaw(obj, (lambda p: np.clip((-.28 - p[:, 2]) / .20, 0, 1)) if cavity else None)
        return obj
    ellipsoid('Mouth cavity', np.array((0, -.68, -.345)), np.array((.245, .245, .215)), lining, True, True)
    ellipsoid('Upper gum palate', np.array((0, -.755, -.227)), np.array((.205, .225, .050)), palate_mat)
    tongue = ellipsoid('Tongue', np.array((0, -.795, -.423)), np.array((.155, .145, .043)), tongue_mat)
    for vertex in tongue.data.vertices:
        x, y, z = vertex.co
        if z > -.423:
            vertex.co.z -= .0035 * math.exp(-(x / .018) ** 2) * math.exp(-((y + .79) / .12) ** 2)
    add_jaw(tongue)
    # During opening, the tongue's muscular dorsum stays above the mandibular
    # floor instead of behaving like a completely rigid piece of the jaw.
    for point in tongue.data.shape_keys.key_blocks['jawOpen'].data:
        point.co.z += .08
        point.co.y -= .03
    neutral = tongue.data.shape_keys.key_blocks[0]
    out = tongue.shape_key_add(name='tongueOut', from_mix=False)
    for point, source in zip(out.data, neutral.data):
        point.co = source.co
        tip = max(0, min(1, (-.80 - point.co.y) / .14))
        tip = tip * tip * (3 - 2 * tip)
        point.co.x *= 1 - .20 * tip
        point.co.z += (source.co.z + .423) * .45 * tip
        point.co.y -= .24 * tip
        point.co.z += .10 * tip
    spec = importlib.util.spec_from_file_location('anatomy_speech', ROOT / 'scripts/avatar/build-facebuilder-interiors.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    speech = module.add_speech_study(created)
    for obj in created:
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                if not np.isfinite(np.array([v.co[:] for v in key.data])).all():
                    raise ValueError('Nonfinite oral geometry')
                key.value = 0
    statistics = []
    for obj in created:
        obj.data.calc_loop_triangles()
        statistics.append({'mesh': obj.name, 'vertices': len(obj.data.vertices), 'triangles': len(obj.data.loop_triangles), 'morphs': len(obj.data.shape_keys.key_blocks) - 1 if obj.data.shape_keys else 0})
    return {'removed': old, 'objects': [o.name for o in created], 'meshStatistics': statistics, 'totalOralTriangles': sum(item['triangles'] for item in statistics), 'speech': speech, 'faceGeometryChanged': False, 'oralMaterialApproximation': 'Very small 0.012–0.028 emissive floor retains oral contours under web lighting without subsurface/bounce support; not a physically validated tissue shader.', 'limits': ['Artistic dentition approximation; no dental scan is available.', 'Speech targets require conversational playback review.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=BASE / 'combined-v8/neutral-study.blend')
    parser.add_argument('--output', type=Path, default=BASE / 'dental-polish')
    parser.add_argument('--poses', default='neutral,small-smile,broad-smile,speaking,jaw,TH')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    args.output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(args.source))
    head = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.data.shape_keys and len(o.data.vertices) == 18024)
    def facial_hash():
        digest = hashlib.sha256()
        for key in head.data.shape_keys.key_blocks:
            digest.update(key.name.encode())
            digest.update(np.array([v.co[:] for v in key.data], dtype=np.float32).tobytes())
        return digest.hexdigest()
    before = facial_hash()
    report = apply_dentition(head)
    assert before == facial_hash(), 'A fitted facial target was unexpectedly changed'
    report['unchangedFittedFaceSha256'] = before
    report['unchangedFittedFaceTargets'] = len(head.data.shape_keys.key_blocks) - 1
    scene = bpy.context.scene
    scene.cycles.samples = 48
    scene.render.resolution_x, scene.render.resolution_y = 960, 1080
    scene.render.resolution_percentage = 100
    camera = scene.camera
    camera.data.type = 'PERSP'
    camera.data.lens = 85
    a = math.radians(15)
    camera.location = (9 * math.sin(a), -9 * math.cos(a), .17)
    camera.rotation_euler = (Vector((0, -.08, .10)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    poses = [('neutral', {}), ('small-smile', {'mouthSmileLeft': .55, 'mouthSmileRight': .55, 'cheekSquintLeft': .12, 'cheekSquintRight': .12, 'jawOpen': .08}), ('broad-smile', {'mouthSmileLeft': .8, 'mouthSmileRight': .8, 'cheekSquintLeft': .22, 'cheekSquintRight': .22, 'mouthUpperUpLeft': .25, 'mouthUpperUpRight': .25, 'jawOpen': .22}), ('speaking', {'viseme_aa': .6}), ('jaw', {'jawOpen': .65}), ('TH', {'viseme_TH': 1})]
    for name, values in poses:
        if name not in args.poses.split(','):
            continue
        for obj in scene.objects:
            if obj.type in ('MESH', 'CURVE') and obj.data.shape_keys:
                for key in obj.data.shape_keys.key_blocks[1:]:
                    key.value = values.get(key.name, 0)
        scene.render.filepath = str(args.output / ('dental-' + name + '.png'))
        bpy.ops.render.render(write_still=True)
    for obj in scene.objects:
        if obj.type in ('MESH', 'CURVE') and obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks[1:]:
                key.value = 0
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output / 'dental-neutral-study.blend'))
    (args.output / 'dental-report.json').write_text(json.dumps(report, indent=2))
    print('DENTAL_POLISH', json.dumps({'objects': len(report['objects']), 'faceGeometryChanged': False}))
