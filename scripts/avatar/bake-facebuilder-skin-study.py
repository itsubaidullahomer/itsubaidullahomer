"""Bake authored skin and physical facial fibers into portable UV PBR maps.

No photo projection. The input must be an isolated neutral facial-groom study.
The dense editable source is preserved; only this export copy loses fibers.
"""
import bpy,sys,argparse,json,numpy as np,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--export',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(a.source))
head=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.shape_keys and len(o.data.vertices)>10000)
for ob in bpy.context.scene.objects:
 if ob.type in ('MESH','CURVE') and ob.data.shape_keys:
  for k in ob.data.shape_keys.key_blocks:k.value=0
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.bake.use_selected_to_active=True;scene.render.bake.cage_extrusion=.012;scene.render.bake.max_ray_distance=.024;scene.render.bake.margin=12
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();sources=[]
physical=[o for o in bpy.context.scene.objects if o.type=='CURVE' and o.name.endswith(' fibers')]
for obj in [head,*physical]:
 mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(deps),depsgraph=deps);copy=bpy.data.objects.new(obj.name+'__bake_source',mesh);bpy.context.collection.objects.link(copy);copy.matrix_world=obj.matrix_world.copy();sources.append(copy)
source_mats={s:list(s.data.materials) for s in sources}
material=bpy.data.materials.new('Authored skin and fibers — baked PBR');material.use_nodes=True;bs=material.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.57;bs.inputs['Specular IOR Level'].default_value=.30;bs.inputs['Subsurface Weight'].default_value=.045;bs.inputs['Subsurface Scale'].default_value=.04
head.data.materials.clear();head.data.materials.append(material)
for polygon in head.data.polygons:polygon.material_index=0
outputs={}
for channel in ['Base Color','Roughness','Normal']:
 temp=[]
 for obj in sources:
  obj.data.materials.clear()
  for original in source_mats[obj]:
   mat=original.copy();temp.append(mat);obj.data.materials.append(mat)
   if channel=='Normal':continue
   nodes=mat.node_tree.nodes;links=mat.node_tree.links;shader=nodes.get('Principled BSDF');output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');emitter=nodes.new('ShaderNodeEmission');socket=shader.inputs[channel]
   if socket.is_linked:links.new(socket.links[0].from_socket,emitter.inputs['Color'])
   else:
    value=socket.default_value;emitter.inputs['Color'].default_value=value if channel=='Base Color' else (value,value,value,1)
   links.new(emitter.outputs['Emission'],output.inputs['Surface'])
 size=2048 if channel!='Roughness' else 1024
 image=bpy.data.images.new('Fitted head '+channel,width=size,height=size,alpha=False);image.colorspace_settings.name='sRGB' if channel=='Base Color' else 'Non-Color';image.generated_color=(.43,.235,.145,1) if channel=='Base Color' else ((.5,.5,1,1) if channel=='Normal' else (.57,.57,.57,1))
 node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;material.node_tree.nodes.active=node
 bpy.ops.object.select_all(action='DESELECT');head.select_set(True);bpy.context.view_layer.objects.active=head
 for obj in sources:obj.select_set(True)
 bpy.ops.object.bake(type='NORMAL' if channel=='Normal' else 'EMIT',normal_space='TANGENT')
 path=a.out/(channel.lower().replace(' ','-')+'.png');image.filepath_raw=str(path);image.file_format='PNG';image.save();image.pack();outputs[channel]=str(path)
 if channel=='Normal':
  normal=material.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.38;material.node_tree.links.new(node.outputs['Color'],normal.inputs['Color']);material.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
 else:material.node_tree.links.new(node.outputs['Color'],bs.inputs[channel])
 for obj in sources:
  obj.data.materials.clear()
  for mat in source_mats[obj]:obj.data.materials.append(mat)
 for mat in temp:bpy.data.materials.remove(mat)
for obj in [*sources,*physical]:bpy.data.objects.remove(obj,do_unlink=True)
scene.render.bake.use_selected_to_active=False
scene.render.filepath=str(a.out/'baked-neutral.png');scene.cycles.samples=48;bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(a.out/'baked-head-study.blend'))
report={'source':str(a.source),'method':'UV emission/normal baking of authored mesh pigmentation and physical facial fibers; no photographic texture','maps':outputs,'removedSourceFiberObjects':len(physical),'shapeChannels':len(head.data.shape_keys.key_blocks)-1}
if a.export:
 bpy.ops.object.select_all(action='DESELECT')
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH':obj.select_set(True);obj.scale*=.1
 raw=a.out/'head-groomed-raw.glb';packed=a.out/'head-groomed-study.glb';bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_morph=True,export_morph_normal=True,export_yup=True,export_apply=False,export_try_sparse_sk=True)
 subprocess.run(['/tmp/ubaid-avatar-tools/gltf-transform/node_modules/.bin/gltf-transform','meshopt',str(raw),str(packed),'--level','high','--quantize-position','16','--quantize-normal','12'],check=True);report['glbBytes']=packed.stat().st_size
(a.out/'report.json').write_text(json.dumps(report,indent=2))
