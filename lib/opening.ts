/**
 * The script that runs before anything paints (it is inlined at the top of <body> by app/layout.tsx).
 * It is plain JavaScript in a string so it can start working while the rest of the page is still on its
 * way, and so the curtain, its Enter button and the opening sound work even if the page's own script is
 * slow to arrive.
 *
 * - Starts downloading the sound effects at once (window.__sfx holds the downloads; lib/sound.ts decodes
 *   them all). The four the opening needs come first and are decoded here, so the opening never waits.
 * - On the first visit of a session, holds the curtain (html.gate) and drives its counter from what has
 *   really loaded: the type, the portrait and the opening's sounds. At 100 the counter becomes an Enter
 *   button. It never waits more than nine seconds.
 * - Enter is the visitor's first tap or click, the one moment a browser allows sound: it opens the audio
 *   (window.__ac), lifts the curtain (html.entered) and plays the opening in time with it: the press, a
 *   whoosh at the curtain's fastest point, a shimmer as the headline lands, a pop as the badge appears.
 *   "Enter without sound" does the same quietly. If nobody presses anything, the curtain lifts by itself.
 * - A reload in the same visit, a link to a part of the page, or reduced motion skips the curtain.
 * - With no script at all, the curtain plays a short timed version on its own (styles/loader.css).
 *
 * The opening's levels match MIX in lib/sound.ts.
 */
export const OPENING = `(function(){
var d=document.documentElement,w=window,first=["pop","whoosh","intro","tick"],rest=["tap","hover","land","chime","success"],got=0;
if(location.hash)d.classList.add("cv-all","jump");
w.__sfx={};w.__buf={};
function get(n,low){w.__sfx[n]=fetch("/sounds/v1/"+n+".mp3",low?{priority:"low"}:{}).then(function(r){return r.ok?r.arrayBuffer():null}).catch(function(){return null})}
first.forEach(function(n){get(n)});rest.forEach(function(n){get(n,1)});
var O=w.OfflineAudioContext,dec=O?new O(1,1,44100):null;
first.forEach(function(n){w.__sfx[n].then(function(b){if(!b||!dec)return null;return dec.decodeAudioData(b.slice(0))}).then(function(a){if(a)w.__buf[n]=a}).catch(function(){}).then(function(){got++})});
var skip=!!location.hash||matchMedia("(prefers-reduced-motion: reduce)").matches;
try{if(sessionStorage.getItem("seen"))skip=true}catch(e){}
if(skip){d.classList.add("seen");return}
d.classList.add("gate");
var done={fonts:0,photo:0},shown=0,ready=false,t0=performance.now(),idle;
if(document.fonts)document.fonts.ready.then(function(){done.fonts=1});else done.fonts=1;
function photo(){var i=document.querySelector(".hero__photo img");if(!i||i.complete){done.photo=1;return}i.addEventListener("load",function(){done.photo=1});i.addEventListener("error",function(){done.photo=1})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",photo);else photo();
function target(){var t=done.fonts*.25+done.photo*.35+got/first.length*.4;return performance.now()-t0>9000?1:t}
function play(c,n,at,rate,gain){var b=w.__buf[n];if(!b)return;var s=c.createBufferSource(),g=c.createGain(),x=b.getChannelData(0),p=0,i=0;for(;i<x.length;i++)if(x[i]>p||-x[i]>p)p=x[i]<0?-x[i]:x[i];for(i=0;i<x.length&&(x[i]<p*.02&&-x[i]<p*.02);i++);s.buffer=b;s.playbackRate.value=rate;g.gain.value=gain*.9;s.connect(g).connect(c.destination);s.start(c.currentTime+at,Math.max(0,i/b.sampleRate-.002))}
function enter(sound,auto){
if(d.classList.contains("entered"))return;
clearTimeout(idle);
try{if(!auto)localStorage.setItem("sound",sound?"on":"off");sessionStorage.setItem("seen","1")}catch(e){}
if(sound){try{var A=w.AudioContext||w.webkitAudioContext;if(A&&!w.__ac){try{if(navigator.audioSession)navigator.audioSession.type="ambient"}catch(e){}w.__ac=new A({latencyHint:"interactive"})}var c=w.__ac;if(c){c.resume();play(c,"pop",0,.95,.26);play(c,"whoosh",.22,1,.24);play(c,"intro",.45,1,.3);play(c,"pop",1.48,1.4,.12)}}catch(e){}}
w.__entered={at:performance.now(),sound:!!sound};
d.classList.add("entered");
w.dispatchEvent(new CustomEvent("enter",{detail:w.__entered}));
}
function wait(){clearTimeout(idle);idle=setTimeout(function(){if(document.hidden)wait();else enter(false,true)},9000)}
function frame(){
var L=document.querySelector(".loader");
if(L){var t=target();shown+=(t-shown)*.14;if(t-shown<.004)shown=t;
L.style.setProperty("--load",shown.toFixed(3));
var c=L.querySelector(".loader__count");if(c)c.textContent=Math.round(shown*100);
if(shown>=1&&!ready){ready=true;L.setAttribute("data-ready","");var g=L.querySelector(".loader__go");if(g)g.focus({preventScroll:true});wait()}}
if(!d.classList.contains("entered"))requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener("click",function(e){var t=e.target;if(!t||!t.closest||!t.closest(".loader"))return;e.preventDefault();enter(!t.closest(".loader__quiet"))},true);
document.addEventListener("keydown",function(e){if(d.classList.contains("entered"))return;if(e.key==="Enter"||e.key===" "){if(e.target&&e.target.closest&&e.target.closest(".loader__quiet"))return;e.preventDefault();enter(true)}else if(e.key==="Escape")enter(false)});
})();`;
