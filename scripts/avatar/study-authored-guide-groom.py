"""Independent explicit-guide wave groom; no portrait projection or shared edits.

Uses only the v9 scalp substrate and short side/back fibers. Main locks have
finite Hermite tangents, transported frames, broad root patches and free tips.
Default creates sparse evidence; --dense generates fine fibers after review.
"""
import argparse
import bpy
import json
import math
import random
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets/avatar/identity-rebuild/facebuilder-study"
OUT = BASE / "authored-guide-groom"
OUT.mkdir(exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument("--dense", action="store_true")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
bpy.ops.wm.open_mainfile(filepath=str(BASE / "groom-refinement/fiber-groom-refined-v9.blend"))
head = bpy.data.objects["FBHead"]
bvh = BVHTree.FromPolygons([v.co for v in head.data.vertices], [list(p.vertices) for p in head.data.polygons])
rng = random.Random(6232005)

def material(name, rgb, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*rgb, 1)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Specular IOR Level"].default_value = .2
    return mat

hair = material("Authored wave near black", (.007, .0055, .0045), .62)
guide_mat = material("Sparse copper guide evidence", (.50, .16, .04), .48)

def curves(name, radius, mat):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 1
    data.bevel_depth = radius
    data.bevel_resolution = 1 if not args.dense else 0
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(mat)
    return data

def strand(data, points, radius=1, taper=True):
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for i, (point, position) in enumerate(zip(spline.points, points)):
        t = i / (len(points) - 1)
        point.co = (*position, 1)
        point.radius = radius * (max(.04, 1 - t**4) if taper else 1)

# Reuse only actual short surface-following fibers; remove every old top lock.
undercoat_lines = []
for ob in list(bpy.data.objects):
    if ob.type != "CURVE":
        continue
    for spline in ob.data.splines:
        if len(spline.points) == 3:
            undercoat_lines.append([(Vector(p.co[:3]), p.radius) for p in spline.points])
    bpy.data.objects.remove(ob, do_unlink=True)
undercoat = curves("Existing v9 short undercoat", .00072, hair)
for line in undercoat_lines:
    strand(undercoat, [p for p, _ in line], line[0][1])
cap = bpy.data.objects.get("Continuous scalp substrate")
cap.data.materials.clear()
cap.data.materials.append(hair)

def scalp_root(x, y):
    hit = bvh.ray_cast(Vector((x, y, 3)), Vector((0, 0, -1)))
    if hit[0] is None or hit[0].z < .8:
        raise RuntimeError(f"Guide root is not on the upper scalp: {x}, {y}")
    return hit[0] + hit[1] * .004, hit[1]

# Roots are behind the visible frontal edge. Locks curve toward that edge;
# front stems do not shoot vertically from forehead roots into a common shelf.
SPECS = [
    ("Left loose fringe", (-.20, -.25), [(-.30, -.40, 1.39), (-.43, -.64, 1.38), (-.50, -.86, 1.16), (-.35, -1.01, .95), (-.22, -1.025, 1.00)], .12, .035, 1300),
    ("Center left wave", (.08, -.18), [(-.04, -.35, 1.46), (-.22, -.60, 1.44), (-.30, -.83, 1.20), (-.15, -1.01, 1.04), (-.04, -1.02, 1.075)], .12, .035, 1300),
    ("Center roll", (.32, -.25), [(.21, -.42, 1.43), (.07, -.62, 1.47), (-.02, -.84, 1.31), (.11, -.96, 1.18), (.23, -.93, 1.25)], .12, .032, 1300),
    ("Right high wave", (.55, -.25), [(.52, -.48, 1.31), (.40, -.68, 1.44), (.27, -.83, 1.41), (.36, -.86, 1.30)], .11, .032, 1150),
    ("Right temple blend", (.66, .02), [(.75, -.15, 1.25), (.73, -.42, 1.40), (.59, -.62, 1.42), (.48, -.75, 1.33)], .10, .030, 1000),
    ("Left temple blend", (-.58, .08), [(-.70, -.10, 1.27), (-.78, -.38, 1.27), (-.75, -.62, 1.14), (-.65, -.78, 1.02)], .10, .030, 1000),
    ("Left crown overlap", (-.40, .40), [(-.42, .20, 1.36), (-.25, -.05, 1.47), (-.13, -.30, 1.43), (-.18, -.50, 1.34)], .14, .035, 1250),
    ("Center crown overlap", (0, .50), [(.04, .29, 1.40), (.20, .08, 1.48), (.21, -.21, 1.47), (.14, -.40, 1.40)], .14, .035, 1250),
    ("Right crown overlap", (.40, .35), [(.55, .12, 1.31), (.50, -.11, 1.44), (.40, -.31, 1.43), (.31, -.47, 1.36)], .13, .034, 1150),
]

def guide_points(nodes, normal, samples=65):
    tangents = []
    preferred = nodes[1] - nodes[0]
    planar = preferred - normal * preferred.dot(normal)
    if planar.length < 1e-7:
        raise RuntimeError("A root has no usable scalp tangent")
    tangents.append(planar.normalized() * min(.15, preferred.length) + normal * .045)
    for i in range(1, len(nodes) - 1):
        tangents.append((nodes[i+1] - nodes[i-1]) * .42)
    tangents.append((nodes[-1] - nodes[-2]) * .65)
    points = []
    for j in range(samples):
        t = j / (samples - 1) * (len(nodes) - 1)
        i = min(len(nodes) - 2, int(t))
        u = t - i
        point = ((2*u**3 - 3*u**2 + 1) * nodes[i]
                 + (u**3 - 2*u**2 + u) * tangents[i]
                 + (-2*u**3 + 3*u**2) * nodes[i+1]
                 + (u**3 - u**2) * tangents[i+1])
        points.append(point)
    return points

def transported_frames(points, normal):
    tangents = [(points[min(i+1, len(points)-1)] - points[max(i-1, 0)]).normalized() for i in range(len(points))]
    side = tangents[0].cross(normal)
    if side.length < 1e-6:
        side = tangents[0].cross(Vector((1, 0, 0)))
    side.normalize()
    frames = [(side.copy(), side.cross(tangents[0]).normalized())]
    for i in range(1, len(points)):
        side = tangents[i-1].rotation_difference(tangents[i]) @ side
        side = (side - tangents[i] * side.dot(tangents[i])).normalized()
        frames.append((side.copy(), side.cross(tangents[i]).normalized()))
    return frames

def clearance(point, amount=.004):
    hit = bvh.find_nearest(point)
    if hit[0] is not None:
        distance = (point - hit[0]).dot(hit[1])
        if distance < amount:
            return point + hit[1] * (amount - distance)
    return point

data = curves("Dense authored wave fibers" if args.dense else "Sparse authored guide paths", .00048 if args.dense else .010, hair if args.dense else guide_mat)
guide_records = []
for name, root_xy, waypoint_values, width, depth, count in SPECS:
    root, normal = scalp_root(*root_xy)
    nodes = [root] + [Vector(p) for p in waypoint_values]
    centerline = guide_points(nodes, normal)
    frames = transported_frames(centerline, normal)
    if not args.dense:
        strand(data, [clearance(p) for p in centerline], taper=False)
    else:
        for fiber in range(count):
            u = max(-1, min(1, rng.gauss(0, .46)))
            v = max(-1, min(1, rng.gauss(0, .45)))
            phase = rng.uniform(0, 2*math.pi)
            end_fraction = rng.uniform(.86, 1)
            layer = rng.uniform(.28, 1.0)
            positions = []
            for i, (center, (side, outward)) in enumerate(zip(centerline, frames)):
                t = i / (len(centerline) - 1)
                if t > end_fraction:
                    break
                tip = max(.10, 1 - .88 * t**3)
                # Broad root patch, gradual narrowing and small coherent bend.
                pos = center + side * (u * width * tip) + outward * (v * depth * tip)
                pos += outward * (.009 * math.sin(2*math.pi*t + phase) * math.sin(math.pi*t)**2)
                # Lower interleaved paths fill the lock's volume instead of
                # cloning a single hollow arch at its outermost clearance.
                nearest = bvh.find_nearest(pos)
                if nearest[0] is not None:
                    pos = nearest[0] + (pos - nearest[0]) * layer
                if i == 0:
                    nearest = bvh.find_nearest(pos)
                    root_correction = nearest[0] + nearest[1] * .004 - pos
                pos += root_correction * max(0, 1 - t/.22)**2
                positions.append(clearance(pos))
            strand(data, positions, rng.uniform(.65, 1.05))
    guide_records.append({"name": name, "root": list(root), "waypoints": waypoint_values, "width": width, "depth": depth, "fiber_count": count if args.dense else 1})

scene = bpy.context.scene
scene.cycles.samples = 32
scene.render.resolution_x, scene.render.resolution_y = 800, 900
scene.render.resolution_percentage = 100
cam = scene.camera
cam.data.ortho_scale = 3.7
mode = "dense" if args.dense else "sparse"
for angle in [0, 30, 90]:
    a = math.radians(angle)
    cam.location = (7 * math.sin(a), -7 * math.cos(a), .08)
    cam.rotation_euler = (Vector((0, -.1, .08)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(OUT / f"{mode}-{angle:03}.png")
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f"{mode}-guide-study.blend"))
(OUT / f"{mode}-report.json").write_text(json.dumps({"status": "isolated guide study; not accepted likeness", "mode": mode, "guide_count": len(SPECS), "undercoat_strands": len(undercoat_lines), "guides": guide_records}, indent=2))
