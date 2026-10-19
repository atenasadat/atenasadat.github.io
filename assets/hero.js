/* Hero drawing: a human profile, facing right, built from neurons and a network.
   At the face and the frontal brain it is made of small graphite neurons (cell body, tapering dendrites, axons).
   Moving back, each neuron straightens into a circuit node, and behind the head the points become a sparse graph.
   On load every piece drifts in from the left and appears with its own texture as it lands.
   Neurons and nodes are clickable: a neuron fires and its signal travels out into the graph; a node sends information back into the brain.
   When idle, signals alternate between those two directions, one at a time. */
(()=>{
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=document.getElementById('hero-cv'),fx=document.getElementById('hero-fx');if(!cv||!fx)return;
const hero=cv.parentElement,ctx=cv.getContext('2d'),fc=fx.getContext('2d'),TAU=Math.PI*2,Q8=Math.PI/4;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,sm=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
function rng(seed){let s=(seed*2654435761)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* lateral head silhouette in a unit box (height 1, facing right); the first 18 points are the face side */
const HEAD=[[.30,0],[.45,.02],[.56,.08],[.63,.16],[.665,.25],[.675,.32],[.664,.36],[.68,.40],[.737,.487],[.70,.512],[.686,.535],[.697,.565],[.676,.586],[.692,.607],[.666,.636],[.676,.69],[.642,.737],[.60,.775],[.588,.86],[.585,1],[.33,1],[.30,.80],[.13,.63],[.05,.43],[.08,.22],[.17,.07]];
function dFront(x,y){let best=9;for(let i=0;i<17;i++){const [ax,ay]=HEAD[i],[bx,by]=HEAD[i+1],dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);best=Math.min(best,Math.hypot(x-ax-dx*t,y-ay-dy*t))}return best}
function inside(x,y){let c=false;for(let i=0,j=HEAD.length-1;i<HEAD.length;j=i++){const [xi,yi]=HEAD[i],[xj,yj]=HEAD[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}

let W=0,H=0,DPR=1,U=1,R=rng(11),INK='43,50,64',AC='226,112,84',items=[],links=[],hh=1,ox=0,oy=0,stat,sc;
const toU=x=>(x-ox)/hh,toV=y=>(y-oy)/hh,ink=a=>`rgba(${INK},${a})`,acc=a=>`rgba(${AC},${clamp(a,0,1).toFixed(3)})`;

/* ---------- a neuron: tapering dendrites that branch; m straightens it toward a circuit node ---------- */
function dendrite(it,x,y,ang,len,w,depth,r,m){const n=Math.max(3,Math.round(len/(3.5*U))),pts=[[x,y]];let a=ang;
  for(let i=0;i<n;i++){a+=(r()-.5)*.34*(1-m);const q=Math.round(a/Q8)*Q8,d=a+(q-a)*m,p=pts[pts.length-1],nx=p[0]+Math.cos(d)*len/n,ny=p[1]+Math.sin(d)*len/n;
    // keep the profile crisp: dendrites near the face stop at the skin
    if(it.inHead&&!inside(toU(nx),toV(ny)))break;pts.push([nx,ny])}
  if(pts.length<2)return;const w1=w*lerp(.55,.95,m);it.strokes.push({pts,w0:w,w1});
  if(m<.4&&depth<=1)for(let k=2;k<pts.length;k+=2)if(r()<.5){const p=pts[k],aa=a+(r()<.5?1:-1)*(1.1+r()*.5),l=(1.6+r()*2)*U;it.strokes.push({pts:[p,[p[0]+Math.cos(aa)*l,p[1]+Math.sin(aa)*l]],w0:.6,w1:.4,spine:1})}
  const e=pts[pts.length-1];
  if(depth>0&&pts.length>n*.7){const sp=lerp(.35+r()*.35,Q8,m);
    dendrite(it,e[0],e[1],a-sp,len*(.62+r()*.2),w1*.8,depth-1,r,m);dendrite(it,e[0],e[1],a+sp,len*(.62+r()*.2),w1*.72,depth-1,r,m)}
  else if(m>.5)it.pads.push(e)}
function makeNeuron(it){const r=rng(it.seed),m=it.m,nd=4+Math.floor(r()*3);it.strokes=[];it.pads=[];it.angs=[];
  for(let i=0;i<nd;i++){const a=i/nd*TAU+r()*.7;it.angs.push(a+(Math.round(a/Q8)*Q8-a)*m)}
  const rs=it.size*lerp(1,.6,m);it.r=rs;
  it.angs.forEach(a=>dendrite(it,it.x+Math.cos(a)*rs*1.4,it.y+Math.sin(a)*rs*1.4,a,it.size*(2.4+r()*1.6)*lerp(1,.8,m),it.size*.42*lerp(1,.6,m),m<.5?2:1,r,m))}

/* ---------- layout ---------- */
function build(){R=rng(11);items=[];links=[];
  hh=Math.min(H*.84,W*.95);const hw=hh*.75;ox=Math.min(W-hw*1.02,W*.5+hw*.08);oy=H*.08+(H*.84-hh)*.5;U=hh/760;
  const X=u=>ox+u*hh,Y=v=>oy+v*hh,all=[],near=(x,y,d)=>all.some(p=>Math.hypot(p.x-x,p.y-y)<d);
  const add=(x,y,u,v,s,inHead)=>{const it={x,y,u,v,s,inHead,seed:all.length*7+3};all.push(it);return it};
  // neurons along the face line, so the profile reads clearly
  for(let i=1;i<17;i++){const [u0,v0]=HEAD[i],[u1,v1]=HEAD[i+1],L=Math.hypot(u1-u0,v1-v0)*hh,n=Math.max(1,Math.round(L/(30*U)));
    for(let k=0;k<n;k++){const t=k/n,u=lerp(u0,u1,t)-.018,v=lerp(v0,v1,t);if(!inside(u,v))continue;const x=X(u),y=Y(v);if(!near(x,y,24*U))add(x,y,u,v,1,true)}}
  // inside the head: dense toward the face and the frontal brain, sparse toward the back
  for(let i=0;i<9000;i++){const u=R()*.75,v=R();if(!inside(u,v))continue;const s=sm(1-dFront(u,v)/.3)*(1-.5*sm((v-.82)/.18));if(R()>.16+.84*s)continue;
    const x=X(u),y=Y(v);if(!near(x,y,lerp(44,34,s)*U))add(x,y,u,v,s,true)}
  // the back of the skull and the neck traced by graph nodes, so the whole head reads
  for(let i=17;i<HEAD.length;i++){const [u0,v0]=HEAD[i],[u1,v1]=HEAD[(i+1)%HEAD.length],L=Math.hypot(u1-u0,v1-v0)*hh,n=Math.max(1,Math.round(L/(40*U)));
    for(let k=0;k<n;k++){const t=k/n,u=lerp(u0,u1,t),v=lerp(v0,v1,t),cx=.38,cy=.5,iu=u+(cx-u)*.03,iv=v+(cy-v)*.03,x=X(iu),y=Y(iv);if(v>.97)continue;if(!near(x,y,30*U))add(x,y,iu,iv,0,true)}}
  // a sparse graph trailing off behind the head
  for(let i=0;i<6000;i++){const u=-1.15+R()*1.35,v=-.02+R()*1.04,back=sm((u+1.15)/1.25);if(Math.abs(v-.45)>.42+.2*(1-back))continue;if(inside(u,v))continue;
    if(R()>.03+.32*back*back)continue;const x=X(u),y=Y(v);if(x<8||y<70*U)continue;if(!near(x,y,(36+70*(1-back))*U))add(x,y,u,v,0,false)}
  for(const it of all){it.m=1-sm((it.s-.18)/.55);it.f=it.inHead?1:.35+.65*sm((it.u+1.15)/1.25);
    if(it.m<.85){it.kind='neuron';it.size=(3.6+rng(it.seed)()*1.6)*U;makeNeuron(it)}else{it.kind='node';it.r=(2.1+(rng(it.seed)()<.12?1.2:0))*U;it.hub=it.r>2.5*U}
    it.links=[];items.push(it)}
  // links: axons between neurons, traces from neurons into the graph, and graph edges
  const seen=new Set(),link=(a,b,kind)=>{const id=a.seed<b.seed?a.seed+'-'+b.seed:b.seed+'-'+a.seed;if(seen.has(id))return;seen.add(id);
    const L={a,b,kind,pts:route(a,b,kind)};links.push(L);a.links.push(L);b.links.push(L)};
  for(const a of items){const cand=items.filter(b=>b!==a).map(b=>[Math.hypot(b.x-a.x,b.y-a.y),b]).sort((p,q)=>p[0]-q[0]);
    if(a.kind==='neuron'&&a.m<.5){cand.filter(([d,b])=>b.kind==='neuron'&&d>a.size*3&&d<75*U).slice(0,2).forEach(([d,b])=>link(a,b,'axon'));
      if(a.m>.25){const n=cand.find(([d,b])=>b.kind==='node'||b.m>=.5);if(n&&n[0]<110*U)link(a,n[1],'edge')}}
    else{const k=a.kind==='neuron'?3:(rng(a.seed+1)()<.4+.6*a.f?3:1),rad=(a.inHead?90:lerp(170,110,a.f))*U;
      cand.filter(([d,b])=>d<rad&&(b.kind==='node'||b.m>.35)).slice(0,k).forEach(([d,b])=>link(a,b,'edge'))}}
  for(const it of items){it.x0=-30-R()*W*.4;it.y0=it.y+(R()-.5)*H*.3;it.delay=(1-sm((it.u+1.15)/1.9))*1.1+R()*.8;it.dur=1.3+R()*.9;it.landed=false}}
function route(a,b,kind){
  if(kind==='axon'){const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,s=rng(a.seed+b.seed)()<.5?1:-1,P=[];
    const sx=a.x+ux*a.r*1.3,sy=a.y+uy*a.r*1.3,ex=b.x-ux*b.r*2.2,ey=b.y-uy*b.r*2.2,L=Math.hypot(ex-sx,ey-sy);
    for(let i=0;i<=16;i++){const t=i/16,w=Math.sin(Math.PI*t)*Math.min(8*U,L*.12)*s;P.push([lerp(sx,ex,t)-uy*w,lerp(sy,ey,t)+ux*w])}return P}
  const dx=b.x-a.x,dy=b.y-a.y,far=Math.max(a.u,b.u)<-.55;if(far)return[[a.x,a.y],[b.x,b.y]];
  const mid=Math.abs(dx)>=Math.abs(dy)?[b.x-Math.sign(dx)*Math.abs(dy),a.y]:[a.x,b.y-Math.sign(dy)*Math.abs(dx)];return[[a.x,a.y],mid,[b.x,b.y]]}

/* ---------- drawing ---------- */
function polyline(c,P){c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
function taper(c,P,w0,w1,a){const n=P.length-1;c.strokeStyle=ink(a);for(let i=0;i<n;i++){c.lineWidth=lerp(w0,w1,i/n);c.beginPath();c.moveTo(P[i][0],P[i][1]);c.lineTo(P[i+1][0],P[i+1][1]);c.stroke()}}
function drawItem(c,it){const f=it.f;
  if(it.kind==='node'){c.fillStyle='rgba(250,248,244,.96)';c.beginPath();c.arc(it.x,it.y,it.r+1,0,TAU);c.fill();c.lineWidth=1;c.strokeStyle=ink((.72*f).toFixed(2));c.stroke();
    if(it.hub){c.fillStyle=ink((.6*f).toFixed(2));c.beginPath();c.arc(it.x,it.y,it.r*.45,0,TAU);c.fill()}return}
  const m=it.m;
  for(const st of it.strokes){if(m>.5){c.lineWidth=Math.max(.8,lerp(st.w0,1*U,m));c.strokeStyle=ink(.55);polyline(c,st.pts)}
    else if(st.spine)taper(c,st.pts,.7,.5,.45);
    else{taper(c,st.pts,st.w0+1.2,st.w1+1.2,.07);taper(c,st.pts,st.w0,st.w1,.55);taper(c,st.pts,st.w0*.55,st.w1*.55,.28)}}
  for(const p of it.pads){c.fillStyle=ink(.6);c.beginPath();c.arc(p[0],p[1],1.4*U,0,TAU);c.fill()}
  // the cell body swells into a cone where each main dendrite leaves it; it rounds into a node as m grows
  const x=it.x,y=it.y,r=it.r,P=[];for(let i=0;i<=72;i++){const th=i/72*TAU;let k=1;for(const a of it.angs){const d=Math.atan2(Math.sin(th-a),Math.cos(th-a));k+=.7*(1-m)*Math.exp(-((d/.24)**2))}P.push([x+Math.cos(th)*r*k,y+Math.sin(th)*r*k])}
  const g=c.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r*1.6);g.addColorStop(0,ink((.1*(1-m)+.04).toFixed(3)));g.addColorStop(1,ink((.38*(1-m)+.08).toFixed(3)));
  c.fillStyle=g;c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();c.lineWidth=1;c.strokeStyle=ink(.7);c.stroke();
  c.fillStyle=ink(.62);c.beginPath();c.arc(x,y,r*lerp(.42,.5,m),0,TAU);c.fill()}
function drawLink(c,L){const f=Math.min(L.a.f,L.b.f);
  if(L.kind==='axon'){c.lineWidth=.9;c.strokeStyle=ink(.42);polyline(c,L.pts);const e=L.pts[L.pts.length-1];c.fillStyle=ink(.35);c.beginPath();c.arc(e[0],e[1],1.6*U,0,TAU);c.fill();return}
  c.lineWidth=.9;c.strokeStyle=ink((.34*f).toFixed(3));polyline(c,L.pts)}
function redrawStatic(){sc.setTransform(1,0,0,1,0,0);sc.clearRect(0,0,stat.width,stat.height);sc.setTransform(DPR,0,0,DPR,0,0);sc.lineCap='round';sc.lineJoin='round';
  for(const L of links)if(L.a.landed&&L.b.landed)drawLink(sc,L);for(const it of items)if(it.landed)drawItem(sc,it)}
function blit(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(stat,0,0)}

/* ---------- entrance: each piece drifts in from the left and appears with its texture as it lands ---------- */
let t0=0,raf=0,intro=false;const ease=t=>1-Math.pow(1-t,3);
function introFrame(){raf=0;const now=(performance.now()-t0)/1000;let pending=0;const fresh=[];
  fc.setTransform(1,0,0,1,0,0);fc.clearRect(0,0,fx.width,fx.height);fc.setTransform(DPR,0,0,DPR,0,0);
  for(const it of items){if(it.landed)continue;const t=clamp((now-it.delay)/it.dur,0,1);
    if(t>=1){it.landed=true;fresh.push(it);continue}pending++;if(t<=0)continue;const e=ease(t),x=lerp(it.x0,it.x,e),y=lerp(it.y0,it.y,e);
    fc.fillStyle=ink((.25+.5*t).toFixed(2));fc.beginPath();fc.arc(x,y,(it.kind==='node'?1.8:2.4)*U,0,TAU);fc.fill()}
  // only the pieces that just landed (and links whose both ends are now down) are drawn
  if(fresh.length){sc.setTransform(DPR,0,0,DPR,0,0);sc.lineCap='round';sc.lineJoin='round';
    for(const it of fresh)for(const L of it.links){const o=L.a===it?L.b:L.a;if(o.landed&&!L.drawn){L.drawn=true;drawLink(sc,L)}}
    for(const it of fresh)drawItem(sc,it);blit()}
  if(pending){raf=requestAnimationFrame(introFrame);return}
  intro=false;fc.setTransform(1,0,0,1,0,0);fc.clearRect(0,0,fx.width,fx.height);hero.classList.add('ready');scheduleIdle()}

/* ---------- interaction and signals ---------- */
let effects=[],hover=null,fxRaf=0,idleT=0,visible=true;
const cum=P=>{const c=[0];for(let i=1;i<P.length;i++)c.push(c[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));return c};
const at=(P,c,d)=>{let i=1;while(i<c.length-1&&c[i]<d)i++;const t=clamp((d-c[i-1])/((c[i]-c[i-1])||1),0,1);return[lerp(P[i-1][0],P[i][0],t),lerp(P[i-1][1],P[i][1],t)]};
function fire(it,depth=0){const D=Math.max(it.r*3,...it.strokes.flatMap(s=>s.pts.map(p=>Math.hypot(p[0]-it.x,p[1]-it.y))));effects.push({k:'fire',it,D,t0:performance.now(),dur:3600,depth});kick()}
function travel(P,opt={}){if(!P||P.length<2){opt.done&&setTimeout(opt.done,0);return}effects.push({k:'travel',P,c:cum(P),t0:performance.now(),speed:opt.speed||.12,trail:opt.trail||120,nodes:opt.nodes||[],done:opt.done});kick()}
const oriented=(L,from)=>L.a===from?L.pts:L.pts.slice().reverse();
function flowFrom(node,steps=6){const P=[[node.x,node.y]],nodes=[[node.x,node.y,node.r,0]],seen=new Set([node]);let cur=node;
  for(let i=0;i<steps;i++){const opts=cur.links.filter(L=>L.kind==='edge'&&!seen.has(L.a===cur?L.b:L.a));if(!opts.length)break;
    const L=opts[Math.floor(Math.random()*opts.length)],nx=L.a===cur?L.b:L.a;P.push(...oriented(L,cur).slice(1));nodes.push([nx.x,nx.y,nx.r,cum(P).pop()]);seen.add(nx);cur=nx}
  travel(P,{nodes,speed:.1,trail:160})}
function pathFrom(start,goal){const prev=new Map([[start,null]]),hop=new Map([[start,0]]),q=[start],found=[];
  while(q.length){const x=q.shift();if(x!==start&&goal(x))found.push(x);for(const L of x.links){const y=L.a===x?L.b:L.a;if(!prev.has(y)){prev.set(y,[x,L]);hop.set(y,hop.get(x)+1);q.push(y)}}}
  if(!found.length)return null;const near=found.slice(0,5),end=near[Math.floor(Math.random()*near.length)],chain=[];
  for(let y=end;prev.get(y);y=prev.get(y)[0])chain.push([prev.get(y)[0],prev.get(y)[1],y]);chain.reverse();
  const P=[[start.x,start.y]],lit=[[start.x,start.y,start.kind==='node'?start.r:start.r*.8,0]];
  for(const [x,L,y] of chain){P.push(...oriented(L,x).slice(1));lit.push([y.x,y.y,y.kind==='node'?y.r:y.r*.8,cum(P).pop()])}
  return{P,lit,end}}
const toGraph=x=>x.kind==='node'&&x.u<-.1,toBrain=x=>x.kind==='neuron'&&x.m<.4;
// brain to graph: the neuron fires, then the signal leaves along its axons and traces and flows out into the network
function brainToGraph(it){fire(it,9);const e=effects[effects.length-1];e.then=()=>{const p=pathFrom(it,toGraph);if(p)travel(p.P,{nodes:p.lit,speed:.075,trail:170})}}
// graph to brain: information gathers in the network, crosses back in, and the neuron it reaches fires
function graphToBrain(node){const p=pathFrom(node,toBrain);if(!p)return;travel(p.P,{nodes:p.lit,speed:.075,trail:170,done:()=>fire(p.end,9)})}
function onFired(e){if(e.then)e.then()}
function kick(){if(!fxRaf&&visible&&!intro)fxRaf=requestAnimationFrame(step)}
function step(){fxRaf=0;const now=performance.now();fc.setTransform(1,0,0,1,0,0);fc.clearRect(0,0,fx.width,fx.height);fc.setTransform(DPR,0,0,DPR,0,0);fc.lineCap='round';fc.lineJoin='round';
  const after=[];effects=effects.filter(e=>{const t=now-e.t0;
    if(e.k==='fire'){const p=t/e.dur;if(p>=1){after.push(()=>onFired(e));return false}const it=e.it,front=p*e.D*1.1,band=Math.max(10*U,e.D*.22);
      const g=fc.createRadialGradient(it.x,it.y,0,it.x,it.y,it.r*4);g.addColorStop(0,acc(.55*(1-p)));g.addColorStop(1,acc(0));fc.fillStyle=g;fc.beginPath();fc.arc(it.x,it.y,it.r*4,0,TAU);fc.fill();
      fc.fillStyle=acc(.95*(1-p*.6));fc.beginPath();fc.arc(it.x,it.y,it.r*.6,0,TAU);fc.fill();
      for(const st of it.strokes){const P=st.pts;for(let i=0;i<P.length-1;i++){const d=Math.hypot(P[i][0]-it.x,P[i][1]-it.y),a=.95*Math.exp(-(((d-front)/band)**2))+(d<front?.3*(1-p):0);if(a<.03)continue;
        fc.lineWidth=Math.max(1.4,st.w0+.6);fc.strokeStyle=acc(a);fc.beginPath();fc.moveTo(P[i][0],P[i][1]);fc.lineTo(P[i+1][0],P[i+1][1]);fc.stroke()}}
      return true}
    const head=t*e.speed,end=e.c[e.c.length-1];if(head-e.trail>end){if(e.done)after.push(e.done);return false}
    const h=Math.min(head,end),s0=Math.max(0,head-e.trail),n=16;
    for(let i=0;i<n;i++){const a0=lerp(s0,h,i/n),a1=lerp(s0,h,(i+1)/n);if(a1<=a0)continue;const p0=at(e.P,e.c,a0),p1=at(e.P,e.c,a1);fc.lineWidth=2;fc.strokeStyle=acc(.9*(i+1)/n*(head>end?1-(head-end)/e.trail:1));fc.beginPath();fc.moveTo(p0[0],p0[1]);fc.lineTo(p1[0],p1[1]);fc.stroke()}
    if(head<=end){const hp=at(e.P,e.c,head),g=fc.createRadialGradient(hp[0],hp[1],0,hp[0],hp[1],12);g.addColorStop(0,acc(.9));g.addColorStop(1,acc(0));fc.fillStyle=g;fc.beginPath();fc.arc(hp[0],hp[1],12,0,TAU);fc.fill()}
    for(const q of e.nodes){const since=head-q[3];if(since<0)continue;const a=Math.max(0,1-since/(e.trail*2.5));if(a<=0)continue;fc.fillStyle=acc(.9*a);fc.beginPath();fc.arc(q[0],q[1],q[2]+2,0,TAU);fc.fill();fc.lineWidth=1.2;fc.strokeStyle=acc(.5*a);fc.beginPath();fc.arc(q[0],q[1],q[2]+6,0,TAU);fc.stroke()}
    return true});
  if(hover){fc.lineWidth=1.3;fc.strokeStyle=acc(.85);fc.setLineDash([3,3]);fc.beginPath();fc.arc(hover.x,hover.y,hover.kind==='node'?hover.r+6:hover.r*2.6,0,TAU);fc.stroke();fc.setLineDash([])}
  after.forEach(f=>f());if(effects.length)kick()}
function pick(ev){const r=cv.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;let best=null,bd=1e9;
  for(const it of items){const d=Math.hypot(it.x-x,it.y-y),lim=it.kind==='node'?12:Math.max(it.r*2.6,12);if(d<lim&&d<bd){bd=d;best=it}}return best}
hero.addEventListener('pointermove',ev=>{if(intro)return;const h=ev.target.closest('a,button')?null:pick(ev);if(h===hover)return;hover=h;hero.style.cursor=h?'pointer':'';if(!effects.length){step()}});
hero.addEventListener('pointerleave',()=>{hover=null;hero.style.cursor='';if(!effects.length)step()});
hero.addEventListener('click',ev=>{if(intro||ev.target.closest('a,button'))return;const it=pick(ev);if(!it)return;it.kind==='node'?graphToBrain(it):brainToGraph(it)});
// idle: now and then one neuron near the face fires on its own
let dir=0;function scheduleIdle(){clearTimeout(idleT);idleT=setTimeout(()=>{if(visible&&!document.hidden&&!effects.length){
    if(dir===0){const pool=items.filter(i=>i.kind==='neuron'&&i.m<.3&&i.y>H*.15&&i.y<H*.75);if(pool.length)brainToGraph(pool[Math.floor(Math.random()*pool.length)])}
    else{const pool=items.filter(i=>i.kind==='node'&&i.u<-.05&&i.u>-.4&&i.y>H*.15&&i.y<H*.8);if(pool.length)graphToBrain(pool[Math.floor(Math.random()*pool.length)])}
    dir=1-dir}scheduleIdle()},2600+Math.random()*1800)}
if('IntersectionObserver' in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)kick()}).observe(hero);

function setup(){const r=cv.getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(2,devicePixelRatio||1);
  for(const c of [cv,fx]){c.width=Math.round(W*DPR);c.height=Math.round(H*DPR)}
  INK=css('--ink-rgb')||INK;AC=css('--accent-rgb')||AC;stat=document.createElement('canvas');stat.width=cv.width;stat.height=cv.height;sc=stat.getContext('2d');build()}
function start(animate){cancelAnimationFrame(raf);cancelAnimationFrame(fxRaf);fxRaf=0;clearTimeout(idleT);effects=[];hover=null;setup();
  if(!animate||RM){items.forEach(i=>i.landed=true);redrawStatic();blit();intro=false;hero.classList.add('ready');fc.clearRect(0,0,fx.width,fx.height);scheduleIdle();return}
  intro=true;t0=performance.now();raf=requestAnimationFrame(introFrame)}
let rz=0,lastW=0;new ResizeObserver(()=>{const w=cv.getBoundingClientRect().width;if(Math.abs(w-lastW)<2)return;const first=!lastW;lastW=w;clearTimeout(rz);rz=setTimeout(()=>start(first),first?0:200)}).observe(cv);
})();
