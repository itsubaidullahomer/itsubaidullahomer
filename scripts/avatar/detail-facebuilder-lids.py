"""Tiny upper eyelashes and wetline, attached to the fitted lid boundary.

Every target is rebuilt from that target's own head boundary coordinates. These
are genuine small meshes, not painted eyeliner or image planes. No lower dark
line is added; no head vertex, eyelid fit, or source FACS target is changed.
"""
from collections import Counter
import math
import bpy
import numpy as np


def _material(name, color, roughness, coat):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = .12
    return mat


def add_lid_details(head):
    keys = head.data.shape_keys.key_blocks
    basis = np.array([v.co[:] for v in keys[0].data])
    edges = Counter(tuple(sorted(edge)) for face in head.data.polygons for edge in face.edge_keys)
    boundary = {i for edge, count in edges.items() if count == 1 for i in edge}
    lash_mat = _material('Soft brown upper eyelashes', (.012, .008, .006), .48, .15)
    wet_mat = _material('Upper lid warm wetline', (.21, .09, .055), .22, .45)
    report = []
    for side, sign in [('L', 1), ('R', -1)]:
        ids = sorted((i for i in boundary if .165 < basis[i, 0] * sign < .405 and basis[i, 1] < -.79 and .312 < basis[i, 2] < .40), key=lambda i: basis[i, 0] * sign)
        if not 10 <= len(ids) <= 30:
            raise ValueError('Unexpected fitted upper eyelid boundary')

        def build(positions, lashes):
            vertices, faces = [], []
            for n, i in enumerate(ids):
                root = positions[i].copy()
                # Very slight forward offset to prevent skin depth flicker.
                root[1] -= .0007
                if lashes:
                    length = .012 + .005 * math.sin(math.pi * n / (len(ids) - 1))
                    lid_drop = (positions[i, 2] - basis[i, 2]) / .07
                    direction = np.array((sign * .18, -.90, .45 + min(0, lid_drop) * .7))
                    direction /= np.linalg.norm(direction)
                    tangent = np.cross(direction, (0, 0, 1))
                    tangent /= np.linalg.norm(tangent)
                    normal = np.cross(direction, tangent)
                    offset = len(vertices)
                    for progress, radius in [(0, .00065), (.6, .00045), (1, .00006)]:
                        for ring in range(3):
                            angle = ring * 2 * math.pi / 3
                            vertices.append(root + direction * length * progress + (tangent * math.cos(angle) + normal * math.sin(angle)) * radius)
                    for row in range(2):
                        for ring in range(3):
                            faces.append((offset + row * 3 + ring, offset + row * 3 + (ring + 1) % 3, offset + (row + 1) * 3 + (ring + 1) % 3, offset + (row + 1) * 3 + ring))
                else:
                    tangent = positions[ids[min(n + 1, len(ids) - 1)]] - positions[ids[max(n - 1, 0)]]
                    tangent /= np.linalg.norm(tangent)
                    normal = np.cross(tangent, (0, -1, 0))
                    normal /= np.linalg.norm(normal)
                    front = np.cross(normal, tangent)
                    for ring in range(4):
                        angle = ring * math.pi / 2
                        vertices.append(root + (normal * math.cos(angle) + front * math.sin(angle)) * .0008)
                    if n:
                        for ring in range(4):
                            faces.append(((n - 1) * 4 + ring, (n - 1) * 4 + (ring + 1) % 4, n * 4 + (ring + 1) % 4, n * 4 + ring))
            return np.array(vertices), faces

        for lashes in (True, False):
            name = ('Upper eyelashes.' if lashes else 'Upper wetline.') + side
            existing = bpy.data.objects.get(name)
            if existing:
                bpy.data.objects.remove(existing, do_unlink=True)
            points, faces = build(basis, lashes)
            mesh = bpy.data.meshes.new(name)
            mesh.from_pydata(points.tolist(), [], faces)
            mesh.update()
            obj = bpy.data.objects.new(name, mesh)
            bpy.context.collection.objects.link(obj)
            mesh.materials.append(lash_mat if lashes else wet_mat)
            for polygon in mesh.polygons:
                polygon.use_smooth = True
            for key in keys:
                positions, _ = build(np.array([v.co[:] for v in key.data]), lashes)
                shape = obj.shape_key_add(name=key.name, from_mix=False)
                shape.data.foreach_set('co', positions.ravel())
                shape.value = 0
            report.append({'mesh': name, 'anchors': len(ids), 'vertexCount': len(points), 'morphCount': len(keys) - 1})
    return report
