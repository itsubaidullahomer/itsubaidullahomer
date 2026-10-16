"""Offline macOS system voice + free Rhubarb cues. No voice cloning or API."""
import json,subprocess,wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/avatar/ubaid-conversation';TMP=Path('/tmp/ubaid-avatar-tools/conversation-audio');TMP.mkdir(exist_ok=True)
segments=[
 ('Listening','neutral',4,None),
 ('Welcome','warm',1.4,'Hello. It is good to meet you. Tell me a little about the thing you want to build, and the people who will use it.'),
 ('Considering the question','thinking',4,None),
 ('Explaining a decision','focused',1.8,'I would start by making the important task feel simple. We can test one useful flow, see where people get stuck, and use that feedback to decide what comes next.'),
 ('A lighter moment','amused',2,'And yes, sometimes the best feature is the button we decide to leave out. A little less can make the whole experience feel better.'),
 ('Listening again','raised_eyebrow',4,None),
 ('Reassurance','warm',2,'That is a fair concern. We do not need to get everything right on the first attempt. Let us understand the difficult part, try a small version, and learn from it.'),
 ('Thinking through a tradeoff','thinking',3,None),
 ('Wrapping up','warm',3,'I would be happy to walk through the options with you. We can keep the details clear, make the tradeoffs visible, and build something that feels right for your users.'),
 ('At rest','neutral',4,None),
]
frames=[];chapters=[];cursor=0;rate=22050
for i,(label,expression,pause,text) in enumerate(segments):
 start=cursor
 if text:
  aiff=TMP/f'{i}.aiff';wav=TMP/f'{i}.wav'
  subprocess.run(['say','-v','Daniel','-r','156','-o',str(aiff),text],check=True)
  subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(aiff),'-ar',str(rate),'-ac','1','-sample_fmt','s16',str(wav)],check=True)
  with wave.open(str(wav)) as f:data=f.readframes(f.getnframes())
  frames.append(data);cursor+=len(data)/(2*rate)
 speechEnd=cursor
 frames.append(bytes(int(pause*rate)*2));cursor+=pause
 chapters.append({'start':round(start,3),'end':round(cursor,3),'speechEnd':round(speechEnd,3),'label':label,'expression':expression,'text':text or ''})
output=ROOT/'public/audio/avatar/conversation.wav'
with wave.open(str(output),'wb') as f:f.setparams((1,2,rate,0,'NONE','not compressed'));f.writeframes(b''.join(frames))
transcript=TMP/'transcript.txt';transcript.write_text('\n'.join(s[3] for s in segments if s[3]))
subprocess.run(['/tmp/ubaid-avatar-tools/Rhubarb-Lip-Sync-1.14.0-macOS/rhubarb','-r','phonetic','-f','json','-o',str(TMP/'raw-cues.json'),str(output)],check=True)
raw=json.loads((TMP/'raw-cues.json').read_text());mapping={'A':'PP','B':'kk','C':'E','D':'aa','E':'oh','F':'ou','G':'FF','H':'TH','X':'sil'}
cues=[{**c,'value':mapping[c['value']]} for c in raw['mouthCues']]
(OUT/'conversation.json').write_text(json.dumps({'duration':round(cursor,3),'voice':'macOS Daniel system voice; not Ubaid’s voice','chapters':chapters,'cues':cues},indent=2)+'\n')
print('CONVERSATION AUDIO',cursor,len(cues))
