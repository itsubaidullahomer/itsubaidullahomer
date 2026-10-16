"""Local-only facial landmarks for review and cage fitting; no photos uploaded."""
from pathlib import Path
import json, numpy as np, mediapipe as mp
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
TOOLS=Path('/tmp/ubaid-avatar-tools')
photo_dir=Path('/var/folders/__/2f00b7s105z4skvk45s1mrmh0000gn/T')
sources={
 'ref27':'6c285b2a-2167-4137-b3f4-a39f54a49f77',
 'ref25':'85055d41-83af-439d-a630-495acd567b87',
 'ref26':'677d05f0-c60b-4c4f-8d10-1a6374496ea1',
 'ref14':'f5987ee8-0a3f-40c3-9bb5-39e66ae1c470',
 'ref24':'b3e251be-1d6f-4a3f-bb3e-af55f0208b3e',
 'ref04':'c1ca3a28-d8dc-4bae-be18-44afa0902db1',
}
paths={k:photo_dir/f'codex-clipboard-{v}.png' for k,v in sources.items()}
paths['render']=ROOT/'assets/avatar/identity-rebuild/neutral-000.png'
opts=mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(TOOLS/'face_landmarker.task')),output_facial_transformation_matrixes=True,output_face_blendshapes=True)
out={}
with mp.tasks.vision.FaceLandmarker.create_from_options(opts) as detector:
 for name,path in paths.items():
  im=np.asarray(Image.open(path).convert('RGB'))
  result=detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=im))
  if not result.face_landmarks:
   out[name]={'detected':False};continue
  out[name]={'detected':True,'width':im.shape[1],'height':im.shape[0], 'landmarks':[[p.x,p.y,p.z] for p in result.face_landmarks[0]],'matrix':np.asarray(result.facial_transformation_matrixes[0]).tolist(),'expressions':{p.category_name:p.score for p in result.face_blendshapes[0]}}
  print(name,'detected',len(result.face_landmarks[0]))
destination=ROOT/'qa-output/avatar-identity';destination.mkdir(parents=True,exist_ok=True)
(destination/'landmarks.json').write_text(json.dumps(out))
