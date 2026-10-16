"""Unify the modeled waves into a continuous sculpt instead of stacked plates."""
import bpy, os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'identity-neutral.blend'))
hair=bpy.data.objects['Ubaid_Hair']
bpy.ops.object.select_all(action='DESELECT');hair.select_set(True);bpy.context.view_layer.objects.active=hair
for mod in list(hair.modifiers):
 if mod.type=='MASK':bpy.ops.object.modifier_apply(modifier=mod.name)
solid=hair.modifiers.new('Closed sculpt undercoat','SOLIDIFY');solid.thickness=.006;solid.offset=-1
bpy.ops.object.modifier_apply(modifier=solid.name)
for ob in bpy.data.objects:
 if ob.name.startswith(('Wavy crest','Temple wave')):ob.select_set(True)
bpy.ops.object.join()
hair.data.remesh_voxel_size=.0018
bpy.ops.object.voxel_remesh()
mod=hair.modifiers.new('Blend wave joins','SMOOTH');mod.factor=.7;mod.iterations=6;bpy.ops.object.modifier_apply(modifier=mod.name)
mat=bpy.data.materials['Sculpted near black waves'];hair.data.materials.clear();hair.data.materials.append(mat)
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.83;bs.inputs['Specular IOR Level'].default_value=.12
for p in hair.data.polygons:p.use_smooth=True
dec=hair.modifiers.new('Wave topology budget','DECIMATE');dec.ratio=min(1,13000/len(hair.data.polygons));bpy.ops.object.modifier_apply(modifier=dec.name)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'hair-study.blend'))
bpy.context.scene.cycles.samples=24;bpy.context.scene.render.filepath=str(OUT/'hair-study.png');bpy.ops.render.render(write_still=True)
