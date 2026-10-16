"""Reference-directed wavy groom made of actual editable Blender hair curves.
No portrait texture; geometric paths define flow, asymmetric crest and fringe.
"""
import bpy,math,random
from mathutils import Vector

def create_wavy_groom(body,old_hair,material):
 rng=random.Random(23062005)
 # The underlayer covers the scalp only; hair details below establish flow.
 for m in old_hair.data.materials:
  if m and m.use_nodes:
   bs=m.node_tree.nodes.get('Principled BSDF')
   bs.inputs['Roughness'].default_value=.9;bs.inputs['Specular IOR Level'].default_value=.1
 for v in old_hair.data.vertices:
  if v.co.z>1.82:v.co.z=1.82+(v.co.z-1.82)*.55
 data=bpy.data.curves.new('Reference wavy groom','CURVE');data.dimensions='3D';data.resolution_u=3;data.bevel_depth=.00085;data.bevel_resolution=0
 ob=bpy.data.objects.new('Ubaid_Hair_Waves',data);bpy.context.collection.objects.link(ob);data.materials.append(material)
 def strand(points,radius=1):
  sp=data.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
  for i,(bp,p) in enumerate(zip(sp.bezier_points,points)):
   bp.co=p;bp.handle_left_type='AUTO';bp.handle_right_type='AUTO';bp.radius=radius*(1 if i<len(points)-1 else .12)
 # Distinct top clumps with irregular lengths. Each guide has offset fibers;
 # the crest sweeps sideways, then curls back through the front fringe.
 for g in range(24):
  x=-.066+(g%8)*.018+rng.uniform(-.003,.003);row=g//8
  peak=1.856+rng.uniform(-.007,.006)+.012*(1-(x/.075)**2)
  rooty=.030-row*.020
  endz=1.781+row*.014+rng.uniform(-.006,.006)
  endx=x-.010+row*.005
  guide=[(x,rooty,1.811),(x-.014,-.023,peak),(x-.025,-.092,peak-.005),(endx,-.131+row*.003,endz)]
  for n in range(14):
   off=rng.uniform(-.006,.006);depth=rng.uniform(-.002,.002)
   points=[(xx+off,yy+depth,zz+rng.uniform(-.0015,.0015)) for xx,yy,zz in guide]
   strand(points,rng.uniform(.6,1.2))
 # Side and rear sweep: short overlapping locks follow the skull and taper at
 # the ear and nape instead of hanging as a solid shell.
 for side in [-1,1]:
  for g in range(13):
   y=-.085+g*.012
   for n in range(9):
    yy=y+rng.uniform(-.005,.005);x=side*(.073+rng.uniform(-.002,.002))
    z=1.796-abs(yy+.018)*.20
    strand([(x*.85,yy+.012,z+.020),(x*1.04,yy,z+.008),(x*1.02,yy-.009,z-.012),(x*.97,yy-.019,z-.034)],rng.uniform(.65,1.0))
 return ob
