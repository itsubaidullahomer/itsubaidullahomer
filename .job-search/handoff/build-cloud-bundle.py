from pathlib import Path
import json, hashlib, re, shutil, zipfile, datetime, subprocess
root=Path.cwd(); stamp='2026-10-16'; base=root/'.job-search/handoff/cloud-package'
base.mkdir(parents=True,exist_ok=True)
manifest=[]; omitted=[]
secret_name=re.compile(r'(?:^|/)(?:\.env(?:\..*)?|session\.json|[^/]*(?:password|passkey|required-login|cookie)[^/]*)$',re.I)
secret_value=re.compile(r'\b(?:sb_secret_[A-Za-z0-9_-]+|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{25,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,})\b')
private_key=re.compile(r'^(?:access_token|refresh_token|id_token|cookie|cookies|authorization|password|client_secret|service_role_key)$',re.I)
def clean(o):
 if isinstance(o,dict):return {k:('[EXCLUDED_SECRET]' if private_key.match(k) and v else clean(v)) for k,v in o.items()}
 if isinstance(o,list):return [clean(v) for v in o]
 if isinstance(o,str):return secret_value.sub('[EXCLUDED_SECRET]',o)
 return o
def add(src, dest, sanitize_json=False):
 if src.is_symlink() or not src.is_file():return
 if secret_name.search(str(src.relative_to(root)) if src.is_relative_to(root) else src.name):omitted.append(str(src.name));return
 data=src.read_bytes()
 if src.suffix=='.json' and sanitize_json:
  data=(json.dumps(clean(json.loads(data)),indent=2)+'\n').encode()
 elif src.suffix.lower() not in ['.png','.jpg','.jpeg','.webp','.gif','.pdf','.ico','.woff','.woff2','.ttf','.mp4','.webm']:
  try:data=secret_value.sub('[EXCLUDED_SECRET]',data.decode()).encode()
  except UnicodeDecodeError:pass
 target=base/dest;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);target.chmod(0o600)
release=Path('/private/tmp/jobs-release-zh713vj9/site')
for directory in ['app','components','content','data','lib','public','assets','tests','supabase','docs']:
 for src in (release/directory).rglob('*'):
  if any(x in {'.DS_Store','__pycache__','node_modules','.next','.git','.vercel'} for x in src.parts):continue
  add(src,Path('portal-source')/src.relative_to(release))
for name in ['AGENTS.md','README.md','DECISIONS.md','DESIGN.md','package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','eslint.config.mjs','postcss.config.mjs','proxy.ts','.gitignore']:
 if (release/name).is_file():add(release/name,Path('portal-source')/name)
for src in [root/'scripts/jobs-agent-client.mjs']:
 add(src,Path('portal-source/scripts')/src.name)
for name in ['application-facts.json','continuation-2026-10-16.json','latest-operational-counts.json','latest-mailbox-reply-check.json','postgresql-confirmation-recorded.json']:
 src=root/'.job-search/private'/name
 if src.exists():add(src,Path('project-data/.job-search/private')/name,True)
for src in (root/'.job-search/handoff/cloud-export-live').glob('*.json'):
 add(src,Path('live-snapshot')/src.name,True)
for src in (root/'.job-search/applications').rglob('*'):
 if src.suffix in ['.json','.txt','.png','.md'] and 'passkey' not in src.name:add(src,Path('project-data')/src.relative_to(root),src.suffix=='.json')
for src in (root/'.job-search/resumes').rglob('*'):
 if src.suffix in ['.json','.md','.py'] and '__pycache__' not in src.parts:add(src,Path('project-data')/src.relative_to(root),src.suffix=='.json')
for src in (root/'output/pdf').glob('*.pdf'):add(src,Path('project-data/output/pdf')/src.name)
for directory in ['2026-10-16-next-remote-review','2026-10-16-0402-heartbeat']:
 for src in (root/'.job-search/research'/directory).rglob('*'):
  if src.suffix in ['.json','.md']:add(src,Path('project-data')/src.relative_to(root),src.suffix=='.json')
for name in ['CLAUDE-START-HERE.md','platforms-30.md']:
 add(root/'.job-search/handoff'/name,Path('reference')/name)
# The exported renderer uses bundled redistributable fonts instead of Mac-only paths.
fontroot=Path('/Users/ubaidullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/standard_fonts')
for name in ['LiberationSans-Regular.ttf','LiberationSans-Bold.ttf','LiberationSans-Italic.ttf','LICENSE_LIBERATION']:
 if (fontroot/name).is_file():add(fontroot/name,Path('project-data/.job-search/resumes/masters/fonts')/name)
font= root/'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf'
if font.is_file():add(font,Path('project-data/.job-search/resumes/masters/fonts/Geist-Regular.ttf'))
builder=base/'project-data/.job-search/resumes/masters/build_resumes.py'
s=builder.read_text();s=re.sub(r"FONT_DIR = Path\('[^']+'\)","FONT_DIR = HERE / 'fonts'",s)
s=s.replace("ROOT / 'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf'","FONT_DIR / 'Geist-Regular.ttf'")
s=s.replace("pdfmetrics.registerFont(TTFont('ResumeMono', '/System/Library/Fonts/Supplemental/Courier New.ttf'))","pdfmetrics.registerFont(pdfmetrics.Font('ResumeMono', 'Courier', 'WinAnsiEncoding'))")
builder.write_text(s)
counts=json.loads((root/'.job-search/private/latest-operational-counts.json').read_text())
readme=f'''# Claude cloud handoff — read this first

Snapshot prepared {datetime.datetime.now(datetime.timezone.utc).isoformat()}. Private candidate/application information: keep out of a public repository.

## Read-only now

This ZIP replaces inaccessible Mac paths. Extract it in your current container. Read this file, `reference/CLAUDE-START-HERE.md`, `project-data/.job-search/private/application-facts.json`, `project-data/.job-search/private/latest-operational-counts.json`, and `live-snapshot/workspace.json`. Resolve historical `/Users/ubaidullah/...` paths against this bundle's `project-data/` tree, never against your container root. The source repository is `itsubaidullahomer/itsubaidullahomer`, not `ubaidullah`.

Acknowledge readiness and remain READ ONLY until the user says START TAKEOVER. Codex is still working; this snapshot will become stale. Before takeover establish that Codex has stopped submitting and obtain fresh live data or an updated bundle. Coordinate the existing `continue-ubaid-s-job-search` automation with the user so two agents never send the same application.

## Snapshot

- {counts['jobs']} job records, {counts['applied']} confirmed applications, {counts['documents']} private PDFs, {counts['receipts']} receipts.
- Applications: Codenzy, Dynamic Logix, Appkeeper, Allcancode, Quirky Bit and TBox Solutionz, plus Niyyt.
- Quirky Bit's web form failed; its later email fallback was sent. Appkeeper and Quirky Bit general-inbox sends are not hiring-team acknowledgements.
- Niyyt employer form confirmed Application Submitted; exact PDF and receipt included.
- Current employment ends at the end of October; salary reported PKR260,000 with period unspecified; Pakistani citizen; schedule flexible to any time zone. No completed degree.
- Existing approved numeric salary expectation: USD50,000/year negotiable. USD50–60k is a search preference, not a required minimum.
- Portal https://admin.itsubaidullahomer.com/admin is deployed; connected Gmail agent access is separate from unimplemented server-side reply synchronization.

## Contents and authority

`live-snapshot/`: owner-authorized workspace, document metadata and submission receipts exported now. No cookies or tokens included.

`project-data/`: private facts, immutable application versions, answer/receipt files, résumé PDFs, renderer and focused research. Keep this private. Before using any older fact snapshot, prefer the latest direct candidate confirmation. Form screenshots may show personal application details.

`portal-source/`: isolated portal-release source snapshot, dependencies, migrations and assets, separate from the Mac's mixed uncommitted avatar work. This is a reference copy; compare with your existing GitHub checkout before making changes after takeover. No `.env`, Vercel login state, node_modules, build cache, session or database credential is included. Docs may contain historical counts; latest JSON snapshots take precedence. Baseline Mac Git HEAD: ea3d453aa20ea24a487722317525d9276b652266. This bundle is not a claim that those source changes were pushed.

`reference/`: workflow and ranked 30-platform shortlist. No new job-site accounts were created in the preparation batch. Recheck actual account status.

`MANIFEST.json`: SHA-256 inventory and export checks. Confirm ZIP integrity before use.

## Access after takeover

Authenticate Claude's own tools to itsubaidullahomer@gmail.com and the approved Supabase/Vercel resources. A connector in Codex does not authenticate Claude. The provided owner API helper expects a local owner session which is deliberately NOT exported; do not fabricate or borrow another account. If access is unavailable, continue independent research and prepared drafts, keeping live mutations pending. Do not make the portal public, weaken auth, share secrets in chat, or enable paid services.

After explicit START TAKEOVER, approved verified applications may be submitted without routine reapproval. Re-read the detailed workflow for missing facts, assessment requirements, CAPTCHA/human steps and special commitments. Tailor and visually verify every résumé, preserve immutable versions and record actual external confirmation. Deduplicate against current live board, receipts and Sent mail first.

## Portable résumé tooling

The exported master renderer uses bundled fonts and standard Courier instead of Mac-only paths. Install/use reportlab, pypdf and pdfplumber, plus a PDF renderer. Work inside `project-data` when running it. Existing employer-specific build scripts are provenance, not turnkey cloud commands: some retain historical absolute paths and fetch old pages. Prefer the portable master renderer with a fresh reviewed config. Never overwrite an already-submitted PDF. The already-rendered PDFs require no runtime to inspect.

## First response

Report that the bundle is readable, state the snapshot counts, list missing account access, and wait. Do not register accounts, apply, email, deploy, or edit live records until START TAKEOVER.
'''
(base/'READ-ME-FIRST.md').write_text(readme)
(base/'CLOUD-PROMPT.txt').write_text('I uploaded a private handoff ZIP. Extract it in your cloud container and read READ-ME-FIRST.md, then the referenced files. Treat this as context, not permission to begin sending: remain read-only until I say START TAKEOVER. Codex is still working, so obtain a fresh snapshot and coordinate stopping it before takeover. Use the correct itsubaidullahomer/itsubaidullahomer repository and itsubaidullahomer@gmail.com only. Tell me if anything is missing; do not claim connector access transferred.\n')
for p in sorted(base.rglob('*')):
 if p.is_file():
  data=p.read_bytes()
  if p.suffix.lower() in ['.json','.txt','.md','.ts','.tsx','.js','.mjs','.py','.sql'] and secret_value.search(data.decode(errors='ignore')):raise RuntimeError('Secret-like value remains: '+str(p.relative_to(base)))
  manifest.append({'path':str(p.relative_to(base)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(base/'MANIFEST.json').write_text(json.dumps({'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':manifest,'sessionExported':False,'environmentFilesExported':False,'privateCredentialsExported':False,'excludedNames':sorted(set(omitted))},indent=2))
archive=root/'.job-search/handoff/ubaid-job-search-claude-cloud-2026-10-16.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(base.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(base))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for item in manifest:assert hashlib.sha256(z.read(item['path'])).hexdigest()==item['sha256']
archive.chmod(0o600)
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'files':len(manifest),'zipIntegrity':'passed','manifestHashes':'passed','sessionExported':False}))
