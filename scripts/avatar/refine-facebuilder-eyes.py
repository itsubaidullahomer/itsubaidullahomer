"""Portable continuous eye coloration for the fitted anatomical globe study.

This changes materials and vertex color only: globe/lid fit and all gaze shape
keys remain untouched. Principled clearcoat gives a moist surface reflection;
it is a rendering approximation, not an additional refractive corneal mesh.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np


def smooth(a, b, value):
    t = max(0.0, min(1.0, (value - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def refine_eyes(objects):
    reports = []
    for eye in objects:
        if eye.type != 'MESH' or eye.name not in ('Eye.L', 'Eye.R'):
            continue
        mesh = eye.data
        keys = mesh.shape_keys.key_blocks if mesh.shape_keys else None
        points = np.array([v.co[:] for v in (keys[0].data if keys else mesh.vertices)])
        # Symmetrical sampling of the complete globe preserves the fitted center.
        center = (points.min(axis=0) + points.max(axis=0)) / 2.0
        attr = mesh.color_attributes.get('EyeColor')
        if attr is None:
            attr = mesh.color_attributes.new(name='EyeColor', type='FLOAT_COLOR', domain='POINT')
        colors = []
        for point in points:
            direction = point - center
            radius = np.linalg.norm(direction)
            theta = math.acos(max(-1.0, min(1.0, -direction[1] / radius)))
            azimuth = math.atan2(direction[2], direction[0])
            iris_radius = max(0.0, min(1.0, (theta - .17) / .25))
            # Small radial variation, continuously interpolated across vertices.
            fiber = .025 * math.sin(azimuth * 23 + theta * 8) + .018 * math.sin(azimuth * 37 - theta * 11)
            iris = np.array((.031, .0165, .0085)) * (1.0 + fiber + .10 * math.sin(iris_radius * math.pi))
            limbus = np.array((.012, .0085, .0055))
            iris = iris * (1 - smooth(.33, .405, theta)) + limbus * smooth(.33, .405, theta)
            pupil = np.array((.0025, .0020, .0016))
            color = pupil * (1 - smooth(.165, .195, theta)) + iris * smooth(.165, .195, theta)
            # Warm, lower-luminance sclera; no white spotlight-like wedges.
            sclera = np.array((.50, .475, .43))
            edge = smooth(.395, .445, theta)
            color = color * (1 - edge) + sclera * edge
            colors.extend((*color.tolist(), 1.0))
        attr.data.foreach_set('color', colors)
        mesh.color_attributes.active_color = attr
        mat = bpy.data.materials.get('Continuous warm eye with wet clearcoat')
        if mat is None:
            mat = bpy.data.materials.new('Continuous warm eye with wet clearcoat')
            mat.use_nodes = True
            nodes = mat.node_tree.nodes
            shader = nodes.get('Principled BSDF')
            vertex_color = nodes.new('ShaderNodeVertexColor')
            vertex_color.layer_name = 'EyeColor'
            mat.node_tree.links.new(vertex_color.outputs['Color'], shader.inputs['Base Color'])
            shader.inputs['Roughness'].default_value = .20
            shader.inputs['IOR'].default_value = 1.376
            shader.inputs['Coat Weight'].default_value = .85
            shader.inputs['Coat Roughness'].default_value = .045
            shader.inputs['Coat IOR'].default_value = 1.376
        mesh.materials.clear()
        mesh.materials.append(mat)
        for polygon in mesh.polygons:
            polygon.material_index = 0
            polygon.use_smooth = True
        reports.append({'eye': eye.name, 'vertices': len(points), 'geometryChanged': False, 'colorAttribute': 'EyeColor', 'surface': 'Portable PBR clearcoat approximation'})
    if len(reports) != 2:
        raise ValueError('Expected exactly two fitted anatomical eye globes')
    return reports


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    bpy.ops.wm.open_mainfile(filepath=str(args.source))
    report = refine_eyes(list(bpy.context.scene.objects))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output))
    print('EYE_REFINEMENT', json.dumps(report))
