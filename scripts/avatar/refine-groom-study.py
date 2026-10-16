"""Independent loose-wave groom study. Reads v5 and writes only groom-refinement outputs."""
import bpy,bmesh,math,random,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild/facebuilder-study'
# Cache the already exported ear mask so future groom rebuilds use Blender core
# and the preserved mesh only; no active trial add-on is required.
ear_polygons=set(json.loads((OUT/'groom-refinement/ear-exclusion.json').read_text())['polygons'])
bpy.ops.wm.open_mainfile(filepath=str(OUT/'fiber-groom-v5-study.blend'))
OUT=OUT/'groom-refinement';OUT.mkdir(exist_ok=True)
for previous in list(bpy.data.objects):
 if previous.type=='CURVE' and previous.name.startswith('Reference wave fibers'): bpy.data.objects.remove(previous,do_unlink=True)
head=next(o for o in bpy.data.objects if o.type=='MESH');plain=bpy.data.materials.new('Plain clay diagnosis');plain.diffuse_color=(.36,.23,.14,1);plain.use_nodes=True;plain.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.36,.23,.14,1);plain.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.8;head.data.materials.clear();head.data.materials.append(plain);rng=random.Random(23062005);mesh=head.data
assert max(ear_polygons)<len(mesh.polygons), "Ear mask does not match source topology"
bpy.context.view_layer.update()
bvh=BVHTree.FromPolygons([v.co for v in mesh.vertices],[list(p.vertices) for p in mesh.polygons])
def scalp(x,y):
 hit=bvh.ray_cast(Vector((x,y,3)),Vector((0,0,-1)))
 return hit[0].copy() if hit[0] and hit[0].z>.52 else None
def curvepoint(ps,t):
 n=len(ps)-1;k=min(n-1,int(t*n));u=t*n-k;p0=ps[max(0,k-1)];p1=ps[k];p2=ps[k+1];p3=ps[min(n,k+2)]
 return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)
mat=bpy.data.materials.new('Near-black fine hair');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.008,.006,.0048,1);bs.inputs['Roughness'].default_value=.63;bs.inputs['Specular IOR Level'].default_value=.22

# Physical scalp substrate makes coverage independent of photo projection.
def hair_region(p):
 front=max(0,min(1,(-p.y-.12)/.88))
 limit=-.18+1.10*(front**1.5)+.09*(p.x+.1)*(front**3)+.016*math.sin(16*p.x+3*p.y)
 if abs(p.x)>.55 and p.y<.12:limit=max(limit,.17)
 return p.z>limit
capverts=[v.co+v.normal*.006 for v in mesh.vertices]
capfaces=[list(p.vertices) for p in mesh.polygons if p.index not in ear_polygons and all(hair_region(mesh.vertices[i].co) for i in p.vertices)]
capmesh=bpy.data.meshes.new('Continuous scalp substrate');capmesh.from_pydata(capverts,[],capfaces);capmesh.update()
# Smooth the actual boundary contour while keeping it on the fitted surface.
bm=bmesh.new();bm.from_mesh(capmesh);bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
for iteration in range(4):
 updates=[]
 for v in bm.verts:
  boundary=[edge.other_vert(v) for edge in v.link_edges if len(edge.link_faces)==1]
  if len(boundary)!=2:continue
  p=v.co*.5+(boundary[0].co+boundary[1].co)*.25
  hit,normal,_,_=bvh.find_nearest(p)
  if hit is not None:updates.append((v,hit+normal*.006))
 for v,p in updates:v.co=p
bm.to_mesh(capmesh);bm.free();capmesh.update()
cap=bpy.data.objects.new('Continuous scalp substrate',capmesh);bpy.context.collection.objects.link(cap);capmat=mat.copy();capmat.name='Dark rough scalp undercoat';cp=capmat.node_tree.nodes.get('Principled BSDF');cp.inputs['Base Color'].default_value=(.0025,.002,.0018,1);cp.inputs['Roughness'].default_value=.88;cp.inputs['Specular IOR Level'].default_value=.08;cap.data.materials.append(capmat)
for face in cap.data.polygons:face.use_smooth=True
# Fade only the actual outer hairline over three mesh rings. Dense physical
# short fibers remain visible; this removes the opaque cap's cut-paper edge.
edge_counts={}
for poly in capmesh.polygons:
 for a,b in poly.edge_keys:edge_counts[tuple(sorted((a,b)))]=edge_counts.get(tuple(sorted((a,b))),0)+1
boundary={v for edge,count in edge_counts.items() if count==1 for v in edge}
neighbors={i:set() for i in range(len(capmesh.vertices))}
for a,b in edge_counts:neighbors[a].add(b);neighbors[b].add(a)
distance={i:0 for i in boundary};frontier=set(boundary)
for ring in range(1,4):
 frontier={n for v in frontier for n in neighbors[v] if n not in distance}
 distance.update({v:ring for v in frontier})
coverage=capmesh.color_attributes.new(name='HairCoverage',type='FLOAT_COLOR',domain='POINT')
for i,color in enumerate(coverage.data):
 alpha={0:.03,1:.35,2:.78}.get(distance.get(i,3),1)
 color.color=(.0025,.002,.0018,alpha)
attr=capmat.node_tree.nodes.new('ShaderNodeAttribute');attr.attribute_name='HairCoverage'
capmat.node_tree.links.new(attr.outputs['Alpha'],cp.inputs['Alpha']);capmat.surface_render_method='DITHERED'


data=bpy.data.curves.new('Refined asymmetric wave fibers','CURVE');data.dimensions='3D';data.resolution_u=1;data.bevel_depth=.00145;data.bevel_resolution=0
ob=bpy.data.objects.new('Refined asymmetric wave fibers',data);bpy.context.collection.objects.link(ob);data.materials.append(mat)
def strand(points,radius=1):
 sp=data.splines.new('POLY');sp.points.add(len(points)-1)
 for j,(p,co) in enumerate(zip(sp.points,points)):
  t=j/(len(points)-1);p.co=(*co,1);p.radius=radius*max(.07,1-t**5)
def guide_bundle(points,width=.065,depth=.032,count=650):
 ps=[Vector(p) for p in points]
 for k in range(count):
  layer=rng.uniform(.18,1.05);sx=rng.uniform(-1,1)*width;sy=rng.uniform(-1,1)*depth;phase=rng.uniform(0,6.28);coords=[];previous_side=Vector((1,0,0));short=rng.uniform(.78,1)
  for j in range(49):
   t=j/48*short;c=curvepoint(ps,t)
   tangent=(curvepoint(ps,min(1,t+.001))-curvepoint(ps,max(0,t-.001))).normalized()
   side=previous_side-tangent*previous_side.dot(tangent)
   if side.length<.01:side=Vector((0,1,0))-tangent*tangent.y
   side.normalize();normal=tangent.cross(side).normalized();previous_side=side
   spread=(.8+.2*math.sin(math.pi*t))*(1-.35*t*t)
   c+=side*(sx*spread+.009*math.sin(9*t+phase)*math.sin(math.pi*t))+normal*(sy*spread)
   closest,n,_,_=bvh.find_nearest(c)
   if closest is not None:
    c=closest+(c-closest)*layer
    if (c-closest).dot(n)<.009:c=closest+n*.009
   coords.append(c)
  strand(coords,rng.uniform(.65,.95))
# A continuous scalp flow field produces overlapping waves without independent
# bridge-shaped bundles. The right front rises and folds back, the left fringe
# crosses slightly forward. A handful of fine tips finish the silhouette.
for i in range(6000):
 x=rng.uniform(-.75,.75);y=rng.uniform(-.96,.58);root=scalp(x,y)
 if root is None or root.z<.72 or not hair_region(root):continue
 front=max(0,min(1,(-y+.15)/1.0));right=max(0,min(1,(x+.24)/.88))
 length=rng.uniform(.36,.66);lift=(.022+.032*front)*rng.uniform(.80,1.16)
 phase=7.5*x+3.2*y
 leftfringe=False
 direction=-1 if leftfringe else 1
 if leftfringe:length=rng.uniform(.12,.23)
 coords=[]
 for j in range(33):
  t=j/32; ease=t*t*(3-2*t)
  yy=y+direction*length*(t if leftfringe else (t-1.18*math.sin(math.pi*t)/math.pi))
  if yy<-1.03:break
  xx=x+(-.23-.16*front)*t+.12*math.sin(6*t+phase)*math.sin(math.pi*t)
  under=scalp(xx,yy)
  if under is None:
   if not leftfringe:break
   under=Vector((xx,yy,.98+.06*math.sin(7*x)))
   under.x=xx;under.y=yy;under.z-=.025
  arch=math.sin(math.pi*t)**2
  z=max(under.z+.006,under.z+.006+lift*arch+.018*math.sin(6*t+phase)*arch)
  if leftfringe and yy<-.97:z=max(z,.94+.05*math.sin(9*x))
  coords.append(Vector((xx,yy,z)))
 if len(coords)>3:strand(coords,rng.uniform(.48,.90))
# Explicit sparse three-dimensional guide study: low left fringe, loose
# central curl, lifted right wave and staggered crown locks. Only collision
# clearance touches the head; free tips never snap back to a height field.
guides=[
 ((-.15,-.20),[(-.25,-.46,1.35),(-.44,-.74,1.27),(-.45,-.91,1.09),(-.23,-1.025,.92),(-.12,-1.04,.91)],.073,.025),
 ((-.48,-.28),[(-.61,-.50,1.27),(-.71,-.73,1.22),(-.62,-.92,1.11),(-.44,-1.03,.98),(-.35,-1.04,.94)],.061,.022),
 ((.13,-.31),[(.07,-.56,1.43),(-.04,-.82,1.33),(.03,-.98,1.15),(.14,-1.02,1.01),(.22,-1.03,.96)],.07,.027),
 ((.46,.12),[(.58,-.14,1.41),(.57,-.45,1.46),(.43,-.70,1.37),(.22,-.87,1.27),(.38,-.90,1.19)],.074,.030),
 ((.66,.18),[(.72,-.08,1.28),(.74,-.31,1.41),(.69,-.57,1.39),(.49,-.78,1.29),(.55,-.80,1.22)],.060,.025),
 ((-.34,.20),[(-.34,-.05,1.43),(-.51,-.33,1.45),(-.56,-.51,1.36),(-.46,-.62,1.31),(-.29,-.61,1.34)],.07,.03),
 ((.02,.25),[(.12,-.01,1.42),(.04,-.23,1.48),(-.09,-.44,1.40),(-.17,-.52,1.30),(-.06,-.58,1.28)],.07,.03),
 ((.39,.22),[(.43,-.03,1.43),(.37,-.23,1.49),(.22,-.43,1.43),(.13,-.48,1.36),(.09,-.35,1.32)],.07,.03),
]
for xy,tail,width,depth in guides:
 root=scalp(*xy)
 if root is not None:
  ps=[root]
  for item in tail[:-1]:
   c=Vector(item);surface,normal,_,_=bvh.find_nearest(c)
   if surface is not None:c=surface+(c-surface)*.6
   ps.append(c)
  guide_bundle(ps,width*1.8,depth*1.45)
  # Shorter interleaved locks broaden the scalp footprint beneath each outer wave.
  ps2=[Vector((p.x+.065,p.y+.07,p.z)) for p in ps[:-1]]
  guide_bundle(ps2,width*1.9,depth*1.6,300)
# Free top silhouettes, embedded inside the main flow with only their tips clear.
# Short side and back fibers grow directly on the head surface and follow it.
for i in range(20000):
 angle=rng.uniform(0,2*math.pi);z=rng.uniform(-.24,1.12);out=Vector((math.sin(angle),-math.cos(angle),0));origin=out*2;origin.z=z
 hit=bvh.ray_cast(origin,-out)
 if not hit[0] or hit[2] in ear_polygons:continue
 p=hit[0];n=hit[1]
 # Front/temple limits and explicit ear exclusion leave the actual ear visible.
 if not hair_region(p):continue
 end=p+Vector((0,.06,-.10))+n*.014
 strand([p+n*.005,p+n*.028+Vector((0,.02,-.035)),end],rng.uniform(.5,.95))
sc=bpy.context.scene;sc.cycles.samples=32;sc.render.resolution_x=800;sc.render.resolution_y=900;sc.render.resolution_percentage=100;cam=sc.camera;cam.data.ortho_scale=3.7
for angle in [0,30,90]:
 a=math.radians(angle);cam.location=(7*math.sin(a),-7*math.cos(a),.08);cam.rotation_euler=(Vector((0,-.1,.08))-cam.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=str(OUT/f'refined-v19-{angle:03}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fiber-groom-refined-v19.blend'))
