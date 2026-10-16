"""Free, unrigged Blender likeness study. No generated images or external services.
Uses the prior CC0-derived mesh as topology only, with a new portrait-space fit,
sculpted hair volumes, eyes, materials, and reference-matched camera.
Run: Blender --background --factory-startup --python scripts/avatar/build-neutral-study.py
"""
import bpy, math, json, random, os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/avatar/ubaid-neutral-study'; QA=ROOT/'qa-output/avatar-study'
OUT.mkdir(exist_ok=True); QA.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/avatar/ubaid-v2/ubaid-rig.blend'))
keep={'Ubaid_Face','Ubaid_Eyes','Ubaid_Shirt','Ubaid_Teeth','Ubaid_Tongue'}
for obj in list(bpy.data.objects):
 if obj.name not in keep:bpy.data.objects.remove(obj,do_unlink=True)
# Freeze only neutral geometry. This study intentionally has no bones or morphs.
for obj in bpy.data.objects:
 world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
 for mod in list(obj.modifiers):obj.modifiers.remove(mod)
 if obj.data.shape_keys:obj.shape_key_clear()
 obj.vertex_groups.clear()
 for v in obj.data.vertices:
  x,y,z=v.co
  # The original reference occupies a square, with eyes at y=410px.
  v.co=((.497+x/.3665)*1.254-.627, y*3.0144, .627-(1-.673-(z-1.4142808914)/.416)*1.254)
  # Keep the full bust in frame and elongate the shirt below the collar.
  if v.co.z<-.18:v.co.z=-.18+(v.co.z+.18)*1.20
  # Lift the right eye subtly, following the approved face's asymmetry.
  if obj.name in {'Ubaid_Face','Ubaid_Eyes'}:
   v.co.z+=.013*math.exp(-((v.co.x-.095)/.070)**2-((v.co.z-.21)/.060)**2)
   for cx,cz in [(-.099,.210),(.091,.225)]:
    v.co.x+=(v.co.x-cx)*.19*math.exp(-((v.co.x-cx)/.065)**6-((v.co.z-cz)/.055)**6)
    v.co.z-=.005*math.exp(-((v.co.x-cx)/.046)**4-((v.co.z-(cz-.025))/.018)**4)
  if obj.name=='Ubaid_Face':
   py=627-v.co.z*1000
   def smoothstep(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
   v.co.x*=1-(.10*smoothstep(640,760,py)+.08*smoothstep(760,845,py))*(1-smoothstep(1030,1160,py))
   v.co.z-=.012*math.exp(-((py-755)/70)**2)
 for p in obj.data.polygons:p.use_smooth=True
 sub=obj.modifiers.new('Smooth sculpt surface','SUBSURF');sub.levels=2;sub.render_levels=2

def p(x,y,d):return Vector(((x-627)/1000,d/1000,(627-y)/1000))
def mat(name,rgb,rough=.55):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*rgb,1);b.inputs['Roughness'].default_value=rough
 return m
def assign(o,m):o.data.materials.clear();o.data.materials.append(m)
def meshobj(name,verts,faces,material):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);m.materials.append(material)
 for f in m.polygons:f.use_smooth=True
 return o
hairmat=mat('Soft black-brown sculpted hair',(.006,.003,.002),.43)
hairmat.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.30
ridgeMat=mat('Hair satin ridges',(.014,.008,.005),.44)
# An asymmetric closed scalp volume follows the reference silhouette, behind the locks.
verts=[];faces=[];rings=32;steps=96
for j in range(rings+1):
 a=(j/rings)*(math.pi/2-.0001)
 for i in range(steps):
  ph=2*math.pi*i/steps;front=max(0,math.cos(ph));edge=480-245*front**2
  x=627+282*math.sin(ph)*math.cos(a)
  y=edge+(50-edge)*math.sin(a)
  d=-100-308*math.cos(ph)*math.cos(a)
  verts.append(p(x,y,d))
for j in range(rings):
 for i in range(steps):
  a=j*steps+i;b=j*steps+(i+1)%steps;faces.append((a,b,b+steps,a+steps))
meshobj('Hair foundation volume',verts,faces,hairmat)
# Fit an undercoat directly to the head so the skin cannot poke through the hair
# when the camera turns. The front boundary follows the approved hairline.
bpy.context.view_layer.update()
head=bpy.data.objects['Ubaid_Face'].evaluated_get(bpy.context.evaluated_depsgraph_get())
headmesh=head.to_mesh();scalpVerts=[];scalpFaces=[];indexMap={}
knots=[(0,218),(.10,234),(.17,289),(.205,420),(.245,480),(.32,445)]
def hairline(x):
 x=abs(x)
 for (a,ya),(b,yb) in zip(knots,knots[1:]):
  if x<=b:return ya+(yb-ya)*max(0,(x-a)/(b-a))
 return 445
for poly in headmesh.polygons:
 if all(627-headmesh.vertices[i].co.z*1000<hairline(headmesh.vertices[i].co.x) for i in poly.vertices):
  faceIndices=[]
  for i in poly.vertices:
   if i not in indexMap:
    v=headmesh.vertices[i];indexMap[i]=len(scalpVerts);scalpVerts.append(v.co+v.normal*.001)
   faceIndices.append(indexMap[i])
  scalpFaces.append(faceIndices)
undercoat=meshobj('Fitted hair undercoat',scalpVerts,scalpFaces,hairmat)
bpy.ops.object.select_all(action='DESELECT');undercoat.select_set(True);bpy.context.view_layer.objects.active=undercoat
smooth=undercoat.modifiers.new('Smooth hairline edge','SMOOTH');smooth.factor=.65;smooth.iterations=8
bpy.ops.object.modifier_apply(modifier=smooth.name)
solid=undercoat.modifiers.new('Closed scalp volume','SOLIDIFY');solid.thickness=.002;solid.offset=-1
bpy.ops.object.modifier_apply(modifier=solid.name)
head.to_mesh_clear()

# Each lock is a tapered, flattened 3D ribbon, not a round pipe. Its editable
# path is traced against the approved front view; depth separates overlapping waves.
def catmull(points,steps=16):
 pts=[Vector(q) for q in points];res=[]
 for i in range(len(pts)-1):
  a=pts[max(0,i-1)];b=pts[i];c=pts[i+1];d=pts[min(len(pts)-1,i+2)]
  for j in range(steps):
   t=j/steps;res.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
 res.append(pts[-1]);return res

def strand(name,points,radius,material):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=2;cu.bevel_depth=radius;cu.bevel_resolution=2
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for i,(bp,q) in enumerate(zip(sp.points,points)):
  bp.co=(*q,1);bp.radius=max(.07,math.sin(math.pi*i/(len(points)-1))**.45)
 ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);cu.materials.append(material)
 return ob

def lock(name,points,width,depth=19):
 pts=catmull(points);vv=[];ff=[];frames=[];sides=32
 for i,q in enumerate(pts):
  t=i/(len(pts)-1);tan=pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)];side=Vector((-tan.y,tan.x,0)).normalized()
  w=width*(.10+.90*math.sin(math.pi*t)**.48);h=depth*(.12+.88*math.sin(math.pi*t)**.6)
  frames.append((q,side,w,h))
  for j in range(sides):
   a=2*math.pi*j/sides;scallop=1+.014*math.cos(18*a+2*t)
   pos=q+side*w*math.cos(a)*scallop+Vector((0,0,-h*math.sin(a)))
   vv.append(p(*pos))
 for i in range(len(pts)-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;ff.append((a,b,b+sides,a+sides))
 ff.extend([tuple(range(sides-1,-1,-1)),tuple((len(pts)-1)*sides+j for j in range(sides))])
 o=meshobj(name,vv,ff,hairmat)
 # Fine low-contrast surface strokes follow the same volume, contributing curved highlights.
 for j in range(39):
  k=-.96+j*1.92/38;path=[]
  for q,side,w,h in frames:
   pos=q+side*(w*k)+Vector((0,0,-h*math.sqrt(max(0,1-k*k))-1.4))
   path.append(p(*pos))
  strand(name+f' / ridge {j:02d}',path,.00025,ridgeMat)
 return o
# Back-to-front order is only organizational; true depth determines occlusion.
locks=[
 ('Right rear wave',[(859,474,-165),(905,375,-180),(930,268,-208),(917,192,-220),(896,140,-230)],35,25),
 ('Left rear wave',[(398,519,-160),(352,424,-216),(321,343,-255),(331,286,-302),(368,247,-320)],32,20),
 ('Crown rear',[(366,251,-260),(398,159,-298),(463,102,-285),(558,78,-230),(619,92,-180)],34,24),
 ('Crown roll',[(502,142,-292),(551,81,-312),(625,56,-287),(703,62,-254),(759,91,-236)],35,24),
 ('Right crest curl',[(810,280,-343),(861,217,-376),(890,145,-370),(882,85,-320),(854,53,-293),(826,65,-279)],38,26),
 ('Right swept wave',[(841,437,-231),(892,359,-281),(925,267,-310),(906,193,-332),(866,160,-365),(823,203,-380)],34,21),
 ('Right temple wave',[(842,524,-242),(855,460,-302),(848,391,-342),(819,333,-373)],22,16),
 ('Left lower curl',[(415,509,-250),(388,426,-299),(400,344,-368),(455,304,-415),(492,257,-429)],24,17),
 ('Left middle curl',[(364,454,-225),(337,365,-313),(366,304,-370),(421,273,-423),(444,212,-425)],32,20),
 ('Left upper curl',[(335,347,-278),(307,275,-338),(345,224,-385),(393,211,-409),(411,155,-370)],31,23),
 ('Left crest',[(336,255,-321),(351,192,-380),(411,167,-411),(448,118,-376),(491,105,-349)],28,20),
 ('Upper sweep',[(824,258,-371),(792,146,-421),(720,91,-432),(638,89,-440),(559,125,-454),(506,132,-443),(471,104,-403)],34,22),
 ('Middle sweep',[(807,254,-409),(754,166,-452),(682,133,-472),(605,157,-484),(543,184,-481),(492,176,-466),(466,140,-445)],31,21),
 ('Front signature wave',[(778,247,-427),(721,196,-474),(651,186,-493),(582,231,-499),(519,239,-495),(474,202,-477),(457,155,-451),(458,108,-399)],30,22),
 ('Under swept fringe',[(409,361,-371),(433,299,-432),(473,263,-453),(516,231,-444)],23,12),
 ('Hairline curl',[(461,294,-399),(501,285,-441),(543,256,-471),(579,238,-475)],13,10),
]
for name,pts,w,d in locks:lock(name,pts,w*1.20,d*.69)
# The filled crest closes the curl without a separate visible inner hook.
# Unite the larger hair masses into a continuous sculpt. Surface strokes remain
# separate so their flow can be edited without changing the silhouette.
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,radius=1,location=p(853,114,-250))
crest=bpy.context.object;crest.name='Filled crest';crest.scale=(.050,.070,.082);assign(crest,hairmat)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.data.objects:
 if ob.type=='MESH' and ob.name!='Fitted hair undercoat' and ob.data.materials and ob.data.materials[0]==hairmat:ob.select_set(True)
bpy.context.view_layer.objects.active=crest;bpy.ops.object.join();crest.name='Sculpted wavy hair'
rem=crest.modifiers.new('Joined sculpt volumes','REMESH');rem.mode='VOXEL';rem.voxel_size=.002;rem.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=rem.name)
smooth=crest.modifiers.new('Soften lock intersections','SMOOTH');smooth.factor=.6;smooth.iterations=4
bpy.ops.object.modifier_apply(modifier=smooth.name)
# Support the right sweep with a continuous mass behind its outer curls.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=48,radius=1,location=p(872,267,-242))
fill=bpy.context.object;fill.name='Right sweep under-volume';fill.scale=(.064,.108,.137);assign(fill,hairmat)
for poly in fill.data.polygons:poly.use_smooth=True
# Natural corneal surface and iris detail on the actual 3D eye geometry.
bpy.data.objects.remove(bpy.data.objects['Ubaid_Eyes'],do_unlink=True)
em=mat('Soft ivory sclera',(.80,.75,.67),.43)
irisMat=mat('Brown iris',(.045,.012,.004),.34)
pupilMat=mat('Deep pupils',(.001,.0006,.0003),.28)
irisMat.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.12
catchlight=mat('Eye catchlight',(.95,.95,.95),.2)
limbal=mat('Dark iris boundary',(.026,.013,.008),.4)
for index,(x,y) in enumerate([(528,420),(718,407)]):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=1,location=p(x,y,-368))
 globe=bpy.context.object;globe.name=f'Eyeball {index}';globe.scale=(.056,.041,.037);assign(globe,em)
 for poly in globe.data.polygons:poly.use_smooth=True
 for label,radius,material,depth in [('Limbal ring',24,limbal,-408.5),('Iris',22,irisMat,-409.0),('Pupil',9,pupilMat,-409.8)]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=1,location=p(x,y,depth))
  eye=bpy.context.object;eye.name=f'{label} {index}';eye.scale=(radius/1000,.0018,radius/1000);assign(eye,material)
  for poly in eye.data.polygons:poly.use_smooth=True
 for dx,dy,radius in [(-6,-9,3.2),(6,7,1.25)]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=radius/1000,location=p(x+dx,y+dy,-413.5))
  highlight=bpy.context.object;highlight.name=f'Soft corneal reflection {index}';highlight.scale.y=.17;assign(highlight,catchlight)
 # Radial iris fibers are geometry on the curved disc, with subtle color variation.
 for n in range(90):
  angle=2*math.pi*n/90
  r1=10+2*math.sin(n*2.3);r2=19+math.cos(n*4.2)
  path=[p(x+r*math.cos(angle+.013*math.sin(r)),y+r*math.sin(angle+.013*math.sin(r)),-410.8+1.4*(r/22)**2) for r in [r1,(r1+r2)/2,r2]]
  strand(f'Iris fiber {index} {n}',path,.00018,limbal)
# Surface-grown eyebrow fibers restore the dark, defined brows of the reference.
face=bpy.data.objects['Ubaid_Face'];deps=bpy.context.evaluated_depsgraph_get();surface=face.evaluated_get(deps)
rng=random.Random(11);browmat=mat('Soft dark eyebrow hair',(.018,.008,.004),.7)
def on_face(x,y,offset=.0007):
 hit,co,normal,index=surface.ray_cast(p(x,y,-2000),Vector((0,1,0)))
 return Vector((co.x,co.y-offset,co.z)) if hit else p(x,y,-405)
for brow in [0,1]:
 for n in range(270):
  t=rng.random();offset=rng.uniform(-1,1)
  if brow==0:x=443+149*t;y=380-21*math.sin(math.pi*t)-10*t;direction=1
  else:x=649+152*t;y=357-17*math.sin(math.pi*t)+12*t;direction=-1
  width=(3+8*math.sin(math.pi*t)**.4);y+=offset*width
  length=rng.uniform(6,12);dx=direction*(6+7*t);dy=-length
  strand(f'Eyebrow {brow} strand {n}',[on_face(x,y),on_face(x+dx*.55,y+dy*.6),on_face(x+dx,y+dy)],rng.uniform(.00017,.00032),browmat)
# Preserve the authored face material, but reduce added shading to avoid doubling
# the directional shadows already present in the reference-derived albedo.
face=bpy.data.objects['Ubaid_Face'];bs=face.data.materials[0].node_tree.nodes.get('Principled BSDF')
bs.inputs['Roughness'].default_value=.68;bs.inputs['Subsurface Weight'].default_value=.035
shirt=bpy.data.objects['Ubaid_Shirt'];assign(shirt,mat('Soft ivory cotton',(.83,.815,.79),.85))
# Two structured collar leaves and a narrow button placket match the tailored
# open-collar silhouette; the original shirt remains the draped body underneath.
bpy.context.view_layer.update();shirtSurface=shirt.evaluated_get(bpy.context.evaluated_depsgraph_get())
cotton=shirt.data.materials[0]
def on_shirt(x,y,offset=.005):
 hit,co,n,idx=shirtSurface.ray_cast(p(x,y,-2000),Vector((0,1,0)))
 return p(x,y,min(co.y*1000-1000*offset,-240)) if hit else p(x,y,-255)
for label,inner,outer in [
 ('Left collar',[(465,774,0),(468,850,0),(514,926,0),(573,977,0)],[(426,811,0),(409,904,0),(403,993,0),(537,957,0)]),
 ('Right collar',[(791,767,0),(790,846,0),(762,930,0),(722,997,0)],[(826,809,0),(873,885,0),(943,979,0),(862,926,0)])]:
 a=catmull(inner,10);b=catmull(outer,10);vv=[];ff=[]
 for i,(left,right) in enumerate(zip(a,b)):
  for j in range(7):
   t=j/6;q=left.lerp(right,t);co=p(q.x,q.y,-300-(q.y-780)*.3-18*math.sin(math.pi*t));vv.append(co)
 for i in range(len(a)-1):
  for j in range(6):idx=i*7+j;ff.append((idx,idx+1,idx+8,idx+7))
 collar=meshobj(label,vv,ff,cotton)
 sub=collar.modifiers.new('Smooth collar fold','SUBSURF');sub.levels=2;sub.render_levels=2
 solid=collar.modifiers.new('Cotton thickness','SOLIDIFY');solid.thickness=.002
 bevel=collar.modifiers.new('Soft sewn edge','BEVEL');bevel.width=.001;bevel.segments=2
# Very fine cloth normal detail, independent of the mesh silhouette.
nodes=shirt.data.materials[0].node_tree.nodes;links=shirt.data.materials[0].node_tree.links
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=520;noise.inputs['Detail'].default_value=2
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.11;bump.inputs['Distance'].default_value=.0007
links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
# Neutral studio. A broad key defines the sculpt; soft fill keeps the face readable.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=int(os.environ.get('AVATAR_SAMPLES','48'));scene.cycles.use_denoising=True
world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.77,.86,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6;scene.world=world

def track(o,point):o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,pos,power,size,color):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=pos;track(o,(0,-.2,0))
area('Large soft key',(-1.8,-2.8,2.3),65,2.2,(1,.91,.83))
area('Hair softbox',(-.55,-.9,1.7),30,1.25,(1,.92,.87))
area('Portrait fill',(1.7,-2.4,.65),55,2.5,(.86,.91,1))
area('Subtle lavender rim',(1.2,.5,1.1),30,1.4,(.69,.68,1))
camdata=bpy.data.cameras.new('Reference matched camera');cam=bpy.data.objects.new('Reference matched camera',camdata);bpy.context.collection.objects.link(cam)
cam.location=(0,-4,0);track(cam,(0,0,0));camdata.type='ORTHO';camdata.ortho_scale=1.32;scene.camera=cam
scene.render.resolution_x=1254;scene.render.resolution_y=1254;scene.render.resolution_percentage=int(os.environ.get('AVATAR_SCALE','70'));scene.render.film_transparent=True
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=-.15
# Embed canonical artwork as a non-rendering reference in the editable file.
ref=bpy.data.objects.new('APPROVED ARTWORK — comparison only',None);bpy.context.collection.objects.link(ref);ref.empty_display_type='IMAGE';ref.data=bpy.data.images.load(str(ROOT/'assets/avatar/ubaid-v1/master.png'));ref.empty_display_size=1.254;ref.hide_render=True;ref.hide_viewport=True
bpy.context.preferences.filepaths.save_version=0
for img in bpy.data.images:
 if img.source=='FILE':img.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ubaid-neutral-study.blend'))
scene.render.filepath=str(QA/'neutral-front.png');bpy.ops.render.render(write_still=True)
