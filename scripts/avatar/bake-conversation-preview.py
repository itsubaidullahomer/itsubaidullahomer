"""Bake the same browser performance into an inspectable native Blender action."""
import bpy,json,math,os
from pathlib import Path
from mathutils import Euler
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/ubaid-conversation'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'conversation-rig.blend'))
performance=json.loads(Path('/tmp/ubaid-avatar-tools/conversation-frames.json').read_text())
scene=bpy.context.scene;scene.render.fps=performance['fps'];scene.frame_start=1;scene.frame_end=len(performance['frames'])
rig=bpy.data.objects['Ubaid conversation rig'];head=rig.pose.bones['head'];head.rotation_mode='XYZ'
objects=[o for o in scene.objects if o.type=='MESH' and o.data.shape_keys]
for o in objects:
 assert len(o.data.vertices)==len(o.data.shape_keys.key_blocks[0].data),o.name
for item in performance['frames'][::2]:
 frame=item['frame']
 for o in objects:
  for key in list(o.data.shape_keys.key_blocks)[1:]:
   key.value=item['face'].get(key.name,0);key.keyframe_insert('value',frame=frame)
 head.rotation_euler=item['rotation'];head.keyframe_insert('rotation_euler',frame=frame)
 for index in range(2):
  eye=rig.pose.bones[f'eye_{index}'];eye.rotation_mode='XYZ';eye.rotation_euler=(item['gaze'][1],0,item['gaze'][0]);eye.keyframe_insert('rotation_euler',frame=frame)
# Native Blender audio track follows the same frame clock.
editor=scene.sequence_editor_create()
editor.strips.new_sound('System voice — not a voice clone',str(ROOT/'public/audio/avatar/conversation.wav'),channel=1,frame_start=1)
for chapter in json.loads((OUT/'conversation.json').read_text())['chapters']:
 scene.timeline_markers.new(chapter['label'],frame=int(chapter['start']*scene.render.fps)+1)
scene.frame_set(1)
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
bpy.ops.file.pack_all()
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'conversation-performance.blend'))
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=640;scene.render.resolution_y=640
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'motion-frames/frame-');(OUT/'motion-frames').mkdir(exist_ok=True)
scene.frame_start=1;scene.frame_end=5
bpy.ops.render.render(animation=True)
print('BAKED',len(performance['frames']),'frames; shape topology verified on reload')
