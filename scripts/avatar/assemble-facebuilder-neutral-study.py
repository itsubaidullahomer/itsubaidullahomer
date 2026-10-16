"""Combine independently authored head anatomy, facial fibers and scalp groom.

Only genuine Blender geometry/materials are appended; diagnostic photo-textured
heads are deliberately excluded. Facial fibers follow the exact detailed
triangles across all head expressions. Outputs remain unapproved studies.
"""
import bpy,sys,json,argparse,math,numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'assets/avatar/identity-rebuild/facebuilder-study'
p=argparse.ArgumentParser();p.add_argument('--groom',type=Path,required=True);p.add_argument('--out',default='combined-neutral');p.add_argument('--expressions',action='store_true');p.add_argument('--facial-version',default='v8');p.add_argument('--skip-render',action='store_true');args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);OUT=BASE/args.out;OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/f'facial-groom-{args.facial_version}-study.blend'))
head=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.shape_keys and len(o.data.shape_keys.key_blocks)>40 and len(o.data.vertices)>10000)
keys=head.data.shape_keys.key_blocks;basis=np.array([v.co[:] for v in keys[0].data]);records=json.loads((BASE/f'facial-hair-attachments-{args.facial_version}.json').read_text())['attachments']
attachments=[]
for obj in list(bpy.context.scene.objects):
 if obj.type!='CURVE' or not obj.name.endswith(' fibers'):continue
 region=obj.name[:-7];rows=[r for r in records if r['region']==region]
 if len(rows)!=len(obj.data.splines):raise ValueError('Fiber/attachment correspondence mismatch '+region)
 ids=np.array([r['triangle'] for r in rows]);tri=basis[ids];e1=tri[:,1]-tri[:,0];e2=tri[:,2]-tri[:,0];normal=np.cross(e1,e2);normal/=np.linalg.norm(normal,axis=1)[:,None]
 frame=np.stack([e1,e2,normal],axis=2);points=np.array([[p.co[:3] for p in spline.points] for spline in obj.data.splines]);local=np.einsum('nij,nkj->nki',np.linalg.inv(frame),points-tri[:,0,None,:])
 kb=obj.shape_key_add(name='Basis')
 if len(kb.data)!=points.shape[0]*3:raise ValueError('Unexpected curve key shape')
 max_displacement=0
 for source_key in keys[1:]:
  v=np.array([v.co[:] for v in source_key.data]);t=v[ids];u=t[:,1]-t[:,0];w=t[:,2]-t[:,0];n=np.cross(u,w);n/=np.linalg.norm(n,axis=1)[:,None];f=np.stack([u,w,n],axis=2)
  posed=np.einsum('nij,nkj->nki',f,local)+t[:,0,None,:]
  if not np.isfinite(posed).all():raise ValueError('Nonfinite groom pose '+source_key.name)
  target=obj.shape_key_add(name=source_key.name);target.data.foreach_set('co',posed.astype(np.float32).ravel());target.value=0
  max_displacement=max(max_displacement,float(np.linalg.norm(posed-points,axis=2).max()))
 attachments.append({'object':obj.name,'strands':len(rows),'shapeKeys':len(obj.data.shape_keys.key_blocks)-1,'maximumNativeDisplacement':max_displacement})
# Read only groom objects, never append the photo-textured head in a groom study.
with bpy.data.libraries.load(str(args.groom),link=False) as (source,destination):
 destination.objects=[name for name in source.objects if any(part in name.lower() for part in ['refined asymmetric wave fibers','scalp undercoat','hair undercoat','hair scalp','continuous scalp substrate'])]
appended=[]
for obj in destination.objects:
 if obj is not None:bpy.context.collection.objects.link(obj);appended.append(obj.name)
if not appended:raise ValueError('No explicitly named groom geometry found')
for obj in bpy.context.scene.objects:
 for mat in obj.data.materials if obj.type in ('MESH','CURVE') else []:
  if mat and mat.use_nodes:
   for node in mat.node_tree.nodes:
    if node.type=='TEX_IMAGE' and node.image:raise ValueError('Unexpected image texture in neutral combination: '+node.image.name)
scene=bpy.context.scene;scene.cycles.samples=64;scene.render.resolution_x=960;scene.render.resolution_y=1080;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';camera=scene.camera;camera.data.type='PERSP';camera.data.lens=85
for ob in bpy.context.scene.objects:
 if ob.type in ('MESH','CURVE') and ob.data.shape_keys:
  for key in ob.data.shape_keys.key_blocks:key.value=0
for angle in ([] if args.skip_render else [0,30,90,330]):
 a=math.radians(angle);camera.location=(9*math.sin(a),-9*math.cos(a),.17);camera.rotation_euler=(Vector((0,-.08,.10))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/f'neutral-{angle:03}.png');bpy.ops.render.render(write_still=True)
a=math.radians(15);camera.location=(9*math.sin(a),-9*math.cos(a),.17);camera.rotation_euler=(Vector((0,-.08,.10))-camera.location).to_track_quat('-Z','Y').to_euler()
if args.expressions:
 for name,values in [('blink',{'eyeBlinkLeft':1,'eyeBlinkRight':1}),('smile',{'mouthSmileLeft':.55,'mouthSmileRight':.55,'cheekSquintLeft':.12,'cheekSquintRight':.12,'jawOpen':.08}),('speaking',{'viseme_aa':.6})]:
  for ob in bpy.context.scene.objects:
   if ob.type in ('MESH','CURVE') and ob.data.shape_keys:
    for key in ob.data.shape_keys.key_blocks[1:]:key.value=values.get(key.name,0)
  scene.render.filepath=str(OUT/f'expression-{name}.png');bpy.ops.render.render(write_still=True)
for ob in bpy.context.scene.objects:
 if ob.type in ('MESH','CURVE') and ob.data.shape_keys:
  for key in ob.data.shape_keys.key_blocks:key.value=0
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'neutral-study.blend'))
(OUT/'report.json').write_text(json.dumps({'stage':'Unapproved combined neutral geometry study','photoTexture':False,'groomSource':str(args.groom),'groomObjects':appended,'facialFiberAttachments':attachments,'headChannels':len(keys)-1,'camera':'85mm perspective, native camera distance9, neutral fixed pose','limitations':['Scalp grooming and likeness require independent visual review.','Dense source curves are not the optimized browser asset.']},indent=2))
