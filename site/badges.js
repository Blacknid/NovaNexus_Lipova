import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { members, openMemberProfile, registerBadgePresentation, selectMember, teamLabel } from './team.js';
import { createBadgePresentation } from './badge-presentation.js';

export function initBadges(motion){
  const host=document.querySelector('#badge-canvas');
  const selector=document.querySelector('#member-selector');
  const buttons=members.map((member,i)=>{
    const button=document.createElement('button');
    button.type='button';
    button.textContent=member.number;
    button.setAttribute('aria-pressed',String(i===0));selector.append(button);return button;
  });
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.setClearColor(0xe7ebe5,1);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  renderer.domElement.setAttribute('aria-hidden','true');
  host.append(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,.1,50);
  camera.position.set(0,.3,7.45);camera.lookAt(0,.3,0);
  const pmrem=new THREE.PMREMGenerator(renderer),env=new RoomEnvironment();
  const envMap=pmrem.fromScene(env,.04);scene.environment=envMap.texture;env.dispose();pmrem.dispose();
  const key=new THREE.DirectionalLight(0xffffff,2.0);key.position.set(-3.5,5,7);key.castShadow=true;
  const shadowSize=window.innerWidth<701?1024:2048;
  key.shadow.mapSize.set(shadowSize,shadowSize);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.015;key.shadow.bias=-.0003;key.shadow.radius=4;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe4f1de,.75);fill.position.set(5,1,3);scene.add(fill,new THREE.AmbientLight(0xffffff,.3));
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(30,16),new THREE.MeshStandardMaterial({color:0xe7ebe5,roughness:1,metalness:0}));
  backdrop.position.set(0,0,-1.4);backdrop.receiveShadow=true;scene.add(backdrop);
  const metal=new THREE.MeshStandardMaterial({color:0xc2cbc6,metalness:1,roughness:.24});
  const darkMetal=new THREE.MeshStandardMaterial({color:0x313d35,metalness:.85,roughness:.32});
  const edgeMaterial=new THREE.MeshStandardMaterial({color:0xadb5a9,metalness:.3,roughness:.44});
  const width=1.68,height=2.45,cardCenter=-1.44;
  function roundedShape(w,h,r){
    const s=new THREE.Shape(),x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const hole=new THREE.Path();hole.absellipse(0,h/2-.14,.14,.024,0,Math.PI*2,true,0);s.holes.push(hole);return s;
  }
  const shape=roundedShape(width,height,.07);
  const bodyGeometry=new THREE.ExtrudeGeometry(shape,{depth:.038,bevelEnabled:true,bevelThickness:.012,bevelSize:.008,bevelSegments:2,curveSegments:12,steps:1});
  const faceGeometry=new THREE.ShapeGeometry(shape,16);
  const uv=faceGeometry.getAttribute('uv'),pos=faceGeometry.getAttribute('position');
  for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/width+.5,pos.getY(i)/height+.5);
  const laminate = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, toneMapped:false,
    vertexShader:`
      varying vec2 sheetUV; varying vec3 sheetNormal; varying vec3 toEye;
      void main() {
        sheetUV=uv; sheetNormal=normalMatrix*normal;
        vec4 viewPosition=modelViewMatrix*vec4(position,1.);
        toEye=-viewPosition.xyz; gl_Position=projectionMatrix*viewPosition;
      }`,
    fragmentShader:`
      varying vec2 sheetUV; varying vec3 sheetNormal; varying vec3 toEye;
      void main() {
        vec3 n=normalize(sheetNormal);
        float band=1.-smoothstep(.02,.30,abs(sheetUV.x+.20*sheetUV.y-(1.63-1.77*abs(n.x))));
        float rim=pow(1.-abs(dot(n,normalize(toEye))),3.);
        gl_FragColor=vec4(.88,.96,.85,.15*band+.16*rim);
      }`
  });
  function textureCanvas(back=false,member=members[0]){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;
    const ctx=canvas.getContext('2d');ctx.fillStyle=back?'#121c17':'#f3f4ec';ctx.fillRect(0,0,512,768);
    for(let i=0;i<3000;i++){ctx.fillStyle=back?'rgba(220,255,210,.025)':'rgba(15,30,15,.025)';ctx.fillRect((i*71)%512,(i*127)%768,1,1);}
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(back){
      const stock=ctx.createLinearGradient(0,0,512,768);
      stock.addColorStop(0,'#24372d');stock.addColorStop(.58,'#101d17');stock.addColorStop(1,'#15271c');
      ctx.fillStyle=stock;ctx.fillRect(0,0,512,768);
      ctx.strokeStyle='#586d59';ctx.lineWidth=1.5;ctx.strokeRect(17,17,478,734);
      ctx.textAlign='left';ctx.fillStyle='#dce7d9';ctx.font='600 25px Space, sans-serif';ctx.fillText('FTC',39,79);
      ctx.textAlign='right';ctx.fillStyle=member.color;ctx.font='19px monospace';ctx.fillText(member.number+' / 15',473,79);
      // Fine interlaced print that remains legible as the laminate turns.
      ctx.save();ctx.translate(256,294);
      const lobes=4+member.id%4;
      for(let j=0;j<46;j++){
        ctx.lineWidth=j%6===0?1.8:1;
        ctx.globalAlpha=.22+.34*(.5+.5*Math.sin(j*.12));
        ctx.strokeStyle=member.color;ctx.beginPath();
        for(let i=0;i<=164;i++){
          const a=i*Math.PI/82;
          const r=80+j*1.35+12*Math.sin(a*lobes+j*.088)+6*Math.cos(a*3-j*.15);
          const x=Math.cos(a)*r*1.11,y=Math.sin(a)*r;
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.closePath();ctx.stroke();
      }
      ctx.restore();
      ctx.textAlign='center';ctx.fillStyle='#edf6e3';ctx.font='600 96px Space, sans-serif';ctx.fillText(member.monogram,256,294,230);
      ctx.fillStyle=member.color;ctx.font='17px monospace';ctx.fillText(teamLabel('MEMBRU','MEMBER')+' '+member.number,256,468);
      ctx.fillStyle='#f4f7ec';ctx.font='600 40px Space, sans-serif';ctx.fillText('@'+member.handle,256,522,446);
      ctx.strokeStyle='#475e4d';ctx.beginPath();ctx.moveTo(39,687);ctx.lineTo(473,687);ctx.stroke();
      ctx.fillStyle='#afc1ac';ctx.font='16px Space, sans-serif';ctx.fillText('FIRST TECH CHALLENGE',256,717);
    }else{
      ctx.textAlign='left';ctx.fillStyle='#56634f';ctx.font='15px monospace';ctx.fillText('FTC / ROBOTICS',37,78);
      ctx.textAlign='right';ctx.fillText(member.number+' / 15',475,78);
      ctx.textAlign='center';ctx.fillStyle='#172319';ctx.font='600 39px Space, sans-serif';ctx.fillText(teamLabel('Echipa FTC','FTC Team'),256,141);
      ctx.fillStyle=member.color;ctx.fillRect(42,196,428,305);
      ctx.save();ctx.beginPath();ctx.rect(42,196,428,305);ctx.clip();
      ctx.strokeStyle='rgba(30,55,30,.1)';ctx.lineWidth=1;
      for(let i=42;i<472;i+=28){ctx.beginPath();ctx.moveTo(i,196);ctx.lineTo(i,501);ctx.stroke();}
      for(let i=196;i<502;i+=28){ctx.beginPath();ctx.moveTo(42,i);ctx.lineTo(470,i);ctx.stroke();}
      ctx.strokeStyle='#8eaa83';ctx.beginPath();ctx.arc(256,340,116,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#203326';ctx.font='600 144px Space, sans-serif';
      ctx.fillText(member.monogram,256,353);
      ctx.restore();
      ctx.fillStyle='#18301e';ctx.font='600 39px Space, sans-serif';ctx.fillText('@'+member.handle,256,563,434);
      ctx.fillStyle='#485846';ctx.font='20px Space, sans-serif';ctx.fillText('Instagram',256,611);
      ctx.strokeStyle='#c4cbbc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(35,661);ctx.lineTo(477,661);ctx.stroke();
      ctx.fillStyle='#283b27';ctx.textAlign='left';ctx.font='15px monospace';ctx.fillText(teamLabel('MEMBRU / ','MEMBER / ')+member.number,37,704);
      for(let i=0;i<35;i++){const bw=i%3===0?3:1;ctx.fillRect(352+i*3.5,687,bw,33);}
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;
  }
  const strapCanvas=document.createElement('canvas');strapCanvas.width=128;strapCanvas.height=1024;
  const strapCtx=strapCanvas.getContext('2d');strapCtx.fillStyle='#19241e';strapCtx.fillRect(0,0,128,1024);
  for(let x=0;x<128;x+=3){strapCtx.fillStyle='rgba(180,200,170,.07)';strapCtx.fillRect(x,0,1,1024);}
  strapCtx.strokeStyle='#506146';strapCtx.lineWidth=2;strapCtx.strokeRect(7,0,114,1024);
  strapCtx.save();strapCtx.translate(64,512);strapCtx.rotate(-Math.PI/2);strapCtx.fillStyle='#c6d7b1';strapCtx.font='bold 35px sans-serif';strapCtx.textAlign='center';strapCtx.textBaseline='middle';strapCtx.fillText('FTC  /  BUILT TOGETHER  /  FTC',0,0);strapCtx.restore();
  const strapTexture=new THREE.CanvasTexture(strapCanvas);strapTexture.colorSpace=THREE.SRGBColorSpace;strapTexture.wrapT=THREE.RepeatWrapping;
  const strapMaterial=new THREE.MeshStandardMaterial({map:strapTexture,roughness:.85,metalness:.12,side:THREE.DoubleSide});
  const segmentCount=10,ropeLength=1.4,restLength=ropeLength/(segmentCount-1),ropeSegments=32;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),-.12);
  let selected=0,page=0,perPage=window.innerWidth<701?1:3,visible=true,drag=null,time=0,last=performance.now(),accumulator=0;
  const createMesh=(geometry,mat,parent,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const railMaterial = new THREE.MeshStandardMaterial({color: 0x7b8980, metalness: .67, roughness: .42});
  createMesh(new THREE.BoxGeometry(32, .082, .12), railMaterial, scene, 0, 2.71, -.10);
  const hangerGeometry = new THREE.TorusGeometry(.068, .017, 8, 22);
  const badges=members.map((member,index)=>{
    const group=new THREE.Group();scene.add(group);
    const hanger=createMesh(hangerGeometry,darkMetal,scene);
    const frontMaterial=new THREE.MeshBasicMaterial({map:textureCanvas(false,member),toneMapped:false});
    const backMaterial=new THREE.MeshBasicMaterial({color:0x1c2d22,toneMapped:false});
    const body=createMesh(bodyGeometry,edgeMaterial,group,0,cardCenter,-.019);
    const face=createMesh(faceGeometry,frontMaterial,group,0,cardCenter,.034);
    const back=createMesh(faceGeometry,backMaterial,group,0,cardCenter,-.034);back.rotation.y=Math.PI;
    for(const sign of [-1,1]){
      const film=new THREE.Mesh(faceGeometry,laminate);
      film.position.set(0,cardCenter,sign*.036);
      film.rotation.y=sign<0?Math.PI:0;group.add(film);
    }
    const topRing=createMesh(new THREE.TorusGeometry(.066,.014,10,28),metal,group,0,-.06,0);
    createMesh(new THREE.BoxGeometry(.1,.12,.03),metal,group,0,-.165,0);
    createMesh(new THREE.BoxGeometry(.13,.11,.035),darkMetal,group,0,-.24,.025);
    createMesh(new THREE.TorusGeometry(.026,.007,6,18),metal,group,0,-.235,.049);
    const ropeGeometry=new THREE.BufferGeometry();
    const ropePositions=new Float32Array((ropeSegments+1)*2*3),ropeUVs=new Float32Array((ropeSegments+1)*2*2),indices=[];
    for(let s=0;s<=ropeSegments;s++){ropeUVs[s*4]=0;ropeUVs[s*4+1]=s/ropeSegments*1.3;ropeUVs[s*4+2]=1;ropeUVs[s*4+3]=s/ropeSegments*1.3;if(s<ropeSegments){const n=s*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
    ropeGeometry.setAttribute('position',new THREE.BufferAttribute(ropePositions,3).setUsage(THREE.DynamicDrawUsage));
    ropeGeometry.setAttribute('uv',new THREE.BufferAttribute(ropeUVs,2));ropeGeometry.setIndex(indices);
    const rope=new THREE.Mesh(ropeGeometry,strapMaterial);rope.castShadow=true;rope.frustumCulled=false;scene.add(rope);
    const nodes=Array.from({length:segmentCount},()=>({position:new THREE.Vector3(),previous:new THREE.Vector3()}));
    const badge={index,member,group,body,face,back,hanger,rope,ropeGeometry,nodes,anchor:new THREE.Vector3(),angle:0,angularVelocity:0,restAngle:0,tiltX:0,tiltZ:0,active:false};
    body.userData.badgeIndex=index;face.userData.badgeIndex=index;back.userData.badgeIndex=index;
    return badge;
  });
  function printBack(badge) {
    const material=badge.back.material;
    if(material.map)return;
    material.map=textureCanvas(true,badge.member);
    material.color.setHex(0xffffff);
    material.needsUpdate=true;
  }
  function resetBadge(badge,x,entry=true){
    badge.anchor.set(x,2.65,0);badge.nodes.forEach((node,i)=>{
      const fraction=i/(segmentCount-1);
      const offset=entry&&!motion.paused?Math.sin(badge.index*2+.5)*.32*fraction:0;
      node.position.set(x+offset,2.65-restLength*i,0);
      node.previous.copy(node.position);
    });
    badge.angle=entry&&!motion.paused?Math.sin(badge.index+1)*.3:0;badge.angularVelocity=0;badge.restAngle=0;badge.tiltX=0;badge.tiltZ=0;
    badge.arrival=entry&&!motion.paused&&!motion.reduced?performance.now()+badge.index%perPage*65:0;
  }
  function showPage(nextPage,nextSelected=null){
    page=(nextPage+Math.ceil(members.length/perPage))%Math.ceil(members.length/perPage);
    selected=nextSelected??page*perPage;
    selectMember(members[selected]);
    drag=null;
    badges.forEach((badge,i)=>{
      badge.active=i>=page*perPage&&i<(page+1)*perPage;
      badge.group.visible=badge.rope.visible=badge.hanger.visible=badge.active;
      if(badge.active)resetBadge(badge,perPage===1?0:(i%3-1)*2.65);
      buttons[i].setAttribute('aria-pressed',String(i===selected));
    });
    const start=page*perPage+1,end=Math.min((page+1)*perPage,members.length);
    document.querySelector('#badge-range').textContent=(perPage===1?String(start).padStart(2,'0'):String(start).padStart(2,'0')+' — '+String(end).padStart(2,'0'))+' / 15';
    host.dataset.selected=String(selected+1);host.dataset.visibleMembers=badges.filter(b=>b.active).map(b=>b.index+1).join(',');
  }
  function labelSelectors(){
    buttons.forEach((button, i) => {
      const label = teamLabel('Selectează ecusonul lui @','Select the badge for @') + members[i].handle;
      button.title = label;
      button.setAttribute('aria-label', label);
    });
  }
  labelSelectors();
  document.addEventListener('site:language', () => {
    labelSelectors();
    for (const badge of badges) {
      const material = badge.face.material;
      material.map.dispose();
      material.map = textureCanvas(false, badge.member);
    }
    for(const badge of badges)if(badge.back.material.map){
      badge.back.material.map.dispose();badge.back.material.map=null;printBack(badge);
    }
  });
  buttons.forEach((button,i)=>button.addEventListener('click',()=>showPage(Math.floor(i/perPage),i)));
  document.querySelector('#badge-prev').addEventListener('click',()=>showPage(page-1));
  document.querySelector('#badge-next').addEventListener('click',()=>showPage(page+1));
  const flip=(badge)=>{printBack(badge);badge.restAngle+=Math.PI;badge.angularVelocity+=2.8;};
  document.querySelector('#badge-flip').addEventListener('click',()=>flip(badges[selected]));
  document.querySelector('#badge-swing').addEventListener('click',()=>{
    const badge=badges[selected];
    badge.nodes.slice(1).forEach((node,i)=>{node.previous.x-=.026*(i+1)/segmentCount;node.previous.z+=.006;});
    badge.angularVelocity+=2;
  });
  document.querySelector('#badge-reset').addEventListener('click',()=>badges.filter(b=>b.active).forEach(b=>resetBadge(b,perPage===1?0:(b.index%3-1)*2.65,false)));
  function updatePointer(event){
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  }
  renderer.domElement.addEventListener('pointerdown',event=>{
    if(presentation.active || event.button!==0 || drag)return;
    updatePointer(event);
    const targets=badges.filter(b=>b.active).flatMap(b=>[b.body,b.face,b.back]);
    const hit=raycaster.intersectObjects(targets,false)[0];if(!hit)return;
    selected=hit.object.userData.badgeIndex;selectMember(members[selected]);buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
    const badge=badges[selected],intersection=new THREE.Vector3();
    raycaster.ray.intersectPlane(plane,intersection);
    drag={badge,offset:badge.nodes.at(-1).position.clone().sub(intersection),target:badge.nodes.at(-1).position.clone(),lastPoint:intersection.clone(),pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,moved:false};
    renderer.domElement.setPointerCapture(event.pointerId);host.dataset.dragging='true';host.dataset.selected=String(selected+1);
  });
  renderer.domElement.addEventListener('pointermove',event=>{
    if(presentation.active)return;
    updatePointer(event);
    if(!drag){
      const hits=raycaster.intersectObjects(badges.filter(b=>b.active).flatMap(b=>[b.body,b.face,b.back]),false);
      host.style.cursor=hits.length?'grab':'default';return;
    }
    if(event.pointerId!==drag.pointerId)return;
    const point=new THREE.Vector3();if(!raycaster.ray.intersectPlane(plane,point))return;
    drag.target.copy(point).add(drag.offset);
    const fromAnchor=drag.target.clone().sub(drag.badge.anchor);if(fromAnchor.length()>ropeLength*.995)drag.target.copy(drag.badge.anchor).add(fromAnchor.setLength(ropeLength*.995));
    drag.badge.angularVelocity=THREE.MathUtils.clamp(drag.badge.angularVelocity+(point.x-drag.lastPoint.x)*5,-10,10);
    drag.lastPoint.copy(point);drag.moved ||= Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>6;
    host.style.cursor='grabbing';
  });
  function release(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    const badge=drag.badge;
    const tapped = !drag.moved && event.type==='pointerup';
    if(!tapped)badge.restAngle=Math.round(badge.angle/(Math.PI*2))*Math.PI*2;
    if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);
    drag=null;host.dataset.dragging='false';host.style.cursor='grab';
    if (tapped) openMemberProfile(badge.member, buttons[badge.index]);
  }
  renderer.domElement.addEventListener('pointerup',release);
  renderer.domElement.addEventListener('pointercancel',release);
  renderer.domElement.addEventListener('lostpointercapture',event=>{if(drag&&event.pointerId===drag.pointerId){drag=null;host.dataset.dragging='false';}});

  const velocityScratch=new THREE.Vector3(),constraintScratch=new THREE.Vector3();
  function simulate(badge,dt){
    const nodes=badge.nodes,dragged=drag?.badge===badge;
    nodes[0].position.copy(badge.anchor);nodes[0].previous.copy(badge.anchor);
    for(let i=1;i<nodes.length;i++){
      const node=nodes[i];
      if(dragged&&i===nodes.length-1){node.previous.copy(node.position);node.position.copy(drag.target);continue;}
      const velocity=velocityScratch.copy(node.position).sub(node.previous).multiplyScalar(.992);
      node.previous.copy(node.position);node.position.add(velocity);node.position.y-=13*dt*dt;
      if(!motion.paused)node.position.x+=Math.sin(time*.7+badge.index)*.000006*i;
    }
    for(let iteration=0;iteration<14;iteration++){
      nodes[0].position.copy(badge.anchor);if(dragged)nodes.at(-1).position.copy(drag.target);
      for(let i=0;i<nodes.length-1;i++){
        const a=nodes[i],b=nodes[i+1],difference=constraintScratch.copy(b.position).sub(a.position),distance=difference.length();
        if(distance<.00001)continue;
        const wa=i===0?0:1,wb=i+1===nodes.length-1?(dragged?0:.2):1,total=wa+wb;
        if(!total)continue;
        const correction=difference.multiplyScalar((distance-restLength)/distance);
        a.position.addScaledVector(correction,wa/total);b.position.addScaledVector(correction,-wb/total);
      }
    }
    const difference=badge.restAngle-badge.angle;
    if(!dragged)badge.angularVelocity+=(difference*6-badge.angularVelocity*3.8)*dt;
    else badge.angularVelocity*=.99;
    badge.angle+=badge.angularVelocity*dt;
  }
  const side=new THREE.Vector3(),tangent=new THREE.Vector3(),unitX=new THREE.Vector3(1,0,0);
  function drawBadge(badge,dt,now=performance.now()){
    const nodes=badge.nodes,end=nodes.at(-1).position;
    badge.group.position.copy(end);
    tangent.copy(end).sub(nodes.at(-2).position).normalize();
    const targetZ=Math.atan2(tangent.x,-tangent.y)*.65,targetX=-Math.atan2(tangent.z,-tangent.y)*.55;
    badge.tiltZ=THREE.MathUtils.lerp(badge.tiltZ,targetZ,1-Math.exp(-dt*7));
    badge.tiltX=THREE.MathUtils.lerp(badge.tiltX,targetX,1-Math.exp(-dt*7));
    const pose=presentation.deformation(badge);
    badge.hanger.position.copy(badge.anchor);
    badge.hanger.position.y+=.035;
    badge.hanger.position.z-=.025;
    if(pose && !pose.fixedAnchor)badge.hanger.position.x+=pose.shift.x;
    const age=Math.max(0,(now-badge.arrival)/1000);
    const settling=badge.arrival && age<1.35 && !motion.paused ? Math.exp(-5.5*age)*Math.cos(10*age) : 0;
    const yaw=pose?.yaw??badge.angle;
    badge.group.position.y+=settling*.67;
    if(pose)badge.group.position.add(pose.shift);
    badge.group.rotation.set(badge.tiltX*(pose?.damp??1)+(pose?.pitch??0),yaw,
      (badge.tiltZ + settling*.105*(badge.index%2?1:-1))*(pose?.damp??1)+(pose?.roll??0),'ZXY');
    const curve=new THREE.CatmullRomCurve3(nodes.map((node,i)=>{
      const f=i/(nodes.length-1), point=node.position.clone();
      point.y+=settling*.67*f*f;
      if(pose){
        point.addScaledVector(pose.shift,f*f);
        if(!pose.fixedAnchor)point.x+=pose.shift.x*(1-f*f);
      }
      return point;
    })),positions=badge.ropeGeometry.attributes.position;
    for(let i=0;i<=ropeSegments;i++){
      const t=i/ropeSegments,point=curve.getPoint(t),direction=curve.getTangent(t).normalize();
      side.copy(unitX).applyAxisAngle(direction,yaw*Math.pow(t,3)).multiplyScalar(.061);
      positions.setXYZ(i*2,point.x-side.x,point.y-side.y,point.z-side.z);
      positions.setXYZ(i*2+1,point.x+side.x,point.y+side.y,point.z+side.z);
    }
    positions.needsUpdate=true;badge.ropeGeometry.computeVertexNormals();
  }
  function resize(){
    if(presentation.active)return;
    const rect=host.getBoundingClientRect();
    if(rect.width<1||rect.height<1)return;
    renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;
    camera.position.z=rect.width<701?7.4:Math.max(7.5,10.9/camera.aspect);
    camera.updateProjectionMatrix();
    const nextPerPage=window.innerWidth<701?1:3;
    if(nextPerPage!==perPage){perPage=nextPerPage;showPage(Math.floor(selected/perPage),selected);}
  }
  const presentation=createBadgePresentation({host,camera,renderer,motion,restore(badge){
    resize();
    if(!motion.paused&&!motion.reduced){
      badge.nodes.slice(1).forEach((node,i)=>{const fraction=(i+1)/(segmentCount-1);node.previous.x-=.013*fraction;node.previous.z-=.009*fraction;});
      badge.angularVelocity+=(badge.index%2?1:-1)*2.1;
    }
    badges.filter(b=>b.active).forEach(b=>drawBadge(b,1/60));
    renderer.render(scene,camera);
  }});
  registerBadgePresentation({
    prepare(member){
      const index=member.id-1;
      if(!host.clientWidth || host.hidden)return false;
      if(!badges[index].active)showPage(Math.floor(index/perPage),index);
      const rect=host.getBoundingClientRect();
      if(rect.bottom<innerHeight*.28||rect.top>innerHeight*.72)host.scrollIntoView({block:'center',behavior:'instant'});
      printBack(badges[index]);
      return true;
    },
    open(member,ui){
      presentation.open(badges[member.id-1],ui);
      badges.filter(b=>b.active).forEach(b=>drawBadge(b,0));
      renderer.render(scene,camera);presentation.positionLink();
    },
    close(done,immediate){presentation.close(done,immediate);}
  });
  document.addEventListener('site:page', event=>{
    if(event.detail.page==='echipa'&&event.detail.previous!=='echipa')showPage(page,selected);
  });
  showPage(0);resize();new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>visible=entries[0].isIntersecting,{rootMargin:'150px'}).observe(host);
  function tick(now){
    requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.05);last=now;
    if((!visible&&!presentation.active)||document.hidden)return;
    if(!motion.paused)time+=dt;
    accumulator=Math.min(accumulator+dt,.05);
    while(accumulator>=1/120){badges.filter(b=>b.active).forEach(b=>simulate(b,1/120));accumulator-=1/120;}
    presentation.updateCamera(now);
    badges.filter(b=>b.active).forEach(b=>drawBadge(b,dt,now));
    renderer.render(scene,camera);
    presentation.positionLink();
  }
  badges.filter(b=>b.active).forEach(b=>drawBadge(b,1/60));renderer.render(scene,camera);requestAnimationFrame(tick);
  host.querySelector('.badge-loading')?.remove();host.dataset.ready='true';host.dataset.memberCount=String(members.length);
  return {renderer,badges};
}
