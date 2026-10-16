"""Validate the neutral study and render a slight turn for geometry review."""
import bpy,json,math,shutil
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/ubaid-neutral-study'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'ubaid-neutral-study.blend'))
scene=bpy.context.scene
report={'armatures':sum(o.type=='ARMATURE' for o in scene.objects),'shapeKeys':sum(bool(o.data.shape_keys) for o in scene.objects if o.type=='MESH'),'meshes':sum(o.type=='MESH' for o in scene.objects),'curves':sum(o.type=='CURVE' for o in scene.objects),'unpackedTextures':[i.name for i in bpy.data.images if i.source=='FILE' and not i.packed_file]}
assert report['armatures']==0 and report['shapeKeys']==0,report
assert not report['unpackedTextures'],report
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.data.orphans_purge(do_local_ids=True,do_linked_ids=True,do_recursive=True)
bpy.context.preferences.filepaths.save_version=0
# Store a helpful opening viewport in the editable source.
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.region_3d.view_perspective='CAMERA'
   area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ubaid-neutral-study.blend'))
shutil.copyfile(ROOT/'qa-output/avatar-study/neutral-front.png',OUT/'neutral-front.png')
# Camera-only studio background does not alter the lighting used for the model.
world=scene.world;nodes=world.node_tree.nodes;links=world.node_tree.links
background=nodes.new('ShaderNodeBackground');background.inputs[0].default_value=(.965,.957,.94,1);background.inputs[1].default_value=2**.15
lightpath=nodes.new('ShaderNodeLightPath');mix=nodes.new('ShaderNodeMixShader')
links.new(lightpath.outputs['Is Camera Ray'],mix.inputs[0]);links.new(nodes['Background'].outputs[0],mix.inputs[1]);links.new(background.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes['World Output'].inputs['Surface'])
scene.render.film_transparent=False
scene.render.filepath=str(OUT/'neutral-studio.png');bpy.ops.render.render(write_still=True)
cam=scene.camera;cam.location=(1.15,-4,.05);cam.rotation_euler=(Vector((0,-.15,0))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.cycles.samples=64;scene.render.resolution_percentage=80
scene.render.filepath=str(OUT/'neutral-angle.png');bpy.ops.render.render(write_still=True)
print('NEUTRAL_STUDY_VALIDATION',json.dumps(report))
