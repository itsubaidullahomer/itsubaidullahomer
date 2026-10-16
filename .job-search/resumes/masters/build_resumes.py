#!/usr/bin/env python3
"""Render factual resume masters; tailoring only selects/reorders existing fact IDs."""
import argparse
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
W, H = A4
INK, SECONDARY, MUTED, LINE = map(HexColor, ['#171717', '#525252', '#737373', '#d8d8d8'])
FONT_DIR = Path('/Users/ubaidullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/standard_fonts')
for name, file in [('ResumeSans','LiberationSans-Regular.ttf'),('ResumeBold','LiberationSans-Bold.ttf'),('ResumeItalic','LiberationSans-Italic.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / file)))
pdfmetrics.registerFontFamily('ResumeSans', normal='ResumeSans', bold='ResumeBold', italic='ResumeItalic', boldItalic='ResumeBold')
pdfmetrics.registerFont(TTFont('Geist', str(ROOT / 'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf')))
pdfmetrics.registerFontFamily('Geist', normal='Geist', bold='ResumeBold', italic='ResumeItalic', boldItalic='ResumeBold')
pdfmetrics.registerFont(TTFont('ResumeMono', '/System/Library/Fonts/Supplemental/Courier New.ttf'))


def p(c, text, x, top, width, size=10, leading=13, font='ResumeSans', color=INK):
    style = ParagraphStyle('body', fontName=font, fontSize=size, leading=leading, textColor=color, splitLongWords=False)
    paragraph = Paragraph(text, style)
    _, height = paragraph.wrap(width, H)
    if top - height < 34:
        raise ValueError(f'Content exceeds safe page area: {text[:90]} (bottom={top-height:.1f})')
    paragraph.drawOn(c, x, top-height)
    return top-height


def rule(c, y, x=40, width=W-80):
    c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(x,y,x+width,y)


def heading(c, label, y, outreach=False):
    if outreach:
        y = p(c, escape(label.upper()), 40, y, W-80, 8, 11, 'ResumeMono')
    else:
        y = p(c, escape(label.upper()), 40, y, W-80, 10.2, 13, 'ResumeBold')
    rule(c, y-4)
    return y-13


def link(text, url):
    return f'<link href="{escape(url)}" color="#171717">{escape(text)}</link>'


def contact(facts):
    i = facts['identity']
    first = f'{escape(i["location"])} | {link(i["email"], "mailto:"+i["email"])} | {escape(i["phone"])}'
    second = f'{link("itsubaidullahomer.com", i["website"])} | {link("github.com/itsubaidullahomer", i["github"])} | {link("linkedin.com/in/itsubaidullahomer", i["linkedin"])}'
    return first, second


def footer(c, focus, variant):
    c.setFillColor(MUTED); c.setFont('ResumeMono',7)
    c.drawString(40,23,'UBAIDULLAH OMER')
    c.drawRightString(W-40,23,'01 / 01')


def select(facts, config):
    allowed = {'focus','slug','projects','experienceBullets'}
    if set(config)-allowed: raise ValueError('Unknown tailoring keys; only select existing facts.')
    focus = config.get('focus','ai_product')
    if focus not in facts['titles']: raise ValueError('Unknown focus')
    slug = config.get('slug','master')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,50}', slug): raise ValueError('Unsafe output slug')
    projects_by_id={item['id']:item for item in facts['projects']}
    project_ids=config.get('projects',list(projects_by_id))
    if not isinstance(project_ids,list) or not 1<=len(project_ids)<=3 or len(set(project_ids))!=len(project_ids): raise ValueError('Select 1-3 unique project IDs')
    projects=[projects_by_id[item] for item in project_ids]
    choices=config.get('experienceBullets',{})
    if set(choices)-{e['id'] for e in facts['experience']}: raise ValueError('Unknown employer ID')
    experience=[]
    for item in facts['experience']:
        by_id={b['id']:b for b in item['bullets']}
        default=list(by_id)[:5]
        ids=choices.get(item['id'],default)
        if not isinstance(ids,list) or not 1<=len(ids)<=5 or len(ids)!=len(set(ids)): raise ValueError('Select 1-5 unique bullet IDs per employer')
        experience.append({**item,'bullets':[by_id[id] for id in ids]})
    return focus,slug,experience,projects


def markdown(facts, focus, experience, projects):
    i=facts['identity']
    lines=[f'# {i["name"]}',facts['titles'][focus],'',f'{i["location"]} | {i["email"]} | {i["phone"]}',i['website']+' | '+i['github']+' | '+i['linkedin'],'','## Profile',facts['summaries'][focus],'','## Experience']
    for e in experience:
        lines.extend([f'### {e["role"]} - {e["company"]}',f'{e["dates"]} | {e["location"]}'])
        lines.extend('- '+b['text'] for b in e['bullets']);lines.append('')
    lines.append('## Selected projects')
    for project in projects:
        lines.extend([f'### {project["name"]} - {project["descriptor"]}',project['url'],project['text'],project['stack'],''])
    lines.append('## Technical skills')
    lines.extend(f'- {s["label"]}: {s["text"]}' for s in facts['skills'])
    return '\n'.join(lines)+'\n'


def render_ats(path, facts, focus, experience, projects):
    c=canvas.Canvas(str(path),pagesize=A4,pageCompression=1)
    c.setTitle(f'{facts["identity"]["name"]} - {facts["titles"][focus]}')
    c.setAuthor(facts['identity']['name']);c.setSubject('ATS resume - candidate-supplied career facts')
    y=H-36
    y=p(c,escape(facts['identity']['name']),40,y,W-80,23,27,'ResumeBold')
    y=p(c,escape(facts['titles'][focus]),40,y-3,W-80,11.3,14,'ResumeBold')
    for line in contact(facts): y=p(c,line,40,y-4,W-80,9.1,11.5)
    y=heading(c,'Profile',y-15)
    y=p(c,escape(facts['summaries'][focus]),40,y,W-80,10.4,13.8)
    y=heading(c,'Experience',y-14)
    for e in experience:
        y=p(c,f'<b>{escape(e["role"])}</b> | {escape(e["company"])}',40,y,W-80,10.5,13)
        y=p(c,escape(e['dates']+' | '+e['location']),40,y-2,W-80,9,11.5,color=SECONDARY)
        for bullet in e['bullets']:
            y=p(c,'- '+escape(bullet['text']),45,y-4,W-85,10.3,13.4)
        y-=10
    y=heading(c,'Selected projects',y)
    for project in projects:
        title=f'<b>{escape(project["name"])}</b> | {escape(project["descriptor"])} | {link(project["url"].replace("https://", "").rstrip("/"),project["url"])}'
        y=p(c,title,40,y,W-80,10,12.5)
        y=p(c,escape(project['text']),40,y-2,W-80,10.3,13.4)
        y-=8
    y=heading(c,'Technical skills',y+1)
    for skill in facts['skills']:
        y=p(c,f'<b>{escape(skill["label"])}:</b> {escape(skill["text"])}',40,y,W-80,10,13)
        y-=2
    footer(c,focus,'ats');c.showPage();c.save()
    return y


def render_outreach(path, facts, focus, experience, projects):
    c=canvas.Canvas(str(path),pagesize=A4,pageCompression=1)
    c.setTitle(f'{facts["identity"]["name"]} - Product Engineering')
    c.setAuthor(facts['identity']['name']);c.setSubject('Product engineering resume - candidate-supplied career facts')
    y=H-35
    y=p(c,'PRODUCT ENGINEERING / SELECTED WORK',40,y,W-80,7.8,11,'ResumeMono')
    y=p(c,escape(facts['identity']['name']),38,y-7,W-76,31,35,'Geist')
    y=p(c,escape(facts['titles'][focus]),40,y-3,W-80,11,15,'Geist')
    for line in contact(facts): y=p(c,line,40,y-5,W-80,8.5,11,'Geist',SECONDARY)
    y-=12;rule(c,y)
    # Three restrained proof points; all reflect candidate-reported portfolio facts.
    y-=12; cell=(W-80)/3
    for idx,proof in enumerate(facts['proofPoints']):
        metric,label=proof['metric'],proof['label']
        x=40+idx*cell
        if idx:
            c.setStrokeColor(LINE);c.setLineWidth(.5);c.line(x-12,y+1,x-12,y-38)
        p(c,metric,x,y,cell-15,23,26,'Geist')
        p(c,escape(label),x,y-29,cell-15,7.4,9.5,'Geist',SECONDARY)
    y-=52
    # Concise profile without repeating the proof strip.
    intro=facts['outreachSummaries'][focus]
    y=p(c,escape(intro),40,y,W-80,10,13.5,'Geist')
    y=heading(c,'Experience',y-15,True)
    for e in experience:
        # Dates stay in source reading order instead of a floating sidebar.
        y=p(c,f'<b>{escape(e["company"])}</b> <font color="#525252"> / {escape(e["role"])}</font>',40,y,W-80,11,14,'Geist')
        y=p(c,escape(e['dates']+' | '+e['location']),40,y-3,W-80,8.4,11,'Geist',SECONDARY)
        for bullet in e['bullets']:
            # Scope already leads the proof strip; preserve the underlying fact in editable sources.
            if bullet['id']=='tututor_scope': continue
            y=p(c,'- '+escape(bullet['text']),44,y-4,W-84,9.25,12,'Geist')
        y-=11
    y=heading(c,'Selected shipped products',y+1,True)
    for idx,project in enumerate(projects):
        x=40
        y=p(c,f'<b>{escape(project["name"])}</b> / {escape(project["descriptor"])}',x,y,W-80,10.2,13,'Geist')
        y=p(c,escape(project['text']),x,y-2,W-80,9.15,12,'Geist')
        y=p(c,link(project['url'].replace('https://','').rstrip('/'),project['url']),x,y-2,W-80,7.9,10.5,'ResumeMono',SECONDARY)
        y-=9
    y=heading(c,'Core stack',y,True)
    core=facts['coreStack']
    y=p(c,escape(core),40,y,W-80,9.1,12,'Geist')
    footer(c,focus,'outreach');c.showPage();c.save()
    return y


def verify(path,facts):
    reader=PdfReader(path)
    if len(reader.pages)!=1: raise AssertionError('Expected one page')
    text='\n'.join(page.extract_text() or '' for page in reader.pages)
    normalized=' '.join(text.split())
    for value in [facts['identity']['name'],facts['identity']['email'],facts['identity']['phone'],'Nov 2023 - Present','Jan 2022 - Jan 2024','MongoDB','Available immediately']:
        if value not in normalized: raise AssertionError('Missing searchable text: '+value)
    for value in ['Bachelor','BSCS','90-95%','$250K','ZeroGPT']:
        if value in text: raise AssertionError('Unapproved claim: '+value)
    if len(reader.pages[0].get('/Annots',[]))<6: raise AssertionError('Missing contact/project links')
    path.with_suffix('.txt').write_text(text)
    return len(text.split())


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config',type=Path)
    parser.add_argument('--output-dir',type=Path,default=ROOT/'output/pdf')
    args=parser.parse_args()
    facts=json.loads((HERE/'facts.json').read_text())
    config=json.loads(args.config.read_text()) if args.config else {}
    focus,slug,experience,projects=select(facts,config)
    args.output_dir.mkdir(parents=True,exist_ok=True)
    source=markdown(facts,focus,experience,projects)
    (HERE/f'ubaidullah-omer-{slug}.md').write_text(source)
    for kind,renderer in [('ats',render_ats),('outreach',render_outreach)]:
        path=args.output_dir/f'ubaidullah-omer-{slug}-{kind}.pdf'
        bottom=renderer(path,facts,focus,experience,projects)
        words=verify(path,facts)
        print(f'{path}: 1 page; {words} searchable words; content bottom {bottom:.1f} pt')

if __name__=='__main__': main()
