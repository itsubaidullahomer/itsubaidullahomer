# One-off migration from the owner's public portfolio, captured 2026-10-10.
import json,re,pathlib,html
D=json.load(open('/tmp/portfolio-source.json'))
slugs=['tututor','insight-x','ai-humanizer','ali-foodies','jurri','yaksport','crown-kabab','animated-landing','toolkitjar']
names=['Tututor.ai','Illume','Viloi','Ali Foodies','Jurri','Yaksport','Crown Kabab','Animated Landing','ToolkitJar']
images=['/images/tututor/showcase/tututor-catalog.jpg','/images/screens/illume.jpg','/images/screens/viloi.jpg','/images/ali-foodies/compare/after-home.jpg','/images/screens/jurri.jpg','/images/screens/yaksport.jpg','/images/screens/crownkabab.png','/images/screens/enomad.png','/images/screens/toolkitjar.png']
projects=[]
def clean(t):return html.unescape(re.sub('<[^>]+>','',t)).strip()
for i,slug in enumerate(slugs):
 d=D['https://itsubaidullahomer.com/work/'+slug];txt=d['text'].split('Next.js · React 19 · Vercel')[-1].strip();lines=txt.split('\n');oldname='Insight-X · now Illume' if i==1 else names[i];idx=lines.index(oldname)
 desc=lines[idx+1];links=[x['href'] for x in d['links'] if x.get('href','').startswith('https') and not any(s in x['href'] for s in ['github.com','linkedin.com','facebook.com','instagram.com'])]
 stack=lines[lines.index('Stack')+1:] if 'Stack' in lines else []
 for label in ['Previous','Next']:
  if label in stack:stack=stack[:stack.index(label)]
 projects.append(dict(slug=slug,name=names[i],description=desc,status=lines[1],dates=lines[2],role=lines[3],image=images[i],url=links[0] if links else '',stack=stack))
 if slug not in ['tututor','ali-foodies']:
  problem=txt.split('The problem\n')[1].split('\nThe approach')[0];built=txt.split('The approach\n')[1].split('\nThe outcome')[0];out=txt.split('The outcome\n')[1].split('\nWhat I owned')[0].split('\nPrevious')[0];owned=txt.split('What I owned\n')[1].split('\nStack')[0] if 'What I owned' in txt else ''
  owned=re.sub(r'(?m)^\d\d\n','- ',owned)
  md=f'## The problem\n\n{problem}\n\n## What I built\n\n{built}\n\n## The hard parts\n\n{owned or built}\n\n## Results\n\n{out}\n'
 elif slug=='ali-foodies':
  md='## The problem\n\nAround 99.9% of Ali Foodies’ visitors are on a phone. The existing website needed to work for that screen first.\n\n## What I built\n\nA mobile-first redesign and rebuild. The comparison shows the actual previous site alongside the new preview.\n\n## The hard parts\n\nKeep the menu and ordering path readable and easy to use on a small screen, then adapt the design for larger screens.\n\n## Results\n\nThe new version is live as a preview at [alifoodiess.vercel.app](https://alifoodiess.vercel.app) while I finish it. This is ongoing work, not a completed launch.\n'
 else:
  md='## The problem\n\nI was hired to fix one bug in someone else’s Next.js app. Fixing the next ten the same way would not make it a dependable product. We agreed to rebuild.\n\n## What I built\n\nEight products on one Express and MongoDB backend: Tututor.AI, EduNova for teachers, school admin, platform admin, and the Familias, Alumnos and Profesores mobile apps, plus the core API.\n\nThe teacher toolkit has 40+ AI tools for lesson preparation, a full document editor, mind maps, games and Google Classroom export.\n\n## The hard parts\n\nI moved AI calls and permanent keys out of the browser, replaced Firebase with our own backend, and added school scoping, realtime messaging, push, storage and billing. The finance module handles SEPA direct-debit batches; Educamos imports and Plumier XXI exports connect the regional school systems. The export matched 1,833 of 1,833 golden-test cases.\n\n## Results\n\n20k+ students, teachers and families use the platform. About 1,000 API endpoints across 90 data models serve eight products. Three mobile apps are listed on both stores. There are approximately 6,000 commits across nine repos, more than 3,600 of them mine.\n\n## The full story\n\n'
  # Retain the detailed first-person narrative and factual product data as editorial paragraphs.
  start=txt.index('The product family\n');end=txt.index('\nStack\n');full=txt[start:end]
  for line in full.split('\n'):
   if len(line)>75:md+=line+'\n\n'
 md=md.replace('{','&#123;').replace('}','&#125;')
 pathlib.Path('content/work/'+slug+'.mdx').write_text(md)
pathlib.Path('content/projects.ts').write_text('export type Project = { slug: string; name: string; description: string; status: string; dates: string; role: string; image: string; url: string; stack: string[] };\nexport const projects: Project[] = '+json.dumps(projects,indent=2)+';\n')
posts=[]
for slug,date,minutes in [('i-taught-my-client-to-code','2026-09-28',5),('shipping-ai-features-to-real-users','2026-04-22',6)]:
 d=D['https://itsubaidullahomer.com/writing/'+slug];t=d['text'].split('All writing\n')[1];lines=t.split('\n');idx=lines.index('min');title=lines[idx+1];description=lines[idx+2]
 paras=re.findall(r'<p[^>]*>(.*?)</p>',d['html'],re.S);paras=[clean(p) for p in paras];paras=[p for p in paras if len(p)>60 and not p.startswith('I take on a few')]
 # Live article body is paragraphs; exclude its duplicated summary.
 paras=[p for p in paras if p!=description]
 pathlib.Path('content/writing/'+slug+'.mdx').write_text('\n\n'.join(paras)+'\n')
 posts.append(dict(slug=slug,date=date,minutes=minutes,title=title,description=description))
pathlib.Path('content/posts.ts').write_text('export const posts = '+json.dumps(posts,indent=2)+';\n')
