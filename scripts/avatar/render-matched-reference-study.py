"""Compare the real character through an existing reference-photo camera.

Photo expression is approximated with bounded native FACS weights. The report
records its residual; this is a diagnostic pose, never a likeness percentage.
The neutral geometry and all target deltas are left unchanged.
"""
import bpy, addon_utils, sys, json
from pathlib import Path
import numpy as np
from mathutils import Matrix

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/avatar/identity-rebuild/facebuilder-study'
OUT = BASE / 'matched-reference-review'
OUT.mkdir(exist_ok=True)
sys.path.insert(0, '/tmp/ubaid-avatar-tools/keentools-blender')
addon_utils.enable('keentools', default_set=False, persistent=False)
bpy.ops.wm.open_mainfile(filepath=str(BASE / 'fitted-head.blend'))
from keentools.addon_config import fb_settings
from keentools.utils.coords import geom_to_npbuffer
settings = fb_settings()
settings.current_headnum = 0
settings.loader().load_model(0)
source = settings.get_head(0)
builder = settings.loader().get_builder()
neutral = np.array([v.co[:] for v in source.headobj.data.vertices])
camera = source.cameras[0]
expression = geom_to_npbuffer(builder.applied_args_model_vertices_at(camera.get_keyframe()))
bpy.context.view_layer.update()
matrix = camera.camobj.matrix_world.copy()
camera_data = {name: getattr(camera.camobj.data, name) for name in ['lens', 'sensor_width', 'sensor_height', 'sensor_fit', 'shift_x', 'shift_y']}
width, height = camera.get_oriented_image_size()
info = json.loads((BASE / 'body-integration/integration-report.json').read_text())
scale = info['uniformScale']
translation = info['translationMeters']
bpy.ops.wm.open_mainfile(filepath=str(BASE / 'portrait-review-v20/warm-portrait.blend'))
scene = bpy.context.scene
head = next(o for o in scene.objects if o.type == 'MESH' and o.name.startswith('Ubaid_FaceBuilder_Head_Study'))
keys = head.data.shape_keys.key_blocks
basis = np.array([p.co[:] for p in keys[0].data])
names = [k.name for k in keys[1:] if not k.name.startswith('viseme_')]
mask = (neutral[:, 1] < -.55) & (neutral[:, 2] > -.85) & (neutral[:, 2] < .75)
A = np.stack([((np.array([p.co[:] for p in keys[name].data]) - basis) / scale)[mask].ravel() for name in names], axis=1)
b = (expression - neutral)[mask].ravel()
G, c = A.T @ A, A.T @ b
step = 1.0 / np.linalg.eigvalsh(G).max()
weights = np.zeros(len(names))
for _ in range(1800):
    weights = np.clip(weights - step * (G @ weights - c), 0, 1)
fit = {name: float(w) for name, w in zip(names, weights) if w > .001}
closed_lip_fit = {name: value for name, value in fit.items() if name not in {
    'jawOpen', 'mouthUpperUpLeft', 'mouthUpperUpRight',
    'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthShrugUpper',
}}
residual = (A @ weights - b).reshape(-1, 3)
camera = scene.camera
for name, value in camera_data.items():
    setattr(camera.data, name, value)
camera.data.type = 'PERSP'
camera.matrix_world = Matrix.Translation(translation) @ Matrix.Scale(scale, 4) @ matrix
scene.render.resolution_x, scene.render.resolution_y = width, height
scene.render.resolution_percentage = 100
scene.cycles.samples = 96
for label, pose in [('closed-lip-expression', closed_lip_fit)]:
    for obj in scene.objects:
        if obj.type in ('MESH', 'CURVE') and obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks[1:]:
                key.value = pose.get(key.name, 0)
    scene.render.filepath = str(OUT / (label + '-reference27.png'))
    bpy.ops.render.render(write_still=True)
(OUT / 'report.json').write_text(json.dumps({
    'reference': 27, 'camera': camera_data, 'weights': fit,
    'closedLipDiagnosticWeights': closed_lip_fit,
    'expressionApproximationRmsMeters': float(np.sqrt((residual ** 2).sum(1).mean()) * scale),
    'geometryEdited': False, 'likenessApproved': False,
    'note': 'Fixed original photo camera. FACS approximation is diagnostic only. Different lighting remains.'
}, indent=2))
