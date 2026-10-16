"""Local Blender modeling study, with no rig or paid service.

The facial edits are explicit localized mesh deformations, recorded below. Hair
is rebuilt from authored surface boundaries and groom curves, not the rejected
tube locks. This is a one-reference interpretation, not an exact reconstruction.
"""
import bpy, math, random, json, os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/avatar/ubaid-sculpt-v3';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/avatar/ubaid-neutral-study/ubaid-neutral-study.blend'))
keep={'Ubaid_Face','Ubaid_Shirt','Ubaid_Teeth','Ubaid_Tongue'}
for ob in list(bpy.data.objects):
 if ob.name not in keep:bpy.data.objects.remove(ob,do_unlink=True)

def p(x,y,d):return Vector(((x-627)/1000,d/1000,(627-y)/1000))
def pixels(v):return Vector((v.x*1000+627,627-v.z*1000,v.y*1000))
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def gaussian(x,y,cx,cy,rx,ry):return math.exp(-2*((x-cx)/rx)**2-2*((y-cy)/ry)**2)
def mat(name,col,rough=.6):
 m=bpy.data.materials.new(name);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*col,1);n.inputs['Roughness'].default_value=rough
 return m
def assign(o,m):o.data.materials.clear();o.data.materials.append(m)
def mesh(name,verts,faces,m):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);assign(o,m)
 for poly in data.polygons:poly.use_smooth=True
 return o

# Facial sculpt: localized, depth-aware edits to the actual editable head mesh.
head=bpy.data.objects['Ubaid_Face']
for v in head.data.vertices:
 q=pixels(v.co);x,y,d=q
 front=1-smooth(-340,-180,d)
 # A lower-face lean matches the approved three-quarter asymmetry.
 q.x+=24*smooth(470,760,y)*(1-smooth(830,1050,y))*front
 # Broaden the soft cheek planes, and fill the exaggerated under-eye hollows.
 q.x+=(-9*gaussian(x,y,450,548,100,155)+7*gaussian(x,y,793,537,100,155))*front
 q.z-=12*(gaussian(x,y,514,458,88,42)+gaussian(x,y,728,448,88,42))*front
 # Reduce the pinched bridge; soften tip and alar transition.
 q.x+=(x-629)*.12*gaussian(x,y,629,504,68,79)*front
 q.z+=8*gaussian(x,y,631,504,49,80)*front
 # Shape the smile line and its asymmetry, without adding a facial rig.
 w=gaussian(x,y,629,613,137,62)*front
 q.x+=(x-629)*.24*w
 q.y-=((x-629)*.12)*w
 q.z-=4*gaussian(x,y,637,642,90,25)*front
 # Fill the chin plane and smooth the jaw rather than shortening the head.
 q.z-=7*gaussian(x,y,641,732,105,60)*front
 # The upper lids overlap the iris; the neutral pose should not stare.
 for cx,cy in [(528,418),(718,405)]:
  q.y+=5*gaussian(x,y,cx,cy-21,53,15)*front
  q.z-=2.5*gaussian(x,y,cx,cy-20,63,14)*front
 v.co=p(*q)
head.data.update()
# Reproject reference pigmentation after sculpting. This is ordinary UV texture
# projection on solid geometry, retained explicitly as a study limitation.
uv=head.data.uv_layers.new(name='Sculpt reference UV')
for loop in head.data.loops:
 q=pixels(head.data.vertices[loop.vertex_index].co);uv.data[loop.index].uv=(q.x/1254,1-q.y/1254)
skin=mat('Study skin pigmentation',(.43,.20,.105),.6)
n=skin.node_tree.nodes;l=skin.node_tree.links;bs=n.get('Principled BSDF')
bs.inputs['Subsurface Weight'].default_value=.07;bs.inputs['Subsurface Radius'].default_value=(1,.48,.28)
bs.inputs['Specular IOR Level'].default_value=.22
tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/'assets/avatar/ubaid-v1/master.png'),check_existing=True)
uvnode=n.new('ShaderNodeUVMap');uvnode.uv_map=uv.name;l.new(uvnode.outputs[0],tex.inputs['Vector'])
# Projection is restricted to the front skin; back and sides remain pigmented.
attr=head.data.color_attributes.new(name='Front pigment',type='FLOAT_COLOR',domain='CORNER')
for loop in head.data.loops:
 q=pixels(head.data.vertices[loop.vertex_index].co)
 w=(1-smooth(-335,-220,q.z))*(1-smooth(790,880,abs(q.x-627)+627))*(1-smooth(860,1000,q.y))
 attr.data[loop.index].color=(w,w,w,1)
vc=n.new('ShaderNodeVertexColor');vc.layer_name=attr.name
alpha=n.new('ShaderNodeMath');alpha.operation='MULTIPLY';l.new(vc.outputs[0],alpha.inputs[0]);l.new(tex.outputs['Alpha'],alpha.inputs[1])
mix=n.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.40,.185,.09,1)
l.new(alpha.outputs[0],mix.inputs[0]);l.new(tex.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],bs.inputs['Base Color'])
# Extremely shallow skin microstructure, separate from facial anatomy.
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=950;noise.inputs['Detail'].default_value=2
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.08;bump.inputs['Distance'].default_value=.00012
l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],bs.inputs['Normal']);assign(head,skin)
for poly in head.data.polygons:poly.material_index=0

def catmull(points,steps=12):
 points=[Vector(x) for x in points];result=[]
 for i in range(len(points)-1):
  a=points[max(i-1,0)];b=points[i];c=points[i+1];d=points[min(i+2,len(points)-1)]
  for j in range(steps):
   t=j/steps;result.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
 result.append(points[-1]);return result

# A single datablock holds the groom, keeping the file inspectable and editable.
hairMats=[mat('Hair pigment '+str(i),c,.44) for i,c in enumerate([(.009,.0045,.003),(.015,.007,.0045),(.023,.011,.008),(.006,.003,.002)])]
for m in hairMats:m.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.34
hairBase=mat('Sculpted hair foundation',(.007,.0035,.0025),.54)
grooms=[]
for i,m in enumerate(hairMats):
 cu=bpy.data.curves.new('Groom fibers '+str(i),'CURVE');cu.dimensions='3D';cu.resolution_u=1;cu.bevel_depth=.00043;cu.bevel_resolution=1;cu.resolution_u=1
 ob=bpy.data.objects.new(cu.name,cu);bpy.context.collection.objects.link(ob);cu.materials.append(m);grooms.append(cu)
rng=random.Random(28)
def fiber(points,kind=0,radius=1):
 sp=grooms[kind].splines.new('POLY');sp.points.add(len(points)-1)
 for j,(bp,co) in enumerate(zip(sp.points,points)):
  bp.co=(*co,1);t=j/(len(points)-1);bp.radius=radius*min(1,.1+8*t)*min(1,.04+12*(1-t))

# Each lock has two authored surface boundaries. The wide, shallow cross section
# is continuous with its neighbors; fibers create the fine combed wave detail.
patches=[
('Crown rear',[(405,157,-240),(455,98,-273),(501,63,-280),(549,63,-240),(591,86,-220)],[(375,137,-195),(435,69,-224),(486,44,-230),(542,43,-202),(596,58,-195)],17,650),
('Crown top',[(487,130,-325),(558,80,-300),(625,64,-280),(697,62,-254),(757,104,-263)],[(482,93,-270),(557,43,-260),(622,29,-220),(703,35,-222),(776,69,-220)],16,700),
('Upper sweep',[(483,153,-357),(544,145,-382),(616,108,-396),(689,83,-365),(754,114,-340),(796,233,-344)],[(455,95,-289),(536,94,-335),(608,48,-335),(691,37,-306),(788,90,-300),(831,225,-290)],18,1000),
('Signature front wave',[(447,149,-337),(478,217,-399),(535,237,-423),(600,220,-459),(664,182,-448),(729,204,-406),(768,265,-368)],[(414,109,-260),(440,159,-335),(508,165,-376),(572,151,-405),(650,112,-400),(748,147,-358),(810,240,-327)],17,1750),
('Soft front fringe',[(422,319,-335),(459,273,-386),(513,251,-414),(562,226,-437),(601,213,-442)],[(413,282,-321),(449,237,-367),(493,224,-400),(547,206,-418),(592,203,-426)],10,520),
('Left outer crown',[(324,306,-250),(306,256,-260),(343,224,-290),(377,195,-300),(385,148,-245)],[(304,318,-209),(284,256,-215),(318,206,-240),(342,160,-260),(371,119,-230)],10,500),
('Left upper curl',[(327,276,-304),(355,250,-326),(397,229,-355),(420,183,-345),(413,132,-277)],[(305,239,-249),(331,204,-280),(366,185,-315),(381,146,-290),(399,105,-247)],12,670),
('Left middle curl',[(341,373,-300),(339,317,-338),(377,285,-360),(425,260,-370),(442,214,-363)],[(314,382,-226),(308,315,-290),(337,271,-320),(385,247,-327),(401,207,-310)],12,800),
('Left temple sweep',[(414,455,-310),(403,385,-354),(429,333,-372),(469,296,-396),(493,249,-413)],[(366,474,-223),(350,390,-283),(371,325,-313),(411,289,-350),(447,251,-368)],15,850),
('Left sideburn',[(412,526,-234),(403,457,-289),(414,389,-326)],[(384,494,-190),(375,441,-232),(390,367,-299)],9,420),
('Right outer body',[(842,450,-230),(892,382,-210),(912,317,-194),(929,237,-180),(931,161,-169)],[(874,461,-165),(912,394,-153),(928,323,-129),(946,242,-113),(942,174,-120)],10,500),
('Right swept body',[(845,421,-290),(886,351,-318),(910,283,-310),(911,211,-294),(893,161,-290)],[(876,445,-241),(919,360,-256),(937,285,-254),(942,206,-230),(924,145,-213)],13,800),
('Right crest',[(803,285,-359),(847,244,-350),(876,180,-328),(877,105,-282),(855,50,-232),(822,44,-240),(803,78,-267)],[(842,300,-295),(892,242,-298),(918,174,-274),(910,96,-230),(883,36,-198),(832,14,-203),(782,53,-235)],17,1250),
('Right temple',[(837,493,-239),(837,421,-292),(827,349,-330),(812,289,-348)],[(872,466,-203),(868,406,-239),(857,336,-289),(846,277,-311)],10,600),
]
patchObjects=[]
for name,left,right,bulge,count in patches:
 a=catmull(left,10);b=catmull(right,10);verts=[];faces=[];across=22
 def surf(i,t,lift=0):
  q=a[i].lerp(b[i],t);q.z-=bulge*math.sin(math.pi*t)**.8+lift
  return p(*q)
 for i in range(len(a)):
  for j in range(across+1):verts.append(surf(i,j/across))
 for i in range(len(a)-1):
  for j in range(across):k=i*(across+1)+j;faces.append((k,k+1,k+across+2,k+across+1))
 # Close the sculpt volume toward the scalp rather than leaving a ribbon edge.
 size=len(verts);verts.extend(v+Vector((0,.085,0)) for v in list(verts))
 fronts=list(faces);faces.extend(tuple(i+size for i in reversed(f)) for f in fronts)
 boundary=list(range(across+1))+[i*(across+1)+across for i in range(1,len(a))]+[(len(a)-1)*(across+1)+j for j in range(across-1,-1,-1)]+[i*(across+1) for i in range(len(a)-2,0,-1)]
 for u,v in zip(boundary,boundary[1:]+boundary[:1]):faces.append((u,v,v+size,u+size))
 ob=mesh(name+' / sculpt surface',verts,faces,hairBase);patchObjects.append(ob)
 if sum(poly.normal.y for poly in ob.data.polygons)>0:
  for poly in ob.data.polygons:poly.flip()
  ob.data.update()
 # Individually varied, tapered strands follow the swept surface, with soft
 # clumping and length variation rather than perfectly parallel plastic ridges.
 for n in range(count):
  base=(n+rng.random())/count;phase=rng.random()*math.tau;drift=rng.uniform(-.018,.018)
  start=rng.randrange(0,max(1,int(len(a)*.06)));end=len(a)-rng.randrange(0,max(1,int(len(a)*.08)))
  path=[]
  for i in range(start,end):
   u=i/(len(a)-1);t=max(.002,min(.998,base+drift*math.sin(math.pi*u)+.005*math.sin(phase+u*12)))
   path.append(surf(i,t,1.7+rng.random()*.25))
  fiber(path,rng.choices([0,1,2,3],[.46,.27,.09,.18])[0],rng.uniform(.55,1.05))

# Continuous closed under-volume, fitted behind the authored visible surface.
# The rings run from the forehead hairline over the crown to the back of head.
verts=[];faces=[];steps=128;rings=48
for j in range(rings+1):
 th=(j/rings)*math.pi/2
 for i in range(steps):
  ph=i/steps*math.tau;f=max(0,math.cos(ph));edge=481-255*f**2
  x=627+292*math.sin(ph)*math.cos(th)
  y=edge+(62-edge)*math.sin(th)
  d=-90-232*math.cos(ph)*math.cos(th)
  verts.append(p(x,y,d))
for j in range(rings):
 for i in range(steps):k=j*steps+i;k1=j*steps+(i+1)%steps;faces.append((k,k1,k1+steps,k+steps))
mesh('Continuous scalp and back volume',verts,faces,hairBase)
# Cover the actual head, including patches that the old geometric cap missed.
bpy.context.view_layer.update();ev=head.evaluated_get(bpy.context.evaluated_depsgraph_get());hm=ev.to_mesh();verts=[];faces=[];indices={}
line=[(280,430),(330,480),(382,515),(410,515),(413,390),(424,314),(462,280),(524,240),(590,217),(744,215),(800,257),(830,344),(845,478),(900,457),(970,430)]
def limit(x):
 for (a,ya),(b,yb) in zip(line,line[1:]):
  if x<=b:return ya+(yb-ya)*max(0,(x-a)/(b-a))
 return 430
for poly in hm.polygons:
 if all(pixels(hm.vertices[i].co).y<limit(pixels(hm.vertices[i].co).x) for i in poly.vertices):
  face=[]
  for i in poly.vertices:
   if i not in indices:indices[i]=len(verts);verts.append(hm.vertices[i].co+hm.vertices[i].normal*.002)
   face.append(indices[i])
  faces.append(face)
under=mesh('Fitted sculpt scalp',verts,faces,hairBase);ev.to_mesh_clear()
mod=under.modifiers.new('Scalp thickness','SOLIDIFY');mod.thickness=.008
for name,loc,scale in [('Crest core',(850,110,-217),(.058,.10,.095)),('Right sweep core',(880,264,-190),(.061,.12,.180)),('Left crown core',(350,302,-199),(.066,.11,.140))]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40,radius=1,location=p(*loc));o=bpy.context.object;o.name=name;o.scale=scale;assign(o,hairBase)
 for poly in o.data.polygons:poly.use_smooth=True
# Join and relax the hair masses into a continuous editable sculpture.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 if o.type=='MESH' and o.data.materials and o.data.materials[0]==hairBase:
  o.select_set(True);bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.context.view_layer.objects.active=patchObjects[0];bpy.ops.object.join();hair=bpy.context.object;hair.name='Hair — continuous sculpt'
rem=hair.modifiers.new('Weld hair masses','REMESH');rem.mode='VOXEL';rem.voxel_size=.0015;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
relax=hair.modifiers.new('Relax sculpt joins','SMOOTH');relax.factor=.65;relax.iterations=7;bpy.ops.object.modifier_apply(modifier=relax.name)

# Eye spheres stay behind the lids; subtle wet margins replace the flat stare.
ivory=mat('Warm sclera',(.48,.43,.36),.28)
iris=mat('Amber brown iris',(.058,.022,.010),.35)
pupil=mat('Pupils',(.0009,.0005,.0003),.23)
rim=mat('Iris rim',(.016,.009,.006),.4)
spark=mat('Corneal glint',(.9,.9,.9),.2)
iris.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.12
pupil.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.06
rim.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.12
def sphere(name,x,y,d,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40,radius=1,location=p(x,y,d));o=bpy.context.object;o.name=name;o.scale=scale;assign(o,m)
 for poly in o.data.polygons:poly.use_smooth=True
 return o
for k,(x,y) in enumerate([(528,418),(718,405)]):
 sphere('Eyeball '+str(k),x,y,-366,(.057,.041,.037),ivory)
 for label,r,dep,m in [('Iris rim',23,-412,rim),('Iris',21.5,-412.5,iris),('Pupil',8.5,-414,pupil)]:sphere(label+str(k),x,y,dep,(r/1000,.0018,r/1000),m)
 sphere('Catchlight '+str(k),x-6,y-9,-417,(.003,.0006,.003),spark)

# Eyebrows, fine lash rims and beard remain editable curves on the skin surface.
bpy.context.view_layer.update();surface=head.evaluated_get(bpy.context.evaluated_depsgraph_get())
def surfacePoint(x,y,lift=.0005):
 hit,co,n,idx=surface.ray_cast(p(x,y,-2000),Vector((0,1,0)))
 return Vector((co.x,co.y-lift,co.z)) if hit else p(x,y,-405)
facialHair=mat('Facial hair pigment',(.014,.007,.0035),.73)
cu=bpy.data.curves.new('Eyebrows and fine facial hair','CURVE');cu.dimensions='3D';cu.bevel_depth=.00022;cu.bevel_resolution=1
ob=bpy.data.objects.new(cu.name,cu);bpy.context.collection.objects.link(ob);cu.materials.append(facialHair)
def facialFiber(points,radius=1):
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for j,(bp,q) in enumerate(zip(sp.points,points)):bp.co=(*q,1);bp.radius=radius*(1-j/(len(points)-1)*.85)
for side in [0,1]:
 for j in range(330):
  t=rng.random();width=rng.uniform(-1,1)*(3+6*math.sin(math.pi*t)**.4)
  if side==0:x=443+150*t;y=380-22*math.sin(math.pi*t)-10*t+width;dx=6+5*t
  else:x=649+152*t;y=357-16*math.sin(math.pi*t)+12*t+width;dx=-6-4*t
  dy=-rng.uniform(6,12);facialFiber([surfacePoint(x,y),surfacePoint(x+dx*.5,y+dy*.6),surfacePoint(x+dx,y+dy)],rng.uniform(.6,1))

# Keep the existing shirt for the first head/hair review. It is not part of the
# likeness claim; the next pass can correct its collar and lower bust silhouette.
shirt=bpy.data.objects['Ubaid_Shirt'];cotton=mat('Warm white cotton',(.68,.66,.63),.87);assign(shirt,cotton)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=int(os.environ.get('AVATAR_SAMPLES','48'));scene.cycles.use_denoising=True
world=bpy.data.worlds.new('Soft portrait studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.80,.84,.90,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55;scene.world=world
def track(o,point):o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,power,size,col):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=col
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc;track(ob,(0,-.2,.1))
area('Large portrait key',(-1.5,-2.8,2),48,2.6,(1,.92,.86))
area('Soft fill',(1.3,-3,.5),55,2.8,(1,.96,.92))
area('Lavender edge',(1.4,.3,1),24,1.8,(.67,.65,1))
camdata=bpy.data.cameras.new('Neutral camera');cam=bpy.data.objects.new('Neutral camera',camdata);bpy.context.collection.objects.link(cam);cam.location=(0,-4,0);track(cam,(0,0,0));camdata.type='ORTHO';camdata.ortho_scale=1.254;scene.camera=cam
scene.render.resolution_x=1254;scene.render.resolution_y=1254;scene.render.resolution_percentage=int(os.environ.get('AVATAR_SCALE','70'));scene.render.film_transparent=True
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=-.15
# Packed reference for the Blender Image Editor; never a rendered billboard.
ref=bpy.data.objects.new('REFERENCE ONLY — approved avatar',None);bpy.context.collection.objects.link(ref);ref.empty_display_type='IMAGE';ref.data=tex.image;ref.hide_render=True;ref.hide_viewport=True
for screen in bpy.data.screens:
 for a in screen.areas:
  if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA';a.spaces.active.shading.type='MATERIAL';a.spaces.active.overlay.show_overlays=False
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.context.preferences.filepaths.save_version=0
report={'status':'Unapproved neutral sculpture study','armatures':sum(ob.type=='ARMATURE' for ob in scene.objects),'shapeKeys':sum(bool(ob.data.shape_keys) for ob in scene.objects if ob.type=='MESH'),'hairFibers':sum(len(c.splines) for c in grooms),'faceVertices':len(head.data.vertices),'paidServices':False,'facialMethod':'Localized mesh deformations, UV reprojection of reference pigmentation. Not hand-brushed sculpt strokes.','hairMethod':'Authored connected surface boundaries and individual groom curves.','referenceLimits':'One approved view. Side and back are inferred; no numerical likeness score.'}
assert report['armatures']==0 and report['shapeKeys']==0
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ubaid-sculpt-v3.blend'))
scene.render.filepath=str(OUT/'neutral-front.png');bpy.ops.render.render(write_still=True)
print('SCULPT_REPORT',json.dumps(report))
