export function pcmBase64(input:Float32Array){const bytes=new Uint8Array(input.length*2);const view=new DataView(bytes.buffer);for(let i=0;i<input.length;i++)view.setInt16(i*2,Math.max(-1,Math.min(1,input[i]))*32767,true);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
export function decodePCM(data:string){const binary=atob(data);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const view=new DataView(bytes.buffer);const floats=new Float32Array(Math.floor(bytes.length/2));for(let i=0;i<floats.length;i++)floats[i]=view.getInt16(i*2,true)/32768;return floats;}
export class AudioOutput {
 readonly context:AudioContext; private next=0;private sources=new Set<AudioBufferSourceNode>();
 constructor(){this.context=new AudioContext({sampleRate:24000});}
 async resume(){await this.context.resume();}
 play(data:string){const samples=decodePCM(data);const buffer=this.context.createBuffer(1,samples.length,24000);buffer.copyToChannel(new Float32Array(samples),0);const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);source.onended=()=>this.sources.delete(source);this.sources.add(source);const start=Math.max(this.context.currentTime,this.next);source.start(start);this.next=start+buffer.duration;}
 interrupt(){for(const s of this.sources){try{s.stop();}catch{}}this.sources.clear();this.next=0;}
 close(){this.interrupt();void this.context.close();}
}
