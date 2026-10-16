"""Render an isolated clothed body portrait using the fitted head and real groom."""
import bpy,sys,json,argparse,math,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'assets/avatar/identity-rebuild/facebuilder-study'
p=argparse.ArgumentParser();p.add_argument('--groom',type=Path,required=True);p.add_argument('--out',default='body-portrait');p.add_argument('--facial-source',default='combined-v8');p.add_argument('--dental',default='dental-polish-v4');p.add_argument('--skip-render',action='store_true');args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);OUT=BASE/args.out;OUT.mkdir(exist_ok=True)
info=json.loads((BASE/'body-integration/integration-report.json').read_text());scale=info['uniformScale'];translation=np.array(info['translationMeters'])
bpy.ops.wm.open_mainfile(filepath=str(BASE/'body-integration/fitted-head-body-study.blend'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');head=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Ubaid_FaceBuilder_Head_Study'))
with bpy.data.libraries.load(str(BASE/args.facial_source/'neutral-study.blend'),link=False) as (source,destination):
 destination.objects=[name for name in source.objects if name.startswith('Ubaid_FaceBuilder_Head_Study') or name in ('Brow R fibers','Brow L fibers','Moustache fibers','Chin beard fibers')]
source_head=next(o for o in destination.objects if o.type=='MESH');groom=[o for o in destination.objects if o.type=='CURVE']
# Same18,024vertex ordering is maintained through neck fitting.
if len(head.data.vertices)!=len(source_head.data.vertices):raise ValueError('Head pigment topology mismatch')
for attribute in source_head.data.color_attributes:
 target=head.data.color_attributes.get(attribute.name) or head.data.color_attributes.new(name=attribute.name,type=attribute.data_type,domain=attribute.domain)
 values=np.empty(len(attribute.data)*4);attribute.data.foreach_get('color',values);target.data.foreach_set('color',values)
head.data.materials.clear()
for mat in source_head.data.materials:
 material=mat.copy();head.data.materials.append(material)
 for node in material.node_tree.nodes:
  if node.type=='BSDF_PRINCIPLED':node.inputs['Subsurface Scale'].default_value*=scale
  if node.type=='BUMP':node.inputs['Distance'].default_value*=scale
bpy.data.objects.remove(source_head,do_unlink=True)
# Conservative independently checked ear breadth; does not alter face/neck.
ear=np.load(BASE/'ear-breadth-study/ear-breadth-augmentation.npz')['delta']*scale
for key in head.data.shape_keys.key_blocks:
 positions=np.array([v.co[:] for v in key.data]);key.data.foreach_set('co',(positions+ear).ravel())
with bpy.data.libraries.load(str(args.groom),link=False) as (source,destination):
 destination.objects=[name for name in source.objects if name in ('Continuous scalp substrate','Refined asymmetric wave fibers') or name.startswith('Guide groom')]
groom +=[o for o in destination.objects if o is not None]
if len(groom)<6:raise ValueError('Groom source is missing scalp or strands')
for ob in groom:
 bpy.context.collection.objects.link(ob)
 if ob.data.shape_keys:
  for key in ob.data.shape_keys.key_blocks:
   xyz=np.array([v.co[:] for v in key.data])*scale+translation;key.data.foreach_set('co',xyz.ravel());key.value=0
 elif ob.type=='MESH':
  xyz=np.array([v.co[:] for v in ob.data.vertices])*scale+translation;ob.data.vertices.foreach_set('co',xyz.ravel())
 else:
  for sp in ob.data.splines:
   for point in sp.points:point.co=(*(np.array(point.co[:3])*scale+translation),1)
 if ob.type=='CURVE':
  if ob.data.shape_keys:
   for spline in ob.data.splines:
    for point in spline.points:point.co=(*(np.array(point.co[:3])*scale+translation),1)
  ob.data.bevel_depth*=scale
 ob.matrix_world.identity()
 if ob.type=='CURVE':
  ob.parent=rig;ob.parent_type='BONE';ob.parent_bone='head';bone=rig.data.bones['head'];rest_tail=rig.matrix_world@bone.matrix_local@Matrix.Translation((0,bone.length,0));ob.matrix_parent_inverse=rest_tail.inverted();ob.matrix_basis.identity()
 else:
  group=ob.vertex_groups.new(name='head');group.add(list(range(len(ob.data.vertices))),1.,'REPLACE');modifier=ob.modifiers.new('Follow fitted head bone','ARMATURE');modifier.object=rig;ob.parent=rig;ob.matrix_parent_inverse=rig.matrix_world.inverted()
# Match exposed body skin to the authored facial palette, retaining cloth maps.
body=bpy.data.objects.get('Ubaid_Body')
if body:
 mat=bpy.data.materials.new('Body skin matched to fitted head');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.43,.235,.145,1);bs.inputs['Roughness'].default_value=.57;bs.inputs['Subsurface Weight'].default_value=.045;bs.inputs['Subsurface Scale'].default_value=.004
 body.data.materials.clear();body.data.materials.append(mat)
 for polygon in body.data.polygons:polygon.material_index=0
# Adopt the independently inspected oral refinement in native coordinates.
oral_prefixes=('Upper tooth ','Lower tooth ','Upper gum','Lower gum','Tongue','Mouth cavity','Oral palate','Inner cheek','Palate')
for old in list(bpy.context.scene.objects):
 if old.type=='MESH' and old.name.startswith(oral_prefixes):bpy.data.objects.remove(old,do_unlink=True)
with bpy.data.libraries.load(str(BASE/args.dental/'dental-neutral-study.blend'),link=False) as (source,destination):destination.objects=[name for name in source.objects if name.startswith(oral_prefixes)]
for ob in destination.objects:
 if ob is None:continue
 bpy.context.collection.objects.link(ob)
 base=np.array([v.co[:] for v in ob.data.vertices])
 if ob.data.shape_keys:
  base=np.array([v.co[:] for v in ob.data.shape_keys.key_blocks[0].data])
  for key in ob.data.shape_keys.key_blocks:key.data.foreach_set('co',(np.array([v.co[:] for v in key.data])*scale+translation).ravel());key.value=0
 ob.data.vertices.foreach_set('co',(base*scale+translation).ravel());ob.matrix_world.identity();group=ob.vertex_groups.new(name='head');group.add(list(range(len(base))),1.,'REPLACE');mod=ob.modifiers.new('Oral skull binding','ARMATURE');mod.object=rig;ob.parent=rig;ob.matrix_parent_inverse=rig.matrix_world.inverted()
scene=bpy.context.scene;scene.view_settings.exposure=-.65;scene.cycles.samples=64;scene.render.resolution_percentage=100;camera=scene.camera
for ob in scene.objects:
 if ob.type in ('MESH','CURVE') and ob.data.shape_keys:
  for key in ob.data.shape_keys.key_blocks:key.value=0
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();evaluated=head.evaluated_get(deps);surface=BVHTree.FromPolygons([evaluated.matrix_world@v.co for v in evaluated.data.vertices],[list(p.vertices) for p in evaluated.data.polygons]);attachment_checks={}
for ob in groom:
 if ob.type=='CURVE' and ob.name.startswith(('Brow','Moustache','Chin beard')):
  distances=[]
  evaluated_curve=ob.evaluated_get(deps)
  for spline in list(evaluated_curve.data.splines)[::max(1,len(evaluated_curve.data.splines)//200)]:
   point=ob.matrix_world@Vector(spline.points[0].co[:3]);distances.append(surface.find_nearest(point)[3])
  attachment_checks[ob.name]=max(distances)
  if max(distances)>.0025:raise ValueError('Facial curve/bone alignment exceeds2.5mm '+ob.name+str(max(distances)))
print('ATTACHMENT_CHECKS',attachment_checks,flush=True)
poses=[('neutral-front',(0,-3,1.68),(0,-.04,1.63),.57,(1000,1100)),('neutral-three-quarter',(1.4,-2.7,1.68),(0,-.04,1.63),.57,(1000,1100)),('neutral-profile',(3,0,1.68),(0,-.04,1.63),.57,(1000,1100)),('neutral-fullbody',(0,-4,.97),(0,0,.96),2.10,(900,1400))]
for name,pos,target,ortho,res in ([] if args.skip_render else poses):
 camera.data.type='ORTHO';camera.data.ortho_scale=ortho;camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x,scene.render.resolution_y=res;scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'clothed-avatar-study.blend'))
(OUT/'report.json').write_text(json.dumps({'stage':'Unapproved clothed likeness study','groomSource':str(args.groom),'uniformScale':scale,'translation':translation.tolist(),'earBreadthAugmentation':True,'dentalStudy':args.dental,'exposure':scene.view_settings.exposure,'groomObjects':[o.name for o in groom],'photoProjectedFace':False,'facialAttachmentsMaxMeters':attachment_checks,'limitations':['Dense groom requires browser optimization.','Likeness and hairstyle require independent review.']},indent=2))
