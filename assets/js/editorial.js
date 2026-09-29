(function(){
 'use strict';
 var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var intro=document.querySelector('.asl-intro');
 if(intro){intro.addEventListener('animationend',function(e){if(e.animationName==='intro-exit')intro.remove();});setTimeout(function(){if(intro.isConnected)intro.remove();},2400);}
 if(!reduced&&'IntersectionObserver' in window){
  var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});},{threshold:.08});
  document.querySelectorAll('main section:not(.banner):not(.accr-strip) .sec-head, .svc, .coverage-photo, .coverage-copy, .step, .post, .purpose').forEach(function(el){el.classList.add('reveal');observer.observe(el);});
 }
 var progress=document.createElement('div');progress.className='scroll-progress';progress.setAttribute('aria-hidden','true');document.body.appendChild(progress);
 var scheduled=false;function update(){var total=document.documentElement.scrollHeight-innerHeight;progress.style.transform='scaleX('+(total>0?Math.min(1,scrollY/total):0)+')';scheduled=false;}
 addEventListener('scroll',function(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});addEventListener('resize',update);update();
 addEventListener('pageshow',function(e){if(e.persisted){document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('is-visible');});}});
})();
