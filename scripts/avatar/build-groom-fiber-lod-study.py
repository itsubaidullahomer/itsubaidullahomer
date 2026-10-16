"""Root-stratified, actual 3D triangular-fiber LOD from preserved v19 groom.

No cards, billboards, reference photographs or image textures. Dense source and
hairline boundary are preserved. Every output fiber follows a source strand.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT/'assets/avatar/identity-rebuild/facebuilder-study/groom-refinement'
OUT = BASE/'fiber-lod'; OUT.mkdir(exist_ok=True)
SOURCE = BASE/'fiber-groom-refined-v19.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
dense = bpy.data.objects['Refined asymmetric wave fibers']
cap = bpy.data.objects['Continuous scalp substrate']
rng = random.Random(23062005)
groups = {'long':[], 'undercoat':[], 'short':[]}
for spline in dense.data.splines:
    points=[Vector(p.co[:3]) for p in spline.points]
    radii=[p.radius*dense.data.bevel_depth for p in spline.points]
    category='long' if len(points)==49 else ('short' if len(points)==3 else 'undercoat')
    groups[category].append((points,radii))

def select_spatially(pool, count):
    buckets={}
    for strand in pool:
        root=strand[0][0]; cell=tuple(int(math.floor(v/.095)) for v in root)
        buckets.setdefault(cell,[]).append(strand)
    # Round-robin one source strand per spatial root cell before taking more.
    # This prevents a heavy crown cluster from consuming the side/nape budget.
    keys=list(buckets); rng.shuffle(keys)
    for bucket in buckets.values():rng.shuffle(bucket)
    result=[]
    while len(result)<min(count,len(pool)):
        for key in keys:
            if buckets[key]:result.append(buckets[key].pop())
            if len(result)>=count:break
    return result

def sample(points,t):
    f=t*(len(points)-1);i=min(int(f),len(points)-2)
    return points[i].lerp(points[i+1],f-i)

def adaptive_points(points, segments):
    points=[p.copy() for p in points]
    for _ in range(3):
        points=[points[0]]+[points[i-1]*.2+points[i]*.6+points[i+1]*.2 for i in range(1,len(points)-1)]+[points[-1]]
    keep=[0,len(points)-1]
    while len(keep)<segments+1:
        worst=(-1,None)
        for a,b in zip(keep,keep[1:]):
            line=points[b]-points[a]
            for i in range(a+1,b):
                t=max(0,min(1,(points[i]-points[a]).dot(line)/max(1e-12,line.length_squared)))
                error=(points[i]-(points[a]+line*t)).length_squared
                if error>worst[0]:worst=(error,i)
        if worst[1] is None:break
        keep.append(worst[1]);keep.sort()
    return [(points[i],i/(len(points)-1)) for i in keep]

verts=[];faces=[];stats={}
for category,count,segments,radius_multiplier in [('long',1600,12,1.65),('undercoat',1200,4,1.5),('short',1500,2,1.5)]:
    selected=select_spatially(groups[category],count)
    stats[category]={'source':len(groups[category]),'selected':len(selected),'segments':segments,'radiusMultiplier':radius_multiplier}
    for points,radii in selected:
        previous=Vector((1,0,0));offset=len(verts);path=adaptive_points(points,segments)
        for j,(center,t) in enumerate(path):
            tangent=(path[min(j+1,len(path)-1)][0]-path[max(0,j-1)][0]).normalized()
            side=previous-tangent*previous.dot(tangent)
            if side.length<.01:side=Vector((0,1,0))-tangent*tangent.y
            side.normalize();normal=tangent.cross(side).normalized();previous=side
            f=t*(len(radii)-1);a=min(int(f),len(radii)-2)
            radius=(radii[a]*(1-(f-a))+radii[a+1]*(f-a))*radius_multiplier
            for side_index in range(3):
                angle=side_index*2*math.pi/3
                p=center+(side*math.cos(angle)+normal*math.sin(angle))*radius
                verts.append(tuple(p))
        for j in range(len(path)-1):
            for side_index in range(3):
                a=offset+j*3+side_index;b=offset+j*3+(side_index+1)%3;c=offset+(j+1)*3+(side_index+1)%3;d=offset+(j+1)*3+side_index
                faces.append((a,b,c,d))
        faces.append((offset+2,offset+1,offset));end=offset+(len(path)-1)*3;faces.append((end,end+1,end+2))
mesh=bpy.data.meshes.new('Root-stratified true-fiber LOD');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Root-stratified true-fiber LOD',mesh);bpy.context.collection.objects.link(obj)
material=dense.data.materials[0].copy();material.name='True-fiber LOD near-black';mesh.materials.append(material)
bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.63;bsdf.inputs['Specular IOR Level'].default_value=.22;material.use_backface_culling=False
for poly in mesh.polygons:poly.use_smooth=True
dense.hide_render=True;dense.hide_set(True)
scene=bpy.context.scene;scene.cycles.samples=48;scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
cam=scene.camera;cam.data.ortho_scale=3.7
for angle in [0,30,90]:
    a=math.radians(angle);cam.location=(7*math.sin(a),-7*math.cos(a),.08)
    cam.rotation_euler=(Vector((0,-.1,.08))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/f'true-fibers-v4-{angle:03}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'true-fiber-lod-study.blend'))
bpy.ops.object.select_all(action='DESELECT')
for item in [obj,cap]:item.hide_set(False);item.select_set(True)
bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=str(OUT/'true-fiber-lod-study.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_extras=True)
report={'source':str(SOURCE.relative_to(ROOT)),'strands':stats,'fiberTriangles':sum(len(p.vertices)-2 for p in mesh.polygons),'capTriangles':sum(len(p.vertices)-2 for p in cap.data.polygons),'images':False,'crossSection':'closed triangular tubes per physical strand; adaptive curvature samples','status':'Unapproved desktop geometry study exceeding final hair budget; compare visible quality before any integration.'}
(OUT/'true-fiber-lod-report.json').write_text(json.dumps(report,indent=2));print('TRUE_FIBER_LOD_REPORT',json.dumps(report))
