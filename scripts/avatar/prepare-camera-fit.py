"""Sample persistent 3D surface anchors on the exact current neutral study."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'identity-neutral.blend'))
data=json.loads((ROOT/'qa-output/avatar-identity/landmarks-current.json').read_text())
p=data['render']['landmarks'];report=json.loads((OUT/'build-report.json').read_text());cz=(report['headTop']+report['landmarks']['joint-neck'][2])*.5
body=bpy.data.objects['Ubaid_Body'];dg=bpy.context.evaluated_depsgraph_get();tree=BVHTree.FromObject(body,dg)
pairs=[(33,263),(133,362),(159,386),(145,374),(61,291),(78,308),(234,454),(93,323),(132,361),(172,397),(58,288),(150,379),(149,378),(148,377),(136,365),(70,300),(105,334),(107,336),(46,276),(55,285),(98,327),(129,358)]
mid=[10,152,1,4,5,6,168,197,2,0,13,14,17];ids=mid+[i for pair in pairs for i in pair]
anchors=[]
for i in ids:
 x=(p[i][0]*900-450)*.0004;z=cz+(500-p[i][1]*1000)*.0004
 hit=tree.ray_cast(Vector((x,-.7,z)),Vector((0,1,0)))[0]
 method='ray'
 if not hit:hit=tree.find_nearest(Vector((x,-.14,z)))[0];method='nearest'
 anchors.append({'id':i,'position':list(hit),'method':method})
(OUT/'camera-fit-anchors.json').write_text(json.dumps({'source':'identity-neutral.blend','frame':'neutral-000.png','pairs':pairs,'mid':mid,'anchors':anchors},indent=2))
