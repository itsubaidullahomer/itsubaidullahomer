"""Independent curved hair locks on the fitted head; never edits fit source."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild/facebuilder-study'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'textured-study.blend'))
head=next(o for o in bpy.data.objects if o.type=='MESH')
rng=random.Random(23062005)
mesh=head.data
bvh=BVHTree.FromPolygons([v.co for v in mesh.vertices],[list(p.vertices) for p in mesh.polygons])
def top(x,y):
 hit=bvh.ray_cast(Vector((x,y,3)),Vector((0,0,-1)))
 return hit[0].z if hit[0] else 1.05
hair=bpy.data.materials.new('Black wavy hair — geometry');hair.use_nodes=True
bs=hair.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.009,.007,.006,1);bs.inputs['Roughness'].default_value=.44;bs.inputs['Specular IOR Level'].default_value=.25
def makemesh(name,verts,faces):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(hair)
 for p in me.polygons:p.use_smooth=True
 return ob
# A low, fitted underlayer, hidden beneath individual locks. No stock hair cap.
selected=[]
for p in mesh.polygons:
 c=p.center;front=max(0,min(1,(-c.y-.05)/.65));boundary=-.06+.91*front-.18*max(0,(abs(c.x)-.55)/.4)
 if c.z>boundary:selected.append(p)
indices=sorted({i for p in selected for i in p.vertices});mapping={v:i for i,v in enumerate(indices)}
cap=makemesh('Hair underlayer',[mesh.vertices[i].co+mesh.vertices[i].normal*.025 for i in indices],[[mapping[i] for i in p.vertices] for p in selected])
def catmull(points,t):
 n=len(points)-1;k=min(n-1,int(t*n));u=t*n-k
 p0=points[max(0,k-1)];p1=points[k];p2=points[k+1];p3=points[min(n,k+2)]
 return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)
def lock(name,pts,width,thickness):
 pts=[Vector(p) for p in pts];verts=[];faces=[];ns=28;ring=10
 for j in range(ns+1):
  t=j/ns;c=catmull(pts,t);tangent=(catmull(pts,min(1,t+.002))-catmull(pts,max(0,t-.002))).normalized()
  radial=Vector((c.x*.55,c.y*.32,max(.3,c.z-.25))).normalized();side=tangent.cross(radial).normalized();normal=side.cross(tangent).normalized()
  taper=(.50+.65*math.sin(math.pi*t))*(1-t**5)+.035
  for k in range(ring):
   a=2*math.pi*k/ring;point=c+side*(math.cos(a)*width*taper)+normal*(math.sin(a)*thickness*taper)
   verts.append(point)
 for j in range(ns):
  for k in range(ring):faces.append((j*ring+k,j*ring+(k+1)%ring,(j+1)*ring+(k+1)%ring,(j+1)*ring+k))
 faces+=[tuple(reversed(range(ring))),tuple(ns*ring+k for k in range(ring))]
 ob=makemesh(name,verts,faces)
 # Fine geometric ridges follow each guide. The silhouette still comes from
 # the independent clump rather than photographic hair painted on the scalp.
 data=bpy.data.curves.new(name+' fibers','CURVE');data.dimensions='3D';data.resolution_u=1;data.bevel_depth=.0032;data.bevel_resolution=0
 fibers=bpy.data.objects.new(name+' fibers',data);bpy.context.collection.objects.link(fibers);data.materials.append(hair)
 for s in range(11):
  off=(s-5)/5*.80;sp=data.splines.new('POLY');sp.points.add(ns)
  for j,bp in enumerate(sp.points):
   t=j/ns;c=catmull(pts,t);tan=(catmull(pts,min(1,t+.002))-catmull(pts,max(0,t-.002))).normalized();rad=Vector((c.x*.55,c.y*.32,max(.3,c.z-.25))).normalized();side=tan.cross(rad).normalized();normal=side.cross(tan).normalized();taper=(.5+.65*math.sin(math.pi*t))*(1-t**5)+.035
   co=c+side*(off*width*taper)+normal*(math.sqrt(max(0,1-off*off))*thickness*taper+.001)
   bp.co=(*co,1);bp.radius=max(.15,(1-t)**.4)
 return ob
# The main sweep has different lengths, crests and curled tips; visible gaps
# separate locks instead of bending one broad frontal sheet into a visor.
for row in range(3):
 for col in range(7):
  x=-.62+col*.195+rng.uniform(-.018,.018);y=.52-row*.27;z=top(x,y)+.02
  sweep=-.10-.06*(1-x);crest=max(z+.18,1.40)+rng.uniform(-.055,.07)-.11*(abs(x)/.8)**2
  endy=-.48-row*.16;endx=x+sweep*.85
  endz=1.13-row*.105-.30*(abs(endx)/.95)**3+rng.uniform(-.055,.045)
  pts=[(x,y,z),(x+sweep*.3,y-.16,crest),(x+sweep,y-.45,crest+.005),(endx-.035,endy-.065,endz+.12),(endx+.045,endy,endz)]
  lock(f'Swept lock {row}-{col}',pts,.095+rng.uniform(-.01,.025),.035+rng.uniform(0,.02))
# Short side/back locks lie along the head rather than standing upright.
for side in [-1,1]:
 for j in range(9):
  y=-.33+j*.13;x=side*(.74-.12*(max(0,y)/.8));z=top(x,y)+.015
  pts=[(x*.97,y,z),(x*1.10,y+.05,z-.12),(x*1.13,y+.12,z-.32),(x*1.07,y+.16,z-.46)]
  lock(f'Side lock {side}-{j}',pts,.078,.023)
# Keep this as an unapproved groom study. The photo-backed face is diagnostic.
sc=bpy.context.scene;sc.cycles.samples=40;cam=sc.camera;cam.data.ortho_scale=3.7
for angle in [0,30,90,180,330]:
 a=math.radians(angle);cam.location=(7*math.sin(a),-7*math.cos(a),.08);cam.rotation_euler=(Vector((0,-.1,.08))-cam.location).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(OUT/f'groom-{angle:03}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'groom-study.blend'))
