import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { BookButton, CopyEmail } from './providers';
import { Wordmark } from './shell';
import { site } from '@/content/site';
import { projects } from '@/content/projects';
import type { ReactNode } from 'react';
export function Section({children,className='',id}:{children:ReactNode;className?:string;id?:string}){return <section id={id} className={`section ${className}`}>{children}</section>;}
export function SectionHeading({title,description,children}:{title:string;description?:string;children?:ReactNode}){return <div className="section-heading"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{children}</div>;}
export function Status({status}:{status:string}){return <span className="status"><i className={status==='Building'?'building':''}/>{status}</span>;}
export function PageIntro({label,title,description,children}:{label:string;title:string;description:string;children?:ReactNode}){return <Section className="page-intro"><span className="eyebrow">{label}</span><h1>{title}</h1><p>{description}</p>{children}</Section>;}
export function FinalCTA(){return <Section className="final-cta grid-texture"><Image className="avatar-small" src="/images/avatar.png" alt="Ubaidullah Omer" width={64} height={64}/><h2>Good products start<br/>with a conversation.</h2><p>Tell me what you’re building.<br className="mobile-only"/> I’ll tell you how I can help.</p><div className="button-row"><BookButton>Book a call <ArrowUpRight size={16}/></BookButton><CopyEmail/></div><span className="mono cta-note">Based in Pakistan. Working everywhere.</span></Section>;}
export function Footer(){return <footer className="footer"><div className="footer-top"><div className="footer-brand"><Wordmark/><p>Thoughtful engineering.<br/>Products that earn their place.</p></div><div><h3>Work</h3>{projects.slice(0,4).map(p=><Link key={p.slug} href={`/work/${p.slug}`}>{p.name}</Link>)}</div><div><h3>Pages</h3>{['About','Playground','Now','Writing','Contact'].map(p=><Link key={p} href={`/${p.toLowerCase()}`}>{p}</Link>)}</div><div><h3>Elsewhere</h3>{Object.entries(site.social).map(([name,url])=><a key={name} href={url} target="_blank" rel="noreferrer">{name} <ArrowUpRight size={12}/></a>)}<a href={`mailto:${site.email}`}>Email <ArrowUpRight size={12}/></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Ubaidullah Omer</span><span>Built in Rahim Yar Khan, Pakistan</span><Link href="/contact">Let’s talk <ArrowRight size={12}/></Link></div></footer>;}
