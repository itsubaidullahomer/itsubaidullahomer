"""Estimate conservative cage adjustments from several local reference views.
Landmarks guide an editable sculpt; these monocular estimates are not a scan.
"""
from pathlib import Path
import numpy as np,json
ROOT=Path(__file__).resolve().parents[2]
data=json.loads((ROOT/'qa-output/avatar-identity/landmarks.json').read_text())
def canonical(name):
 d=data[name];p=np.array(d['landmarks']);p*=np.array([d['width'],d['height'],d['width']]);p[:,1:]*=-1
 r=np.array(d['matrix'])[:3,:3];p=p@r
 p-=(p[33]+p[263])/2
 return p/np.linalg.norm(p[263]-p[33])
source=canonical('render')
target=sum(canonical(name)*weight for name,weight in [('ref27',.55),('ref24',.15),('ref04',.10),('ref25',.12),('ref26',.08)])
# Preserve symmetry in neutral geometry while leaving small natural deviations.
pairs=[(33,263),(133,362),(159,386),(145,374),(61,291),(78,308),(234,454),(93,323),(132,361),(172,397),(58,288),(150,379),(149,378),(148,377),(136,365),(70,300),(105,334),(107,336),(46,276),(55,285),(98,327),(129,358)]
for a,b in pairs:
 x=(abs(target[a,0])+abs(target[b,0]))/2
 yz=(target[a,1:]+target[b,1:])/2
 target[a]=[-x,*yz];target[b]=[x,*yz]
ids=[10,152,1,4,5,6,168,197,2,0,13,14,17]+[n for p in pairs for n in p]
render=data['render'];pixels=np.array(render['landmarks']);pixels*=np.array([render['width'],render['height'],render['width']])
scale=np.linalg.norm(pixels[263,:2]-pixels[33,:2])*.0004
report=json.loads((ROOT/'assets/avatar/identity-rebuild/build-report.json').read_text())
cz=(report['headTop']+report['landmarks']['joint-neck'][2])*.5
controls=[]
for i in ids:
 delta=(target[i]-source[i])*scale
 # Source canonical is camera X/Y/Z. Blender uses X/depth/height.
 controls.append({'id':i,'x':(pixels[i,0]-450)*.0004,'z':cz+(500-pixels[i,1])*.0004,'delta':[float(delta[0]),float(-delta[2]*.6),float(delta[1])]})
(ROOT/'assets/avatar/identity-rebuild/landmark-fit.json').write_text(json.dumps({'method':'Conservative multi-view landmark-informed cage sculpt, not photogrammetry','references':[27,24,4,25,26],'controls':controls},indent=2))
print('Cage controls',len(controls),'max correction',max(np.linalg.norm(p['delta']) for p in controls))
