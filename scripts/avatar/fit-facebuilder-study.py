"""Local Blender/FaceBuilder trial study using the add-on's own operators.

No payment, cloud photo service, or alteration of KeenTools code/licensing.
Private reference files are read in place, never copied into public assets.
"""
import sys, json, math
from pathlib import Path
import bpy, addon_utils
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/avatar/identity-rebuild/facebuilder-study'
OUT.mkdir(exist_ok=True)
sys.path.insert(0,'/tmp/ubaid-avatar-tools/keentools-blender')
addon_utils.enable('keentools',default_set=False,persistent=False)
from keentools.addon_config import fb_settings,get_operator
from keentools.facebuilder_config import FBConfig
from keentools.blender_independent_packages.pykeentools_loader import module
from keentools.utils.coords import update_head_mesh_neutral

status,_=module().FaceBuilder.license_manager().perform_license_and_trial_check()
license_record={'trial':status.trial_status.status,'license':status.license_status.status,'daysLeft':status.days_left}
print('LICENSE',license_record,flush=True)
if status.trial_status.status!='succeed' and status.license_status.status!='succeed':
    raise RuntimeError('No active FaceBuilder license or trial; stopping without a bypass.')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
assert get_operator(FBConfig.fb_add_head_operator_idname)('EXEC_DEFAULT')=={'FINISHED'}
settings=fb_settings();settings.current_headnum=0;head=settings.get_head(0)
head.use_emotions=True
head.set_neutral_expression_view()
names=[
 ('27','6c285b2a-2167-4137-b3f4-a39f54a49f77'),
 ('25','85055d41-83af-439d-a630-495acd567b87'),
 ('14','f5987ee8-0a3f-40c3-9bb5-39e66ae1c470'),
]
directory=Path('/var/folders/__/2f00b7s105z4skvk45s1mrmh0000gn/T')
results=[]
for label,uid in names:
    filename=f'codex-clipboard-{uid}.png'
    res=get_operator(FBConfig.fb_multiple_filebrowser_idname)('EXEC_DEFAULT',headnum=0,directory=str(directory),files=({'name':filename},))
    camnum=len(head.cameras)-1;settings.current_camnum=camnum
    res=get_operator(FBConfig.fb_pickmode_starter_idname)('EXEC_DEFAULT',headnum=0,camnum=camnum,auto_detect_single=True)
    camera=head.get_camera(camnum);builder=settings.loader().get_builder()
    count=builder.pins_count(camera.get_keyframe())
    results.append({'reference':label,'result':list(res),'pins':count})
    print('FIT',results[-1],flush=True)
    if count<4:raise RuntimeError(f'Reference {label} did not fit.')
    head.set_neutral_expression_view();update_head_mesh_neutral(builder,head)
    settings.loader().save_fb_serial_and_image_pathes(0)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'fit-through-{label}.blend'))

obj=head.headobj
for p in obj.data.polygons:p.use_smooth=True
bpy.context.view_layer.update()
points=[obj.matrix_world@v.co for v in obj.data.vertices]
lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
print('BOUNDS',lo,hi,flush=True)
(OUT/'fit-report.json').write_text(json.dumps({'license':license_record,'references':results,'vertices':len(obj.data.vertices),'polygons':len(obj.data.polygons),'bounds':[lo,hi],'status':'unreviewed clay study'},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fitted-head.blend'))
