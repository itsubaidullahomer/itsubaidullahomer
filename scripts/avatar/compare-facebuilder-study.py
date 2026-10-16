"""Camera-matched, untextured evidence for the licensed local FaceBuilder fit.

Reads the neutral fit without saving it. Reference image bytes are embedded
unchanged in a private review HTML, never copied to public website assets.
"""
import sys
import json
import math
import base64
import html
from pathlib import Path
import bpy
import addon_utils
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/avatar/identity-rebuild/facebuilder-study'
sys.path.insert(0, '/tmp/ubaid-avatar-tools/keentools-blender')
addon_utils.enable('keentools', default_set=False, persistent=False)
from keentools.addon_config import fb_settings
from keentools.facebuilder.fbloader import FBLoader
from keentools.blender_independent_packages.pykeentools_loader import module
from keentools.utils.coords import update_head_mesh_non_neutral

status, _ = module().FaceBuilder.license_manager().perform_license_and_trial_check()
if status.trial_status.status != 'succeed' and status.license_status.status != 'succeed':
    raise RuntimeError('An active FaceBuilder trial or license is required; no bypass.')
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'fitted-head.blend'))
settings = fb_settings()
settings.current_headnum = 0
assert FBLoader.load_model(0)
head = settings.get_head(0)
builder = FBLoader.get_builder()
obj = head.headobj
FBLoader.update_all_camera_positions(0)
FBLoader.update_all_camera_focals(0)

for item in bpy.data.objects:
    item.hide_render = item != obj
clay = bpy.data.materials.new('Matched camera clay — no image texture')
clay.use_nodes = True
bsdf = clay.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.34, .35, .36, 1)
bsdf.inputs['Roughness'].default_value = .74
obj.data.materials.clear()
obj.data.materials.append(clay)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 28
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
scene.render.resolution_percentage = 100
scene.render.pixel_aspect_x = 1
scene.render.pixel_aspect_y = 1
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.28, .30, .33, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .5

def light(name, location, power, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    item = bpy.data.objects.new(name, data)
    scene.collection.objects.link(item)
    item.location = location
    item.rotation_euler = (Vector((0, 0, -.05)) - item.location).to_track_quat('-Z', 'Y').to_euler()
    return item

key = light('Matched review key', (-3, -4, 5), 600, 4)
fill = light('Matched review fill', (3, -2, 1), 240, 3)
records = []
report = json.loads((OUT / 'fit-report.json').read_text())
labels = [item['reference'] for item in report['references']]
for camnum, camera in enumerate(head.cameras):
    settings.current_camnum = camnum
    kid = camera.get_keyframe()
    head.expression_view = str(kid)
    update_head_mesh_non_neutral(builder, head)
    scene.camera = camera.camobj
    w, h = camera.get_oriented_image_size()
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.camera.data.clip_start = .01
    scene.camera.data.clip_end = 1000
    label = labels[camnum]
    filename = f'matched-reference-{label}.png'
    scene.render.filepath = str(OUT / filename)
    if '--report-only' not in sys.argv:
        bpy.ops.render.render(write_still=True)
    residuals = []
    for pin in builder.projected_pins(kid):
        a = [float(value) for value in pin.img_pos]
        b = [float(value) for value in pin.surface_point]
        residuals.append({'observed': a, 'projected': b, 'distance': math.dist(a, b)})
    errors = [p['distance'] for p in residuals]
    records.append({
        'reference': label, 'camera': camnum, 'keyframe': kid,
        'image': camera.get_abspath(), 'render': filename, 'size': [w, h],
        'orientation_quarter_turns': camera.orientation,
        'auto_focal_estimation': camera.auto_focal_estimation,
        'focal_mm': camera.focal,
        'focal_pixels': float(builder.focal_length_at(kid)),
        'sensor_fit': camera.camobj.data.sensor_fit,
        'pins': builder.pins_count(kid), 'residuals_pixels': residuals,
        'residual_rms_pixels': math.sqrt(sum(e*e for e in errors)/len(errors)) if errors else None,
        'residual_max_pixels': max(errors) if errors else None,
        'camera_matrix_world': [list(row) for row in camera.camobj.matrix_world],
    })

head.set_neutral_expression_view()
update_head_mesh_non_neutral(builder, head)
summary = {
    'focal_mode': builder.focal_length_estimation_mode(),
    'use_emotions': builder.use_emotions(),
    'references': records,
    'note': 'RMS measures agreement with automatic pins, not identity or photographic accuracy. No source blend saved.',
}
(OUT / 'matched-camera-report.json').write_text(json.dumps(summary, indent=2))

def data_uri(path):
    return 'data:image/png;base64,' + base64.b64encode(Path(path).read_bytes()).decode()

sections = []
for record in records:
    label = record['reference']
    source = data_uri(record['image'])
    rendered = data_uri(OUT / record['render'])
    sections.append(f'''<section>
      <h2>Reference {label}</h2>
      <p>{record['pins']} automatic pins · independently estimated focal {record['focal_mm']:.1f} mm ·
      pin RMS {record['residual_rms_pixels']:.2f} px (fit consistency, not likeness)</p>
      <div class="pair"><figure><img src="{source}"><figcaption>Original photo, unchanged</figcaption></figure>
      <figure><img src="{rendered}"><figcaption>Untextured geometry · matched camera and expression</figcaption></figure></div>
      <details><summary>Compare in the same frame</summary><label>Clay opacity <input type="range" min="0" max="100" value="50" oninput="this.closest('details').querySelector('.clay').style.opacity=this.value/100"></label>
      <div class="overlay"><img src="{source}"><img class="clay" style="opacity:.5" src="{rendered}"></div></details>
      </section>''')
document = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>FaceBuilder camera evidence — private draft</title><style>
*{box-sizing:border-box}body{margin:0 auto;max-width:1200px;padding:36px 24px;background:#f0efec;color:#232323;font:16px/1.5 system-ui}h1{line-height:1.15;font-size:30px}h2{margin-bottom:6px}p{color:#555}section{margin:40px 0 64px;border-top:1px solid #ccc;padding-top:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}figure{margin:0;background:#d4d4d4;border-radius:12px;overflow:hidden}figure img{width:100%;height:auto;display:block}figcaption{padding:12px;background:#fff}summary{cursor:pointer;padding:16px 0}label{display:flex;gap:20px;align-items:center;padding-bottom:12px}.overlay{position:relative;max-width:800px;margin:auto}.overlay img{width:100%;display:block}.overlay .clay{position:absolute;inset:0}small{color:#666}
</style><h1>Camera-matched geometry review</h1><p>Private, unapproved model study. Each gray head is actual 3D geometry rendered through the fitted photograph's camera, with the fitted expression for that view. No photo texture is applied. The reference photographs below are unchanged.</p><p>Neutral likeness still needs front/profile review. Hair, skin, brows and beard are deliberately absent. Small pin residuals do not prove likeness; inspect contours and unconstrained features.</p>'''+''.join(sections)+'''<small>Generated locally in Blender. Source neutral file was not modified. Do not publish this page; it embeds private reference photographs.</small></html>'''
(OUT / 'matched-camera-review.html').write_text(document)
print('MATCHED_CAMERA_REPORT', json.dumps({k: v for k, v in summary.items() if k != 'references'}))
print('PER_VIEW', json.dumps([{k: v for k, v in r.items() if k not in ['residuals_pixels', 'camera_matrix_world', 'image']} for r in records]))
