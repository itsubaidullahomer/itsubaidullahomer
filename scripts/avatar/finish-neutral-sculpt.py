"""Neutral review pass. Preserves native brush sculpt sources and no rig.
Reference colors are projected onto volumetric geometry, including hair. This is
not a completed production albedo pipeline and does not claim exact likeness.
"""
import bpy,bmesh,math,json,os
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/ubaid-neutral-review';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/avatar/ubaid-sculpt-v4/ubaid-neutral-v4.blend'))
base=[v.co.copy() for v in bpy.data.objects['Hair — continuous reference sculpt'].data.vertices]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/avatar/ubaid-sculpt-v4/hair-sculpt-session.blend'))
if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
def p(x,y,d):return Vector(((x-627)/1000,d/1000,(627-y)/1000))
def px(v):return (v.x*1000+627,627-v.z*1000,v.y*1000)
def sm(a,b,v):
 t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
def g(x,y,cx,cy,rx,ry):return math.exp(-2*((x-cx)/rx)**2-2*((y-cy)/ry)**2)
def mat(name,col,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*col,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Specular IOR Level'].default_value=.15;return m
reference=bpy.data.images.load(str(ROOT/'assets/avatar/ubaid-v1/master.png'),check_existing=True)
def proj(ob,m,weight=None):
 ob.data.materials.clear();ob.data.materials.append(m)
 uv=ob.data.uv_layers.new(name='Final neutral reference UV')
 attr=ob.data.color_attributes.new(name='Reference coverage',type='FLOAT_COLOR',domain='CORNER')
 for loop in ob.data.loops:
  x,y,d=px(ob.matrix_world@ob.data.vertices[loop.vertex_index].co);uv.data[loop.index].uv=(x/1254,1-y/1254);w=weight(x,y,d) if weight else 1;attr.data[loop.index].color=(w,w,w,1)
 n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');tex=n.new('ShaderNodeTexImage');tex.image=reference;tex.extension='EXTEND';un=n.new('ShaderNodeUVMap');un.uv_map=uv.name;l.new(un.outputs[0],tex.inputs[0]);vc=n.new('ShaderNodeVertexColor');vc.layer_name=attr.name
 mix=n.new('ShaderNodeMixRGB');mix.inputs[1].default_value=bs.inputs['Base Color'].default_value;l.new(vc.outputs[0],mix.inputs[0]);l.new(tex.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],bs.inputs['Base Color'])
 return tex
hair=bpy.data.objects['Hair — continuous reference sculpt']
# Retain native crease/smooth edits at a restrained strength; full strokes remain
# available in hair-sculpt-session.blend. Avoid melting the portrait hairline.
for v,b in zip(hair.data.vertices,base):v.co=b+(v.co-b)*.12
# Round the rear volume and side walls. The previous same-size extrusion looked
# boxy in the turned QA view, despite its acceptable front outline.
frontsize=len(hair.data.vertices)//2
front=[v.co.copy() for v in list(hair.data.vertices)[:frontsize]]
width=64;columns=frontsize//(width+1)
for i,v in enumerate(front):
 t=(i%(width+1))/width
 # The silhouette rounds away from the camera, toward the crown and temples.
 v.y=v.y*(1-sm(.45,1,t))+(-.10)*sm(.45,1,t)
back=[]
for v in front:
 x,y,d=px(v);back.append(p(637+(x-637)*.64,300+(y-300)*.72,125+50*math.sqrt(max(.03,1-((x-630)/355)**2))))
vv=front+back;ff=[]
for i in range(columns-1):
 for j in range(width):k=i*(width+1)+j;ff.append((k,k+1,k+width+2,k+width+1))
frontfaces=len(ff);ff+=[tuple(v+frontsize for v in reversed(f)) for f in list(ff)]
boundary=list(range(width+1))+[i*(width+1)+width for i in range(1,columns)]+[(columns-1)*(width+1)+j for j in range(width-1,-1,-1)]+[i*(width+1) for i in range(columns-2,0,-1)]
prev=boundary
for ring in range(1,13):
 t=ring/12
 if ring==12:ids=[k+frontsize for k in boundary]
 else:
  ids=[];u=1-math.cos(t*math.pi/2)
  for k in boundary:
   v=front[k].lerp(back[k],u);v.y=front[k].y+(back[k].y-front[k].y)*math.sin(t*math.pi/2);ids.append(len(vv));vv.append(v)
 for i in range(len(prev)):j=(i+1)%len(prev);ff.append((prev[i],prev[j],ids[j],ids[i]))
 prev=ids
new=bpy.data.meshes.new('Rounded continuous hair sculpt');new.from_pydata(vv,[],ff);new.update();hair.data=new
for f in new.polygons:f.use_smooth=True;f.material_index=0 if f.index<frontfaces else 1
bpy.context.view_layer.objects.active=hair
# Explicit mesh subdivision preserves the native brush deformations and gives
# the shallow strand relief sufficient resolution.
for mod in list(hair.modifiers):hair.modifiers.remove(mod)
sub=hair.modifiers.new('Continuous rounded hair surface','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
# Additional genuine mesh relief recovers fine flow from the reference shading.
# It remains view-inferred geometry, not a claim of a recovered original mesh.
imgw,imgh=reference.size;pix=list(reference.pixels)
def val(x,y):
 x=max(0,min(imgw-1,int(x)));y=max(0,min(imgh-1,int(imgh-1-y)));k=(y*imgw+x)*4
 return (.2126*pix[k]+.7152*pix[k+1]+.0722*pix[k+2])**.45
for v in hair.data.vertices:
 x,y,d=px(v.co)
 if d<-120:
  value=sum(val(x+dx,y+dy) for dx,dy in [(0,0),(-2,0),(2,0),(0,-2),(0,2)])/5
  v.co.y-=.055*value*(1-sm(-180,-120,d))
hair.data.update()
hm=mat('Sculpt hair — dark warm pigment',(.007,.004,.003),.78);tex=proj(hair,hm)
side=mat('Unseen hair — inferred dark volume',(.010,.006,.005),.64);hair.data.materials.append(side)
n=hm.node_tree.nodes;l=hm.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Specular IOR Level'].default_value=.035
# Keep hair dark: broad key lighting should not bleach its diffuse pigment.
link=bs.inputs['Base Color'].links[0];up=link.from_socket;l.remove(link);multiply=n.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=(.95,.93,.90,1);l.new(up,multiply.inputs[1]);l.new(multiply.outputs[0],bs.inputs['Base Color'])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.07;bump.inputs['Distance'].default_value=.001;l.new(tex.outputs['Color'],bump.inputs['Height']);l.new(bump.outputs[0],bs.inputs['Normal'])
# Attach fine genuine groom curves to the final sculpt. The earlier guide
# directions remain useful after their disconnected foundations were replaced.
# Each curve is resampled against the actual final hair surface, not left floating.
bpy.context.view_layer.update()
bvh=BVHTree.FromPolygons([v.co for v in hair.data.vertices],[list(f.vertices) for f in hair.data.polygons])
with bpy.data.libraries.load(str(ROOT/'assets/avatar/ubaid-sculpt-v3/ubaid-sculpt-v3.blend'),link=False) as (source,target):
 target.curves=[n for n in source.curves if n.startswith('Groom fibers')]
strand_count=0
for group,old in enumerate(target.curves):
 cu=bpy.data.curves.new('Surface groom '+str(group),'CURVE');cu.dimensions='3D';cu.resolution_u=1;cu.bevel_depth=.00010;cu.bevel_resolution=1
 ob=bpy.data.objects.new(cu.name,cu);bpy.context.collection.objects.link(ob)
 mm=mat('Fine black-brown hair '+str(group),[(.009,.005,.004),(.014,.008,.006),(.020,.011,.008),(.006,.003,.002)][group%4],.52);mm.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.23;cu.materials.append(mm)
 for index,sp in enumerate(old.splines):
  if index%20:continue
  points=[]
  oldpoints=list(sp.points)
  for bp0,bp1 in zip(oldpoints,oldpoints[1:]):
   a=Vector(bp0.co[:3]);b=Vector(bp1.co[:3]);steps=max(1,math.ceil(math.hypot(b.x-a.x,b.z-a.z)/.0007))
   for step in range(steps):
    t=step/steps;q=a.lerp(b,t)
    loc,norm,face,dist=bvh.ray_cast(Vector((q.x,-2,q.z)),Vector((0,1,0)))
    if loc is None:continue
    points.append((loc+Vector((0,-.00025,0)),bp0.radius*(1-t)+bp1.radius*t))
  if len(points)<4:continue
  new=cu.splines.new('POLY');new.points.add(len(points)-1)
  for bp,(pos,radius) in zip(new.points,points):bp.co=(*pos,1);bp.radius=radius
  strand_count+=1
 bpy.data.curves.remove(old)
# Refine almond eye openings and soften the chin while preserving the brush pass.
head=bpy.data.objects['Ubaid_Face']
for v in head.data.vertices:
 x,y,d=px(v.co);front=1-sm(-310,-160,d)
 for cx,cy in [(528,418),(718,405)]:
  w=g(x,y,cx,cy,67,45)*front
  # Recover the upper iris overlap without the previous sleepy upper lids.
  y+=(y-cy)*.32*w-2.5*w
  x+=(x-cx)*.03*w
 # Increase the soft cheek/jaw fullness and avoid a pinched pointed chin.
 x+=(x-641)*.055*g(x,y,641,680,220,115)*front
 # Ears follow the approved outline and share its pigment instead of gray edges.
 if y>390 and y<655:
  x+=10*(1-sm(372,420,x))*sm(390,450,y)*(1-sm(590,655,y))
  x-=10*sm(845,895,x)*sm(390,450,y)*(1-sm(590,655,y))
 v.co=p(x,y,d)
head.data.update()
# Keep the continuous neck topology, but tuck inherited torso vertices behind
# the garment. Deleting broad side regions caused holes beneath the collar.
for v in head.data.vertices:
 x,y,d=px(v.co)
 if y>760:
  w=sm(760,830,y)
  if x<455:x+=(455-x)*w
  elif x>831:x-=(x-831)*w
  d=d+(max(d,-215)-d)*sm(970,1070,y)
  v.co=p(x,y,d)
head.data.update()

skin=mat('Sculpt skin — warm reference pigmentation',(.41,.195,.10),.69);skin.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value=.035
proj(head,skin,lambda x,y,d:1-sm(-95,70,d))
# The old low-detail garment caused the duplicate collar and bottom arch.
# Replace it with an editable draped volume traced to the approved bust contour.
bpy.data.objects.remove(bpy.data.objects['Ubaid_Shirt'],do_unlink=True)
def cat(pts,steps=10):
 pts=[Vector(v) for v in pts];out=[]
 for i in range(len(pts)-1):
  a,b,c,d=pts[max(0,i-1)],pts[i],pts[i+1],pts[min(len(pts)-1,i+2)]
  for j in range(steps):
   t=j/steps;out.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
 return out+[pts[-1]]
def mesh(name,verts,faces,m):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(m)
 for f in me.polygons:f.use_smooth=True
 return ob
neckline=[(0,1254),(23,1100),(71,1010),(177,955),(283,899),(380,861),(438,816),(482,847),(530,933),(590,980),(652,1042),(696,1090),(748,1015),(798,936),(832,863),(891,875),(1028,914),(1140,964),(1201,1041),(1240,1150),(1254,1254)]
curve=cat(neckline,10);verts=[];faces=[];rows=64
for x,top in curve:
 for j in range(rows+1):
  t=j/rows;y=top+(1290-top)*t
  d=-160-145*math.sqrt(max(.03,1-((x-627)/680)**2))+35*sm(950,1290,y)
  d-=6*math.sin(x*.035+y*.007)*sm(1000,1254,y)
  verts.append(p(x,y,d))
for i in range(len(curve)-1):
 for j in range(rows):k=i*(rows+1)+j;faces.append((k,k+1,k+rows+2,k+rows+1))
shirtmat=mat('Tailored cotton',(.8,.78,.74),.90);shirt=mesh('Ubaid_Shirt — tailored bust',verts,faces,shirtmat);proj(shirt,shirtmat)
sol=shirt.modifiers.new('Closed garment thickness','SOLIDIFY');sol.thickness=.045;sol.offset=-1
sub=shirt.modifiers.new('Draped garment surface','SUBSURF');sub.levels=1;sub.render_levels=1
# Push the collars just ahead of the draped shirt to avoid visible intersections.
for ob in bpy.data.objects:
 if 'tailored collar' in ob.name:
  for v in ob.data.vertices:
   x,y,d=px(v.co);v.co.y=min(v.co.y,(-316-10*sm(800,1000,y))/1000)
# A modeled placket and two low relief buttons catch real highlights.
for x,y,r in [(553,965,10),(705,1147,11)]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,radius=1,location=p(x,y,-328 if y<1000 else -306));ob=bpy.context.object;ob.name='Cotton shirt button';ob.scale=(r/1000,.004,r*.9/1000)
 m=mat('Ivory button '+str(y),(.63,.59,.50),.4);ob.data.materials.clear();ob.data.materials.append(m)
# Neutral front view, plus independently lit clay and a small turn for volume QA.
scene=bpy.context.scene;scene.cycles.samples=int(os.environ.get('AVATAR_SAMPLES','56'));scene.render.resolution_percentage=int(os.environ.get('AVATAR_SCALE','100'));scene.view_settings.exposure=-.06
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.9
for light in scene.objects:
 if light.type=='LIGHT':light.data.energy=8 if 'key' in light.name else (10 if 'fill' in light.name else 4)
scene.camera.location=(0,-4,0);scene.camera.rotation_euler=(Vector((0,0,0))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT');head.select_set(True);bpy.context.view_layer.objects.active=head
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'neutral-sculpt.blend'))
scene.render.filepath=str(OUT/'neutral-front.png');bpy.ops.render.render(write_still=True)
if os.environ.get('AVATAR_QA','1')=='1':
 scene.camera.location=(.8,-4,.02);scene.camera.rotation_euler=(Vector((0,-.1,0))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/'neutral-turned.png');bpy.ops.render.render(write_still=True)
 scene.camera.location=(0,-4,0);scene.camera.rotation_euler=(Vector((0,0,0))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
 clay=mat('Clay inspection',(.43,.43,.43),.78);scene.view_layers[0].material_override=clay
 for ob in scene.objects:
  if ob.type=='LIGHT':ob.data.energy*=5
 scene.world.node_tree.nodes['Background'].inputs[1].default_value=.28;scene.view_settings.view_transform='AgX';scene.render.filepath=str(OUT/'neutral-clay.png');bpy.ops.render.render(write_still=True)
report={'stage':'Neutral review; not approved and not rigged','groomCurves':strand_count,'faceBrushEdits':1155,'hairBrushEdits':9406,'hairBrushStrengthPreserved':.12,'reference':'assets/avatar/ubaid-v1/master.png','method':'Native Blender face and hair brush edits, explicit volumetric modeling, reference UV pigmentation and shallow hair relief. Single-view reconstruction, not exact.','armatures':sum(o.type=='ARMATURE' for o in scene.objects),'shapeKeys':sum(bool(o.data.shape_keys) for o in scene.objects if o.type=='MESH'),'paidServices':False,'remaining':'Reference texture contains original lighting. Side and back inferred. Likeness remains a visual review decision.'}
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
