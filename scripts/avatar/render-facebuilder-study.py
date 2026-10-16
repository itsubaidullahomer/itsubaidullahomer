"""Untextured, neutral lighting evidence for the fitted head geometry."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild/facebuilder-study'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'fitted-head.blend'))
obj=next(o for o in bpy.data.objects if o.type=='MESH')
for o in bpy.data.objects:
    o.hide_render=o!=obj
clay=bpy.data.materials.new('Neutral clay — geometry evidence');clay.use_nodes=True
p=clay.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.36,.34,.32,1);p.inputs['Roughness'].default_value=.75
obj.data.materials.clear();obj.data.materials.append(clay)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.23,.25,.28,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
def light(name,position,power,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=position;o.rotation_euler=(Vector((0,0,.1))-o.location).to_track_quat('-Z','Y').to_euler()
light('Large soft key',(-3,-4,5),550,4);light('Quiet fill',(3,-2,1),180,3);light('Edge',(1,3,3),350,3)
d=bpy.data.cameras.new('Clay review');cam=bpy.data.objects.new('Clay review',d);scene.collection.objects.link(cam);scene.camera=cam
d.type='ORTHO';d.ortho_scale=3.5
for angle in [0,30,90,180,270,330]:
    a=math.radians(angle);cam.location=(7*math.sin(a),-7*math.cos(a),-.05)
    cam.rotation_euler=(Vector((0,-.1,-.05))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/f'clay-{angle:03}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'clay-review.blend'))
