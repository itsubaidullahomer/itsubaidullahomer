"""Multi-view UV texture evidence on the fitted, freely rotatable head.

This study is explicitly photo-textured. It is not the final stylized material.
It tests registration of brows, lips, and other reference features to geometry.
"""
import bpy,sys,addon_utils,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild/facebuilder-study'
sys.path.insert(0,'/tmp/ubaid-avatar-tools/keentools-blender');addon_utils.enable('keentools',default_set=False,persistent=False)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'fitted-head.blend'))
from keentools.addon_config import fb_settings
from keentools.utils.materials import bake_tex,show_texture_in_mat
from keentools.utils.coords import update_head_mesh_neutral
s=fb_settings();s.current_headnum=0;h=s.get_head(0);s.loader().load_model(0)
s.tex_width=2048;s.tex_height=2048;s.tex_equalize_brightness=True;s.tex_equalize_colour=True;s.tex_fill_gaps=True
status=bake_tex(0,h.preview_texture_name());print('BAKE',status.success,status.error_message,flush=True)
assert status.success
h.set_neutral_expression_view();update_head_mesh_neutral(s.loader().get_builder(),h)
mat=show_texture_in_mat(h.preview_texture_name(),h.preview_material_name());h.headobj.data.materials.clear();h.headobj.data.materials.append(mat)
p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Roughness'].default_value=.70;p.inputs['Subsurface Weight'].default_value=.04;p.inputs['Subsurface Scale'].default_value=.03
tex=bpy.data.images[h.preview_texture_name()];tex.filepath_raw=str(OUT/'multiview-uv-study.png');tex.file_format='PNG';tex.save()
for o in bpy.data.objects:o.hide_render=o!=h.headobj
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=40;sc.render.resolution_x=900;sc.render.resolution_y=1000;sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX';sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.26,.28,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.6
for name,pos,power,size in [('Softbox',(-3,-4,5),400,4),('Fill',(3,-2,1),150,3),('Edge',(1,3,3),250,3)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);sc.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.1))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Texture review');cam=bpy.data.objects.new('Texture review',d);sc.collection.objects.link(cam);sc.camera=cam;d.type='ORTHO';d.ortho_scale=3.5
for angle in [0,30,90,330]:
 a=math.radians(angle);cam.location=(7*math.sin(a),-7*math.cos(a),-.05);cam.rotation_euler=(Vector((0,-.1,-.05))-cam.location).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(OUT/f'textured-{angle:03}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'textured-study.blend'))
