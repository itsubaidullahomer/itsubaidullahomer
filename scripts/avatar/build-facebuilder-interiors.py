"""Separate eye/oral anatomy study on original FaceBuilder facial topology.

Uses FaceBuilder's own Eyes/Mouth face masks, preserving every original vertex
and51 fitted shape-key arrays. Added eyeballs, teeth, gums and tongue are real
geometry with simple portable PBR materials. No photograph is used as a texture.
Only isolated study files are written; original/canonical sources stay untouched.
"""
import argparse, importlib.util, json, math, subprocess, sys
from pathlib import Path
import bpy, bmesh, addon_utils, numpy as np
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/avatar/identity-rebuild/facebuilder-study/anatomy'
SOURCE=ROOT/'assets/avatar/identity-rebuild/facebuilder-study/facs-export/fitted-head-facs.blend'
TOOLS=Path('/tmp/ubaid-avatar-tools')


def material(name,color,roughness=.55):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness
 return m


def add_anatomy(obj,eye_polygons,mouth_polygons):
 original=obj.data;original_keys=[(key.name,np.array([v.co[:] for v in key.data])) for key in original.shape_keys.key_blocks]
 base=original_keys[0][1];removed=set(eye_polygons)|set(mouth_polygons)
 survivors=[p for p in original.polygons if p.index not in removed]
 mesh=bpy.data.meshes.new('FaceBuilder fitted skin - opened eyes and mouth')
 mesh.from_pydata(base.tolist(),[],[list(p.vertices) for p in survivors]);mesh.update()
 for layer in original.uv_layers:
  uv=mesh.uv_layers.new(name=layer.name);values=[]
  for p in survivors:
   values.extend([tuple(layer.data[index].uv) for index in p.loop_indices])
  uv.data.foreach_set('uv',np.array(values,dtype=np.float32).ravel())
 obj.data=mesh
 for name,positions in original_keys:
  key=obj.shape_key_add(name=name);key.data.foreach_set('co',positions.ravel());key.value=0
 skin=material('Plain skin - no photographic color',(.43,.235,.145),.65)
 skin.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.045
 skin.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Scale'].default_value=.04
 mesh.materials.append(skin)
 for p in mesh.polygons:p.use_smooth=True
 eye_indices=sorted({i for p in original.polygons if p.index in eye_polygons for i in p.vertices})
 eye_points=base[eye_indices]
 sclera=material('Warm sclera',(.73,.71,.65),.22)
 iris=[material('Brown iris '+str(i),color,.30) for i,color in enumerate([(.028,.013,.006),(.055,.027,.01),(.085,.045,.019),(.039,.021,.009)])]
 limbus=material('Dark iris limbus',(.012,.007,.004),.3);pupil=material('Pupil',(.002,.0015,.001),.15)
 eyes=[];eye_report={}
 for side,sign in [('L',1),('R',-1)]:
  points=eye_points[eye_points[:,0]*sign>0];a=np.c_[2*points,np.ones(len(points))];b=np.sum(points**2,axis=1);solution=np.linalg.lstsq(a,b,rcond=None)[0]
  center=solution[:3];radius=float(np.sqrt(solution[3]+center@center))
  theta=[0,.06,.12,.165,.19,.25,.31,.37,.40,.43,.49,.62,.82,1.08,1.38,1.72,2.10,2.52,2.88,math.pi]
  segments=48;verts=[];faces=[];bands=[]
  for t in theta:
   for k in range(segments):
    angle=2*math.pi*k/segments;verts.append((center+radius*np.array([math.sin(t)*math.cos(angle),-math.cos(t),math.sin(t)*math.sin(angle)])).tolist())
  for row in range(len(theta)-1):
   for k in range(segments):
    faces.append((row*segments+k,(row+1)*segments+k,(row+1)*segments+(k+1)%segments,row*segments+(k+1)%segments));bands.append((row,k))
  em=bpy.data.meshes.new('Eye '+side+' continuous spherical surface');em.from_pydata(verts,[],faces);em.update();eye=bpy.data.objects.new('Eye.'+side,em);bpy.context.collection.objects.link(eye)
  for mat in [sclera,*iris,limbus,pupil]:em.materials.append(mat)
  for p,(row,k) in zip(em.polygons,bands):
   t=(theta[row]+theta[row+1])/2;p.material_index=6 if t<.19 else (1+(k*7+row)%4 if t<.37 else (5 if t<.43 else 0));p.use_smooth=True
  basis=eye.shape_key_add(name='Basis')
  for channel,axis,angle in [('Up','X',-.23),('Down','X',.23),('In','Z',-.25*sign),('Out','Z',.25*sign)]:
   key=eye.shape_key_add(name='eyeLook'+channel+('Left' if side=='L' else 'Right'));rot=Matrix.Rotation(angle,3,axis)
   for v,neutral in zip(key.data,basis.data):v.co=Vector(center)+rot@(neutral.co-Vector(center))
  eyes.append(eye);eye_report[side]={'centerNative':center.tolist(),'radiusNative':radius,'fitResidualRMS':float(np.sqrt(np.mean((np.linalg.norm(points-center,axis=1)-radius)**2)))}
 # Rigid jaw transforms are derived from the fitted head's own mandibular FACS,
 # not copied from the previous MPFB face. Upper dentition stays on the skull.
 jaw_region=(base[:,2]<-.42)&(base[:,2]>-.80)&(np.abs(base[:,0])<.40)&(base[:,1]<-.75)
 reference=base[jaw_region];transforms={}
 for name,positions in original_keys[1:]:
  if name not in ('jawOpen','jawLeft','jawRight','jawForward'):continue
  target=positions[jaw_region];a=reference-reference.mean(axis=0);b=target-target.mean(axis=0);u,s,vh=np.linalg.svd(a.T@b);rotation=vh.T@u.T
  if np.linalg.det(rotation)<0:vh[-1,:]*=-1;rotation=vh.T@u.T
  translation=target.mean(axis=0)-rotation@reference.mean(axis=0);transforms[name]=(rotation,translation)
 def lower_jaw_shapes(o):
  basis=o.shape_key_add(name='Basis')
  for name,(rot,translation) in transforms.items():
   key=o.shape_key_add(name=name)
   for v,n in zip(key.data,basis.data):v.co=rot@np.array(n.co)+translation
 def ellipsoid(name,location,scale,mat,lower=False,hollow=False):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=location);o=bpy.context.object;o.name=o.data.name=name
  for vertex in o.data.vertices:vertex.co=Vector([vertex.co[i]*scale[i]+location[i] for i in range(3)])
  o.location=(0,0,0);o.data.materials.append(mat)
  if hollow:
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[face for face in bm.faces if face.calc_center_median().y<location[1]],context='FACES_ONLY')
   for face in bm.faces:face.normal_flip()
   bm.to_mesh(o.data);bm.free();o.data.update()
  for p in o.data.polygons:p.use_smooth=True
  if lower:lower_jaw_shapes(o)
  return o
 oral=material('Oral cavity',(.012,.0025,.002),.85);gum=material('Gums',(.18,.035,.027),.62);enamel=material('Warm tooth enamel',(.74,.70,.60),.34);tongue_mat=material('Tongue',(.27,.059,.047),.65)
 cavity=ellipsoid('Mouth cavity',(0,-.76,-.36),(.265,.22,.20),oral,True,True)
 upper_gum=ellipsoid('Upper gum',(0,-.96,-.28),(.21,.087,.055),gum)
 lower_gum=ellipsoid('Lower gum',(0,-.94,-.395),(.19,.085,.055),gum,True)
 teeth=[]
 for lower in (False,True):
  for i,x in enumerate([-.175,-.13,-.083,-.028,.028,.083,.13,.175]):
   width=.027 if abs(x)<.1 else .023
   y=-1.01+.85*(x/.25)**2*.10
   z=-.329 if not lower else -.365
   bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z));o=bpy.context.object;o.name=o.data.name=('Lower' if lower else 'Upper')+' tooth '+str(i+1)
   o.scale=(width*2,.055,.070 if not lower else .055);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
   bevel=o.modifiers.new('Rounded enamel edges','BEVEL');bevel.width=.006;bevel.segments=3;bpy.ops.object.modifier_apply(modifier=bevel.name)
   for vertex in o.data.vertices:
    vertex.co.x*=1-.10*(vertex.co.z/(.035 if not lower else .0275))*(1 if not lower else -1)
    vertex.co.y-=.003*max(0,1-(vertex.co.x/width)**2)
   for vertex in o.data.vertices:vertex.co+=o.location
   o.location=(0,0,0);o.data.materials.append(enamel)
   for p in o.data.polygons:p.use_smooth=True
   if lower:lower_jaw_shapes(o)
   teeth.append(o)
 tongue=ellipsoid('Tongue',(0,-.84,-.41),(.17,.14,.055),tongue_mat,True)
 tongue_out=tongue.shape_key_add(name='tongueOut',from_mix=False)
 for v,neutral in zip(tongue_out.data,tongue.data.shape_keys.key_blocks[0].data):
  v.co=neutral.co
  tip=max(0,min(1,(-.80-v.co.y)/.18));v.co.y-=.15*tip;v.co.z+=.085*tip
 report={'removedEyeCapFaces':len(eye_polygons),'removedMouthClosureFaces':len(mouth_polygons),'preservedOriginalVertexCount':len(mesh.vertices),'headFacsCount':len(mesh.shape_keys.key_blocks)-1,'eyeFit':eye_report,'jawMotion':'Rigid best-fit transform of each fitted mandibular FACS; no prior avatar facial deltas used.','limitations':['Dental anatomy and gaze fit are a first geometry study, not final acceptance.','TongueOut is real tongue geometry; fifteen lip-sync visemes not authored yet.']}
 return report


def add_speech_study(objects):
 """Authored poses from this fit's FACS and genuine tongue mesh, not alignment data."""
 pairs=lambda stem,value:{stem+'Left':value,stem+'Right':value}
 presets={
  'sil':{},'PP':{**pairs('mouthPress',.75),'mouthRollUpper':.12,'mouthRollLower':.12},
  'FF':{'jawOpen':.08,'mouthRollLower':.52,**pairs('mouthUpperUp',.12)},
  'TH':{'jawOpen':.27,**pairs('mouthStretch',.10),'tongueOut':.95},
  'DD':{'jawOpen':.20,**pairs('mouthStretch',.15)},
  'kk':{'jawOpen':.32,**pairs('mouthStretch',.10)},
  'CH':{'jawOpen':.22,'mouthFunnel':.33,**pairs('mouthStretch',.08)},
  'SS':{'jawOpen':.12,**pairs('mouthStretch',.28)},
  'nn':{'jawOpen':.16,**pairs('mouthStretch',.13)},
  'RR':{'jawOpen':.22,'mouthPucker':.30},'aa':{'jawOpen':.66},
  'E':{'jawOpen':.34,**pairs('mouthStretch',.42)},
  'I':{'jawOpen':.18,**pairs('mouthStretch',.53)},
  'O':{'jawOpen':.38,'mouthFunnel':.60},'U':{'jawOpen':.17,'mouthPucker':.72},
 }
 checks=[]
 for obj in objects:
  if obj.type!='MESH' or not obj.data.shape_keys:continue
  keys=obj.data.shape_keys.key_blocks
  if not any(name in keys for name in ('jawOpen','mouthPressLeft')):continue
  basis=np.array([v.co[:] for v in keys[0].data]);deltas={k.name:np.array([v.co[:] for v in k.data])-basis for k in keys[1:]}
  for name,weights in presets.items():
   positions=basis.copy()
   for channel,amount in weights.items():
    if channel in deltas:positions+=deltas[channel]*amount
   if obj.name=='Tongue':
    front=np.clip((-.83-basis[:,1])/.15,0,1)
    if name in ('DD','nn'):positions[:,2]+=.055*front
    if name=='kk':positions[:,2]+=.045*np.exp(-((basis[:,1]+.81)/.10)**2)
    if name=='RR':positions[:,2]+=.03*front
   if not np.isfinite(positions).all():raise ValueError('Nonfinite authored viseme '+name)
   key=obj.shape_key_add(name='viseme_'+name);key.data.foreach_set('co',positions.ravel())
   checks.append({'mesh':obj.name,'viseme':name,'maximumNativeDisplacement':float(np.linalg.norm(positions-basis,axis=1).max())})
 return {'stage':'Authored English viseme geometry study; audiovisual review pending','presets':presets,'checks':checks,'notes':['sil intentionally equals neutral.','DD/nn lift the real tongue tip; kk arches its dorsum; TH protrudes its tip.','No phoneme timing or alignment is implied by these shape keys.']}


if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=SOURCE);parser.add_argument('--output',type=Path,default=OUT);parser.add_argument('--detail-offsets',type=Path);parser.add_argument('--visemes',action='store_true');parser.add_argument('--export',action='store_true');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []);args.output.mkdir(parents=True,exist_ok=True)
 sys.path.insert(0,str(TOOLS/'keentools-blender'));addon_utils.enable('keentools',default_set=False,persistent=False)
 bpy.ops.wm.open_mainfile(filepath=str(args.source))
 from keentools.addon_config import fb_settings
 s=fb_settings();s.current_headnum=0;s.loader().load_model(0);builder=s.loader().get_builder();obj=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.shape_keys)
 masks={}
 for name in ['Eyes','Mouth']:
  flags=[True]*len(builder.masks());flags[list(builder.mask_names()).index(name)]=False
  temp=s.loader().get_builder_mesh(builder,mesh_name='Mask query '+name,masks=flags);remaining={tuple(p.vertices) for p in temp.polygons}
  masks[name]=[p.index for p in obj.data.polygons if tuple(p.vertices) not in remaining];bpy.data.meshes.remove(temp)
 if args.detail_offsets:
  offsets=np.load(args.detail_offsets);basis=np.array([v.co[:] for v in obj.data.shape_keys.key_blocks[0].data])
  if not np.allclose(basis,offsets['basis'],atol=1e-6):raise ValueError('Detail offsets do not match the exact fitted topology/basis')
  for key in obj.data.shape_keys.key_blocks:
   positions=np.array([v.co[:] for v in key.data])+offsets['delta'];key.data.foreach_set('co',positions.ravel())
  obj.data.update()
 report=add_anatomy(obj,masks['Eyes'],masks['Mouth'])
 eye_spec=importlib.util.spec_from_file_location('eye_refinement',ROOT/'scripts/avatar/refine-facebuilder-eyes.py');eye_module=importlib.util.module_from_spec(eye_spec);eye_spec.loader.exec_module(eye_module)
 report['eyeRefinement']=eye_module.refine_eyes(list(bpy.context.scene.objects))
 if args.detail_offsets:report['detailOffsets']=str(args.detail_offsets)
 if args.visemes:
  report['speechStudy']=add_speech_study(list(bpy.context.scene.objects))
  report['limitations'][1]='Fifteen authored speech poses are geometric approximations awaiting conversational playback review.'
 lid_spec=importlib.util.spec_from_file_location('lid_details',ROOT/'scripts/avatar/detail-facebuilder-lids.py');lid_module=importlib.util.module_from_spec(lid_spec);lid_spec.loader.exec_module(lid_module)
 report['lidDetails']=lid_module.add_lid_details(obj)
 scene=bpy.context.scene
 for o in scene.objects:o.hide_render=o.type not in ('MESH',)
 scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
 world=bpy.data.worlds.new('Anatomy review');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.4,.42,.45,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4;scene.world=world
 def track(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
 for name,pos,power,size in [('Anatomy key',(-3,-4,5),550,4),('Anatomy fill',(3,-2,1),180,3),('Anatomy edge',(1,3,3),350,3),('Small genuine eye catchlight',(-.5,-4,1),20,.5)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;track(o,(0,0,.1))
 d=bpy.data.cameras.new('Anatomy camera');d.type='ORTHO';d.ortho_scale=3.5;camera=bpy.data.objects.new('Anatomy camera',d);scene.collection.objects.link(camera);scene.camera=camera;camera.location=(0,-7,-.05);track(camera,(0,-.1,-.05))
 poses=[('neutral',{}),('blink',{'eyeBlinkLeft':1,'eyeBlinkRight':1}),('jaw',{'jawOpen':.65}),('smile',{'mouthSmileLeft':.65,'mouthSmileRight':.65,'jawOpen':.12}),('gaze',{'eyeLookOutLeft':.6,'eyeLookInRight':.6})]
 if args.visemes:poses += [('viseme-'+name,{'viseme_'+name:1}) for name in ['PP','FF','TH','aa','O','U']]
 for name,values in poses:
  for ob in scene.objects:
   if ob.type=='MESH' and ob.data.shape_keys:
    for key in ob.data.shape_keys.key_blocks[1:]:key.value=values.get(key.name,0)
  scene.render.filepath=str(args.output/f'anatomy-{name}.png');bpy.ops.render.render(write_still=True)
 for ob in scene.objects:
  if ob.type=='MESH' and ob.data.shape_keys:
   for key in ob.data.shape_keys.key_blocks[1:]:key.value=0
 bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(args.output/'head-anatomy-study.blend'))
 if args.export:
  bpy.ops.object.select_all(action='DESELECT')
  for ob in scene.objects:
   if ob.type=='MESH':ob.select_set(True);ob.scale*=.1
  bpy.context.view_layer.update()
  raw=args.output/'head-anatomy-uncompressed.glb';packed=args.output/'head-anatomy-study.glb'
  bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_morph=True,export_morph_normal=True,export_yup=True,export_apply=False,export_try_sparse_sk=True)
  subprocess.run([str(TOOLS/'gltf-transform/node_modules/.bin/gltf-transform'),'meshopt',str(raw),str(packed),'--level','high','--quantize-position','16','--quantize-normal','12'],check=True)
  report['glbBytes']=packed.stat().st_size
 (args.output/'anatomy-report.json').write_text(json.dumps(report,indent=2));print('ANATOMY_REPORT',json.dumps({k:report[k] for k in ['removedEyeCapFaces','removedMouthClosureFaces','preservedOriginalVertexCount','headFacsCount','limitations']}),flush=True)
