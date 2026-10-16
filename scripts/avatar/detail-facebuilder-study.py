"""Small, reversible anatomical detail study on the original FaceBuilder topology.

Run in Blender. This never overwrites the fitted source. Native coordinates are
retained; a unit here is 0.1 m in the downstream character export. --inspect only
renders the source; otherwise a sparse, labelled Basis delta is exported for use
on every native FACS target. This is a draft study, not likeness acceptance.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets/avatar/identity-rebuild/facebuilder-study"


def gaussian(values, center, radius):
    d = (values - np.asarray(center)) / np.asarray(radius)
    return np.exp(-.5 * np.sum(d * d, axis=1))


def detail_deltas(vertices, normals, edges):
    """Return native-space offsets and per-region masks, with oral folds protected."""
    delta = np.zeros_like(vertices)
    labels = {}
    x, y, z = vertices.T

    def smoothstep(low, high, values):
        t = np.clip((values - low) / (high - low), 0, 1)
        return t * t * (3 - 2 * t)

    def tube(points, path, width):
        # Rounded, continuously joined ridge in the ear's local Y/Z plane.
        distance = np.full(len(points), np.inf)
        for a, b in zip(path[:-1], path[1:]):
            a, b = np.asarray(a), np.asarray(b)
            segment = b - a
            t = np.clip(((points - a) @ segment) / (segment @ segment), 0, 1)
            distance = np.minimum(distance, np.linalg.norm(points - a - t[:, None] * segment, axis=1))
        return np.exp(-.5 * (distance / width) ** 2)

    # Source has an outer helix and lobe but flattened inner cartilage. Reinforce
    # the existing antihelix direction and concha without moving the outer rim.
    # Ref25 supports the relief and upper fork; its exact depth is not measured.
    yz = vertices[:, 1:]
    branch = tube(yz, [(.015, -.015), (.045, .065), (.048, .14), (.02, .22), (-.025, .255)], .027)
    fork = tube(yz, [(.047, .12), (.016, .155), (-.033, .18)], .020)
    bowl = gaussian(yz, (-.023, .055), (.041, .070))
    upper_bowl = gaussian(yz, (-.013, .213), (.032, .034))
    # Keep the bottom lobe softly rounded, blending the concha's relief above it.
    ear_extent = smoothstep(.64, .73, np.abs(x)) * smoothstep(-.145, -.065, z)
    ear_extent *= 1 - smoothstep(.29, .33, z)
    ear_extent *= smoothstep(-.14, -.09, y) * (1 - smoothstep(.092, .12, y))
    external = smoothstep(.15, .65, normals[:, 0] * np.sign(x))
    ear_weight = ear_extent * external
    relief = (.025 * branch + .012 * fork - .024 * bowl - .007 * upper_bowl) * ear_weight
    # A per-vertex normal gate alone can generate pinched folds in the existing
    # cartilage. Diffuse the offset over the real edge graph, while keeping the
    # unaffected surrounding surface constrained to zero.
    counts = np.bincount(edges.ravel(), minlength=len(vertices))
    support = ear_extent > 0
    for _ in range(4):
        neighbors = np.zeros(len(vertices))
        np.add.at(neighbors, edges[:, 0], relief[edges[:, 1]])
        np.add.at(neighbors, edges[:, 1], relief[edges[:, 0]])
        relief = (.35 * relief + .65 * neighbors / np.maximum(counts, 1)) * support
    # Compact support: never leave floating point tails outside the named region.
    relief[np.abs(relief) < 1e-6] = 0
    delta[:, 0] += np.sign(x) * relief
    labels["inner_ear_cartilage"] = np.flatnonzero(relief != 0)

    # Upper vermilion border only. The moustache obscures precise border shape
    # in the photos, so this is deliberately modest (<1 mm) and reversible.
    peaks = (gaussian(vertices, (-.066, -1.126, -.213), (.035, .040, .027))
             + gaussian(vertices, (.066, -1.126, -.213), (.035, .040, .027)))
    center = gaussian(vertices, (-.005, -1.133, -.213), (.022, .033, .023))
    lip_mask = smoothstep(-.272, -.252, z) * (1 - smoothstep(-.183, -.163, z))
    lip_mask *= smoothstep(.55, .9, -normals[:, 1])
    # External-facing normals plus a strict Z barrier preserve the mouth seam
    # and all oral/interior folds. Lower lip and overall mouth width stay fixed.
    lip_delta = np.zeros_like(vertices)
    lip_delta[:, 2] = (.008 * peaks - .004 * center) * lip_mask
    lip_delta[:, 1] = (-.003 * peaks + .001 * center) * lip_mask
    lip_delta[np.linalg.norm(lip_delta, axis=1) < 1e-6] = 0
    delta += lip_delta
    labels["upper_vermilion_border"] = np.flatnonzero(np.linalg.norm(lip_delta, axis=1) > 0)

    # Very local taper just above the corners; never change the sealing edge.
    corners = (gaussian(vertices, (-.252, -1.007, -.244), (.018, .018, .014))
               + gaussian(vertices, (.252, -1.007, -.244), (.018, .018, .014)))
    corner_delta = .003 * corners * lip_mask
    corner_delta[corner_delta < 1e-6] = 0
    delta[:, 1] += corner_delta
    labels["upper_commissure_taper"] = np.flatnonzero(corner_delta != 0)
    assert not np.any(np.linalg.norm(delta[(np.abs(x) < .40) & (z <= -.272)], axis=1) > 0)
    return delta, labels


def material():
    mat = bpy.data.materials.new("Untextured detail study clay")
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (.36, .34, .32, 1)
    principled.inputs["Roughness"].default_value = .75
    return mat


def setup_scene(obj):
    scene = bpy.context.scene
    for item in scene.objects:
        item.hide_render = item != obj
    obj.data.materials.clear()
    obj.data.materials.append(material())
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes["Background"]
    background.inputs[0].default_value = (.23, .25, .28, 1)
    background.inputs[1].default_value = .4
    for name, pos, energy, size in [
        ("Detail soft key", (-3, -4, 5), 550, 4),
        ("Detail fill", (3, -2, 1), 180, 3),
        ("Detail edge", (1, 3, 3), 350, 3),
    ]:
        light = bpy.data.lights.new(name, "AREA")
        light.energy, light.size = energy, size
        light.shape = "DISK"
        item = bpy.data.objects.new(name, light)
        scene.collection.objects.link(item)
        item.location = pos
        item.rotation_euler = (Vector((0, 0, .1)) - item.location).to_track_quat("-Z", "Y").to_euler()
    camera_data = bpy.data.cameras.new("Detail study camera")
    camera_data.type = "ORTHO"
    camera = bpy.data.objects.new("Detail study camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return scene, camera


def render_views(scene, cam, prefix, full):
    views = [
        ("ear", (5, -.20, .12), (.8, .03, .12), .65, 700, 850),
        ("ear-oblique", (4, -3, .18), (.8, .03, .12), .65, 700, 850),
        ("mouth", (0, -5, -.29), (0, -1.10, -.29), .82, 900, 580),
    ]
    if full:
        views += [
            ("front", (0, -7, -.05), (0, -.1, -.05), 3.5, 900, 1000),
            ("profile", (7, 0, -.05), (0, -.1, -.05), 3.5, 900, 1000),
        ]
    for label, pos, target, scale, width, height in views:
        cam.location = pos
        cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam.data.ortho_scale = scale
        scene.render.resolution_x, scene.render.resolution_y = width, height
        scene.render.filepath = str(OUT / f"{prefix}-{label}.png")
        bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    bpy.ops.wm.open_mainfile(filepath=str(OUT / "fitted-head.blend"))
    obj = next(o for o in bpy.data.objects if o.type == "MESH")
    assert len(obj.data.vertices) == 18024, "Topology mismatch; do not transfer offsets."
    vertices = np.asarray([tuple(v.co) for v in obj.data.vertices], dtype=np.float64)
    normals = np.asarray([tuple(v.normal) for v in obj.data.vertices], dtype=np.float64)
    edges = np.asarray([tuple(e.vertices) for e in obj.data.edges], dtype=np.int32)
    if not args.inspect:
        delta, labels = detail_deltas(vertices, normals, edges)
        old_face_normals = np.asarray([tuple(p.normal) for p in obj.data.polygons])
        face_indices = [tuple(p.vertices) for p in obj.data.polygons]
        for v, d in zip(obj.data.vertices, delta):
            v.co += Vector(d)
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                for v, d in zip(key.data, delta):
                    v.co += Vector(d)
        obj.data.update()
        new_face_normals = np.asarray([tuple(p.normal) for p in obj.data.polygons])
        normal_dots = np.sum(old_face_normals * new_face_normals, axis=1)
        assert np.all(normal_dots > 0), "Detail change inverted a face normal."
        assert all(tuple(p.vertices) == before for p, before in zip(obj.data.polygons, face_indices))
        np.savez_compressed(OUT / "detail-basis-deltas.npz", basis=vertices, delta=delta,
                            **{f"region_{name}": indices for name, indices in labels.items()})
        report = {
            "status": "draft; unapproved likeness", "vertex_count": len(vertices),
            "source": "fitted-head.blend", "coordinate_units": "native FaceBuilder; downstream meter scale 0.1",
            "basis_sha256_float64": hashlib.sha256(vertices.tobytes()).hexdigest(),
            "maximum_displacement_native": float(np.linalg.norm(delta, axis=1).max()),
            "maximum_displacement_millimeters": float(np.linalg.norm(delta, axis=1).max() * 100),
            "changed_vertex_count": int(np.count_nonzero(np.linalg.norm(delta, axis=1) > 1e-10)),
            "regions": {name: indices.tolist() for name, indices in labels.items()},
            "transfer": "Verify source Basis matches saved basis, then add delta to mesh vertices and each of Basis + all 51 shape key data. Do not regenerate shapes or change topology after applying.",
            "validation": {"polygon_count": len(face_indices), "topology_unchanged": True,
                           "inverted_face_normals": int(np.count_nonzero(normal_dots < 0)),
                           "minimum_original_to_modified_face_normal_dot": float(normal_dots.min()),
                           "oral_fold_and_lower_lip_deltas": 0},
        }
        (OUT / "detail-basis-report.json").write_text(json.dumps(report, indent=2))
    scene, cam = setup_scene(obj)
    prefix = "detail-source" if args.inspect else "detailed-neutral"
    render_views(scene, cam, prefix, full=not args.inspect)
    if not args.inspect:
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "detailed-neutral-study.blend"))


if __name__ == "__main__":
    main()
