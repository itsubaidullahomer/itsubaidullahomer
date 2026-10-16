"""Build the free, editable Phase 2 bust. Run with Blender --background --python.
Requires the pinned MPFB source and CC0 packs listed in assets/avatar/ubaid-v2/manifest.json.
AVATAR_TOOL_ROOT points at the unpacked tools; no external API or paid service is used.
"""
import bpy, sys, os, math, json, shutil
from pathlib import Path
from mathutils import Vector
import addon_utils
ROOT=Path(__file__).resolve().parents[2]
TOOLS=Path(os.environ.get('AVATAR_TOOL_ROOT','/tmp/ubaid-avatar-tools'))
sys.path.insert(0,str(TOOLS/'mpfb2/src'))
bpy.utils.extension_path_user=lambda *args,**kwargs: str(TOOLS/'mpfb-user')
shutil.copytree(TOOLS/'functional',TOOLS/'mpfb-user/data',dirs_exist_ok=True)
shutil.copytree(TOOLS/'system',TOOLS/'mpfb-user/data',dirs_exist_ok=True)
addon_utils.enable('mpfb',default_set=True,persistent=False)
from mpfb.services.humanservice import HumanService
from mpfb.services.targetservice import TargetService
from mpfb.services.faceservice import FaceService
from mpfb.services.exportservice import ExportService
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
macro=TargetService.get_default_macro_info_dict()
macro.update(gender=1.0,age=0.32,muscle=0.45,weight=0.4,proportions=0.5)
base=HumanService.create_human(macro_detail_dict=macro)
base.name='Ubaid_Face'
shape={
 'head/head-oval':0.55,'head/head-scale-vert-incr':0.16,'head/head-scale-horiz-decr':0.05,
 'chin/chin-width-decr':0.20,'chin/chin-prominent-incr':0.15,
 'nose/nose-scale-horiz-decr':0.25,'nose/nose-scale-vert-incr':0.12,
 'nose/nose-point-width-incr':0.12,'nose/nose-curve-concave':0.12,
 'mouth/mouth-scale-horiz-incr':0.12,'mouth/mouth-upperlip-volume-decr':0.08,
 'mouth/mouth-lowerlip-volume-incr':0.12,'mouth/mouth-angles-up':0.12,
 'eyes/l-eye-scale-incr':0.55,'eyes/r-eye-scale-incr':0.55,
 'eyes/l-eye-height1-incr':0.35,'eyes/r-eye-height1-incr':0.35,
 'eyes/l-eye-height2-incr':0.45,'eyes/r-eye-height2-incr':0.45,
 'eyes/l-eye-height3-incr':0.3,'eyes/r-eye-height3-incr':0.3,
 'mouth/mouth-scale-vert-decr':0.32,
 'cheek/l-cheek-bones-incr':0.14,'cheek/r-cheek-bones-incr':0.14,
}
for fragment,weight in shape.items():
 TargetService.load_target(base,str(TOOLS/'mpfb2/src/mpfb/data/targets'/f'{fragment}.target.gz'),weight=weight)
TargetService.bake_targets(base)

def center(group):
 index=base.vertex_groups[group].index
 vv=[v.co for v in base.data.vertices if any(g.group==index for g in v.groups)]
 return sum(vv,Vector())/len(vv)
landmarks={g:list(center(g)) for g in ['joint-head','joint-head-2','joint-neck','joint-jaw','joint-mouth','joint-l-eye','joint-r-eye']}
print('LANDMARKS',json.dumps(landmarks))
rig=HumanService.add_builtin_rig(base,'default')
rig.name='Ubaid_Rig'

def equip(fragment,kind,name):
 obj=HumanService.add_mhclo_asset(str(TOOLS/'system'/fragment),base,asset_type=kind,subdiv_levels=0,material_type='MAKESKIN')
 obj.name=name
 return obj

eyes=equip('eyes/high-poly/high-poly.mhclo','Eyes','Ubaid_Eyes')
teeth=equip('teeth/teeth_base/teeth_base.mhclo','Teeth','Ubaid_Teeth')
tongue=equip('tongue/tongue01/tongue01.mhclo','Tongue','Ubaid_Tongue')
shirt=equip('clothes/male_casualsuit01/male_casualsuit01.mhclo','Clothes','Ubaid_Shirt')
brows=equip('eyebrows/eyebrow001/eyebrow001.mhclo','Eyebrows','Ubaid_Brows')
hair=equip('hair/short04/short04.mhclo','Hair','Ubaid_Hair')

def material(name,color,roughness=.55):
 mat=bpy.data.materials.new(name);mat.use_nodes=True
 bsdf=mat.node_tree.nodes.get('Principled BSDF')
 bsdf.inputs['Base Color'].default_value=(*color,1);bsdf.inputs['Roughness'].default_value=roughness
 return mat

def assign(obj,mat): obj.data.materials.clear();obj.data.materials.append(mat)
skin=material('Warm clay skin',(0.48,0.235,0.125),.6)
skin.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.09
assign(base,skin)
lip=material('Natural warm lips',(0.32,0.105,0.075),.56);base.data.materials.append(lip)
lipsid=base.vertex_groups['lips'].index
lipverts={v.index for v in base.data.vertices if any(g.group==lipsid for g in v.groups)}
for p in base.data.polygons:
 if all(v in lipverts for v in p.vertices):p.material_index=1
assign(shirt,material('Off white cotton',(0.87,.85,.81),.88))
assign(teeth,material('Teeth ivory',(.78,.73,.62),.4))
assign(tongue,material('Mouth interior',(.20,.045,.035),.6))
hairmat=material('Sculpted near black hair',(.019,.011,.009),.42)
assign(hair,hairmat)
# Preserve alpha eyebrow material; it is fitted and receives the expression shapes.
for mat in brows.data.materials:
 if mat and mat.use_nodes:
  bsdf=mat.node_tree.nodes.get('Principled BSDF')
  if bsdf:bsdf.inputs['Roughness'].default_value=.8
# A portable glTF-compatible eye material using the CC0 brown-eye texture.
eyemat=material('Brown eyes',(1,1,1),.23)
tex=eyemat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(TOOLS/'system/eyes/materials/brown_eye.png'))
eyemat.node_tree.links.new(tex.outputs['Color'],eyemat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
assign(eyes,eyemat)
# Load the neutral-topology face rig and propagate its deformations to teeth/eyes/brows.
FaceService.load_targets(base,load_microsoft_visemes=False,load_meta_visemes=True,load_arkit_faceunits=True)
print('TARGETS BEFORE INTERPOLATION',[k.name for k in base.data.shape_keys.key_blocks])
FaceService.interpolate_targets(base)
ExportService.bake_modifiers_remove_helpers(base,bake_masks=True,bake_subdiv=False,remove_helpers=True)
# Restrict the model to the portrait bust, keeping matching shape-key topology.
cut=landmarks['joint-neck'][2]-.12
for obj in list(bpy.data.objects):
 if obj.type!='MESH':continue
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 for v in obj.data.vertices:v.select=v.co.z<cut
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.delete(type='VERT');bpy.ops.object.mode_set(mode='OBJECT')
 for p in obj.data.polygons:p.use_smooth=True
 # A level cut makes a clean bust silhouette without altering facial topology.
 edgeUse={}
 for poly in obj.data.polygons:
  for edge in poly.edge_keys:edgeUse[edge]=edgeUse.get(edge,0)+1
 boundary={i for edge,count in edgeUse.items() if count==1 for i in edge}
 for i in boundary:
  if obj.data.vertices[i].co.z<cut+.05:
   obj.data.vertices[i].co.z=cut
   if obj.data.shape_keys:
    for key in obj.data.shape_keys.key_blocks:key.data[i].co.z=cut
 # Keep only nonzero morphs; a static shirt should not carry 67 empty targets.
 if obj.data.shape_keys:
  basis=obj.data.shape_keys.key_blocks[0]
  for key in list(obj.data.shape_keys.key_blocks)[1:]:
   key.name=key.name.removeprefix('!ex-')
   key.name={'viseme_I':'viseme_ih','viseme_O':'viseme_oh','viseme_U':'viseme_ou'}.get(key.name,key.name)
   if not any((a.co-b.co).length>1e-6 for a,b in zip(key.data,basis.data)):obj.shape_key_remove(key)
# Sculpt broad swept locks on top of the fitted hair shell; every lock follows the head bone.
headtop=max(v.co.z for v in base.data.vertices)
eyeZ=landmarks['joint-l-eye'][2]
frontY=landmarks['joint-l-eye'][1]-.015

def lock(name,points,radius):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=12
 curve.bevel_depth=radius;curve.bevel_resolution=3
 spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
 for i,(bp,point) in enumerate(zip(spline.bezier_points,points)):
  bp.co=point;bp.handle_left_type='AUTO';bp.handle_right_type='AUTO';bp.radius=[.35,1,.85,.12][min(i,3)]
 obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);curve.materials.append(hairmat)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
 obj=bpy.context.object
 # Bone weighting avoids object-parent inverse ambiguity at export.
 vg=obj.vertex_groups.new(name='head');vg.add(list(range(len(obj.data.vertices))),1,'REPLACE')
 mod=obj.modifiers.new('Head skinning','ARMATURE');mod.object=rig;obj.parent=rig
 for p in obj.data.polygons:p.use_smooth=True
 return obj
# Bake a blended reference projection into the original UV atlas. This keeps a
# conventional editable texture and fades the reference into the side/neck skin.
bpy.data.objects.remove(brows,do_unlink=True)
originalUV=base.data.uv_layers.active
projectionUV=base.data.uv_layers.new(name='Reference projection')
mask=base.data.color_attributes.new(name='Reference blend',type='FLOAT_COLOR',domain='CORNER')
for loop in base.data.loops:
 v=base.data.vertices[loop.vertex_index].co
 projectionUV.data[loop.index].uv=(.497+v.x/.3665,.673+(v.z-eyeZ)/.416)
 w=max(0,min(1,(-v.y-.062)/.035))*max(0,min(1,(v.z-landmarks['joint-neck'][2])/.045))
 for side in ['l','r']:
  eye=Vector(landmarks[f'joint-{side}-eye'])
  d=((v.x-eye.x)/.022)**2+((v.z-eye.z)/.012)**2
  w*=max(0,min(1,(d-.45)/.6))
 mask.data[loop.index].color=(w,w,w,1)
faceMat=material('Character skin',(.35,.145,.075),.7)
nodes=faceMat.node_tree.nodes;links=faceMat.node_tree.links
faceTex=nodes.new('ShaderNodeTexImage');faceTex.image=bpy.data.images.load(str(ROOT/'assets/avatar/ubaid-v1/master.png'))
uvNode=nodes.new('ShaderNodeUVMap');uvNode.uv_map=projectionUV.name;links.new(uvNode.outputs['UV'],faceTex.inputs['Vector'])
attribute=nodes.new('ShaderNodeVertexColor');attribute.layer_name=mask.name
mix=nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.35,.145,.075,1)
links.new(attribute.outputs['Color'],mix.inputs[0]);links.new(faceTex.outputs['Color'],mix.inputs[2])
output=nodes.get('Material Output');emission=nodes.new('ShaderNodeEmission');links.new(mix.outputs[0],emission.inputs['Color']);links.new(emission.outputs[0],output.inputs['Surface'])
assign(base,faceMat)
for poly in base.data.polygons:poly.material_index=0
baked=bpy.data.images.new('Ubaid face albedo',width=2048,height=2048,alpha=False)
bakeNode=nodes.new('ShaderNodeTexImage');bakeNode.image=baked;nodes.active=bakeNode
base.data.uv_layers.active=originalUV;originalUV.active_render=True
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=1
bpy.ops.object.select_all(action='DESELECT');base.select_set(True);bpy.context.view_layer.objects.active=base
bpy.context.scene.render.bake.margin=12
bpy.ops.object.bake(type='EMIT')
baked.filepath_raw=str(ROOT/'assets/avatar/ubaid-v2/face-albedo.png');baked.file_format='PNG';baked.save()
bsdf=nodes.get('Principled BSDF');links.new(bakeNode.outputs['Color'],bsdf.inputs['Base Color']);links.new(bsdf.outputs[0],output.inputs['Surface'])
for n in [faceTex,uvNode,attribute,mix,emission]:nodes.remove(n)
base.data.uv_layers.remove(projectionUV)
# Replace the card-based hair shell with a closed, editable stylized cap.
bpy.data.objects.remove(hair,do_unlink=True)
hairmat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.78
hairmat.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.16
verts=[];faces=[];rings=16;steps=64
for j in range(rings+1):
 a=(j/rings)*(math.pi/2-.008)
 for i in range(steps):
  p=2*math.pi*i/steps
  front=max(0,math.cos(p))
  edge=eyeZ-.014+.066*front**3
  z=edge+(headtop+.018-edge)*math.sin(a)
  radius=math.cos(a)
  verts.append((.083*math.sin(p)*radius,-.038-.100*math.cos(p)*radius,z))
for j in range(rings):
 for i in range(steps):
  a=j*steps+i;b=j*steps+(i+1)%steps;faces.append((a,b,b+steps,a+steps))
mesh=bpy.data.meshes.new('Hair cap');mesh.from_pydata(verts,[],faces);mesh.update()
cap=bpy.data.objects.new('Sculpted_hair_cap',mesh);bpy.context.collection.objects.link(cap);mesh.materials.append(hairmat)
vg=cap.vertex_groups.new(name='head');vg.add(list(range(len(verts))),1,'REPLACE')
mod=cap.modifiers.new('Head skinning','ARMATURE');mod.object=rig;cap.parent=rig
for p in mesh.polygons:p.use_smooth=True
# Swept arcs run across the crest, with gently varied lengths and widths.
for i in range(7):
 y=frontY+.005+i*.013
 z=headtop-.061+i*.006
 lock(f'Swept_lock_{i}',[(-.073,y,z),(-.045,y-.016,z+.060),(.016+i*.002,y+.008,headtop+.025-i*.002),(.064,y+.055,headtop-.024)],.011+(i%3)*.002)
for i in range(7):
 y=frontY+i*.013
 lock(f'Hair_detail_{i}',[(-.072,y,headtop-.065+i*.006),(-.047,y-.02,headtop+.001+i*.005),(.025,y+.012,headtop+.022-i*.002),(.067,y+.05,headtop-.026)],.002)
# Matte sclera and individually modeled iris/pupil surfaces are clearer at hero size.
assign(eyes,material('Eye sclera',(.76,.74,.68),.48))
irisMat=material('Warm brown iris',(.11,.047,.021),.45)
pupilMat=material('Pupil',(.006,.004,.003),.38)
for side in ['l','r']:
 ec=Vector(landmarks[f'joint-{side}-eye'])
 for label,radius,mat,depth in [('Iris',.0070,irisMat,.0160),('Pupil',.0028,pupilMat,.0164)]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=1,location=(ec.x,ec.y-depth,ec.z))
  obj=bpy.context.object;obj.name=f'{label}_{side}';obj.scale=(radius,.0014,radius)
  bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);assign(obj,mat)
  vg=obj.vertex_groups.new(name='eye.'+side.upper());vg.add(list(range(len(obj.data.vertices))),1,'REPLACE')
  mod=obj.modifiers.new('Eye skinning','ARMATURE');mod.object=rig;obj.parent=rig
  for p in obj.data.polygons:p.use_smooth=True
# Save a self-contained editable source, and a glTF asset with actual skinning and morphs.
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=24
bpy.context.scene.world.color=(.22,.22,.22)
centerZ=(cut+headtop+.03)/2

def track(obj,point):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
def area(name,location,power,size,color):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=location;track(obj,(0,0,centerZ))
area('Soft key',(-.7,-1.2,2),14,.8,(1,.89,.8));area('Fill',(.8,-.7,1.5),5,.8,(.78,.85,1));area('Rim',(.4,.4,1.7),2,.5,(.66,.7,1))
camdata=bpy.data.cameras.new('Portrait camera');cam=bpy.data.objects.new('Portrait camera',camdata);bpy.context.collection.objects.link(cam)
cam.location=(0,-2,centerZ+.015);track(cam,(0,-.01,centerZ));camdata.type='ORTHO';camdata.ortho_scale=(headtop-cut+.08)*1.06
scene=bpy.context.scene;scene.camera=cam;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
bpy.data.orphans_purge(do_local_ids=True,do_linked_ids=True,do_recursive=True)
for img in bpy.data.images:
 if img.filepath and img.source=='FILE':img.pack()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/avatar/ubaid-v2/ubaid-rig.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
 if obj.type in ['MESH','ARMATURE']:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/avatar/ubaid-v2.glb'),export_format='GLB',use_selection=True,export_animations=False,export_morph=True,export_morph_normal=True,export_skins=True,export_yup=True,export_image_format='AUTO')
report={'landmarks':landmarks,'cut':cut,'headTop':headtop,'bones':[b.name for b in rig.data.bones], 'meshes':[]}
for obj in bpy.data.objects:
 if obj.type=='MESH':report['meshes'].append({'name':obj.name,'vertices':len(obj.data.vertices),'shapes':[k.name for k in obj.data.shape_keys.key_blocks] if obj.data.shape_keys else []})
(ROOT/'assets/avatar/ubaid-v2/build-report.json').write_text(json.dumps(report,indent=2)+'\n')
scene.render.filepath=str(ROOT/'qa-output/avatar/neutral.png');bpy.ops.render.render(write_still=True)
