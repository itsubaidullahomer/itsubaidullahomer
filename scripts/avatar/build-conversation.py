"""Free local animation study on the approved neutral sculpt.
Real mesh morphs, weighted neck/head skeleton and independently moving eyes.
Reference-derived pigmentation is baked into UV atlases, not claimed as recovered albedo.
"""
import bpy, math, json, os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/ubaid-conversation';OUT.mkdir(exist_ok=True)
def p(x,y,d):return Vector(((x-627)/1000,d/1000,(627-y)/1000))
def px(v):return v.x*1000+627,627-v.z*1000,v.y*1000
def sm(a,b,t):
 t=max(0,min(1,(t-a)/(b-a)));return t*t*(3-2*t)
def mat(name,col,rough=.6):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes['Principled BSDF'];n.inputs['Base Color'].default_value=(*col,1);n.inputs['Roughness'].default_value=rough;n.inputs['Specular IOR Level'].default_value=.2;return m
# Exact vertex correspondence with the CC0 source; no nearest-point target transfer.
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/avatar/ubaid-v2/ubaid-rig.blend'))
source={}
for name in ['Ubaid_Face','Ubaid_Teeth','Ubaid_Tongue']:
 o=bpy.data.objects[name];basis=o.data.shape_keys.key_blocks[0]
 source[name]={'polys':[tuple(f.vertices) for f in o.data.polygons], 'deltas':{k.name:[(v.co-b.co).copy() for v,b in zip(k.data,basis.data)] for k in list(o.data.shape_keys.key_blocks)[1:]}}
 if name=='Ubaid_Face':
  idx=o.vertex_groups['ears'].index;earids={v.index for v in o.data.vertices if any(g.group==idx for g in v.groups)}
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/avatar/ubaid-neutral-review/neutral-sculpt.blend'))
if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
head=bpy.data.objects['Ubaid_Face'];reference=bpy.data.images.load(str(ROOT/'assets/avatar/ubaid-v1/master.png'),check_existing=True)
# Soften inherited angular ear folds while retaining attached helix/lobe topology.
neighbors={i:set() for i in earids}
for edge in head.data.edges:
 a,b=edge.vertices
 if a in neighbors:neighbors[a].add(b)
 if b in neighbors:neighbors[b].add(a)
for iteration in range(3):
 coords=[v.co.copy() for v in head.data.vertices]
 for i in earids:
  near=neighbors[i]
  if near:head.data.vertices[i].co=coords[i].lerp(sum((coords[j] for j in near),Vector())/len(near),.18)
# Lower only the upper-lid arch, covering the iris as in the approved neutral.
for v in head.data.vertices:
 x,y,d=px(v.co)
 if d < -300:
  for cx,cy in [(528,418),(718,405)]:
   if y < cy:
    y += 5.5*math.exp(-2*((x-cx)/56)**2-2*((y-(cy-23))/17)**2)
  v.co=p(x,y,d)
# Remove alpha-edge streaks on side neck; inferred skin fills the unobserved parts.
head.data.update()
coverage=head.data.color_attributes['Reference coverage']
uv=head.data.uv_layers['Final neutral reference UV']
for loop in head.data.loops:
 x,y,d=px(head.data.vertices[loop.vertex_index].co)
 w=coverage.data[loop.index].color[0]
 if loop.vertex_index in earids:w*=.60
 if y>710:w*=1-sm(120,185,abs(x-643))
 coverage.data[loop.index].color=(w,w,w,1)
# Skin-side tone is sampled as a material color, not a painted eye/lip replacement.
bs=head.data.materials[0].node_tree.nodes['Principled BSDF'];bs.inputs['Subsurface Weight'].default_value=.025
mix=next(n for n in head.data.materials[0].node_tree.nodes if n.type=='MIX_RGB');mix.inputs[1].default_value=(.49,.255,.145,1)
# Independent sclera, iris dome, limbus and pupil; all follow separate eye bones.
for o in list(bpy.data.objects):
 if o.name.startswith(('Eyeball','Limbal','Iris','Pupil','Soft corneal','Catchlight')):bpy.data.objects.remove(o,do_unlink=True)
sclera=mat('Warm off-white sclera',(.67,.63,.56),.29)
pupilmat=mat('Pupil',(.002,.0015,.001),.24)
limbusmat=mat('Limbal boundary',(.035,.018,.011),.38)
irismat=mat('Iris — reference brown pigmentation',(1,1,1),.3)
bs=irismat.node_tree.nodes['Principled BSDF'];tex=irismat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=reference;irismat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
eyeowners={}
def sphere(name,center,scale,material,segments=48,rings=24):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=center);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.clear();o.data.materials.append(material)
 for f in o.data.polygons:f.use_smooth=True
 return o
for index,(x,y) in enumerate([(528,418),(718,405)]):
 bone=f'eye_{index}'
 globe=sphere(f'Eye {index} / sclera',p(x,y,-367),(.055,.040,.036),sclera);eyeowners[globe.name]=bone
 for label,radius,depth,material in [('Limbus',27,-406.6,limbusmat),('Iris',26,-407.1,irismat),('Pupil',9.0,-410.2,pupilmat)]:
  o=sphere(f'Eye {index} / {label}',p(x,y,depth),(radius/1000,.0027,radius/1000),material);eyeowners[o.name]=bone
  if label=='Iris':
   uv=o.data.uv_layers.active
   for loop in o.data.loops:
    xx,yy,_=px(o.data.vertices[loop.vertex_index].co);uv.data[loop.index].uv=((x+(xx-x)*.84)/1254,1-(y+(yy-y)*.84)/1254)
# Inner mouth is dark three-dimensional geometry. It is hidden in the neutral pose.
cavity=sphere('Mouth cavity',p(643,637,-330),(.083,.044,.057),mat('Oral cavity',(.027,.006,.006),.88))
# Transfer the real topological morphs to the revised proportions.
for name,data in source.items():
 o=bpy.data.objects[name]
 assert len(o.data.vertices)==len(next(iter(data['deltas'].values())))
 assert [tuple(f.vertices) for f in o.data.polygons]==data['polys'], 'Morph topology changed'
 o.shape_key_add(name='Basis')
 for keyname,deltas in data['deltas'].items():
  key=o.shape_key_add(name=keyname)
  for i,delta in enumerate(deltas):
   x,y,d=px(o.data.vertices[i].co)
   # Enlargement of the portrait eyes needs larger lid travel than the old rig.
   eye_factor=1.18 if keyname.startswith('eyeBlink') else 1
   gain=.76 if keyname.startswith('viseme') or keyname=='jawOpen' else .80
   if keyname.startswith('eyeBlink'):gain=eye_factor
   key.data[i].co=o.data.vertices[i].co+Vector((delta.x*3.42155,delta.y*3.0144,delta.z*3.0144))*gain
# Bake full node coloration into conventional unique UV maps for glTF.
# Base Color only: no lighting or newly rendered shading is baked in this pass.
def bake_color(o,size=2048):
 materials=list(o.data.materials)
 if not materials:return
 # The head retains the original unique UV atlas. Other projected objects can
 # export their existing projection map directly; dark back hair is separate.
 for material in materials:
  if not material or not material.use_nodes:continue
  n=material.node_tree.nodes;l=material.node_tree.links;bs=n.get('Principled BSDF')
  if not bs or not bs.inputs['Base Color'].is_linked:continue
  image=bpy.data.images.new(o.name+' color atlas',size,size,alpha=False)
  output=n.get('Material Output');up=bs.inputs['Base Color'].links[0].from_socket
  emit=n.new('ShaderNodeEmission');l.new(up,emit.inputs[0]);l.new(emit.outputs[0],output.inputs['Surface'])
  target=n.new('ShaderNodeTexImage');target.image=image;n.active=target
  for mod in o.modifiers:mod.show_render=False
  o.data.uv_layers.active=o.data.uv_layers[0];o.data.uv_layers[0].active_render=True
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  scene.render.bake.margin=12;bpy.ops.object.bake(type='EMIT')
  image.filepath_raw=str(OUT/(o.name.replace(' ','-')+'-color.png'));image.file_format='PNG';image.save();image.pack()
  for node in list(n):
   if node not in [bs,output,target]:n.remove(node)
  l.new(target.outputs['Color'],bs.inputs['Base Color']);l.new(bs.outputs[0],output.inputs['Surface'])
  for layer in list(o.data.uv_layers)[1:]:o.data.uv_layers.remove(layer)
  for attr in list(o.data.color_attributes):o.data.color_attributes.remove(attr)
  for mod in o.modifiers:mod.show_render=True
bake_color(head)
# Hair/shirt projection is fixed in rest-space and deforms with their vertices.
for o in bpy.data.objects:
 if o.type!='MESH' or o==head:continue
 for material in o.data.materials:
  if not material or not material.use_nodes:continue
  n=material.node_tree.nodes;l=material.node_tree.links;bs=n.get('Principled BSDF')
  textures=[n for n in n if n.type=='TEX_IMAGE']
  if not bs or not textures:continue
  texture=textures[-1]
  if 'Iris' in o.name:continue
  # The exported texture node uses a single named UV channel.
  uvnode=next((q for q in n if q.type=='UVMAP'),None)
  uvname=uvnode.uv_map if uvnode else o.data.uv_layers[-1].name
  for layer in list(o.data.uv_layers):
   if layer.name!=uvname:o.data.uv_layers.remove(layer)
  l.new(texture.outputs['Color'],bs.inputs['Base Color'])
  for inp in ['Normal','Alpha']:
   for link in list(bs.inputs[inp].links):l.remove(link)
  for node in list(n):
   if node not in [bs,n.get('Material Output'),texture,uvnode]:n.remove(node)
# Subdivide morph geometry consistently once (18k head verts), then preserve all shapes.
for name in source:
 o=bpy.data.objects[name]
 for mod in list(o.modifiers):o.modifiers.remove(mod)
 sub=o.modifiers.new('Consistent facial subdivision','SUBSURF');sub.levels=1;sub.render_levels=1
 keys=o.data.shape_keys.key_blocks;names=[k.name for k in keys];result=[]
 deps=bpy.context.evaluated_depsgraph_get()
 for key in keys:
  for other in keys:other.value=0
  if key.name!='Basis':key.value=1
  bpy.context.view_layer.update();evaluated=o.evaluated_get(deps);mesh=evaluated.to_mesh()
  result.append([v.co.copy() for v in mesh.vertices])
  if key.name=='Basis':newmesh=mesh.copy()
  evaluated.to_mesh_clear()
 old=o.data;o.modifiers.clear();o.data=newmesh
 if o.data.shape_keys:o.shape_key_clear()
 for name2,coords in zip(names,result):
  key=o.shape_key_add(name=name2)
  for v,co in zip(key.data,coords):v.co=co
 for key in o.data.shape_keys.key_blocks:key.value=0
# Cotton-colored thickness prevents dark projected silhouette pixels on the shirt rim.
shirt=bpy.data.objects['Ubaid_Shirt — tailored bust']
# Sample a few pixels inside the garment, away from the reference cutout's
# transparent fringe. This changes rest UVs, not the source artwork.
for loop in shirt.data.uv_layers.active.data:
 u,v=loop.uv;loop.uv=(max(8/1254,min(1246/1254,u)),v-12/1254)
shirt.data.materials.append(mat('Cotton rim and back',(.80,.78,.74),.9))
for mod in shirt.modifiers:
 if mod.type=='SOLIDIFY':mod.material_offset=1;mod.material_offset_rim=1
# Compact groom curves while retaining silhouette strands.
for o in list(bpy.data.objects):
 if o.type=='CURVE':
  o.data.bevel_resolution=0
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 if o.type=='MESH' and o.name not in source:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):
   if mod.type=='SUBSURF':mod.levels=min(1,mod.levels)
   bpy.ops.object.modifier_apply(modifier=mod.name)
  if 'continuous reference' in o.name or o.name.startswith('Surface groom'):
   dec=o.modifiers.new('Browser mesh reduction','DECIMATE');dec.ratio=.30 if 'continuous' in o.name else .22;bpy.ops.object.modifier_apply(modifier=dec.name)
# Head and gaze skeleton, with a smooth neck transition into the stationary bust.
arm=bpy.data.armatures.new('Conversation skeleton');rig=bpy.data.objects.new('Ubaid conversation rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
root=arm.edit_bones.new('root');root.head=p(640,1150,0);root.tail=p(640,950,0)
neck=arm.edit_bones.new('neck');neck.head=p(640,860,-60);neck.tail=p(640,740,-80);neck.parent=root
hb=arm.edit_bones.new('head');hb.head=p(640,740,-80);hb.tail=p(640,330,-100);hb.parent=neck
for index,(x,y) in enumerate([(528,418),(718,405)]):
 b=arm.edit_bones.new(f'eye_{index}');b.head=p(x,y,-367);b.tail=p(x,y,-430);b.parent=hb
bpy.ops.object.mode_set(mode='OBJECT')
for o in list(bpy.data.objects):
 if o.type!='MESH':continue
 o.vertex_groups.clear();o.parent=rig
 groups={n:o.vertex_groups.new(name=n) for n in ['root','neck','head','eye_0','eye_1']}
 for v in o.data.vertices:
  x,y,d=px(o.matrix_world@v.co)
  if o.name in eyeowners:groups[eyeowners[o.name]].add([v.index],1,'REPLACE')
  elif o.name=='Ubaid_Face':
   h=1-sm(745,875,y);groups['head'].add([v.index],h,'REPLACE');groups['root'].add([v.index],1-h,'REPLACE')
  elif any(t in o.name for t in ['Shirt','collar','button']):groups['root'].add([v.index],1,'REPLACE')
  else:groups['head'].add([v.index],1,'REPLACE')
 mod=o.modifiers.new('Weighted conversation skeleton','ARMATURE');mod.object=rig
# Source scene is saved with neutral keys and no staged animation.
scene.render.resolution_percentage=int(os.environ.get('AVATAR_SCALE','64'));scene.cycles.samples=int(os.environ.get('AVATAR_SAMPLES','32'))
for o in scene.objects:
 if o.type=='EMPTY':o.hide_render=True
for img in bpy.data.images:
 if img.source=='FILE' or img.has_data: 
  try:img.pack()
  except:pass
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'conversation-rig.blend'))
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
for o in scene.objects:
 if o.type=='MESH':
  o.parent=None
  o.select_set(True)
  if o.name.startswith('Surface groom') or 'Shirt' in o.name:
   bpy.context.view_layer.objects.active=o
   dec=o.modifiers.new('Export-only detail reduction','DECIMATE');dec.ratio=.25 if o.name.startswith('Surface groom') else .18
   bpy.ops.object.modifier_apply(modifier=dec.name)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/avatar/ubaid-conversation.glb'),export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_morph=True,export_skins=True,export_texcoords=True,export_extras=True,export_image_format='AUTO')
report={'method':'Editable sculpt mesh; original-topology facial target transfer; independently skinned eyes; baked reference-derived skin and hair pigmentation','shapeKeys':len(head.data.shape_keys.key_blocks)-1,'faceVertices':len(head.data.vertices),'paidServices':False,'limitations':['Single front reference; side/back are inferred','Pigment still contains lighting from the reference','This is a conversation study, not a production avatar']}
(OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
for label,pose in [('neutral',{}),('smile',{'mouthSmileLeft':.5,'mouthSmileRight':.5,'cheekSquintLeft':.15,'cheekSquintRight':.15}),('speaking',{'viseme_aa':.7}),('blink',{'eyeBlinkLeft':1,'eyeBlinkRight':1})]:
 for o in [bpy.data.objects[n] for n in source]:
  for key in o.data.shape_keys.key_blocks:key.value=pose.get(key.name,0)
 scene.render.filepath=str(OUT/(label+'.png'));bpy.ops.render.render(write_still=True)
print('CONVERSATION BUILD COMPLETE',json.dumps(report))
