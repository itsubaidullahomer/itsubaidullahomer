"""Small reversible upper-lid fold test on the detailed native head.

Preserves every opening vertex, topology and source files. The same local
offset is added to Basis and all 66 targets, then checked in a full blink.
No photograph texture or newly inferred global face proportions are used.
"""
import hashlib
import json
import math
from collections import Counter, defaultdict, deque
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/avatar/identity-rebuild/facebuilder-study'
OUT = BASE / 'upper-lid-fold-study'
OUT.mkdir(exist_ok=True)
SOURCE = BASE / 'anatomy-detailed/head-anatomy-study.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
head = next(o for o in bpy.data.objects if o.type == 'MESH' and o.data.shape_keys and len(o.data.vertices) == 18024)
keys = head.data.shape_keys.key_blocks
original = {key.name: np.array([v.co[:] for v in key.data]) for key in keys}
basis = original['Basis']
known = np.load(BASE / 'detail-basis-deltas.npz')
assert np.allclose(basis, known['basis'] + known['delta'], atol=1e-6), 'Unexpected detailed Basis; do not apply offsets.'
for key in keys:
    key.value = 0
head.data.vertices.foreach_set('co', basis.ravel())
head.data.update()
normals = np.array([v.normal[:] for v in head.data.vertices])
edge_counts = Counter(tuple(sorted(edge)) for face in head.data.polygons for edge in face.edge_keys)
boundary_links = defaultdict(set)
neighbors = defaultdict(set)
for (a, b), count in edge_counts.items():
    neighbors[a].add(b)
    neighbors[b].add(a)
    if count == 1:
        boundary_links[a].add(b)
        boundary_links[b].add(a)
remaining = set(boundary_links)
loops = []
while remaining:
    queue = [remaining.pop()]
    loop = []
    while queue:
        vertex = queue.pop()
        loop.append(vertex)
        for other in boundary_links[vertex]:
            if other in remaining:
                remaining.remove(other)
                queue.append(other)
    loops.append(loop)
eye_loops = [loop for loop in loops if .1 < abs(basis[loop, 0].mean()) < .5 and basis[loop, 2].mean() > .2]
assert len(eye_loops) == 2 and all(len(loop) == 48 for loop in eye_loops)
opening = np.array(sorted(vertex for loop in eye_loops for vertex in loop), dtype=np.int32)
graph_distance = np.full(len(basis), 999, dtype=np.int32)
queue = deque(opening.tolist())
graph_distance[opening] = 0
while queue:
    vertex = queue.popleft()
    if graph_distance[vertex] >= 5:
        continue
    for other in neighbors[vertex]:
        if graph_distance[other] > graph_distance[vertex] + 1:
            graph_distance[other] = graph_distance[vertex] + 1
            queue.append(other)

delta = np.zeros_like(basis)
regions = []
for loop in eye_loops:
    sign = 1 if basis[loop, 0].mean() > 0 else -1
    # Walk each of the two rim paths from the medial to lateral canthus.
    inner = min(loop, key=lambda i: basis[i, 0] * sign)
    outer = max(loop, key=lambda i: basis[i, 0] * sign)
    paths = []
    for first in boundary_links[inner]:
        path = [inner, first]
        while path[-1] != outer:
            choices = [i for i in boundary_links[path[-1]] if i != path[-2]]
            assert len(choices) == 1
            path.append(choices[0])
        paths.append(path)
    upper = max(paths, key=lambda ids: basis[ids, 2].mean())
    upper = sorted(upper, key=lambda i: basis[i, 0] * sign)
    xx = basis[:, 0] * sign
    sample_x = basis[upper, 0] * sign
    rim_z = np.interp(xx, sample_x, basis[upper, 2])
    t = (xx - sample_x[0]) / (sample_x[-1] - sample_x[0])
    support = (t > .08) & (t < .95) & (basis[:, 1] < -.76)
    support &= (basis[:, 2] > rim_z + .015) & (basis[:, 2] < rim_z + .105)
    support &= normals[:, 1] < -.35
    # A small crease 3.5–5 mm above the upper free edge, tapering before
    # the canthi. Peak recess is below 0.6 mm after actual body scaling.
    phase = np.clip((t - .08) / .87, 0, 1)
    lateral = np.sin(math.pi * phase) ** 1.3
    rise = .035 + .012 * np.sin(math.pi * np.clip(t, 0, 1))
    dz = basis[:, 2] - rim_z - rise
    recess = -.0050 * np.exp(-.5 * (dz / .012) ** 2)
    shelf = .0014 * np.exp(-.5 * ((dz + .021) / .012) ** 2)
    # Preserve the opening and its immediate support ring exactly.
    protection = np.clip((graph_distance - 1) / 2, 0, 1)
    amount = (recess + shelf) * lateral * support * protection
    amount[np.abs(amount) < 1e-6] = 0
    delta += normals * amount[:, None]
    regions.append({'side': 'L' if sign > 0 else 'R', 'upper_boundary': upper,
                    'modified_vertices': np.flatnonzero(amount).tolist()})
assert np.max(np.abs(delta[opening])) == 0
assert np.max(np.abs(delta[graph_distance <= 1])) == 0
affected = np.flatnonzero(np.linalg.norm(delta, axis=1) > 0)
assert 30 < len(affected) < 700

# Check shape topology normals for every target, not only the neutral.
triangles = np.array([tuple(p.vertices[:3]) for p in head.data.polygons], dtype=np.int32)
normal_checks = []
for name, coordinates in original.items():
    before = coordinates[triangles]
    after = (coordinates + delta)[triangles]
    n0 = np.cross(before[:, 1] - before[:, 0], before[:, 2] - before[:, 0])
    n1 = np.cross(after[:, 1] - after[:, 0], after[:, 2] - after[:, 0])
    lengths = np.linalg.norm(n0, axis=1) * np.linalg.norm(n1, axis=1)
    valid = lengths > 1e-12
    dots = np.sum(n0[valid] * n1[valid], axis=1) / lengths[valid]
    assert dots.min() > 0, f'Face reversal in {name}'
    normal_checks.append({'target': name, 'minimum_normal_dot': float(dots.min())})

blink_original = basis.copy()
for name in ['eyeBlinkLeft', 'eyeBlinkRight']:
    blink_original += original[name] - basis
eye_checks = []
for eye in [bpy.data.objects['Eye.L'], bpy.data.objects['Eye.R']]:
    points = np.array([v.co[:] for v in eye.data.shape_keys.key_blocks[0].data])
    center = (points.min(axis=0) + points.max(axis=0)) / 2
    radius = np.median(np.linalg.norm(points - center, axis=1))
    local = affected[np.sign(basis[affected, 0]) == np.sign(center[0])]
    for pose, coordinates in [('neutral', basis), ('blink', blink_original)]:
        before = np.linalg.norm(coordinates[local] - center, axis=1) - radius
        after = np.linalg.norm(coordinates[local] + delta[local] - center, axis=1) - radius
        newly_inside = (after < 0) & (before >= 0)
        assert not np.any(newly_inside), f'New globe penetration: {eye.name}, {pose}'
        eye_checks.append({'eye': eye.name, 'pose': pose,
                           'minimum_clearance_native_before': float(before.min()),
                           'minimum_clearance_native_after': float(after.min()),
                           'newly_inside_vertices': int(newly_inside.sum())})

scale = json.loads((BASE / 'body-integration/integration-report.json').read_text())['uniformScale']
np.savez_compressed(OUT / 'upper-lid-fold-augmentation.npz', basis=basis, delta=delta,
                    protected_opening=opening, affected=affected)
report = {'status': 'Isolated upper-lid fold study; not adopted or likeness-approved',
          'source': str(SOURCE.relative_to(ROOT)), 'vertex_count': len(basis),
          'target_count_including_basis': len(keys), 'same_delta_every_target': True,
          'basis_sha256': hashlib.sha256(basis.tobytes()).hexdigest(),
          'modified_vertices': len(affected), 'opening_boundary_delta': 0,
          'maximum_delta_native': float(np.linalg.norm(delta, axis=1).max()),
          'maximum_delta_millimeters_at_body_scale': float(np.linalg.norm(delta, axis=1).max() * scale * 1000),
          'regions': regions, 'target_normal_checks': normal_checks,
          'globe_clearance_checks': eye_checks,
          'transfer': 'Verify original detailed native Basis, then add delta to Basis and every target. Multiply delta by body uniform scale if applying to integrated head. Existing ear augmentation changes other regions only.'}
(OUT / 'report.json').write_text(json.dumps(report, indent=2))

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = 0
for ob in scene.objects:
    if ob.type in ('LIGHT', 'CAMERA'):
        ob.hide_render = True
world = bpy.data.worlds.new('Upper fold quiet studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.22, .24, .26, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .28
scene.world = world
for name, location, power, size in [('Fold key', (-3, -4, 4), 600, 2.8), ('Fold fill', (3, -2, 1), 100, 3)]:
    light = bpy.data.lights.new(name, 'AREA')
    light.energy, light.size = power, size
    ob = bpy.data.objects.new(name, light)
    scene.collection.objects.link(ob)
    ob.location = location
    ob.rotation_euler = (Vector((0, -.8, .35)) - ob.location).to_track_quat('-Z', 'Y').to_euler()
camera = bpy.data.objects.new('Upper fold review camera', bpy.data.cameras.new('Upper fold review camera'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.clip_start = .01
matched = json.loads((BASE / 'matched-camera-report.json').read_text())['references'][0]

def pose(values):
    for ob in scene.objects:
        if ob.type == 'MESH' and ob.data.shape_keys:
            for key in ob.data.shape_keys.key_blocks:
                key.value = values.get(key.name, 0)
    bpy.context.view_layer.update()

for version in ['before', 'after']:
    d = delta if version == 'after' else np.zeros_like(delta)
    for key in keys:
        key.data.foreach_set('co', (original[key.name] + d).ravel())
    head.data.vertices.foreach_set('co', (basis + d).ravel())
    head.data.update()
    for view in ['matched-reference27', 'eyes', 'side', 'blink']:
        pose({'eyeBlinkLeft': 1, 'eyeBlinkRight': 1} if view == 'blink' else {})
        if view == 'matched-reference27':
            camera.data.type = 'PERSP'
            camera.data.lens = matched['focal_mm']
            camera.data.sensor_width = 36
            camera.data.sensor_fit = matched['sensor_fit']
            camera.matrix_world = Matrix(matched['camera_matrix_world'])
            scene.render.resolution_x, scene.render.resolution_y = matched['size']
        else:
            camera.data.type = 'ORTHO'
            camera.data.ortho_scale = 1.12 if view != 'side' else .72
            position, target = ((0, -5, .37), (0, -.90, .37)) if view != 'side' else ((2.8, -4, .44), (.26, -.88, .37))
            camera.location = position
            camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
            scene.render.resolution_x, scene.render.resolution_y = (1100, 560) if view != 'side' else (900, 700)
        scene.render.filepath = str(OUT / f'{version}-{view}.png')
        bpy.ops.render.render(write_still=True)
pose({})
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'upper-lid-fold-study.blend'))
print('LID_FOLD_STUDY', json.dumps({k: v for k, v in report.items() if k not in ['regions', 'target_normal_checks']}))
