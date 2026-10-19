/* Shared behaviour: scroll reveal, email copy. */
(()=>{
  try{localStorage.removeItem('theme')}catch(e){}

  const els=document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});els.forEach(el=>io.observe(el))}
  else els.forEach(el=>el.classList.add('in'));

  document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{
    const t=b.dataset.copy,old=b.textContent;try{await navigator.clipboard.writeText(t);b.textContent='Copied'}catch(e){b.textContent=t}
    setTimeout(()=>b.textContent=old,1600)}));
})();
