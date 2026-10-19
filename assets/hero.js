/* Hero drawing: graphite neurons on the left that morph into a circuit mesh on the right. No canvas filters (they crash GPUs at this stroke count). */
(()=>{
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=document.getElementById('hero-cv'),ctx=cv.getContext('2d'),TAU=Math.PI*2,Q8=Math.PI/4;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,sm=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
function rng(seed){let s=(seed*2654435761)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
let W=0,H=0,U=1,R=rng(17),strokes=[],MX0=0,MX1=1;
// how far a point has turned from biology into graph: 0 = neuron, 1 = circuit
const morph=x=>sm((x-MX0)/(MX1-MX0));
let CELLS=[],CELLMAP=new Map(),curCell=null;
function add(pts,w0,w1,kind='line',a=1,L=2,m=0){const st={x:Math.min(...pts.map(p=>p[0])),pts,w0,w1,kind,a,L,m};strokes.push(st);if(curCell&&kind==='line')curCell.s.push(st)}
const pad=(c,r,L,a=.8)=>strokes.push({x:c[0],kind:'pad',c,r,L,a});

/* ---------- neurons that straighten into circuitry as they approach the graph ---------- */
function dendrite(x,y,ang,len,w,depth,seed,L,m){const r=rng(seed),n=Math.max(3,Math.round(len/(6*U))),pts=[[x,y]];let a=ang;
  for(let i=0;i<n;i++){a+=(r()-.5)*.32*(1-m);const q=Math.round(a/Q8)*Q8,d=a+(q-a)*m,p=pts[pts.length-1];pts.push([p[0]+Math.cos(d)*len/n,p[1]+Math.sin(d)*len/n])}
  const w1=w*lerp(.6,.95,m);add(pts,w,w1,'line',1,L,m);
  if(L===2&&depth<=1&&m<.5)for(let k=2;k<pts.length;k+=2)if(r()<.55*(1-2*m)){const p=pts[k],aa=a+(r()<.5?1:-1)*(1.1+r()*.5),l=(2.5+r()*3)*U;add([p,[p[0]+Math.cos(aa)*l,p[1]+Math.sin(aa)*l]],.7,.5,'line',1,L,m)}
  const e=pts[pts.length-1];
  if(depth>0){const spread=lerp(.35+r()*.35,Q8,m);
    dendrite(e[0],e[1],a-spread*lerp(.6+r()*.4,1,m),len*(.6+r()*.2),w1*.78,depth-1,seed*7+1,L,m);
    dendrite(e[0],e[1],a+spread*lerp(.6+r()*.4,1,m),len*(.6+r()*.2),w1*.7,depth-1,seed*7+2,L,m)}
  else if(m>.45&&r()<m)pad(e,(1.3+m)*U*(L===2?1:.7),L)}
function neuron(x,y,size,seed,L){const m=morph(x),r=rng(seed),nd=5+Math.floor(r()*3),angs=[];
  for(let i=0;i<nd;i++){const a=i/nd*TAU+r()*.6;angs.push(a+(Math.round(a/Q8)*Q8-a)*m)}
  const sz=size*lerp(1,.55,m);
  strokes.push({x:x-size,kind:'soma',c:[x,y],r:sz,angs,L,m});
  const depth=(L===2?3:L===1?2:1)-(m>.7?1:0);
  angs.forEach((a,i)=>dendrite(x+Math.cos(a)*sz*lerp(1.5,2.2,m),y+Math.sin(a)*sz*lerp(1.5,2.2,m),a,size*(2.2+r()*1.4)*lerp(1,.8,m),size*.38*lerp(1,.5,m),Math.max(0,depth),seed*13+i,L,m))
  return m}
function axon(from,to,seed,L){const r=rng(seed),dx=to[0]-from[0],dy=to[1]-from[1],l=Math.hypot(dx,dy)||1,sgn=r()<.5?1:-1,pts=[from],n=28,m=morph(from[0]);
  for(let i=1;i<=n;i++){const t=i/n,bend=Math.sin(t*Math.PI)*Math.min(30,l*.08)*U*sgn*(1-m);pts.push([lerp(from[0],to[0],t)-dy/l*bend,lerp(from[1],to[1],t)+dx/l*bend])}
  add(pts,1.1*U,1*U,'axon',1,L,m);
  const e=pts[n];if(m>.5){pad(e,2.2*U,L);return}
  for(let k=-1;k<=1;k++){const a=Math.atan2(dy,dx)+k*.55,q=[e[0]+Math.cos(a)*12*U,e[1]+Math.sin(a)*12*U];add([e,q],.9,.8,'line',1,L,m);strokes.push({x:q[0],kind:'bouton',c:q,r:3.6*U,L})}}

/* ---------- the graph: a flat triangulated mesh spanning the right of the page, fraying open on its left ---------- */
let M=null;
function mesh(){const g=46*U,X0=W*.5,X1=W*.66,pts=[];
  for(let y=-g;y<H+g;y+=g*.87)for(let x=X0-g;x<W+g;x+=g){const px=x+(R()-.5)*g*.8+((y/g|0)%2)*g*.5,py=y+(R()-.5)*g*.7;
    // further left, more of the mesh is missing
    const keep=sm((px-X0)/(X1-X0));if(R()>keep*1.05)continue;
    pts.push({sx:px,sy:py,z:R()*2-1,e:[],big:R()<.06,keep})}
  const seen=new Set(),lim=g*1.45;
  pts.forEach((a,i)=>{pts.map((b,j)=>[j,Math.hypot(a.sx-b.sx,a.sy-b.sy)]).filter(e=>e[0]!==i&&e[1]<lim).sort((u,v)=>u[1]-v[1]).slice(0,5).forEach(([j])=>{
    const k=i<j?i+'-'+j:j+'-'+i;if(seen.has(k))return;seen.add(k);a.e.push(j);pts[j].e.push(i);const b=pts[j],zm=(a.z+b.z)/2,al=(.2+.75*Math.pow((zm+1)/2,1.4))*Math.min(a.keep,b.keep);
    strokes.push({x:Math.min(a.sx,b.sx),kind:'edge',pts:[[a.sx,a.sy],[b.sx,b.sy]],w0:(.55+.6*(zm+1)/2)*U,a:al,L:zm<-.4?0:2})})});
  pts.forEach(p=>strokes.push({x:p.sx-4,kind:'node',c:[p.sx,p.sy],r:(1.1+(p.z+1)*.9)*U*(p.big?1.9:1),big:p.big,a:(.3+.7*(p.z+1)/2)*Math.max(.4,p.keep),L:p.z<-.4?0:2}));
  return{pts,X0,X1}}

/* ---------- connectors: organic axon, then 45-degree circuit trace, then an edge of the sphere ---------- */
function fillet(poly,rad){const out=[poly[0]];
  for(let i=1;i<poly.length-1;i++){const P=poly[i-1],V=poly[i],N=poly[i+1],d1=[P[0]-V[0],P[1]-V[1]],d2=[N[0]-V[0],N[1]-V[1]],l1=Math.hypot(...d1)||1,l2=Math.hypot(...d2)||1,r=Math.min(rad,l1/2.2,l2/2.2);
    const a=[V[0]+d1[0]/l1*r,V[1]+d1[1]/l1*r],b=[V[0]+d2[0]/l2*r,V[1]+d2[1]/l2*r];
    for(let s=0;s<=6;s++){const t=s/6,u=1-t;out.push([u*u*a[0]+2*u*t*V[0]+t*t*b[0],u*u*a[1]+2*u*t*V[1]+t*t*b[1]])}}
  out.push(poly[poly.length-1]);return out}
function edgeDir(node){const nbs=node.e.map(j=>M.pts[j]).filter(b=>b.sx>node.sx+4*U).sort((a,b)=>Math.abs(a.sy-node.sy)-Math.abs(b.sy-node.sy));
  let v=nbs.length?[node.sx-nbs[0].sx,node.sy-nbs[0].sy]:[-1,0];const l=Math.hypot(...v);return[v[0]/l,v[1]/l]}
function connector(src,node,seed,L){const r=rng(seed),v=edgeDir(node),Lq=(20+r()*30)*U,Q=[node.sx+v[0]*Lq,node.sy+v[1]*Lq];
  const p0=[src[0]+18*U,src[1]],hx=lerp(p0[0],Q[0],.3+r()*.25),hy=lerp(p0[1],Q[1],.25+r()*.35);
  const c1=[p0[0]+(40+r()*50)*U,p0[1]+(r()-.5)*70*U],c2=[hx-(30+r()*40)*U,hy],org=[];
  for(let i=0;i<=30;i++){const t=i/30,u=1-t,j=(r()-.5)*1.6*U*(1-t);org.push([u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*hx+j,u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*hy+j])}
  const dx=Q[0]-hx,dy=Q[1]-hy,diag=Math.min(Math.abs(dy),Math.max(0,dx*.7)),ax=hx+(dx-diag)*(.2+r()*.5),A=[ax,hy],B=[ax+diag,hy+Math.sign(dy)*diag];
  const tr=fillet([[hx,hy],A,B,Q,[node.sx,node.sy]],10*U),pts=org.concat(tr.slice(1));
  strokes.push({x:p0[0],kind:'conn',pts,m0:hx-80*U,m1:Q[0],w0:(L===2?1.2:.9)*U,w1:(L===2?1.3:.9)*U,L,a:.8});{const sc=CELLMAP.get(src);if(sc)sc.conn.push({pts,node})}
  // side branches sprout off the straight part, like dendrites that have turned into traces
  const nb=Math.floor(r()*3);for(let k=0;k<nb;k++){const i=Math.floor(org.length+(tr.length-2)*(.15+r()*.6));if(i>=pts.length-2)continue;const P=pts[i],s=r()<.5?-1:1,l1=(10+r()*16)*U,l2=(8+r()*22)*U;
    const poly=[P,[P[0]+l1,P[1]+s*l1],[P[0]+l1+l2,P[1]+s*l1]],q=fillet(poly,5*U);strokes.push({x:P[0],kind:'conn',pts:q,m0:-1e9,m1:-1e8,w0:.8*U,w1:.8*U,L,a:.6});pad(q[q.length-1],1.8*U,L)}
  pad([hx,hy],1.6*U,L,.5);node.big=node.big||r()<.4}
function fray(node,seed){const r=rng(seed),v=edgeDir(node),Lq=(16+r()*24)*U,Q=[node.sx+v[0]*Lq,node.sy+v[1]*Lq],d=(20+r()*70)*U,s=r()<.5?-1:1,D=(8+r()*24)*U;
  const pts=fillet([[node.sx,node.sy],Q,[Q[0]-D,Q[1]+s*D],[Q[0]-D-d,Q[1]+s*D]],8*U),e=pts[pts.length-1];
  strokes.push({x:e[0],kind:'conn',pts,m0:-1e9,m1:-1e8,w0:.9*U,w1:.9*U,L:2,a:.65});pad(e,2*U,2)}

function grid(L,cell,maxX,sizeFn,seed0){const cells=[],cols=Math.ceil(maxX/cell)+1,rowsN=Math.ceil(H/cell)+1;let seed=seed0;
  for(let j=0;j<rowsN;j++)for(let i=0;i<cols;i++){const x=(i+.5+(R()-.5)*.8)*cell-cell*.3,y=(j+.5+(R()-.5)*.8)*cell-cell*.2;if(R()<.12||x>maxX)continue;const k=[x,y];cells.push(k);const nc={c:[x,y],r:sizeFn()*U,L,m:morph(x),s:[],conn:[],ax:null,to:null};CELLS.push(nc);CELLMAP.set(k,nc);curCell=nc;neuron(x,y,nc.r,seed+=6,L);curCell=null;nc.r*=lerp(1,.55,nc.m)}
  return cells}
function link(cells,cell,L){cells.forEach((a,i)=>{const nb=cells.filter(b=>b[0]>a[0]+30&&Math.hypot(b[0]-a[0],b[1]-a[1])<cell*1.5).sort((p,q)=>Math.hypot(p[0]-a[0],p[1]-a[1])-Math.hypot(q[0]-a[0],q[1]-a[1]));
  if(nb.length){const b=nb[0],ang=Math.atan2(b[1]-a[1],b[0]-a[0]),ca=CELLMAP.get(a),n0=strokes.length;axon([a[0]+Math.cos(ang)*20*U,a[1]+Math.sin(ang)*20*U],[b[0]-Math.cos(ang)*34*U,b[1]-Math.sin(ang)*34*U],i*11+5+L*977,L);if(ca){ca.ax=strokes[n0].pts;ca.to=CELLMAP.get(b)}}})}

function build(){strokes=[];CELLS=[];CELLMAP=new Map();R=rng(17);U=clamp(Math.min(W,H)/700,.7,1.5);
  M=mesh();MX0=W*.28;MX1=W*.56;
  const back=grid(0,95*U,W*.62,()=>5+R()*3,9000),mid=grid(1,135*U,W*.58,()=>8.5+R()*4,5000),front=grid(2,190*U,W*.54,()=>14+R()*6,3);
  link(front,190*U,2);link(mid,135*U,1);
  // dozens of axons cross the middle and become edges of the sphere's frayed left side
  const targets=M.pts.filter(p=>p.sx<W*.7&&p.sy>H*.06&&p.sy<H*.94);
  const srcF=front.filter(c=>c[0]>W*.18&&c[0]<MX1),srcM=mid.filter(c=>c[0]>W*.22&&c[0]<MX1),use=new Map();
  const K=Math.min(targets.length,Math.round(46*clamp(H/900,.7,1.3)));
  targets.sort((a,b)=>a.sy-b.sy);
  for(let k=0;k<K;k++){const node=targets[Math.floor((k+R())*targets.length/K)],near=node.z>-.2,pool=near?srcF:srcM;if(!pool.length)continue;
    const s=pool.filter(c=>(use.get(c)||0)<3).sort((p,q)=>(Math.abs(p[1]-node.sy)+Math.abs(node.sx-p[0])*.25)-(Math.abs(q[1]-node.sy)+Math.abs(node.sx-q[0])*.25))[Math.floor(R()*2)];
    if(!s)continue;use.set(s,(use.get(s)||0)+1);connector(s,node,k*53+11,near?2:1)}
  const free=M.pts.filter(p=>p.z>.1&&p.sx<W*.72&&p.sy>H*.08&&p.sy<H*.92);for(let i=0;i<Math.min(16,free.length);i++)fray(free[Math.floor(R()*free.length)],i*17+3);
  for(let i=0;i<Math.round(W*H/90000);i++){const x=R()*W*.75,y=R()*H;strokes.unshift({x:-1,kind:'smudge',c:[x,y],r:(60+R()*120)*U,a:.06+R()*.07,L:0})}
  strokes.sort((a,b)=>a.x-b.x)}

/* ---------- rendering: one graphite ink for everything ---------- */
let GR='rgba(36,33,30,';
function ink(){const v=getComputedStyle(document.documentElement).getPropertyValue('--ink-rgb').trim()||'36,33,30';GR='rgba('+v+','}
function line(c,P,w0,w1,al){const n=P.length-1;c.strokeStyle=GR+al+')';for(let i=0;i<n;i++){c.lineWidth=lerp(w0,w1,i/n);c.beginPath();c.moveTo(P[i][0],P[i][1]);c.lineTo(P[i+1][0],P[i+1][1]);c.stroke()}}
function poly(c,P,w,al){c.lineWidth=w;c.strokeStyle=GR+al+')';c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
function drawStroke(c,s){
  if(s.kind==='smudge'){const g=c.createRadialGradient(s.c[0],s.c[1],0,s.c[0],s.c[1],s.r);g.addColorStop(0,GR+s.a+')');g.addColorStop(1,GR+'0)');c.fillStyle=g;c.beginPath();c.ellipse(s.c[0],s.c[1],s.r,s.r*.7,R()*3,0,TAU);c.fill();return}
  if(s.kind==='soma'){const [x,y]=s.c,r=s.r,m=s.m,P=[];
    for(let i=0;i<=96;i++){const th=i/96*TAU;let k=1;for(const a of s.angs){let d=Math.atan2(Math.sin(th-a),Math.cos(th-a));k+=.75*(1-m)*Math.exp(-((d/.22)**2))}P.push([x+Math.cos(th)*r*k,y+Math.sin(th)*r*k*lerp(.92,1,m)])}
    const g=c.createRadialGradient(x-r*.3,y-r*.3,r*.2,x,y,r*1.6);g.addColorStop(0,GR+(.12*(1-m)).toFixed(3)+')');g.addColorStop(1,GR+(.42*(1-m)+.08).toFixed(3)+')');c.fillStyle=g;c.beginPath();P.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();
    if(s.L===2&&m<.4){c.lineWidth=.6;c.strokeStyle=GR+'.35)';for(let i=0;i<40;i++){const a=R()*TAU,r0=R()*r*.9;c.beginPath();c.moveTo(x+Math.cos(a)*r0,y+Math.sin(a)*r0);c.lineTo(x+Math.cos(a+.25)*(r0+4),y+Math.sin(a+.25)*(r0+4));c.stroke()}}
    const jit=.6*(1-m);for(let p=0;p<(s.L===2?2:1);p++){c.lineWidth=1.2-p*.4;c.strokeStyle=GR+(.75-p*.2)+')';c.beginPath();P.forEach((q,i)=>i?c.lineTo(q[0]+(R()-.5)*jit,q[1]+(R()-.5)*jit):c.moveTo(...q));c.closePath();c.stroke()}
    // the nucleus becomes the node's solid core
    c.fillStyle=GR+'.6)';c.beginPath();c.ellipse(x,y,r*lerp(.4,.55,m),r*lerp(.36,.55,m),0,0,TAU);c.fill();
    if(m<.6){c.fillStyle=GR+'.85)';c.beginPath();c.arc(x+r*.08,y-r*.04,r*.12,0,TAU);c.fill()}return}
  if(s.kind==='bouton'){c.fillStyle=GR+'.28)';c.beginPath();c.arc(s.c[0],s.c[1],s.r,0,TAU);c.fill();c.lineWidth=1;c.strokeStyle=GR+'.75)';c.beginPath();c.arc(s.c[0],s.c[1],s.r,0,TAU);c.stroke();return}
  if(s.kind==='edge'){poly(c,s.pts,s.w0,s.a.toFixed(2));return}
  if(s.kind==='node'){c.fillStyle=GR+s.a.toFixed(2)+')';c.beginPath();c.arc(s.c[0],s.c[1],s.r,0,TAU);c.fill();
    if(s.big){c.lineWidth=.9*U;c.strokeStyle=GR+(s.a*.8).toFixed(2)+')';c.beginPath();c.arc(s.c[0],s.c[1],s.r*1.9,0,TAU);c.stroke()}return}
  if(s.kind==='pad'){c.fillStyle=GR+s.a+')';c.beginPath();c.arc(s.c[0],s.c[1],s.r,0,TAU);c.fill();return}
  if(s.kind==='conn'){const P=s.pts,n=P.length-1;
    // organic start keeps a soft graphite halo; it thins out as the line turns into a trace
    for(let i=0;i<n;i++){const t=sm((P[i][0]-s.m0)/(s.m1-s.m0));if(t>=1)break;c.lineWidth=lerp(s.w0,s.w1,t)+1.4*(1-t);c.strokeStyle=GR+(.1*(1-t)).toFixed(3)+')';c.beginPath();c.moveTo(P[i][0],P[i][1]);c.lineTo(P[i+1][0],P[i+1][1]);c.stroke()}
    poly(c,P,(s.w0+s.w1)/2,s.a);return}
  if(s.kind==='axon'){if(s.m<.5)line(c,s.pts,s.w0+1.2,s.w1+1.2,'.08');line(c,s.pts,s.w0,s.w1,'.6');return}
  // a dendrite: soft and tapering while biological, a clean even line once it has become a trace
  if(s.m>.5){poly(c,s.pts,lerp(s.w0,1*U,s.m)*(s.L===2?1:.8),'.6');return}
  if(s.L<2){if(s.L===0)line(c,s.pts,s.w0+2.2,s.w1+2.2,'.18');line(c,s.pts,s.w0,s.w1,s.L===0?'.4':'.55');return}
  line(c,s.pts,s.w0+1.4,s.w1+1.4,'.1');const o=(R()-.5)*.7;line(c,s.pts.map(p=>[p[0]+o,p[1]+o]),s.w0,s.w1,'.6');line(c,s.pts,s.w0*.6,s.w1*.6,'.35')}

/* ---------- three depth planes composited: far plane blurred and pale, middle pale, near plane full ---------- */

/* ---------- interaction layer: hover and click neurons and graph nodes; idle firing, at most one per side ---------- */
const FX=(()=>{
  const fx=document.getElementById('hero-fx'),hero=cv.parentElement;if(!fx)return{reset(){}};
  const fc=fx.getContext('2d');let AC='226,112,84',effects=[],hover=null,raf=0,idleT=0,visible=true;
  const cum=pts=>{const c=[0];for(let i=1;i<pts.length;i++)c.push(c[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return c};
  const at=(pts,c,d)=>{let i=1;while(i<c.length-1&&c[i]<d)i++;const t=clamp((d-c[i-1])/((c[i]-c[i-1])||1),0,1);return[lerp(pts[i-1][0],pts[i][0],t),lerp(pts[i-1][1],pts[i][1],t)]};
  const col=a=>`rgba(${AC},${clamp(a,0,1).toFixed(3)})`;
  function reset(){effects=[];hover=null;AC=getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim()||AC;
    fx.width=cv.width;fx.height=cv.height;fc.setTransform(DPR,0,0,DPR,0,0);fc.lineCap='round';fc.lineJoin='round';kick();schedule()}
  // a neuron fires: a wave of activity spreads from the soma out along its dendrites, then a spike runs down the axon
  function fire(cell,side,depth=0){if(!cell)return;const D=Math.max(...cell.s.flatMap(st=>st.pts.map(p=>Math.hypot(p[0]-cell.c[0],p[1]-cell.c[1]))),cell.r*3);
    effects.push({k:'fire',cell,D,t0:performance.now(),dur:3800,side,depth});kick()}
  // a signal travels along a polyline; lit nodes along the way
  function travel(pts,side,opt={}){if(!pts||pts.length<2)return;const c=cum(pts);effects.push({k:'travel',pts,c,t0:performance.now(),speed:opt.speed||.32,trail:opt.trail||90,side,nodes:opt.nodes||[],done:opt.done,w:opt.w||1.6});kick()}
  function walk(node,steps=11){const path=[node],seen=new Set([node]);let cur=node;
    for(let i=0;i<steps;i++){const nb=cur.e.map(j=>M.pts[j]).filter(n=>!seen.has(n));if(!nb.length)break;
      // prefer moving away from the neurons, so information flows into the graph
      nb.sort((a,b)=>(b.sx-a.sx)*.3+(R()-.5)*90);cur=nb[Math.floor(R()*Math.min(2,nb.length))];seen.add(cur);path.push(cur)}
    return path}
  function flow(node,side){const path=walk(node);travel(path.map(n=>[n.sx,n.sy]),side,{nodes:path.map(n=>[n.sx,n.sy,n.r||2]),speed:.075,trail:170,w:2.6})}
  function step(){const now=performance.now();raf=0;fc.setTransform(1,0,0,1,0,0);fc.clearRect(0,0,fx.width,fx.height);fc.setTransform(DPR,0,0,DPR,0,0);
    effects=effects.filter(e=>{const t=now-e.t0;
      if(e.k==='fire'){const p=t/e.dur;if(p>=1){onFired(e);return false}
        const [x,y]=e.cell.c,front=p*e.D*1.1,band=Math.max(22,e.D*.18);
        const gr=e.cell.r*3,g=fc.createRadialGradient(x,y,0,x,y,gr);g.addColorStop(0,col(.6*(1-p*.8)));g.addColorStop(1,col(0));fc.fillStyle=g;fc.beginPath();fc.arc(x,y,gr,0,TAU);fc.fill();
        fc.fillStyle=col(.9*(1-p*.7));fc.beginPath();fc.arc(x,y,e.cell.r*.5,0,TAU);fc.fill();
        for(const st of e.cell.s){const P=st.pts;for(let i=0;i<P.length-1;i++){const d=Math.hypot(P[i][0]-x,P[i][1]-y),a=.95*Math.exp(-(((d-front)/band)**2))+(d<front?.35*(1-p):0);if(a<.03)continue;
          fc.lineWidth=Math.max(1.8,st.w0*.9+.9);fc.strokeStyle=col(a);fc.beginPath();fc.moveTo(P[i][0],P[i][1]);fc.lineTo(P[i+1][0],P[i+1][1]);fc.stroke()}}
        return true}
      const head=t*e.speed,end=e.c[e.c.length-1];if(head-e.trail>end){e.done&&e.done();return false}
      const h=Math.min(head,end),s0=Math.max(0,head-e.trail),n=14;
      for(let i=0;i<n;i++){const a0=lerp(s0,h,i/n),a1=lerp(s0,h,(i+1)/n);if(a1<=a0)continue;const p0=at(e.pts,e.c,a0),p1=at(e.pts,e.c,a1);fc.lineWidth=e.w;fc.strokeStyle=col(.9*(i+1)/n*(head>end?1-(head-end)/e.trail:1));fc.beginPath();fc.moveTo(...p0);fc.lineTo(...p1);fc.stroke()}
      if(head<=end){const hp=at(e.pts,e.c,head),g=fc.createRadialGradient(hp[0],hp[1],0,hp[0],hp[1],20);g.addColorStop(0,col(.95));g.addColorStop(.35,col(.5));g.addColorStop(1,col(0));fc.fillStyle=g;fc.beginPath();fc.arc(hp[0],hp[1],20,0,TAU);fc.fill()}
      // nodes light up as the signal reaches them, then fade
      e.nodes.forEach((q,i)=>{const since=head-e.c[i];if(since<0)return;const a=Math.max(0,1-since/(e.trail*2.2));if(a<=0)return;fc.fillStyle=col(.9*a);fc.beginPath();fc.arc(q[0],q[1],q[2]+3,0,TAU);fc.fill();fc.lineWidth=1.4;fc.strokeStyle=col(.6*a);fc.beginPath();fc.arc(q[0],q[1],q[2]+5+8*(1-a),0,TAU);fc.stroke()});
      return true});
    if(hover){fc.lineWidth=1.3;fc.strokeStyle=col(.85);fc.setLineDash([3,3]);fc.beginPath();fc.arc(hover.x,hover.y,hover.r,0,TAU);fc.stroke();fc.setLineDash([])}
    if(effects.length)kick()}
  function onFired(e){const c=e.cell;
    if(e.depth===0&&c.conn.length&&(e.user||R()<.5)){const k=c.conn[Math.floor(R()*c.conn.length)];
      // the spike leaves the brain, becomes a trace, and continues as information flow in the graph
      travel(k.pts,e.side,{speed:.1,trail:150,w:2.4,done:()=>flow(k.node,e.side)})}
    else if(c.ax){travel(c.ax,e.side,{speed:.09,trail:90,w:2.2,done:()=>{if(e.depth<2&&c.to)fire(c.to,e.side,e.depth+1)}})}}
  function kick(){if(!raf&&visible)raf=requestAnimationFrame(step)}
  const active=side=>effects.some(e=>e.side===side);
  function idle(){idleT=0;if(!visible||document.hidden)return schedule();
    if(!active('L')){const pool=CELLS.filter(c=>c.L===2&&c.m<.45&&c.c[0]>20&&c.c[1]>H*.06&&c.c[1]<H*.72&&c.s.length);if(pool.length)fire(pool[Math.floor(R()*pool.length)],'L')}
    if(!active('R')){const pool=M.pts.filter(n=>n.sx>W*.6&&n.sx<W*.82&&n.sy>H*.08&&n.sy<H*.72&&n.z>-.4);if(pool.length)flow(pool[Math.floor(R()*pool.length)],'R')}
    schedule()}
  function schedule(){clearTimeout(idleT);idleT=setTimeout(idle,1400+Math.random()*1600)}
  function pick(ev){const r=cv.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;let best=null,bd=1e9;
    for(const c of CELLS){if(c.L!==2)continue;const d=Math.hypot(c.c[0]-x,c.c[1]-y),lim=Math.max(c.r*2.2,16);if(d<lim&&d<bd){bd=d;best={k:'cell',cell:c,x:c.c[0],y:c.c[1],r:Math.max(c.r*2.2,12)}}}
    if(!best)for(const n of M.pts){if(n.z<-.4)continue;const d=Math.hypot(n.sx-x,n.sy-y);if(d<14&&d<bd){bd=d;best={k:'node',node:n,x:n.sx,y:n.sy,r:9}}}
    return best}
  hero.addEventListener('pointermove',ev=>{if(ev.target.closest('a,button,h1'))return set(null);set(pick(ev))});
  hero.addEventListener('pointerleave',()=>set(null));
  hero.addEventListener('click',ev=>{if(ev.target.closest('a,button'))return;const h=pick(ev);if(!h)return;
    if(h.k==='cell'){fire(h.cell,'U');effects[effects.length-1].user=true}else flow(h.node,'U')});
  function set(h){const same=h&&hover&&h.x===hover.x&&h.y===hover.y;if(same||(!h&&!hover))return;hover=h;hero.style.cursor=h?'pointer':'';kick()}
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible){kick();schedule()}}).observe(hero);
  return{reset}})();
let layers=[],lc=[],drawn=0,t0=0,DPR=1;const DUR=4.5,PLANE=[{a:.3},{a:.55},{a:1}];
function setup(){const r=cv.getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(1.5,devicePixelRatio||1);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  layers=[];lc=[];for(let i=0;i<3;i++){const p=document.createElement('canvas');p.width=cv.width;p.height=cv.height;const c=p.getContext('2d');c.setTransform(DPR,0,0,DPR,0,0);c.lineCap='round';c.lineJoin='round';layers.push(p);lc.push(c)}
  drawn=0;build()}
function show(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
  PLANE.forEach((p,i)=>{ctx.globalAlpha=p.a;ctx.drawImage(layers[i],0,0)});ctx.globalAlpha=1}
function step(){const now=performance.now(),target=Math.floor(strokes.length*clamp((now-t0)/1000/DUR,0,1));while(drawn<target){const s=strokes[drawn++];drawStroke(lc[s.L],s)}show();if(drawn<strokes.length)requestAnimationFrame(step)}
function start(animate){ink();setup();FX.reset();if(!animate||RM){while(drawn<strokes.length){const s=strokes[drawn++];drawStroke(lc[s.L],s)}show();return}t0=performance.now();requestAnimationFrame(step)}
let rz=0,lastW=0;new ResizeObserver(()=>{const w=cv.getBoundingClientRect().width;if(Math.abs(w-lastW)<2)return;const first=!lastW;lastW=w;clearTimeout(rz);rz=setTimeout(()=>start(false),first?0:200)}).observe(cv);

})();
