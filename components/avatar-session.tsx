'use client';
import {useContact} from './providers';
import {Button} from './ui/button';
export default function AvatarSession({onEnd}:{mode:'polite'|'unfiltered';textOnly:boolean;onEnd:()=>void}){const{book}=useContact();return <><p className="avatar-caption" role="status">The AI me is getting ready. The real me is one conversation away.</p><div className="button-row"><Button onClick={book}>Book a call</Button><button className="button button-secondary" onClick={onEnd}>Back</button></div></>;}
