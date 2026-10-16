"""Fit a shared symmetric facial cage against per-photo perspective cameras.
Uses 2D reference points only; MediaPipe pseudo-depth never drives anatomy.
Regularized editable study, not a claimed photogrammetric reconstruction.
"""
from pathlib import Path
import json,cv2,numpy as np
from scipy.optimize import least_squares
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/identity-rebuild'
refs=json.loads((ROOT/'qa-output/avatar-identity/landmarks-current.json').read_text());sample=json.loads((OUT/'camera-fit-anchors.json').read_text())
ids=[a['id'] for a in sample['anchors']];idx={n:i for i,n in enumerate(ids)}
raw=np.array([a['position'] for a in sample['anchors']]);base=raw[:,[0,2,1]].copy();base[:,1]=1.71-base[:,1];base[:,2]+=.14
# Symmetry belongs to geometry; image rotation and perspective are independent.
pairs=sample['pairs'];mid=sample['mid'];groups=[(i,) for i in mid]+[tuple(p) for p in pairs]
nshape=len(groups)*3
images=['ref27','ref24','ref04','ref25','ref26']
obs=[];initial=[];weights=[]
for name in images:
 d=refs[name];w,h=d['width'],d['height'];q=np.array(d['landmarks'])[:,:2]*[w,h];q=q[ids]
 f=max(w,h)*1.15;K=np.array([[f,0,w/2],[0,f,h/2],[0,0,1.]],float)
 ok,r,t=cv2.solvePnP(base,q,K,None,flags=cv2.SOLVEPNP_EPNP)
 if not ok:raise RuntimeError('camera initialization failed')
 initial.extend([*r[:,0],*t[:,0],np.log(f)])
 obs.append((q,w,h,np.linalg.norm(q[idx[263]]-q[idx[33]])))
 wt=np.ones(len(ids))
 if name in ['ref25','ref26']:
  for n in [234,454,93,323,132,361,172,397,58,288,150,379,149,378,148,377,136,365]:wt[idx[n]]=.001
 weights.append(wt)
# Local smoothness retains continuous surface proportions between landmarks.
dist=np.linalg.norm(base[:,None,:]-base[None,:,:],axis=2);neighbors=np.argsort(dist,axis=1)[:,1:5]
def shape(x):
 delta=np.zeros_like(base)
 for g,(members) in enumerate(groups):
  d=x[g*3:g*3+3]*np.array([.008,.008,.004])
  if len(members)==1:delta[idx[members[0]]]=[0,d[1],d[2]]
  else:
   a,b=members;delta[idx[a]]=[-d[0],d[1],d[2]];delta[idx[b]]=[d[0],d[1],d[2]]
 return base+delta,delta

def residual(x,geometry=True):
 pos,delta=shape(x[:nshape]) if geometry else (base,np.zeros_like(base));res=[]
 offset=nshape
 for vi,(q,w,h,scale) in enumerate(obs):
  par=x[offset:offset+7];offset+=7;f=np.exp(par[6]);K=np.array([[f,0,w/2],[0,f,h/2],[0,0,1.]],float)
  pred=cv2.projectPoints(pos,par[:3],par[3:6],K,None)[0][:,0,:]
  res.extend(((pred-q)/scale*100*weights[vi][:,None]).ravel())
  res.append((par[6]-initial[vi*7+6])*1.5)
 if geometry:
  res.extend((delta/.004).ravel())
  smooth=delta-delta[neighbors].mean(axis=1);res.extend((smooth/.003*.65).ravel())
 return np.array(res)
x0=np.r_[np.zeros(nshape),initial]
# Resolve cameras first, then alternate shared geometry and camera refinement.
cam=least_squares(lambda c:residual(np.r_[np.zeros(nshape),c],False),np.array(initial),max_nfev=160,loss='soft_l1',f_scale=2)
x0[nshape:]=cam.x
lo=np.r_[np.full(nshape,-1.),np.tile([-10,-10,-10,-2,-2,.10,np.log(100)],len(images))]
hi=np.r_[np.full(nshape,1.),np.tile([10,10,10,2,2,5,np.log(6000)],len(images))]
solution=least_squares(residual,np.minimum(hi-.0001,np.maximum(lo+.0001,x0)),bounds=(lo,hi),max_nfev=200,loss='soft_l1',f_scale=2,ftol=1e-7)
new,delta=shape(solution.x[:nshape]);records=[]
for n,d,p in zip(ids,delta,raw):records.append({'id':n,'position':p.tolist(),'delta':[float(d[0]),float(d[2]),float(-d[1])]})
report={'method':'Shared symmetric surface, per-reference perspective camera, 2D-only regularized fit','references':images,'initialReprojectionRms':float(np.sqrt(np.mean(residual(x0,False)**2))),'maxDisplacementMm':float(np.linalg.norm(delta,axis=1).max()*1000),'source':'identity-neutral.blend (04:10 study)','controls':records,'cameras':{name:solution.x[nshape+i*7:nshape+(i+1)*7].tolist() for i,name in enumerate(images)}}
# Geometry=False above intentionally evaluates unchanged geometry; calculate
# fitted residual separately without regularization rows for a useful metric.
report['fittedObjectiveRms']=float(np.sqrt(np.mean(residual(solution.x)**2)))
report['finalReprojectionRms']=float(np.sqrt(np.mean(residual(solution.x)[:len(images)*(len(ids)*2+1)]**2)))
(OUT/'camera-fit-study.json').write_text(json.dumps(report,indent=2));print({k:v for k,v in report.items() if k not in ['controls','cameras']})
