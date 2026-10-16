"""Non-destructive clay and material render of the camera-aware head study."""
import bpy,json,math,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'identity-neutral.blend'))
fit=json.loads((OUT/'camera-fit-study.json').read_text());centers=np.array([p['position'] for p in fit['controls']]);delta=np.array([p['delta'] for p in fit['controls']]);sigma=.023
kernel=np.exp(-np.sum((centers[:,None,:]-centers[None,:,:])**2,axis=2)/(sigma*sigma));coef=np.linalg.solve(kernel+np.eye(len(kernel))*.04,delta)
def deformation(p):
 if p[2]<1.57:return np.zeros(3)
 d=np.exp(-np.sum((centers-p)**2,axis=1)/(sigma*sigma))@coef
 mirror=p.copy();mirror[0]*=-1
 dm=np.exp(-np.sum((centers-mirror)**2,axis=1)/(sigma*sigma))@coef;dm[0]*=-1
 d=(d+dm)*.5
 # Preserve the independently solved lid/globe contact. Perspective landmark
 # fitting does not constrain its depth reliably enough to move this region.
 eye=math.exp(-((abs(p[0])-.031)/.020)**4-((p[2]-1.72)/.022)**4)
 return d*min(1,max(0,(p[2]-1.57)/.045))*(1-eye)
for ob in bpy.data.objects:
 if ob.type=='MESH' and not ob.name.startswith('Ubaid_Hair'):
  if ob.name.startswith('Eye.'):
   pos=np.mean(np.array([list(v.co) for v in ob.data.vertices]),axis=0);shift=Vector(deformation(pos).tolist())
   for v in ob.data.vertices:v.co+=shift
  else:
   for v in ob.data.vertices:v.co+=Vector(deformation(np.array(v.co)).tolist())
 elif ob.type=='CURVE' and ob.name.startswith(('Mustache fiber','Chin fiber')):
  for sp in ob.data.splines:
   for v in sp.points:
    d=deformation(np.array(v.co[:3]));v.co=(*((np.array(v.co[:3])+d).tolist()),v.co.w)
scene=bpy.context.scene;cam=scene.camera;scene.cycles.samples=32
cam.data.type='ORTHO';cam.data.ortho_scale=.40
report=json.loads((OUT/'build-report.json').read_text());cz=(report['headTop']+report['landmarks']['joint-neck'][2])*.5
for angle in [0,45,90]:
 a=math.radians(angle);cam.location=(2*math.sin(a),-2*math.cos(a)-.045,cz);cam.rotation_euler=(Vector((0,-.045,cz))-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(OUT/f'camera-fit-{angle:03}.png');bpy.ops.render.render(write_still=True)
clay=bpy.data.materials.new('Neutral sculpt clay');clay.diffuse_color=(.45,.45,.45,1);clay.use_nodes=True;clay.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.4,.4,.4,1);clay.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.8
for ob in bpy.data.objects:
 if ob.type=='MESH' and not ob.name.startswith('Eye.'):
  for i in range(len(ob.data.materials)):ob.data.materials[i]=clay
 if ob.type=='CURVE':ob.hide_render=True
cam.location=(0,-2,cz);cam.rotation_euler=(Vector((0,-.045,cz))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/'camera-fit-clay.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'camera-fit-study.blend'))
