import { initRobot } from './robot.js';
import { initBadges } from './badges.js';
import { initTeamProfiles, showTeamFallback } from './team.js';

const preference = matchMedia('(prefers-reduced-motion: reduce)');
const motion = {reduced:preference.matches,paused:preference.matches};
const motionButton=document.querySelector('.motion-toggle');
function setMotion(){
  document.documentElement.dataset.motion=motion.paused?'paused':'active';
  motionButton.setAttribute('aria-pressed',String(motion.paused));
  const english=document.documentElement.lang==='en';
  motionButton.title=english
    ? (motion.paused?'Resume automatic animations':'Pause automatic animations')
    : (motion.paused?'Reia animațiile automate':'Pauză pentru animațiile automate');
  motionButton.setAttribute('aria-label',motionButton.title);
  motionButton.querySelector('.motion-label').textContent=english
    ? (motion.paused?'Resume motion':'Pause motion')
    : (motion.paused?'Reia animațiile':'Pauză animații');
  motionButton.querySelector('.motion-icon').textContent=motion.paused?'▷':'Ⅱ';
  document.dispatchEvent(new Event('site:motion'));
}
motionButton.addEventListener('click',()=>{motion.paused=!motion.paused;setMotion();});
preference.addEventListener('change',event=>{motion.reduced=event.matches;motion.paused=event.matches;setMotion();});
setMotion();
document.documentElement.classList.add('js-ready');
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('in-view');revealObserver.unobserve(entry.target);}
}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(element=>revealObserver.observe(element));
const hero=document.querySelector('[data-panel="hero"]'),engineering=document.querySelector('[data-panel="engineering"]');
const annotation=document.querySelector('.robot-annotations');
const journey=document.querySelector('.robot-journey');
const header=document.querySelector('.header');
const progressBar=document.querySelector('.scroll-progress');
const clamp=value=>Math.min(1,Math.max(0,value));
const smooth=(start,end,value)=>{const t=clamp((value-start)/(end-start));return t*t*(3-2*t);};
let robot=null,scrollQueued=false;
function updateScroll(){
  scrollQueued=false;
  const total=document.documentElement.scrollHeight-innerHeight;
  progressBar.style.transform='scaleX('+(total>0?scrollY/total:0)+')';
  header.classList.toggle('scrolled',scrollY>25);
  if(document.documentElement.dataset.page!=='home') {
    robot?.setProgress(0);
    return;
  }
  const rect=journey.getBoundingClientRect();
  const progress=clamp(-rect.top/Math.max(1,rect.height-innerHeight));
  robot?.setProgress(progress);
  const heroOpacity=1-smooth(.06,.24,progress);
  const engineerOpacity=smooth(.18,.35,progress)*(1-smooth(.82,.99,progress));
  hero.style.opacity=heroOpacity;hero.style.transform=motion.reduced?'none':'translateY('+(-progress*100)+'px)';
  hero.setAttribute('aria-hidden',String(heroOpacity<.05));hero.inert=heroOpacity<.05;
  engineering.style.opacity=engineerOpacity;
  engineering.style.transform=motion.reduced?'none':'translateY('+((1-smooth(.18,.35,progress))*35)+'px)';
  engineering.setAttribute('aria-hidden',String(engineerOpacity<.05));
  annotation.style.opacity=smooth(.3,.5,progress)*(1-smooth(.82,.98,progress));
}
addEventListener('scroll',()=>{if(!scrollQueued){scrollQueued=true;requestAnimationFrame(updateScroll);}},{passive:true});
addEventListener('resize',updateScroll,{passive:true});
document.querySelectorAll('.magnetic').forEach(button=>{
  button.addEventListener('pointermove',event=>{
    if(motion.paused||event.pointerType!=='mouse')return;
    const rect=button.getBoundingClientRect();
    button.style.transform='translate('+(event.clientX-rect.left-rect.width/2)*.1+'px,'+(event.clientY-rect.top-rect.height/2)*.15+'px)';
  });
  button.addEventListener('pointerleave',()=>{button.style.transform='';});
});
document.querySelector('#year').textContent=new Date().getFullYear();
document.addEventListener('site:language',()=>{
  setMotion();
  updateScroll();
});
initTeamProfiles();
updateScroll();
document.addEventListener('site:page',updateScroll);
await document.fonts.ready;
function firstAppearance(target,initialize){
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    observer.disconnect();
    initialize();
  },{rootMargin:'180px'});
  observer.observe(target);
}
firstAppearance(document.querySelector('#robot-canvas'),()=>{
  try{robot=initRobot(motion);updateScroll();}
  catch(error){
  console.error('Robot scene unavailable:',error);
  document.querySelector('.scene-fallback').hidden=false;
  document.querySelector('.scene-loading')?.remove();
  document.querySelector('#robot-canvas').dataset.ready='failed';
  document.querySelectorAll('.robot-toolbar button,.view-controls button').forEach(button=>button.disabled=true);
  }
});
firstAppearance(document.querySelector('#badge-canvas'),()=>{
  try{initBadges(motion);}
  catch(error){
    console.error('Badge scene unavailable:',error);
    showTeamFallback();
  }
});
