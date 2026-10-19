/* Hero drawing: a human profile, facing right, made of light points.
   Near the face and the frontal brain the points are dense and joined by fine branching dendrite-like strands (a mind).
   Moving back and away, the points thin out and their links straighten into a graph and then circuit traces (a model).
   On load the points drift in from the left and settle into the figure; afterwards a few points quietly glow.
   One static canvas plus one light overlay; no canvas filters. */
(()=>{
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=document.getElementById('hero-cv'),fx=document.getElementById('hero-fx');if(!cv)return;
const ctx=cv.getContext('2d'),fc=fx&&fx.getContext('2d'),TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,sm=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
function rng(seed){let s=(seed*2654435761)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* lateral head silhouette in a unit box (height 1, facing right) */
const HEAD=[[.30,0],[.45,.02],[.56,.08],[.63,.16],[.665,.25],[.675,.32],[.664,.36],[.68,.40],[.737,.487],[.70,.512],[.686,.535],[.697,.565],[.676,.586],[.692,.607],[.666,.636],[.676,.69],[.642,.737],[.60,.775],[.588,.86],[.585,1],[.33,1],[.30,.80],[.13,.63],[.05,.43],[.08,.22],[.17,.07]];
function inside(x,y,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}

let W=0,H=0,DPR=1,pts=[],edges=[],R=rng(7),INK='43,50,64',AC='226,112,84';
let haloInk,haloAc,stat;

function sprite(rgb,a){const c=document.createElement('canvas'),s=64;c.width=c.height=s;const g=c.getContext('2d'),gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  gr.addColorStop(0,`rgba(${rgb},${a})`);gr.addColorStop(.35,`rgba(${rgb},${a*.35})`);gr.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=gr;g.fillRect(0,0,s,s);return c}

function build(){R=rng(7);pts=[];edges=[];
  const hh=Math.min(H*.86,W*.95),hw=hh*.75,ox=Math.min(W-hw*1.02,W*.5+hw*.08),oy=H*.07+(H*.86-hh)*.5;
  const toX=u=>ox+u*hh,toY=v=>oy+v*hh,U=hh/780;
  // points inside the head: dense toward the face and the frontal brain
  const cell=7*U,grid=new Map(),key=(x,y)=>Math.floor(x/cell)+','+Math.floor(y/cell);
  const far=(x,y,d)=>{const gx=Math.floor(x/cell),gy=Math.floor(y/cell);for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const b=grid.get((gx+i)+','+(gy+j));if(b)for(const q of b)if(Math.hypot(q.x-x,q.y-y)<d)return false}return true};
  const put=p=>{pts.push(p);const k=key(p.x,p.y);(grid.get(k)||grid.set(k,[]).get(k)).push(p)};
  const tries=Math.round(26000*clamp(hh/780,.5,1.3));
  for(let i=0;i<tries;i++){const u=R()*.75,v=R();if(!inside(u,v,HEAD))continue;
    const s=sm((u-.18)/.5)*(1-.6*sm((v-.78)/.2)),dens=.06+.94*s;if(R()>dens)continue;
    const x=toX(u),y=toY(v),gap=lerp(16,6.5,s)*U;if(!far(x,y,gap))continue;put({x,y,s,u,v})}
  // a sparse cloud trailing off behind the head, to the left
  for(let i=0;i<tries*.36;i++){const u=-1.1+R()*1.3,v=-.05+R()*1.1,back=sm((u+1.1)/1.2);
    const cy=.45,ry=.42+.25*(1-back),inBlob=Math.abs(v-cy)<ry;if(!inBlob||R()>.015+.14*back*back)continue;if(inside(u,v,HEAD))continue;
    const x=toX(u),y=toY(v);if(x<-20)continue;if(!far(x,y,(30+70*(1-back))*U))continue;put({x,y,s:0,u,v})}
  // links: short organic strands in the mind, straight edges and circuit traces in the graph
  const seen=new Set();
  pts.forEach((a,i)=>{a.i=i});
  for(const a of pts){const syn=a.s>.5,k=syn?3:2,rad=(syn?36:lerp(70,110,1-sm((a.u+1.1)/1.2)))*U,gx=Math.floor(a.x/cell),gy=Math.floor(a.y/cell),span=Math.ceil(rad/cell),cand=[];
    for(let i=-span;i<=span;i++)for(let j=-span;j<=span;j++){const b=grid.get((gx+i)+','+(gy+j));if(b)for(const q of b)if(q!==a){const d=Math.hypot(q.x-a.x,q.y-a.y);if(d<rad)cand.push([d,q])}}
    cand.sort((p,q)=>p[0]-q[0]);
    if(!syn&&R()>.25+.75*sm((a.u+.9)/1.0))continue;
    for(const [d,b] of cand.slice(0,k)){const id=a.i<b.i?a.i+'-'+b.i:b.i+'-'+a.i;if(seen.has(id))continue;seen.add(id);edges.push({a,b,s:(a.s+b.s)/2,d,seed:R()})}}
  pts.forEach(p=>{p.show=p.s<.5||R()<.4;p.f=p.s>0?1:.3+.7*sm((p.u+1.1)/1.2);p.lit=R()<.03;p.r=lerp(1.1,1.3,p.s)*Math.max(.8,U)*(R()<.12?1.6:1);
    // where each point starts its flight: off to the left, at roughly the same height
    p.x0=-40-R()*W*.45;p.y0=p.y+(R()-.5)*H*.35;p.delay=(1-sm((p.u+1.1)/1.85))*.9+R()*.9;p.dur=1.5+R()*1.1})}

/* ---------- static drawing ---------- */
function strand(c,a,b,seed,s){const r=rng(Math.floor(seed*1e6)+1),dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,bend=(r()-.5)*l*.7,P=[];
  for(let i=0;i<=8;i++){const t=i/8,w=Math.sin(Math.PI*t)*bend+(r()-.5)*l*.05*Math.sin(Math.PI*t);P.push([a.x+dx*t+nx*w,a.y+dy*t+ny*w])}
  c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();
  // a short side branch now and then, like a dendrite
  if(r()<.35){const m=P[3+Math.floor(r()*3)],a2=Math.atan2(dy,dx)+(r()<.5?1:-1)*(.7+r()*.6),L=l*(.25+r()*.35);c.beginPath();c.moveTo(m[0],m[1]);c.quadraticCurveTo(m[0]+Math.cos(a2)*L*.6+(r()-.5)*4,m[1]+Math.sin(a2)*L*.6+(r()-.5)*4,m[0]+Math.cos(a2)*L,m[1]+Math.sin(a2)*L);c.stroke()}}
function trace(c,a,b){const dx=b.x-a.x,dy=b.y-a.y;let mid;
  if(Math.abs(dx)>=Math.abs(dy))mid=[b.x-Math.sign(dx)*Math.abs(dy),a.y];else mid=[a.x,b.y-Math.sign(dy)*Math.abs(dx)];
  c.beginPath();c.moveTo(a.x,a.y);c.lineTo(mid[0],mid[1]);c.lineTo(b.x,b.y);c.stroke()}
function drawStatic(){const c=stat.getContext('2d');c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);c.lineCap='round';c.lineJoin='round';
  for(const e of edges){const s=e.s;
    const f=Math.min(e.a.f,e.b.f);if(s>.5){c.strokeStyle=`rgba(${INK},${(.2+.22*s).toFixed(3)})`;c.lineWidth=.55+.45*s;strand(c,e.a,e.b,e.seed,s)}
    else if(s>.15){c.strokeStyle=`rgba(${INK},${(.26*f).toFixed(3)})`;c.lineWidth=.8;c.beginPath();c.moveTo(e.a.x,e.a.y);c.lineTo(e.b.x,e.b.y);c.stroke()}
    else if(e.a.u>-.55||e.b.u>-.55){c.strokeStyle=`rgba(${INK},${(.3*f).toFixed(3)})`;c.lineWidth=.9;trace(c,e.a,e.b)}
    else{c.strokeStyle=`rgba(${INK},${(.22*f).toFixed(3)})`;c.lineWidth=.8;c.beginPath();c.moveTo(e.a.x,e.a.y);c.lineTo(e.b.x,e.b.y);c.stroke()}}
  for(const p of pts){const h=p.r*(p.s>.5?7:5);c.globalAlpha=lerp(.45,.75,p.s)*p.f;c.drawImage(p.lit?haloAc:haloInk,p.x-h,p.y-h,h*2,h*2);c.globalAlpha=1}
  for(const p of pts){
    if(!p.show&&!p.lit)continue;
    if(p.s>.3){c.fillStyle=`rgba(${p.lit?AC:INK},${lerp(.5,.7,p.s).toFixed(2)})`;c.beginPath();c.arc(p.x,p.y,p.r,0,TAU);c.fill()}
    else{c.fillStyle='rgba(250,248,244,.95)';c.beginPath();c.arc(p.x,p.y,p.r+1.3,0,TAU);c.fill();c.lineWidth=1;c.strokeStyle=`rgba(${p.lit?AC:INK},${(.7*p.f).toFixed(2)})`;c.stroke()}}}

/* ---------- entrance: points drift in from the left and settle ---------- */
let t0=0,raf=0,phase='idle',tw=[],twT=0,visible=true;
const ease=t=>1-Math.pow(1-t,3);
function frameIntro(){raf=0;const now=(performance.now()-t0)/1000;let done=true;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.setTransform(DPR,0,0,DPR,0,0);
  for(const p of pts){const t=clamp((now-p.delay)/p.dur,0,1);if(t<1)done=false;if(t<=0)continue;const e=ease(t),x=lerp(p.x0,p.x,e),y=lerp(p.y0,p.y,e)+Math.sin(t*Math.PI)*12*(p.u<0?-1:1),h=p.r*5;
    ctx.globalAlpha=.25+.75*t;ctx.drawImage(p.lit?haloAc:haloInk,x-h,y-h,h*2,h*2);ctx.fillStyle=`rgba(${p.lit?AC:INK},.8)`;ctx.beginPath();ctx.arc(x,y,p.r,0,TAU);ctx.fill()}
  ctx.globalAlpha=1;
  if(!done){raf=requestAnimationFrame(frameIntro);return}
  // the strands and edges fade in once every point has arrived
  phase='reveal';t0=performance.now();raf=requestAnimationFrame(frameReveal)}
function frameReveal(){raf=0;const a=clamp((performance.now()-t0)/900,0,1);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.globalAlpha=a;ctx.drawImage(stat,0,0);ctx.globalAlpha=1;
  if(a<1)raf=requestAnimationFrame(frameReveal);else{phase='idle';startTwinkle()}}
function showStatic(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(stat,0,0)}

/* ---------- idle: a handful of points glow softly in turn (about 20 redraws a second, overlay only) ---------- */
function startTwinkle(){if(!fc||RM)return;clearTimeout(twT);tick()}
function tick(){twT=0;if(!visible||document.hidden){twT=setTimeout(tick,600);return}
  const now=performance.now();tw=tw.filter(q=>now-q.t<q.d);
  while(tw.length<10){const p=pts[Math.floor(Math.random()*pts.length)];tw.push({p,t:now,d:2200+Math.random()*2600})}
  fc.setTransform(1,0,0,1,0,0);fc.clearRect(0,0,fx.width,fx.height);fc.setTransform(DPR,0,0,DPR,0,0);
  for(const q of tw){const k=Math.sin(Math.PI*(now-q.t)/q.d),h=q.p.r*(9+5*k);fc.globalAlpha=.85*k;fc.drawImage(haloAc,q.p.x-h,q.p.y-h,h*2,h*2);
    fc.fillStyle=`rgba(${AC},${(.9*k).toFixed(2)})`;fc.beginPath();fc.arc(q.p.x,q.p.y,q.p.r*1.15,0,TAU);fc.fill()}
  fc.globalAlpha=1;twT=setTimeout(tick,50)}

function setup(){const r=cv.getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(1.5,devicePixelRatio||1);
  for(const c of [cv,fx])if(c){c.width=Math.round(W*DPR);c.height=Math.round(H*DPR)}
  INK=css('--ink-rgb')||INK;AC=css('--accent-rgb')||AC;haloInk=sprite(INK,.22);haloAc=sprite(AC,.5);
  stat=document.createElement('canvas');stat.width=cv.width;stat.height=cv.height;build();drawStatic()}
function start(animate){cancelAnimationFrame(raf);clearTimeout(twT);setup();
  if(!animate||RM){showStatic();phase='idle';startTwinkle();return}
  phase='intro';t0=performance.now();raf=requestAnimationFrame(frameIntro)}

let rz=0,lastW=0;new ResizeObserver(()=>{const w=cv.getBoundingClientRect().width;if(Math.abs(w-lastW)<2)return;const first=!lastW;lastW=w;clearTimeout(rz);rz=setTimeout(()=>start(first),first?0:200)}).observe(cv);
if('IntersectionObserver' in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting}).observe(cv.parentElement);
})();
