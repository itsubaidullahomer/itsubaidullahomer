'use client';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, type ReactNode, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
 const reduce = useReducedMotion();
 return <motion.div className={className} initial={{ opacity: 1 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .1 }} transition={{ type: 'spring', stiffness: 240, damping: 30 }} style={{ transform: reduce ? 'none' : undefined }}>{children}</motion.div>;
}
export function HeroWords() {
 const reduce = useReducedMotion();
 return <h1 className="hero-title" aria-label="I build AI products people actually use.">{['I build AI', 'products people', 'actually use.'].map((line,i)=><span className="hero-line" key={line}>{line.split(' ').map((word,j)=><motion.span aria-hidden="true" key={word} initial={{ opacity: 1 }} animate={{ opacity: [0,1], y: reduce ? 0 : [8,0], filter: reduce ? 'none' : ['blur(8px)','blur(0px)'] }} transition={{ duration: .45, delay: (i*3+j)*.055 }} className={i===2?'soft-word':''}>{word} </motion.span>)}</span>)}</h1>;
}
export function Spotlight({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
 function move(e: MouseEvent<HTMLDivElement>) { const r=e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--spot-x',`${e.clientX-r.left}px`);e.currentTarget.style.setProperty('--spot-y',`${e.clientY-r.top}px`); }
 return <div id={id} className={cn('spotlight',className)} onMouseMove={move}>{children}</div>;
}
export function Parallax({ children, className }: { children: ReactNode; className?: string }) {
 const ref=useRef<HTMLDivElement>(null); const reduce=useReducedMotion(); const {scrollYProgress}=useScroll({target:ref,offset:['start end','end start']}); const y=useTransform(scrollYProgress,[0,1],[12,-12]);
 return <div ref={ref} className={cn('parallax-wrap',className)}><motion.div style={{ y: reduce?0:y }} className="parallax-content">{children}</motion.div></div>;
}
