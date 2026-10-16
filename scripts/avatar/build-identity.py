"""Photo-guided, genuinely three-dimensional identity build.

Free MPFB/MakeHuman CC0 topology is a starting cage; all identity adjustments
are geometry. No portrait projection or generated-photo billboard is used.
Run in the available Blender: --background --python scripts/avatar/build-identity.py
"""
import bpy, sys, os, math, json, random, numpy as np
from pathlib import Path
from mathutils import Vector
import addon_utils

ROOT = Path(__file__).resolve().parents[2]
TOOLS = Path(os.getenv('AVATAR_TOOL_ROOT', '/tmp/ubaid-avatar-tools'))
OUT = ROOT/'assets/avatar/identity-rebuild'
OUT.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(TOOLS/'mpfb2/src'))
bpy.utils.extension_path_user = lambda *a, **k: str(TOOLS/'mpfb-user')
addon_utils.enable('mpfb', default_set=True, persistent=False)
from mpfb.services.humanservice import HumanService
from mpfb.services.targetservice import TargetService
from mpfb.services.exportservice import ExportService

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(20050623)
macro = TargetService.get_default_macro_info_dict()
macro.update(gender=1., age=.45, muscle=.57, weight=.43, proportions=.6, height=.63)
body = HumanService.create_human(macro_detail_dict=macro)
body.name = 'Ubaid_Body'
targets = {
 'head/head-oval':.38, 'head/head-scale-vert-incr':.10,
 'head/head-scale-horiz-decr':.12, 'head/head-fat-decr':.06,
 'chin/chin-width-decr':.26, 'chin/chin-prominent-incr':.22,
 'chin/chin-bones-incr':.18, 'chin/chin-height-incr':.06,
 'nose/nose-scale-depth-incr':.30, 'nose/nose-scale-vert-incr':.14,
 'nose/nose-scale-horiz-decr':.10, 'nose/nose-width1-decr':.10,
 'nose/nose-point-down':.08, 'nose/nose-curve-convex':.09,
 'mouth/mouth-scale-horiz-incr':.10, 'mouth/mouth-upperlip-volume-decr':.10,
 'mouth/mouth-lowerlip-volume-incr':.23, 'mouth/mouth-cupidsbow-incr':.08,
 'mouth/mouth-angles-up':.07,
}
for side in ['l','r']:
 targets.update({f'eyes/{side}-eye-scale-incr':.12,
  f'eyes/{side}-eye-height2-decr':.07,
  f'eyes/{side}-eye-height3-decr':.05,
  f'eyes/{side}-eye-corner2-up':.08,
  f'cheek/{side}-cheek-bones-incr':.18,
  f'cheek/{side}-cheek-volume-decr':.10})
override = OUT/'fit-parameters.json'
if override.exists(): targets.update(json.loads(override.read_text()))
for fragment, weight in targets.items():
 path = TOOLS/'mpfb2/src/mpfb/data/targets'/f'{fragment}.target.gz'
 if not path.exists(): raise RuntimeError(f'Missing anatomical target: {path}')
 TargetService.load_target(body, str(path), weight=weight)
TargetService.bake_targets(body)

# Fit stable landmarks from five differently posed reference photographs. The
# displacement is on the mesh, with local support; the back is never stretched
# to satisfy a front view. Retain this independently editable neutral cage.
fit_path=OUT/'landmark-fit.json'
if fit_path.exists():
 from mathutils.bvhtree import BVHTree
 bpy.context.view_layer.update()
 tree=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
 controls=[];deltas=[]
 for p in json.loads(fit_path.read_text())['controls']:
  q=tree.ray_cast(Vector((p['x'],-.8,p['z'])),Vector((0,1,0)))[0]
  if q:controls.append([q.x,q.z]);deltas.append(p['delta'])
 centers=np.array(controls);delta=np.array(deltas);sigma=.025
 diff=centers[:,None,:]-centers[None,:,:]
 kernel=np.exp(-np.sum(diff*diff,axis=2)/(sigma*sigma))
 coefficients=np.linalg.solve(kernel+np.eye(len(kernel))*.055,delta)
 for v in body.data.vertices:
  if v.co.z<1.58 or v.co.y>-.065:continue
  distance=np.sum((centers-np.array([v.co.x,v.co.z]))**2,axis=1)
  displacement=np.exp(-distance/(sigma*sigma))@coefficients
  fade=min(1.,max(0.,(-v.co.y-.065)/.045))*min(1.,max(0.,(v.co.z-1.58)/.035))
  v.co+=Vector(displacement.tolist())*fade

# Lip volume is reviewed independently of pigmentation. Preserve the existing
# mouth loops and taper the correction toward the commissures.
lip_group=body.vertex_groups['lips'].index
for v in body.data.vertices:
 if not any(g.group==lip_group for g in v.groups):continue
 amount=max(0.,1-(abs(v.co.x)/.029)**4)
 seam=1.647
 if v.co.y<-.14:
  v.co.z=seam+(v.co.z-seam)*(1-(.28 if v.co.z>seam else .14)*amount)
  v.co.y+=.0025*amount

# Round 2 direct geometric sculpt. The side silhouette receives full changes;
# unlike front-depth-gated projection this follows the complete jaw volume.
for v in body.data.vertices:
 x,y,z=v.co
 if z<1.54:continue
 # Cheek and mandibular taper; keep the temple/eye socket span intact.
 cheek=math.exp(-((z-1.674)/.035)**2)*math.exp(-((abs(x)-.062)/.026)**2)
 v.co.x-=math.copysign(.0065*cheek,x)
 # Shorten the lower chin, blended around its underside into the neck.
 v.co.z+=.0045*math.exp(-((z-1.599)/.021)**2)*min(1,max(0,(-y-.025)/.055))
 # Mouth commissures taper without thinning the already-corrected vermilion.
 mouth=math.exp(-((z-1.647)/.014)**2)*math.exp(-((abs(x)-.025)/.014)**2)
 v.co.x-=math.copysign(.0018*mouth,x)*min(1,max(0,(-y-.09)/.035))
 # Relaxed lid aperture: preserve corners and globe, shape the skin/lid rim.
 for ex in [-.030,.030]:
  dx=abs(x-ex);dz=z-1.716
  if dx<.018 and abs(dz)<.014 and y<-.145:
   mask=math.exp(-(dx/.011)**4)*math.exp(-(dz/.010)**4)
   v.co.z-=dz*.26*mask
 # Profile-supported bridge/tip projection, without changing nose base width.
 nose=math.exp(-(x/.010)**2)*math.exp(-((z-1.680)/.023)**2)
 v.co.y-=.003*nose*min(1,max(0,(-y-.14)/.025))

def center(group):
 idx=body.vertex_groups[group].index
 vv=[v.co for v in body.data.vertices if any(g.group==idx for g in v.groups)]
 return sum(vv, Vector())/len(vv)
landmarks = {g: list(center(g)) for g in ['joint-head','joint-head-2','joint-neck','joint-jaw','joint-mouth','joint-l-eye','joint-r-eye']}

def equip(fragment,kind,name):
 ob=HumanService.add_mhclo_asset(str(TOOLS/'system'/fragment),body,asset_type=kind,subdiv_levels=0,material_type='MAKESKIN')
 ob.name=name
 return ob
eyes=equip('eyes/high-poly/high-poly.mhclo','Eyes','Ubaid_Eyes')
teeth=equip('teeth/teeth_base/teeth_base.mhclo','Teeth','Ubaid_Teeth')
tongue=equip('tongue/tongue01/tongue01.mhclo','Tongue','Ubaid_Tongue')
outfit=equip('clothes/male_casualsuit01/male_casualsuit01.mhclo','Clothes','Ubaid_Outfit')
shoes=equip('clothes/shoes01/shoes01.mhclo','Clothes','Ubaid_Shoes')
brows=equip('eyebrows/eyebrow001/eyebrow001.mhclo','Eyebrows','Ubaid_Brows')
hair=equip('hair/short01/short01.mhclo','Hair','Ubaid_Hair')

def material(name,rgb,rough=.6):
 mat=bpy.data.materials.new(name);mat.use_nodes=True
 bs=mat.node_tree.nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*rgb,1)
 bs.inputs['Roughness'].default_value=rough
 bs.inputs['Specular IOR Level'].default_value=.27
 return mat
def assign(ob,mat): ob.data.materials.clear();ob.data.materials.append(mat)
skin=material('Skin warm brown',(.26,.115,.055),.64)
skin.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.07
skin.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Scale'].default_value=.003
assign(body,skin)
# Full-body authored CC0 UV albedo supplies fine skin variation. This is a
# complete material atlas, never a camera-projected portrait of the user.
sn=skin.node_tree.nodes;sl=skin.node_tree.links
st=sn.new('ShaderNodeTexImage');st.image=bpy.data.images.load(str(TOOLS/'system/skins/young_caucasian_male/young_lightskinned_male_diffuse.png'))
sm=sn.new('ShaderNodeMixRGB');sm.blend_type='MULTIPLY';sm.inputs[0].default_value=1;sm.inputs[2].default_value=(.40,.30,.22,1)
sl.new(st.outputs['Color'],sm.inputs[1])
# Sparse, soft beard roots establish local color beneath real short fibers.
# Vertex-domain color travels with the skinned face and bakes into its UVs.
tone=body.data.color_attributes.new(name='BeardTone',type='FLOAT_COLOR',domain='POINT')
for v in body.data.vertices:
 x,y,z=v.co
 chin=.36*math.exp(-(x/.024)**4-((z-1.613)/.009)**4)*min(1,max(0,(-y-.09)/.035))
 jaw=.12*math.exp(-((z-1.606)/.010)**2)*math.exp(-((abs(x)-.027)/.025)**2)*min(1,max(0,(-y-.055)/.055))
 shade=1-max(chin,jaw)
 tone.data[v.index].color=(shade,shade,shade,1)
col=sn.new('ShaderNodeVertexColor');col.layer_name='BeardTone'
blend=sn.new('ShaderNodeMixRGB');blend.blend_type='MULTIPLY';blend.inputs[0].default_value=1
sl.new(sm.outputs[0],blend.inputs[1]);sl.new(col.outputs['Color'],blend.inputs[2]);sl.new(blend.outputs[0],sn.get('Principled BSDF').inputs['Base Color'])

lip=skin.copy();lip.name='Natural lips — continuous UV albedo'
body.data.materials.append(lip)
lipid=body.vertex_groups['lips'].index
lipverts={v.index for v in body.data.vertices if any(g.group==lipid for g in v.groups)}
for p in body.data.polygons:
 if all(v in lipverts for v in p.vertices):p.material_index=1
ivory=material('Ivory enamel',(.78,.75,.65),.32)
assign(teeth,ivory);assign(tongue,material('Tongue and gums',(.27,.065,.055),.64))
cotton=material('White cotton',(.81,.80,.77),.88)
trousers=material('Charcoal woven trousers',(.045,.048,.052),.87)
belt=material('Black leather belt',(.018,.017,.016),.43)
assign(outfit,cotton);outfit.data.materials.append(trousers);outfit.data.materials.append(belt)
# Assign by the actual waist band in the fitted garment; a single asset retains
# continuous weighted clothing geometry without skin showing between pieces.
for p in outfit.data.polygons:
 z=sum(outfit.data.vertices[i].co.z for i in p.vertices)/len(p.vertices)
 p.material_index=1 if z<.98 else 0
 if .973<z<.996:p.material_index=2
assign(shoes,material('Black loafers',(.017,.016,.015),.39))
for v in shoes.data.vertices:
 if v.co.z>.11:
  amount=min(1,(v.co.z-.11)/.06)
  v.co.y+=.012*amount
  v.co.z=.11+(v.co.z-.11)*.35

for mat in brows.data.materials:
 if not mat or not mat.use_nodes:continue
 bs=mat.node_tree.nodes.get('Principled BSDF')
 for link in list(mat.node_tree.links):
  if link.to_node==bs and link.to_socket.name=='Base Color':mat.node_tree.links.remove(link)
 bs.inputs['Base Color'].default_value=(.004,.003,.002,1)
 bs.inputs['Roughness'].default_value=.86;bs.inputs['Specular IOR Level'].default_value=.1
 for link in list(mat.node_tree.links):
  if link.to_node==bs and link.to_socket.name=='Alpha':
   source=link.from_socket;mat.node_tree.links.remove(link)
   power=mat.node_tree.nodes.new('ShaderNodeMath');power.operation='POWER';power.inputs[1].default_value=.42
   mat.node_tree.links.new(source,power.inputs[0]);mat.node_tree.links.new(power.outputs[0],bs.inputs['Alpha'])
for side in [-1,1]:
 vv=[v for v in brows.data.vertices if v.co.x*side>0]
 z=sum(v.co.z for v in vv)/len(vv)
 for v in vv:v.co.z=z+(v.co.z-z)*1.42+.002
# Anatomical continuous eye surface. The original asset contains a corneal
# shell whose UV samples the pupil; replace it instead of stacking iris disks.
bpy.data.objects.remove(eyes,do_unlink=True)
sclera=material('Warm sclera',(.58,.55,.49),.23)
iris=material('Dark brown iris',(.018,.008,.003),.25)
pupil=material('Pupil',(.001,.001,.001),.19)
for side in ['l','r']:
 ec=Vector(landmarks[f'joint-{side}-eye']);verts=[];faces=[];mats=[]
 rings=[.001,.06,.12,.18,.24,.30,.36,.42,.48,.58,.72,.9,1.1,1.4,1.8,2.2,2.6,math.pi-.001];segments=48
 for theta in rings:
  for j in range(segments):
   phi=2*math.pi*j/segments
   verts.append((ec.x+.0145*math.sin(theta)*math.cos(phi),ec.y-.018*math.cos(theta),ec.z+.015*math.sin(theta)*math.sin(phi)))
 for i in range(len(rings)-1):
  for j in range(segments):
   a=i*segments+j;b=i*segments+(j+1)%segments
   faces.append((a,a+segments,b+segments,b));mats.append(2 if rings[i+1]<=.18 else 1 if rings[i+1]<=.42 else 0)
 me=bpy.data.meshes.new('Eye continuous surface');me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new(f'Eye.{side.upper()}',me);bpy.context.collection.objects.link(ob)
 for m in [sclera,iris,pupil]:me.materials.append(m)
 for poly,mi in zip(me.polygons,mats):poly.material_index=mi;poly.use_smooth=True
# Preserve the original full-UV hair cards and transparency. Darken their
# pigment, then shape the fringe and crest in real depth from the photo set.
for mat in hair.data.materials:
 if not mat or not mat.use_nodes:continue
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
 bs.inputs['Roughness'].default_value=.63
 bs.inputs['Specular IOR Level'].default_value=.25
 for link in list(links):
  if link.to_node==bs and link.to_socket.name=='Base Color':
   source=link.from_socket;links.remove(link)
   mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1.;mix.inputs[2].default_value=(.065,.05,.042,1)
   links.new(source,mix.inputs[1]);links.new(mix.outputs[0],bs.inputs['Base Color'])
for v in hair.data.vertices:
 x,y,z=v.co
 eyez=landmarks['joint-l-eye'][2]
 front=max(0.,min(1.,(-y-.005)/.085))
 top=max(0.,min(1.,(z-eyez-.025)/.08))
 v.co.x+=.004*front*top
 v.co.y-=.004*front*top

# Actual curved strands establish the chosen wave pattern over the scalp.
import runpy
hair_detail=runpy.run_path(str(ROOT/'scripts/avatar/sculpt-hair.py'))
lockmat=material('Soft black wavy hair',(.007,.005,.003),.78)
# Rejected curve-groom study is retained separately; not used for the character.

# The fitted cage is retained separately for later morph/weight work.
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'identity-cage.blend'))
ExportService.bake_modifiers_remove_helpers(body,bake_masks=True,bake_subdiv=False,remove_helpers=True)
for ob in bpy.data.objects:
 if ob.type!='MESH':continue
 for p in ob.data.polygons:p.use_smooth=True
 if ob not in [hair,brows]:
  sub=ob.modifiers.new('Review surface subdivision','SUBSURF');sub.levels=1;sub.render_levels=2

# Surface-aware mustache/chin fibers: sample the actual face instead of floating
# colored strips. The curves are editable and can be bound to the rig later.
from mathutils.bvhtree import BVHTree
bpy.context.view_layer.update()
tree=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
hairmat=material('Facial hair soft black',(.025,.016,.010),.82)
def strand(name,points,radius,mat):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=2;cu.bevel_depth=radius;cu.bevel_resolution=1
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for i,(point,co) in enumerate(zip(sp.points,points)):
  point.co=(*co,1);point.radius=.65 if i==0 else (1-i/len(points))
 ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);cu.materials.append(mat)
 return ob
mouthz=sum(body.data.vertices[i].co.z for i in lipverts if i<len(body.data.vertices))/max(1,len([i for i in lipverts if i<len(body.data.vertices)]))
# lip vertex indices change when helpers are removed; use the retained named
# group instead of the jaw pivot (joint-mouth is not the lip surface).
mouthz=center('lips').z
def surface(x,z):
 hit=tree.ray_cast(Vector((x,-.7,z)),Vector((0,1,0)))
 return hit[0]
facial=[]
for n in range(1400):
 x=random.uniform(-.027,.027)
 # Narrow moustache with philtrum gap and tapered ends.
 z=mouthz+.006+.007*max(0,1-abs(x)/.027)**.65+random.uniform(0,.004)
 if abs(x)<.0009 or random.random()>min(1,(.029-abs(x))/.008):continue
 q=surface(x,z)
 if q:
  direction=-1 if x<0 else 1
  end=surface(x+direction*.0015,z-.0016)
  if end:facial.append(strand('Mustache fiber',[(q.x,q.y-.0007,q.z),((q.x+end.x)/2,min(q.y,end.y)-.0011,(q.z+end.z)/2),(end.x,end.y-.0006,end.z)],.00013,hairmat))
for n in range(2900):
 x=random.uniform(-.028,.028);z=mouthz-random.uniform(.025,.046)
 if random.random()>math.exp(-((x/.020)**2)-((z-(mouthz-.037))/.009)**2):continue
 q=surface(x,z)
 if q and q.y<-.025:
  end=surface(x+random.uniform(-.0007,.0007),z-.00085)
  if end:facial.append(strand('Chin fiber',[(q.x,q.y-.0007,q.z),(end.x,end.y-.0006,end.z)],.00013,hairmat))

def track(ob,point):ob.rotation_euler=(Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()
def area(name,location,power,size,color):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=location;track(ob,(0,0,1.35))
area('Broad soft key',(-1.8,-2.8,3.3),210,3.,(1.,.94,.88))
area('Soft fill',(2.,-1.8,2.),120,2.5,(.86,.92,1.))
area('Hair edge',(1.2,1.6,2.9),230,2.,(.9,.94,1.))
world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.67,.7,1);world.node_tree.nodes['Background'].inputs[1].default_value=.3
scene=bpy.context.scene;scene.world=world
camdata=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',camdata);bpy.context.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO'
scene.render.engine='CYCLES';scene.cycles.samples=int(os.getenv('AVATAR_SAMPLES','32'));scene.cycles.use_denoising=True
scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.film_transparent=False;scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.render.image_settings.color_mode='RGBA'
headtop=max(v.co.z for v in body.data.vertices)
cz=(headtop+landmarks['joint-neck'][2])*.5
camdata.ortho_scale=.4;cam.location=(0,-2,cz);track(cam,(0,0,cz))
for img in bpy.data.images:
 if img.source=='FILE':img.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'identity-neutral.blend'))
report={'stage':'neutral review, unapproved','blender':bpy.app.version_string,'referenceCount':27,'portraitProjection':False,'parameters':targets,'landmarks':landmarks,'headTop':headtop,'facialFibers':len(facial),'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in scene.objects if ob.type=='MESH')}
(OUT/'build-report.json').write_text(json.dumps(report,indent=2))
for angle in [0,45,90,180,270,315]:
 a=math.radians(angle);cam.location=(2*math.sin(a),-2*math.cos(a)-.045,cz);track(cam,(0,-.045,cz));scene.render.filepath=str(OUT/f'neutral-{angle:03}.png');bpy.ops.render.render(write_still=True)
camdata.ortho_scale=2.1;cam.location=(0,-3,.9);track(cam,(0,0,.9));scene.render.filepath=str(OUT/'neutral-fullbody.png');bpy.ops.render.render(write_still=True)
print(json.dumps(report))
