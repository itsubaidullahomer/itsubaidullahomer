"""Fine-strand groom study; preserves the earlier rejected broad-lock study."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild/facebuilder-study'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'textured-study.blend'))
head=next(o for o in bpy.data.objects if o.type=='MESH');rng=random.Random(23062005);mesh=head.data
bpy.context.view_layer.update()
bvh=BVHTree.FromPolygons([v.co for v in mesh.vertices],[list(p.vertices) for p in mesh.polygons])
def scalp(x,y):
 hit=bvh.ray_cast(Vector((x,y,3)),Vector((0,0,-1)))
 return hit[0].copy() if hit[0] and hit[0].z>.52 else None
def curvepoint(ps,t):
 n=len(ps)-1;k=min(n-1,int(t*n));u=t*n-k;p0=ps[max(0,k-1)];p1=ps[k];p2=ps[k+1];p3=ps[min(n,k+2)]
 return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)
mat=bpy.data.materials.new('Near-black fine hair');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.008,.006,.0048,1);bs.inputs['Roughness'].default_value=.63;bs.inputs['Specular IOR Level'].default_value=.22
data=bpy.data.curves.new('Reference wave fibers','CURVE');data.dimensions='3D';data.resolution_u=1;data.bevel_depth=.0016;data.bevel_resolution=0
ob=bpy.data.objects.new('Reference wave fibers',data);bpy.context.collection.objects.link(ob);data.materials.append(mat)
def strand(points,radius=1):
 sp=data.splines.new('POLY');sp.points.add(len(points)-1)
 for j,(p,co) in enumerate(zip(sp.points,points)):
  t=j/(len(points)-1);p.co=(*co,1);p.radius=radius*max(.07,1-t**5)
def bundle(ps,width,depth,count):
 ps=[Vector(p) for p in ps]
 for k in range(count):
  u=rng.uniform(-1,1);v=rng.uniform(-1,1);phase=rng.uniform(0,6.28);short=rng.uniform(.84,1);coords=[]
  for j in range(29):
   t=j/28*short;c=curvepoint(ps,t);tan=(curvepoint(ps,min(1,t+.002))-curvepoint(ps,max(0,t-.002))).normalized();rad=Vector((c.x*.3,c.y*.3,max(.4,c.z))).normalized();side=tan.cross(rad).normalized();normal=side.cross(tan).normalized();spread=.5+.5*math.sin(math.pi*t)
   c+=side*(u*width*spread+.012*math.sin(10*t+phase)*math.sin(math.pi*t))+normal*(v*depth*spread)
   coords.append(c)
  strand(coords,rng.uniform(.6,1.1))
# Irregular roots and smoothly varying wave phase avoid rows of identical locks.
# Ray hits below the scalp are rejected: a failed top ray must never create
# strands on an ear or collar.
for i in range(8500):
 x=rng.uniform(-.70,.70);y=rng.uniform(-.76,.42);root=scalp(x,y)
 if root is None or root.z<.78:continue
 z=root.z;front=max(0,min(1,(-y+.12)/.85));lift=.06+.16*front+.05*math.sin(10*x+2*y)
 shift=-.10-.12*front;length=rng.uniform(.22,.40)+.06*front
 phase=rng.uniform(0,6.28);coords=[]
 for j in range(25):
  t=j/24;xx=max(-.80,x+shift*(t*t*(3-2*t))+.024*math.sin(7*t+phase)*math.sin(math.pi*t));yy=y+length*t;under=scalp(xx,yy)
  if under is None:break
  c=under+Vector((0,0,.008+lift*math.sin(math.pi*t)**.9+.025*math.sin(9*t+phase)*math.sin(math.pi*t)))
  coords.append(c)
 if len(coords)>3:strand(coords,rng.uniform(.65,1.1))
# A few looser forward curls break the combed silhouette and cover the frontal
# transition. Their tips return sideways instead of forming a straight fringe.
front_guides=[
 ((.50,-.55),[(.27,-.69,1.30),(-.02,-.80,1.25),(-.20,-.86,1.05),(-.12,-.88,.94)],.115,.040,520),
 ((.14,-.50),[(-.12,-.66,1.36),(-.39,-.78,1.24),(-.52,-.82,1.09),(-.45,-.84,1.02)],.098,.035,430),
 ((-.22,-.48),[(-.43,-.60,1.32),(-.64,-.69,1.19),(-.75,-.75,1.04),(-.68,-.77,.96)],.080,.026,330),
 ((.61,-.26),[(.65,-.35,1.28),(.60,-.50,1.35),(.48,-.61,1.20),(.51,-.66,1.10)],.070,.028,300),
]
for xy,guide,width,depth,count in front_guides:
 root=scalp(*xy)
 if root is not None:bundle([root,*guide],width,depth,count)
# Short side and back fibers grow directly on the head surface and follow it.
for i in range(4700):
 angle=rng.uniform(0,2*math.pi);z=rng.uniform(-.18,1.1);out=Vector((math.sin(angle),-math.cos(angle),0));origin=out*2;origin.z=z
 hit=bvh.ray_cast(origin,-out)
 if not hit[0]:continue
 p=hit[0];n=hit[1]
 # Front/temple limits and explicit ear exclusion leave the actual ear visible.
 front=max(0,min(1,(-p.y-.02)/.65));limit=.02+.85*front
 if p.z<limit or abs(p.x)>.87 or (abs(p.x)>.76 and p.z<.43 and p.y<.20):continue
 end=p+Vector((0,.06,-.10))+n*.014
 strand([p+n*.005,p+n*.028+Vector((0,.02,-.035)),end],rng.uniform(.5,.95))
sc=bpy.context.scene;sc.cycles.samples=40;cam=sc.camera;cam.data.ortho_scale=3.7
for angle in [0,30,90,180,330]:
 a=math.radians(angle);cam.location=(7*math.sin(a),-7*math.cos(a),.08);cam.rotation_euler=(Vector((0,-.1,.08))-cam.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=str(OUT/f'fibers-v5-{angle:03}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fiber-groom-v5-study.blend'))
