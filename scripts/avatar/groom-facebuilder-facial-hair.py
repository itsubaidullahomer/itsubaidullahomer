"""Reference-located facial fibers on actual neutral geometry.

Photo27 supplies placement/density observations through its solved camera.
The output is dark 3D curves, not a photograph mapped onto the face. Barycentric
attachments preserve correspondence to the neutral and all native FACS keys.
"""
import bpy,sys,addon_utils,math,json,random,numpy as np,importlib.util
from collections import Counter
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild/facebuilder-study'
sys.path.insert(0,'/tmp/ubaid-avatar-tools/keentools-blender');addon_utils.enable('keentools',default_set=False,persistent=False)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'fitted-head.blend'))
from keentools.addon_config import fb_settings
from keentools.utils.coords import geom_to_npbuffer
s=fb_settings();s.current_headnum=0;s.loader().load_model(0);head=s.get_head(0);fb=s.loader().get_builder();obj=head.headobj
neutral=np.array([v.co[:] for v in obj.data.vertices]);expr=geom_to_npbuffer(fb.applied_args_model_vertices_at(head.cameras[0].get_keyframe()))
# Camera rays intersect the original photo-fit expression, while attachments
# resolve onto the exact detailed neutral basis used by the anatomy source.
detail=np.load(OUT/'detail-basis-deltas.npz')
if not np.allclose(neutral,detail['basis'],atol=1e-6):raise ValueError('Facial grooming basis differs from detail source')
neutral+=detail['delta']
obj.data.calc_loop_triangles();triangles=[tuple(p.vertices) for p in obj.data.loop_triangles]
bvh=BVHTree.FromPolygons(expr.tolist(),triangles,all_triangles=True)
camera=head.cameras[0].camobj;w,h=head.cameras[0].get_oriented_image_size();bpy.context.view_layer.update()
proj=camera.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(),x=w,y=h).inverted();world=camera.matrix_world.copy();origin=world.translation.copy()
pixels=np.array(head.cameras[0].cam_image.pixels[:]).reshape(h,w,4)
def locate(x,y):
 p=proj@Vector((2*x/w-1,1-2*y/h,-1,1));p/=p.w;direction=((world@p).to_3d()-origin).normalized();hit=bvh.ray_cast(origin,direction)
 if hit[0] is None:return None
 ids=triangles[hit[2]];a,b,c=expr[list(ids)];uv=np.linalg.lstsq(np.stack([b-a,c-a],axis=1),np.array(hit[0])-a,rcond=None)[0];weights=np.array([1-uv.sum(),uv[0],uv[1]])
 q=neutral[list(ids)];normal=np.cross(q[1]-q[0],q[2]-q[0]);normal/=np.linalg.norm(normal)
 return q.T@weights+normal*.0015,ids,weights,normal
def inside(p,polygon):
 x,y=p;c=False;j=len(polygon)-1
 for i in range(len(polygon)):
  xi,yi=polygon[i];xj,yj=polygon[j]
  if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:c=not c
  j=i
 return c
def boundary_distance(point,polygon):
 p=np.array(point);distance=1e9
 for a,b in zip(polygon,polygon[1:]+polygon[:1]):
  a=np.array(a);b=np.array(b);t=np.clip(np.dot(p-a,b-a)/np.dot(b-a,b-a),0,1);distance=min(distance,np.linalg.norm(p-a-t*(b-a)))
 return distance
regions=[
 ('Brow R',[(258,379),(267,356),(291,345),(313,343),(340,351),(352,369),(325,362),(294,365),(271,379)],3800,(-3,-1.5),.42),
 ('Brow L',[(393,336),(412,320),(447,301),(477,302),(512,309),(523,323),(492,321),(463,318),(435,329),(414,343)],4000,(3,-1.5),.43),
 ('Moustache',[(326,544),(332,521),(351,505),(380,496),(401,500),(429,484),(456,486),(476,499),(482,516),(465,514),(442,506),(420,509),(394,518),(368,530),(344,539)],5100,(1,2.1),.49),
 ('Chin beard',[(318,578),(335,596),(364,610),(400,613),(438,599),(465,581),(489,555),(505,561),(489,592),(467,617),(432,639),(395,646),(365,636),(336,618),(321,603)],2600,(.5,1.5),.49),
]
rng=random.Random(270623);records=[];counts={}
for name,polygon,count,direction,threshold in regions:
 xs=[p[0] for p in polygon];ys=[p[1] for p in polygon];saved=[];attempt=0
 while len(saved)<count and attempt<count*40:
  attempt+=1;x=rng.uniform(min(xs),max(xs));y=rng.uniform(min(ys),max(ys))
  if not inside((x,y),polygon):continue
  rgb=pixels[h-1-int(y),int(x),:3];light=float(np.mean(rgb));prob=max(0,min(1,(threshold-light)/threshold))
  if name=='Moustache':prob=max(.27,prob)*min(1,boundary_distance((x,y),polygon)/3.5)*min(1,(x-min(xs))/9,(max(xs)-x)/9)
  if name=='Brow R':prob*=min(1,max(0,(352-x)/17))*.85
  if name=='Brow L':prob*=min(1,max(0,(x-395)/17))*.85
  if rng.random()>prob**1.5:continue
  root=locate(x,y)
  if root is None:continue
  length=rng.uniform(.9,1.65) if name=='Moustache' else rng.uniform(.65,1.4);dx,dy=direction
  if name=='Brow R':
   f=max(0,min(1,(x-270)/75));dx=-3.2;dy=.9-3.3*f
  elif name=='Brow L':
   f=max(0,min(1,(x-400)/115));dx=3.2;dy=-2.5+3.6*f
  elif name=='Moustache':dx=1.5 if x>405 else -1.5
  dx+=rng.uniform(-.35,.35);dy+=rng.uniform(-.35,.35)
  while length>.15 and not inside((x+dx*length,y+dy*length),polygon):length*=.72
  end=locate(x+dx*length,y+dy*length)
  if end is None:continue
  a,ids,weights,n=root;b=end[0];mid=(a+b)/2+n*.00075
  saved.append([a.tolist(),mid.tolist(),b.tolist()]);records.append({'region':name,'triangle':list(ids),'weights':weights.tolist(),'root':a.tolist()})
 counts[name]=len(saved)
 globals().setdefault('fibers',[]).append((name,saved))
# The reference chin is a central tuft, not a shadow-driven underside crescent.
fibers=[entry for entry in fibers if entry[0]!='Chin beard'];records=[r for r in records if r['region']!='Chin beard']
neutral_bvh=BVHTree.FromPolygons(neutral.tolist(),triangles,all_triangles=True);saved=[]
for attempt in range(22000):
 x=rng.uniform(-.27,.27);z=rng.uniform(-.705,-.46)
 density=math.exp(-((x/.19)**2+((z+.61)/.087)**2)*1.35)
 if rng.random()>density:continue
 hit=neutral_bvh.ray_cast(Vector((x,-3,z)),Vector((0,1,0)))
 if hit[0] is None or hit[1].y>-.40:continue
 ids=triangles[hit[2]];a,b,c=neutral[list(ids)];uv=np.linalg.lstsq(np.stack([b-a,c-a],axis=1),np.array(hit[0])-a,rcond=None)[0];weights=np.array([1-uv.sum(),uv[0],uv[1]])
 root=hit[0]+hit[1]*.0009;end=root+Vector((x*.025,0,-rng.uniform(.010,.020)));mid=(root+end)/2+hit[1]*.0009
 saved.append([list(root),list(mid),list(end)]);records.append({'region':'Chin beard','triangle':list(ids),'weights':weights.tolist(),'root':list(root)})
 if len(saved)>=2400:break
fibers.append(('Chin beard',saved));counts['Chin beard']=len(saved)
print('FIBER_COUNTS',counts,flush=True)
# Projection-derived semantic vertex pigment, rather than a photographic texture.
project=camera.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(),x=w,y=h)@world.inverted()
projected=[]
for point in expr:
 c=project@Vector((*point,1));projected.append((w*(c.x/c.w+1)/2,h*(1-c.y/c.w)/2))
upper_lip=[(339,542),(355,535),(381,522),(402,520),(421,511),(444,511),(470,517),(459,525),(435,532),(408,541),(379,548),(355,548)]
lower_lip=[(348,549),(375,550),(404,544),(432,535),(460,525),(452,546),(430,561),(407,571),(380,570),(360,560)]
def pigment_mask(point, polygon, feather=3.5):
 if inside(point,polygon):return 1.
 p=np.array(point);distance=10000
 for a,b in zip(polygon,polygon[1:]+polygon[:1]):
  a=np.array(a);b=np.array(b);t=np.clip(np.dot(p-a,b-a)/np.dot(b-a,b-a),0,1);distance=min(distance,np.linalg.norm(p-a-t*(b-a)))
 return max(0,1-distance/feather)**2

bpy.ops.wm.open_mainfile(filepath=str(OUT/'anatomy-detailed/head-anatomy-study.blend'))
face=next(o for o in bpy.data.objects if o.type=='MESH' and o.data.shape_keys and len(o.data.shape_keys.key_blocks)>40)
for key in face.data.shape_keys.key_blocks:key.value=0
eye_spec=importlib.util.spec_from_file_location('eye_refinement',ROOT/'scripts/avatar/refine-facebuilder-eyes.py');eye_module=importlib.util.module_from_spec(eye_spec);eye_spec.loader.exec_module(eye_module);eye_module.refine_eyes(list(bpy.context.scene.objects))
material=bpy.data.materials.new('Reference facial hair pigment');material.use_nodes=True;p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.008,.005,.0035,1);p.inputs['Roughness'].default_value=.8
for name,lines in fibers:
 data=bpy.data.curves.new(name+' fibers','CURVE');data.dimensions='3D';data.resolution_u=1;data.bevel_depth=.00038 if name=='Moustache' else (.00040 if name.startswith('Brow') else .00036);data.bevel_resolution=0;data.materials.append(material)
 ob=bpy.data.objects.new(name+' fibers',data);bpy.context.collection.objects.link(ob)
 for points in lines:
  sp=data.splines.new('POLY');sp.points.add(2)
  for j,(bp,co) in enumerate(zip(sp.points,points)):bp.co=(*co,1);bp.radius=[.75,1,.12][j]
# A softly shaded follicle bed keeps short bristles from resembling isolated dots.
color=face.data.color_attributes.new(name='AuthoredSkinPigment',type='FLOAT_COLOR',domain='POINT')
trees={}
for region,lines in fibers:
 tree=KDTree(len(lines))
 for i,points in enumerate(lines):tree.insert(Vector(points[0]),i)
 tree.balance();trees[region]=tree
edges=Counter(tuple(sorted(edge)) for poly in face.data.polygons for edge in poly.edge_keys)
boundary={i for edge,count in edges.items() if count==1 for i in edge}
lid_ids=[i for i in boundary if .165<abs(face.data.vertices[i].co.x)<.405 and face.data.vertices[i].co.y<-.79 and .312<face.data.vertices[i].co.z<.40]
lid_tree=KDTree(len(lid_ids))
for i,index in enumerate(lid_ids):lid_tree.insert(face.data.vertices[index].co,i)
lid_tree.balance()
for v,datum,screen in zip(face.data.vertices,color.data,projected):
 rgb=np.array([.43,.235,.145])
 if v.co.y<-.55:
  upper=pigment_mask(screen,upper_lip);lower=pigment_mask(screen,lower_lip)
  rgb=rgb*(1-upper*.88)+np.array([.19,.063,.047])*upper*.88
  rgb=rgb*(1-lower*.85)+np.array([.368,.147,.120])*lower*.85
  for region,tree in trees.items():
   distance=tree.find(v.co)[2];radius=.010 if region.startswith('Brow') else (.012 if region=='Moustache' else .010)
   strength=(.45 if region.startswith('Brow') else (.45 if region=='Moustache' else .28))*math.exp(-2*(distance/radius)**2)
   rgb=rgb*(1-strength)+np.array([.019,.011,.007])*strength
  if lid_ids:
   lid=.30*math.exp(-2*(lid_tree.find(v.co)[2]/.010)**2)
   rgb=rgb*(1-lid)+np.array([.17,.066,.035])*lid
 datum.color=(*rgb,1)
material_skin=face.data.materials[0];nodes=material_skin.node_tree.nodes;attribute=nodes.new('ShaderNodeVertexColor');attribute.layer_name=color.name
bsdf=nodes.get('Principled BSDF');links=material_skin.node_tree.links
links.new(attribute.outputs['Color'],bsdf.inputs['Base Color']);bsdf.inputs['Roughness'].default_value=.57;bsdf.inputs['Specular IOR Level'].default_value=.30
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=850;noise.inputs['Detail'].default_value=2
uv=nodes.new('ShaderNodeTexCoord');links.new(uv.outputs['UV'],noise.inputs['Vector']);bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.08;bump.inputs['Distance'].default_value=.0008;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
(OUT/'facial-hair-attachments-v9.json').write_text(json.dumps({'counts':counts,'reference':'27','method':'local reference density + solved-camera surface attachments; no photo texture','attachments':records}))
scene=bpy.context.scene;scene.cycles.samples=48
for angle in [0,30,90]:
 cam=scene.camera;a=math.radians(angle);cam.location=(7*math.sin(a),-7*math.cos(a),-.05);cam.rotation_euler=(Vector((0,-.1,-.05))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/f'facial-groom-v9-{angle:03}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'facial-groom-v9-study.blend'))
