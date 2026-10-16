"""Free Blender neutral likeness pass, preserving native face brush edits.
The hair is a closed continuous volume; the approved image supplies pigmentation
and strand color, not a billboard. Side/back geometry remains inferred.
"""
import bpy, math, json, os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/avatar/ubaid-sculpt-v4';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/avatar/ubaid-sculpt-v3/face-sculpt-session.blend'))
if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
for ob in list(bpy.data.objects):
 if ob.name.startswith(('Hair —','Groom fibers','Iris','Pupil','Catchlight','Eyebrows')):bpy.data.objects.remove(ob,do_unlink=True)
def p(x,y,d):return Vector(((x-627)/1000,d/1000,(627-y)/1000))
def px(v):return (v.x*1000+627,627-v.z*1000,v.y*1000)
def smooth(a,b,v):
 t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
def gauss(x,y,cx,cy,rx,ry):return math.exp(-2*((x-cx)/rx)**2-2*((y-cy)/ry)**2)
def mat(name,c,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Specular IOR Level'].default_value=.18;return m
def assign(o,m):o.data.materials.clear();o.data.materials.append(m)
def mesh(name,verts,faces,m):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);assign(ob,m)
 for f in me.polygons:f.use_smooth=True
 return ob
def catmull(points,steps=16):
 points=[Vector(q) for q in points];out=[]
 for i in range(len(points)-1):
  a,b,c,d=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
  for j in range(steps):
   t=j/steps;out.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
 return out+[points[-1]]
reference=bpy.data.images.load(str(ROOT/'assets/avatar/ubaid-v1/master.png'),check_existing=True)
def project(o,m,front_weight=None):
 uv=o.data.uv_layers.new(name='Approved portrait coordinates')
 for lp in o.data.loops:
  q=o.matrix_world@o.data.vertices[lp.vertex_index].co;x,y,d=px(q);uv.data[lp.index].uv=(x/1254,1-y/1254)
 n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');tex=n.new('ShaderNodeTexImage');tex.image=reference;uvn=n.new('ShaderNodeUVMap');uvn.uv_map=uv.name;l.new(uvn.outputs[0],tex.inputs[0])
 if front_weight:
  attr=o.data.color_attributes.new(name='Projection coverage',type='FLOAT_COLOR',domain='CORNER')
  for lp in o.data.loops:
   q=o.matrix_world@o.data.vertices[lp.vertex_index].co;w=front_weight(*px(q));attr.data[lp.index].color=(w,w,w,1)
  vc=n.new('ShaderNodeVertexColor');vc.layer_name=attr.name
  mult=n.new('ShaderNodeMath');mult.operation='MULTIPLY';l.new(vc.outputs[0],mult.inputs[0]);l.new(tex.outputs['Alpha'],mult.inputs[1])
  mix=n.new('ShaderNodeMixRGB');mix.inputs[1].default_value=bs.inputs['Base Color'].default_value;l.new(mult.outputs[0],mix.inputs[0]);l.new(tex.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],bs.inputs['Base Color'])
 else:l.new(tex.outputs[0],bs.inputs['Base Color'])
 assign(o,m)
# Continuous swept scalp: paired contours model the inner hairline and the outer
# silhouette. It has a modeled back and side wall, rather than isolated ribbons.
outer=[(417,525),(357,469),(319,388),(315,320),(285,246),(334,176),(395,132),(459,87),(535,47),(622,33),(702,32),(762,53),(816,17),(862,23),(899,60),(927,106),(940,167),(949,234),(935,292),(919,354),(891,418),(849,502)]
inner=[(417,525),(409,468),(410,414),(418,365),(434,317),(464,278),(498,254),(531,244),(562,223),(605,216),(648,211),(695,211),(737,218),(762,229),(784,255),(801,291),(820,332),(829,371),(835,408),(838,447),(841,479),(849,502)]
a=catmull(inner,12);b=catmull(outer,12);width=64;verts=[];faces=[]
# Authored depth ridges on the same continuous surface, following reference flow.
guides=[([(450,102),(477,185),(535,204),(609,171),(679,141),(744,178),(788,251)],18,36), ([(345,255),(386,221),(412,165),(455,126),(500,111)],12,30), ([(326,323),(376,293),(414,268),(438,214)],11,27), ([(380,430),(389,364),(437,310),(478,272)],9,30), ([(826,72),(850,61),(876,110),(866,174),(835,228)],14,27), ([(873,372),(909,282),(904,211),(883,171)],9,32)]
sampled=[(catmull(line,5),amp,rad) for line,amp,rad in guides]
for i,(start,end) in enumerate(zip(a,b)):
 for j in range(width+1):
  t=j/width;q=start.lerp(end,t);x,y=q
  d=-165-245*math.sqrt(max(.025,1-((x-630)/355)**2))
  d+=60*smooth(235,35,y) # round back over the crown
  d-=24*math.sin(math.pi*t)
  for line,amp,rad in sampled:
   dist=min((q-g).length_squared for g in line);d-=amp*math.exp(-dist/(rad*rad))
  verts.append(p(x,y,d))
for i in range(len(a)-1):
 for j in range(width):k=i*(width+1)+j;faces.append((k,k+1,k+width+2,k+width+1))
frontsize=len(verts)
# Back remains round and closed so the object can be turned and inspected.
for v in list(verts):
 x,y,d=px(v);verts.append(p(x,y,90+155*math.sqrt(max(.025,1-((x-630)/355)**2))))
faces+= [tuple(k+frontsize for k in reversed(f)) for f in list(faces)]
boundary=list(range(width+1))+[i*(width+1)+width for i in range(1,len(a))]+[(len(a)-1)*(width+1)+j for j in range(width-1,-1,-1)]+[i*(width+1) for i in range(len(a)-2,0,-1)]
for u,v in zip(boundary,boundary[1:]+boundary[:1]):faces.append((u,v,v+frontsize,u+frontsize))
hairmat=mat('Dark hair with reference strand pigmentation',(.012,.006,.004),.57)
hair=mesh('Hair — continuous reference sculpt',verts,faces,hairmat)
project(hair,hairmat,lambda x,y,d:1-smooth(-120,30,d))
sub=hair.modifiers.new('Fine continuous surface','SUBSURF');sub.levels=1;sub.render_levels=1
# Reference tonal detail supplies only a shallow additional strand relief.
n=hairmat.node_tree.nodes;l=hairmat.node_tree.links;bs=n.get('Principled BSDF');tex=next(x for x in n if x.type=='TEX_IMAGE')
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.0012;l.new(tex.outputs['Color'],bump.inputs['Height']);l.new(bump.outputs[0],bs.inputs['Normal'])
# The head retains the actual Sculpt Mode brush edits from face-sculpt-session.
head=bpy.data.objects['Ubaid_Face'];skin=mat('Warm skin — reference pigmentation',(.40,.185,.09),.69)
bs=skin.node_tree.nodes.get('Principled BSDF');bs.inputs['Subsurface Weight'].default_value=.035
project(head,skin,lambda x,y,d:1-smooth(-230,-50,d))
# Give the eye globes the reference iris detail, while retaining actual spherical
# anatomy, visible beneath the sculpted lids. No floating pupil disks.
bpy.context.view_layer.update()
for eye in [o for o in bpy.data.objects if o.name.startswith('Eyeball')]:
 m=mat('Eye pigment '+eye.name,(.6,.55,.48),.23)
 project(eye,m,lambda x,y,d:1-smooth(-370,-340,d))
# Fit the existing shirt's shoulder width to the approved silhouette.
shirt=bpy.data.objects['Ubaid_Shirt']
for v in shirt.data.vertices:
 x,y,d=px(v.co)
 # Narrow the broad old bust. Keep the neckline center in place.
 scale=.82+.17*smooth(950,1220,y)
 x=645+(x-627)*scale
 # Raise the center opening so the neutral bust matches the approved framing.
 y-=80*gauss(x,y,677,1130,180,200)
 v.co=p(x,y,d)
shirt.data.update()
cotton=mat('White cotton — reference pigmentation',(.77,.75,.72),.88)
project(shirt,cotton,lambda x,y,d:1-smooth(-150,0,d))
# Small editable tailored collar leaves with explicit curved outline, rather than
# the former rounded, indistinct collar. The draped shirt remains underneath.
def collar(name,outline):
 # Quad strips provide real thickness and a curved fold line.
 vv=[];ff=[];a=catmull(outline[0],8);b=catmull(outline[1],8);across=10
 for i in range(len(a)):
  for j in range(across+1):
   t=j/across;q=a[i].lerp(b[i],t);q.z-=6*math.sin(math.pi*t);vv.append(p(*q))
 for i in range(len(a)-1):
  for j in range(across):k=i*(across+1)+j;ff.append((k,k+1,k+across+2,k+across+1))
 o=mesh(name,vv,ff,cotton);m=cotton.copy();m.name=name+' material';project(o,m)
 sol=o.modifiers.new('Cotton thickness','SOLIDIFY');sol.thickness=.002
 sub=o.modifiers.new('Soft tailored edge','SUBSURF');sub.levels=2;sub.render_levels=2
 return o
collar('Left tailored collar', [[(468,735,-176),(443,782,-217),(414,852,-240),(394,924,-246),(376,991,-250)],[(491,801,-236),(495,839,-273),(513,883,-300),(523,916,-323),(529,925,-337)]])
collar('Right tailored collar', [[(795,737,-153),(826,779,-202),(853,838,-220),(906,923,-190),(960,980,-194)],[(796,821,-215),(808,865,-244),(811,900,-268),(826,917,-285),(875,918,-280)]])
# Match the soft neutral lighting while retaining real geometric shading.
scene=bpy.context.scene
scene.cycles.samples=int(os.environ.get('AVATAR_SAMPLES','48'))
scene.render.resolution_percentage=int(os.environ.get('AVATAR_SCALE','85'))
scene.view_settings.exposure=0
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.78
for o in scene.objects:
 if o.type=='LIGHT':
  if 'key' in o.name:o.data.energy=22
  elif 'fill' in o.name:o.data.energy=24
  elif 'Lavender' in o.name:o.data.energy=8
# Save a neutral, unrigged source. No production website assets are touched.
bpy.ops.object.select_all(action='DESELECT');hair.select_set(True);bpy.context.view_layer.objects.active=hair
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='SOLID'
for image in bpy.data.images:
 if image.source=='FILE':image.pack()
assert not any(o.type=='ARMATURE' for o in scene.objects)
assert not any(o.data.shape_keys for o in scene.objects if o.type=='MESH')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ubaid-neutral-v4.blend'))
scene.render.filepath=str(OUT/'neutral-front.png');bpy.ops.render.render(write_still=True)
report={'stage':'unapproved neutral study','nativeFaceSculpt':'1,155 base vertices changed in Blender Sculpt Mode','hair':'Closed paired-contour volume with shaped swept ridges and reference-derived strand pigmentation','textures':'Reference projection includes original illumination; neutral study only, not a fully delit production texture set','armatures':0,'shapeKeys':0,'paidServices':False}
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
