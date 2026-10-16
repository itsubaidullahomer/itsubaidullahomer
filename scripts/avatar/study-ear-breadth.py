"""Isolated ear-depth/breadth trial on the registered multiphoto head.

Source, existing detail deltas, and production avatar remain untouched. The
native Ears mask constrains the trial, with zero attachment-boundary motion.
It is a visual trial, not an automatic identity improvement or accepted mesh.
"""
import hashlib
import json
import sys
from pathlib import Path

import addon_utils
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/avatar/identity-rebuild/facebuilder-study"
OUT = SOURCE / "ear-breadth-study"
OUT.mkdir(exist_ok=True)
sys.path.insert(0, "/tmp/ubaid-avatar-tools/keentools-blender")
addon_utils.enable("keentools", default_set=False, persistent=False)
from keentools.addon_config import fb_settings
from keentools.facebuilder.fbloader import FBLoader
from keentools.blender_independent_packages.pykeentools_loader import module
from keentools.utils.coords import geom_to_npbuffer

status, _ = module().FaceBuilder.license_manager().perform_license_and_trial_check()
if status.trial_status.status != "succeed" and status.license_status.status != "succeed":
    raise RuntimeError("An active official local trial or license is required; no bypass.")

bpy.ops.wm.open_mainfile(filepath=str(SOURCE / "fitted-head.blend"))
settings = fb_settings()
settings.current_headnum = 0
assert FBLoader.load_model(0)
head = settings.get_head(0)
builder = FBLoader.get_builder()
obj = head.headobj
FBLoader.update_all_camera_positions(0)
FBLoader.update_all_camera_focals(0)
original = np.asarray([tuple(v.co) for v in obj.data.vertices])
detail = np.load(SOURCE / "detail-basis-deltas.npz")
assert np.array_equal(original, detail["basis"])
basis = original + detail["delta"]

flags = [True] * len(builder.masks())
flags[list(builder.mask_names()).index("Ears")] = False
masked = settings.loader().get_builder_mesh(builder, mesh_name="Temporary ear mask query", masks=flags)
remaining = {tuple(p.vertices) for p in masked.polygons}
ear_faces = [p.index for p in obj.data.polygons if tuple(p.vertices) not in remaining]
bpy.data.meshes.remove(masked)
ear_vertices = {v for i in ear_faces for v in obj.data.polygons[i].vertices}
other_vertices = {v for p in obj.data.polygons if p.index not in set(ear_faces) for v in p.vertices}
boundary = ear_vertices & other_vertices
neighbors = [set() for _ in original]
for edge in obj.data.edges:
    a, b = edge.vertices
    neighbors[a].add(b)
    neighbors[b].add(a)
distance = np.full(len(original), -1, dtype=int)
distance[list(boundary)] = 0
frontier = set(boundary)
for level in range(1, 30):
    next_frontier = {j for i in frontier for j in neighbors[i] if j in ear_vertices and distance[j] < 0}
    if not next_frontier:
        break
    distance[list(next_frontier)] = level
    frontier = next_frontier
weight = np.clip(distance / 5, 0, 1)
weight = weight * weight * (3 - 2 * weight)
weight[distance < 0] = 0

# Widen toward the posterior rim (+Y), preserving the front root and height.
# This is a conservative 12% breadth trial; the photos do not provide a scan.
delta = np.zeros_like(basis)
delta[:, 1] = .12 * np.maximum(basis[:, 1] + .13, 0) * weight
delta[np.linalg.norm(delta, axis=1) < 1e-7] = 0
assert not np.any(delta[list(boundary)])
assert not np.any(delta[[i for i in range(len(original)) if i not in ear_vertices]])

for item in bpy.data.objects:
    item.hide_render = item != obj
clay = bpy.data.materials.new("Ear trial matched clay")
clay.use_nodes = True
bsdf = clay.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (.34, .35, .36, 1)
bsdf.inputs["Roughness"].default_value = .74
obj.data.materials.clear()
obj.data.materials.append(clay)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 28
scene.cycles.use_denoising = True
scene.render.resolution_percentage = 100
scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.28, .30, .33, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = .5
for name, pos, power, size in [("Ear study key", (-3, -4, 5), 600, 4), ("Ear study fill", (3, -2, 1), 240, 3)]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.size, data.shape = power, size, "DISK"
    item = bpy.data.objects.new(name, data)
    scene.collection.objects.link(item)
    item.location = pos
    item.rotation_euler = (Vector((0, 0, -.05)) - item.location).to_track_quat("-Z", "Y").to_euler()

labels = [item["reference"] for item in json.loads((SOURCE / "fit-report.json").read_text())["references"]]
records = []
for camnum, camera in enumerate(head.cameras):
    kid = camera.get_keyframe()
    expression = geom_to_npbuffer(builder.applied_args_model_vertices_at(kid)).astype(np.float64)
    scene.camera = camera.camobj
    w, h = camera.get_oriented_image_size()
    scene.render.resolution_x, scene.render.resolution_y = w, h
    camera.camobj.data.clip_start, camera.camobj.data.clip_end = .01, 1000
    for variant, amount in [("before", 0), ("after", 1)]:
        coords = expression + detail["delta"] + amount * delta
        obj.data.vertices.foreach_set("co", coords.ravel())
        obj.data.update()
        scene.render.filepath = str(OUT / f"reference-{labels[camnum]}-{variant}.png")
        if "--skip-renders" not in sys.argv:
            bpy.ops.render.render(write_still=True)
    records.append({"reference": labels[camnum], "camera": camnum, "focal_mm": camera.focal,
                    "size": [w, h], "expression_keyframe": kid})

head.set_neutral_expression_view()
obj.data.vertices.foreach_set("co", basis.ravel())
obj.data.update()
normal_before = np.asarray([tuple(p.normal) for p in obj.data.polygons])
obj.data.vertices.foreach_set("co", (basis + delta).ravel())
obj.data.update()
normal_after = np.asarray([tuple(p.normal) for p in obj.data.polygons])
dots = np.sum(normal_before * normal_after, axis=1)
assert np.all(dots > 0)
np.savez_compressed(OUT / "ear-breadth-augmentation.npz", basis=basis, delta=delta,
                    ear_vertices=np.asarray(sorted(ear_vertices)), boundary=np.asarray(sorted(boundary)))
report = {"status": "isolated visual trial; review required", "fraction": .12, "root_pivot_y": -.13,
          "coordinate_units": "native FaceBuilder; downstream meter scale 0.1",
          "vertex_count": len(basis), "ear_faces": len(ear_faces), "ear_vertices": len(ear_vertices),
          "boundary_vertices": len(boundary), "changed_vertices": int(np.count_nonzero(np.linalg.norm(delta, axis=1) > 0)),
          "basis_sha256_float64": hashlib.sha256(basis.tobytes()).hexdigest(),
          "maximum_delta_native": float(np.linalg.norm(delta, axis=1).max()),
          "maximum_delta_mm": float(np.linalg.norm(delta, axis=1).max() * 100),
          "minimum_face_normal_dot": float(dots.min()), "references": records,
          "transfer": "This is augmentation relative to existing detailed basis. Verify basis, then apply delta to every shape key. Do not replace or overwrite original detail-basis-deltas.npz."}
(OUT / "ear-breadth-report.json").write_text(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "ear-breadth-neutral.blend"))
print("EAR_BREADTH_REPORT", json.dumps(report))
