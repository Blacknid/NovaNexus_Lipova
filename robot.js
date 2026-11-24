import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCameraDirector } from './robot-camera.js';
import { currentPart } from './pages.js';

export function initRobot(motion) {
  const container = document.querySelector('#robot-canvas');
  const mobile = () => window.innerWidth < 701;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.4 : 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, .04);
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 90);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .055;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = .25;
  controls.maxPolarAngle = Math.PI * .62;
  renderer.domElement.style.touchAction = 'pan-y';
  let userMoved = false;
  controls.addEventListener('start', () => { userMoved = true; });
  const root = new THREE.Group();
  scene.add(root);
  const geometryCache = new Map();
  const boltSets = new Map();
  const assemblies = [];
  const wheels = [];
  const gears = [];
  const material = (color, metalness = .6, roughness = .38, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const materials = {
    steel: material(0x9eada5, .95, .3),
    darkSteel: material(0x3e4947, .8, .34),
    black: material(0x111918, .5, .48),
    rubber: material(0x222a26, .12, .82),
    lime: material(0xc9f44e, .38, .34),
    limeDark: material(0x6e8d27, .7, .38),
    copper: material(0xc58f4c, .9, .3),
    red: material(0xd94932, .3, .48),
    cyan: material(0x81e6d8, .4, .24, { emissive: 0x2caa95, emissiveIntensity: .65 }),
    led: material(0xcfff65, .1, .3, { emissive: 0xb8ff44, emissiveIntensity: 1.5 }),
    glass: material(0x071c23, .85, .1, { emissive: 0x0c535b, emissiveIntensity: .3 }),
  };
  const cached = (key, make) => { if (!geometryCache.has(key)) geometryCache.set(key, make()); return geometryCache.get(key); };
  function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent, w, h, d, x, y, z, mat = materials.steel) {
    return mesh(parent, cached(['b',w,h,d].join(','), () => new THREE.BoxGeometry(w,h,d)), mat, x,y,z);
  }
  function cylinder(parent, radius, height, x,y,z, mat = materials.steel, axis = 'y', segments = 24) {
    const object = mesh(parent,cached(['c',radius,height,segments].join(','),()=>new THREE.CylinderGeometry(radius,radius,height,segments)),mat,x,y,z);
    if (axis === 'x') object.rotation.z = Math.PI/2;
    if (axis === 'z') object.rotation.x = Math.PI/2;
    return object;
  }
  function ring(parent, radius, tube, x,y,z, mat = materials.steel, axis = 'z') {
    const object = mesh(parent,cached(['r',radius,tube].join(','),()=>new THREE.TorusGeometry(radius,tube,8,40)),mat,x,y,z);
    if (axis === 'x') object.rotation.y = Math.PI/2;
    if (axis === 'y') object.rotation.x = Math.PI/2;
    return object;
  }
  function beam(parent,a,b,width,mat=materials.steel) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
    const object=box(parent,width,start.distanceTo(end),width,...start.clone().add(end).multiplyScalar(.5).toArray(),mat);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());
    return object;
  }
  function bolt(parent,x,y,z,axis='z') {
    if (!boltSets.has(parent)) boltSets.set(parent,[]);
    const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(axis==='x'?1:0,axis==='y'?1:0,axis==='z'?1:0));
    boltSets.get(parent).push(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),quaternion,new THREE.Vector3(1,1,1)));
  }
  function cable(parent,points,mat=materials.red,radius=.025) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return mesh(parent,new THREE.TubeGeometry(curve,32,radius,6,false),mat);
  }
  function perforatedRail(parent,length,height,x,y,z,side=false) {
    const shape=new THREE.Shape();
    shape.moveTo(-length/2,-height/2);shape.lineTo(length/2,-height/2);shape.lineTo(length/2,height/2);shape.lineTo(-length/2,height/2);shape.closePath();
    for(let p=-length/2+.14;p<length/2-.1;p+=.22){const hole=new THREE.Path();hole.absarc(p,0,.055,0,Math.PI*2,true);shape.holes.push(hole);}
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:1,steps:1,curveSegments:8});
    const plate=mesh(parent,geo,materials.steel,x,y,z);
    if(side)plate.rotation.y=Math.PI/2;
    if(side){box(parent,.2,.035,length,x,y-height/2,z,materials.darkSteel);box(parent,.2,.035,length,x,y+height/2,z);}
    else{box(parent,length,.035,.2,x,y-height/2,z,materials.darkSteel);box(parent,length,.035,.2,x,y+height/2,z);}
    return plate;
  }
  function label(parent,text,w,h,x,y,z,bg='#101916',fg='#d5ff6a',rotateX=0) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);
    ctx.strokeStyle=fg;ctx.strokeRect(9,9,494,110);ctx.fillStyle=fg;ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    const object=mesh(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.55,metalness:.25}),x,y,z);object.rotation.x=rotateX;return object;
  }
  function assembly(x,y,z,explosion) {
    const group=new THREE.Group();group.position.set(x,y,z);root.add(group);
    assemblies.push({group,base:group.position.clone(),offset:new THREE.Vector3(...explosion)});
    return group;
  }

  // Perforated aluminum chassis, four independent mecanum modules.
  const chassis=assembly(0,0,0,[0,-.25,0]);
  chassis.userData.part = 'chassis';
  perforatedRail(chassis,3.25,.27,0,.72,1.43);
  perforatedRail(chassis,3.25,.27,0,.72,-1.43);
  perforatedRail(chassis,3.15,.27,-1.49,.72,0,true);
  perforatedRail(chassis,3.15,.27,1.49,.72,0,true);
  const deck=new THREE.Shape();
  deck.moveTo(-1.42,-1.35);deck.lineTo(1.42,-1.35);deck.lineTo(1.42,1.35);deck.lineTo(-1.42,1.35);deck.closePath();
  for(const x of [-.9,0,.9])for(const y of [-.85,0,.85]){const hole=new THREE.Path();hole.absarc(x,y,.22,0,Math.PI*2,true);deck.holes.push(hole);}
  const floor=mesh(chassis,new THREE.ExtrudeGeometry(deck,{depth:.045,bevelEnabled:false,curveSegments:12}),materials.black,0,.52,0);floor.rotation.x=-Math.PI/2;
  for(const x of [-1.2,1.2])for(const z of [-1.15,1.15]){
    box(chassis,.36,.09,.36,x,.88,z,materials.limeDark);
    bolt(chassis,x-.1,.94,z-.1,'y');bolt(chassis,x+.1,.94,z+.1,'y');
    box(chassis,.22,.4,.3,x,.48,z,materials.darkSteel);
  }
  for(const x of [-1.54,1.54]){
    box(chassis,.045,.13,2.3,x,.76,0,materials.lime);
    for(let z=-1;z<=1;z+=.25)bolt(chassis,x*1.025,.76,z,'x');
    for(const z of [-1.05,1.05]){
      cylinder(chassis,.18,.55,x*.63,.81,z,materials.black,'x');
      cylinder(chassis,.19,.07,x*.84,.81,z,materials.steel,'x');
      cylinder(chassis,.06,.4,x,.81,z,materials.steel,'x');
      cable(chassis,[[x*.6,.8,z],[x*.35,.95,z*.8],[.3,.83,.15]],materials.red);
    }
  }
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const wheel=assembly(sx*1.78,.47,sz*1.12,[sx*.72,-.18,sz*.28]);
    wheel.userData.part = 'wheels';
    const spin=new THREE.Group();wheel.add(spin);wheels.push(spin);
    cylinder(spin,.34,.44,0,0,0,materials.darkSteel,'x');
    cylinder(spin,.23,.51,0,0,0,materials.lime,'x');
    cylinder(spin,.105,.56,0,0,0,materials.steel,'x',12);
    for(const x of [-.23,.23])ring(spin,.325,.034,x,0,0,materials.steel,'x');
    const rollers=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.126,.27,4,10),materials.rubber,10);
    const axle=new THREE.InstancedMesh(new THREE.CylinderGeometry(.039,.039,.62,8),materials.steel,10);
    for(let i=0;i<10;i++){
      const theta=i/10*Math.PI*2;
      const pos=new THREE.Vector3(0,Math.cos(theta)*.435,Math.sin(theta)*.435);
      const direction=new THREE.Vector3(.72*sx*sz,-Math.sin(theta)*.7,Math.cos(theta)*.7).normalize();
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
      const matrix=new THREE.Matrix4().compose(pos,q,new THREE.Vector3(1,1,1));
      rollers.setMatrixAt(i,matrix);axle.setMatrixAt(i,matrix);
      bolt(spin,sx*.28,Math.cos(theta)*.2,Math.sin(theta)*.2,'x');
    }
    rollers.castShadow=true;axle.castShadow=true;spin.add(rollers,axle);
  }

  // Electronics: finned controller, battery, ports, loomed power and signal wires.
  const electronics=assembly(0,.81,0,[0,.8,.2]);
  electronics.userData.part = 'electronics';
  box(electronics,.8,.38,1.1,-.52,.12,-.15,materials.black);
  box(electronics,.82,.06,1.12,-.52,.34,-.15,materials.darkSteel);
  for(let i=0;i<9;i++)box(electronics,.66,.065,.026,-.52,.4,-.58+i*.11,materials.steel);
  for(let i=0;i<5;i++){box(electronics,.11,.13,.065,-.8+i*.14,.17,.44,materials.rubber);box(electronics,.06,.04,.075,-.8+i*.14,.17,.48,materials.copper);}
  const indicatorLights = [];
  for(let i=0;i<3;i++){
    const led=(i===0?materials.led:materials.cyan).clone();
    indicatorLights.push(led);
    cylinder(electronics,.035,.025,-.75+i*.12,.45,.21,led,'y',12);
  }
  label(electronics,'CONTROL',.66,.18,-.52,.19,.416);
  box(electronics,.63,.35,1.08,.57,.12,-.1,materials.red);
  box(electronics,.68,.1,1.12,.57,.13,-.1,materials.black);
  label(electronics,'POWER / 12V',.6,.19,.57,.31,.451,'#e9eee8','#152018');
  for(const x of [.39,.72])cylinder(electronics,.055,.09,x,.36,-.55,materials.copper);
  cable(electronics,[[.4,.4,-.55],[.28,.65,-.6],[-.15,.6,-.5],[-.3,.18,.44]],materials.red,.035);
  cable(electronics,[[.72,.4,-.55],[.9,.58,-.8],[-.1,.5,-.85],[-.75,.18,.44]],materials.black,.035);
  box(electronics,1.2,.08,.35,0,.1,.92,materials.lime);
  label(electronics,'FTC / LAB',.98,.19,0,.1,1.11);
  for(const x of [-.48,.48])bolt(electronics,x,.1,1.12);

  // Twin linear lift, winch, pulleys, bearings and moving tool carriage.
  const lift=assembly(0,.86,-.73,[0,1.05,-.45]);
  lift.userData.part = 'lift';
  for(const x of [-.88,.88]){
    box(lift,.22,2.9,.22,x,1.4,0,materials.darkSteel);
    box(lift,.085,2.9,.04,x,1.4,.13,materials.steel);
    box(lift,.04,2.7,.04,x-.085,1.4,.13,materials.limeDark);
    for(let i=0;i<10;i++)bolt(lift,x, .17+i*.28,.17);
    box(lift,.4,.1,.55,x,-.02,.05,materials.lime);
    for(const z of [-.1,.24])bolt(lift,x,.055,z,'y');
    cylinder(lift,.135,.15,x,2.88,.04,materials.black,'z');
    ring(lift,.126,.024,x,2.88,.125,materials.steel);
    cylinder(lift,.04,2.65,x+.16,1.4,.1,materials.steel);
    cable(lift,[[x-.08,.1,.13],[x-.08,2.83,.13],[x,2.99,.13],[x+.08,2.83,.13],[x+.08,.7,.13]],materials.black,.018);
  }
  box(lift,2.1,.12,.27,0,2.87,0,materials.steel);
  box(lift,1.9,.12,.25,0,.15,-.06,materials.darkSteel);
  cylinder(lift,.21,.58,0,.25,-.17,materials.black,'x');
  for(const x of [-.29,.29])cylinder(lift,.24,.04,x,.25,-.17,materials.lime,'x');
  cylinder(lift,.045,1.6,0,.25,-.17,materials.steel,'x');
  for(let i=0;i<12;i++)ring(lift,.19,.015,-.22+i*.04,.25,-.17,materials.copper,'x');
  const carriage=new THREE.Group();carriage.position.y=1.15;lift.add(carriage);
  for(const x of [-.88,.88]){
    box(carriage,.31,.5,.34,x,0,.04,materials.limeDark);
    for(const y of [-.16,.16])for(const dx of [-.16,.16]){
      cylinder(carriage,.08,.06,x+dx,y,.24,materials.rubber,'z',12);bolt(carriage,x+dx,y,.281);
    }
  }
  box(carriage,1.95,.22,.24,0,0,.15,materials.steel);
  for(const x of [-.6,.6]){
    beam(carriage,[x,0,.18],[x,.42,1.65],.1,materials.black);
    beam(carriage,[x,-.15,.18],[x,.24,1.65],.07,materials.steel);
    cylinder(carriage,.15,.12,x,0,.22,materials.lime,'x');
    bolt(carriage,x,.05,.3);
  }
  box(carriage,1.42,.1,.18,0,.4,1.64,materials.steel);
  const wrist=new THREE.Group();wrist.position.set(0,.32,1.85);carriage.add(wrist);
  wrist.userData.part = 'gripper';
  cylinder(wrist,.2,.34,0,0,0,materials.black,'x');
  box(wrist,.55,.22,.32,0,0,.1,materials.lime);
  const jaws=[];
  for(const sign of [-1,1]){
    const jaw=new THREE.Group();jaw.position.set(sign*.25,0,.23);wrist.add(jaw);jaws.push({jaw,sign});
    beam(jaw,[0,0,0],[sign*.24,0,.48],.11,materials.steel);
    beam(jaw,[sign*.24,0,.48],[sign*.04,0,.78],.1,materials.lime);
    box(jaw,.11,.26,.27,sign*.04,0,.69,materials.rubber);
    cylinder(jaw,.08,.14,0,0,0,materials.darkSteel,'y');bolt(jaw,0,.085,0,'y');
  }
  // Sensor bar and camera lenses.
  box(lift,.72,.28,.35,0,3.08,.04,materials.black);
  for(const x of [-.23,.23]){
    cylinder(lift,.095,.1,x,3.08,.255,materials.steel,'z');
    cylinder(lift,.069,.105,x,3.08,.27,materials.glass,'z');
    ring(lift,.078,.012,x,3.08,.326,materials.cyan);
  }
  cylinder(lift,.025,.04,0,3.11,.24,materials.led,'z',8);
  cable(lift,[[.3,.3,.1],[.4,1,.2],[.25,2,.15],[.3,3,.1]],materials.black,.032);
  cable(carriage,[[-.7,0,.12],[-.3,.12,.7],[0,.32,1.8]],materials.red,.022);
  label(lift,'ROBOTICS',1.25,.24,0,2.89,.15,'#c9f44e','#162214');

  // Front intake with spinning compliant wheels and side timing pulleys.
  const intake=assembly(0,.65,1.62,[0,.1,1.05]);
  intake.userData.part = 'intake';
  for(const x of [-1.13,1.13]){
    beam(intake,[x,0,-.2],[x,-.16,.74],.12,materials.steel);
    box(intake,.15,.54,.15,x,.05,.56,materials.lime);
    bolt(intake,x,.23,.65);
  }
  const roller=new THREE.Group();roller.position.set(0,.05,.55);intake.add(roller);
  cylinder(roller,.06,2.45,0,0,0,materials.steel,'x');
  for(let i=0;i<9;i++){
    cylinder(roller,.245,.11,-.92+i*.23,0,0,materials.lime,'x');
    ring(roller,.2,.024,-.92+i*.23,0,0,materials.rubber,'x');
    const phase=i*.52;
    const pad=box(roller,.107,.035,.092,-.92+i*.23,.242*Math.cos(phase),.242*Math.sin(phase),materials.rubber);
    pad.rotation.x=phase;
  }
  for(const x of [-1.23,1.23]){
    const gear=cylinder(intake,.22,.065,x,.05,.55,materials.darkSteel,'x',24);gears.push(gear);
    ring(intake,.215,.019,x,.05,.55,materials.copper,'x');
    cylinder(intake,.1,.24,x,-.02,-.1,materials.black,'x');
    cable(intake,[[x,.26,.55],[x,.2,-.1],[x,-.18,-.1],[x,-.18,.55],[x,.26,.55]],materials.rubber,.024);
  }
  for(const z of [-1.4,1.4])box(chassis,1.8,.025,.025,0,.92,z,materials.led);
  for(const [parent,matrices] of boltSets){
    const bolts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.045,.045,.034,6),materials.steel,matrices.length);
    matrices.forEach((m,i)=>bolts.setMatrixAt(i,m));bolts.castShadow=true;parent.add(bolts);
  }

  const selectable = [];
  const componentMeshes = new Map();
  root.traverse(object => {
    if (!object.isMesh) return;
    let group = object;
    while (group && !group.userData.part) group = group.parent;
    if (!group) return;
    const key = group.userData.part;
    object.userData.part = key;
    selectable.push(object);
    if (!componentMeshes.has(key)) componentMeshes.set(key, []);
    componentMeshes.get(key).push(object);
  });
  const originals = new Map();
  const highlights = new Map();
  function highlight(part) {
    originals.forEach((material, object) => { object.material = material; });
    originals.clear();
    for (const object of componentMeshes.get(part) || []) {
      const original = object.material;
      if (!highlights.has(original)) {
        const highlighted = original.clone();
        highlighted.emissive.setHex(0x64853c);
        highlighted.emissiveIntensity = .14;
        highlights.set(original, highlighted);
      }
      const highlighted = highlights.get(original);
      highlighted.wireframe = original.wireframe;
      originals.set(object, original);
      object.material = highlighted;
    }
  }
  const canvas = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let tap = null;
  canvas.addEventListener('pointerdown', event => {
    tap = event.isPrimary && event.button === 0
      ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  });
  canvas.addEventListener('pointermove', event => {
    if (tap?.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 6) tap = null;
  });
  canvas.addEventListener('pointercancel', () => { tap = null; });
  canvas.addEventListener('pointerup', event => {
    const start = tap;
    tap = null;
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(selectable, false);
    if (hit) document.dispatchEvent(new CustomEvent('robot:inspect', { detail: hit.object.userData.part }));
  });

  const ground=mesh(scene,new THREE.CircleGeometry(5.8,96),new THREE.ShadowMaterial({opacity:.35}),0,-.14,0);
  ground.rotation.x=-Math.PI/2;ground.castShadow=false;ground.receiveShadow=true;
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=256;
  const glowContext=glowCanvas.getContext('2d'),glowGradient=glowContext.createRadialGradient(128,128,5,128,128,128);
  glowGradient.addColorStop(0,'rgba(140,220,70,.12)');glowGradient.addColorStop(1,'rgba(140,220,70,0)');
  glowContext.fillStyle=glowGradient;glowContext.fillRect(0,0,256,256);
  const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;
  const floorGlow=mesh(scene,new THREE.PlaneGeometry(12,12),new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,depthWrite:false}),0,-.145,0);
  floorGlow.rotation.x=-Math.PI/2;floorGlow.castShadow=false;
  for(const radius of [2.75,3.9,5.5]){
    const orbit=mesh(scene,new THREE.RingGeometry(radius,radius+.012,96),new THREE.MeshBasicMaterial({color:0x9bc65a,transparent:true,opacity:radius===2.75?.28:.1,side:THREE.DoubleSide}),0,-.13,0);
    orbit.rotation.x=-Math.PI/2;orbit.castShadow=false;
  }
  const grid=new THREE.GridHelper(12,24,0x273825,0x1b2b21);grid.position.y=-.125;grid.material.transparent=true;grid.material.opacity=.24;scene.add(grid);
  const key=new THREE.DirectionalLight(0xf4ffe9,3.2);key.position.set(4,8,5);key.castShadow=true;
  key.shadow.mapSize.set(mobile()?1024:2048,mobile()?1024:2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=8;key.shadow.camera.bottom=-5;key.shadow.normalBias=.025;key.shadow.bias=-.0003;scene.add(key);
  const rim=new THREE.DirectionalLight(0xa7ff77,2.3);rim.position.set(-5,3,-4);scene.add(rim);
  const fill=new THREE.DirectionalLight(0x8bb8d7,1.5);fill.position.set(-3,2,6);scene.add(fill);
  scene.add(new THREE.AmbientLight(0xb2c6b5,.3));
  const particlesGeo=new THREE.BufferGeometry();const positions=[];
  for(let i=0;i<75;i++)positions.push((Math.sin(i*127.1)*.5+.5)*16-8,Math.cos(i*89.3)*3+3,Math.sin(i*56.9)*7-2);
  particlesGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const particles=new THREE.Points(particlesGeo,new THREE.PointsMaterial({color:0xc7dd9e,size:.018,transparent:true,opacity:.32,sizeAttenuation:true}));
  scene.add(particles);

  let progress=0,explosion=0,manualExplode=null,run=false,wire=false,visible=true,time=0,last=performance.now();
  let rotateBase=0;
  const baseCam=new THREE.Vector3(),baseTarget=new THREE.Vector3();
  const screenOffset=new THREE.Vector3(1.55,0,-1.24),rootDestination=new THREE.Vector3();
  const director=createCameraDirector(camera,controls,container,root,{
    chassis, wheels:wheels.at(-1).parent, electronics, lift, gripper:wrist, intake
  },motion);
  let selectedPart=null, demoStart=0, stillExtended=false;
  function selectShot(key) {
    selectedPart=key;
    stillExtended=false;
    demoStart=performance.now()+620;
    highlight(key);
    director.select(key);
  }
  document.addEventListener('site:page',event=>{
    if(event.detail.page==='robot') selectShot(event.detail.part);
    else if(selectedPart){
      selectedPart=null;highlight(null);
      director.leave(event.detail.page!=='home');
    }
  });
  document.addEventListener('robot:replay',()=>{
    stillExtended=!stillExtended;
    demoStart=performance.now();
    if(selectedPart) director.select(selectedPart);
  });
  function resetCamera(){
    camera.fov=mobile()?42:36;
    baseCam.set(...(mobile()?[8.8,7.2,11.5]:[8.3,5.8,10.3]));
    baseTarget.set(0,mobile()?4.3:1.65,0);
    camera.position.copy(baseCam);controls.target.copy(baseTarget);camera.updateProjectionMatrix();controls.update();userMoved=false;
  }
  function resize(){
    const {width,height}=container.getBoundingClientRect();
    if(width<1||height<1)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    director.resize();
  }
  resetCamera();resize();new ResizeObserver(resize).observe(container);
  let previousMobile=mobile();window.addEventListener('resize',()=>{if(previousMobile!==mobile()){previousMobile=mobile();if(!selectedPart)resetCamera();}});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'150px'}).observe(container);
  const explodeButton=document.querySelector('#robot-explode');
  explodeButton.addEventListener('click',()=>{manualExplode=(manualExplode??(progress>.28&&progress<.8))?false:true;explodeButton.setAttribute('aria-pressed',String(manualExplode));});
  document.querySelector('#robot-wire').addEventListener('click',event=>{
    wire=!wire;root.traverse(o=>{if(o.isMesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m.wireframe=wire;});}});
    event.currentTarget.setAttribute('aria-pressed',String(wire));
  });
  document.querySelector('#robot-run').addEventListener('click',event=>{run=!run;event.currentTarget.setAttribute('aria-pressed',String(run));});
  document.querySelector('#robot-reset').addEventListener('click',()=>{
    resetCamera();manualExplode=false;rotateBase=0;wire=false;run=false;
    root.traverse(o=>{if(o.isMesh){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.wireframe=false);}});
    ['robot-explode','robot-wire','robot-run'].forEach(id=>document.getElementById(id).setAttribute('aria-pressed','false'));
  });
  document.querySelector('#rotate-left').addEventListener('click',()=>{rotateBase-=Math.PI/12;});
  document.querySelector('#rotate-right').addEventListener('click',()=>{rotateBase+=Math.PI/12;});
  document.querySelector('#zoom-in').addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(.88).clampLength(5,22).add(controls.target);controls.update();});
  document.querySelector('#zoom-out').addEventListener('click',()=>{camera.position.sub(controls.target).multiplyScalar(1.12).clampLength(5,22).add(controls.target);controls.update();});
  const smooth=(a,b,t)=>a+(b-a)*t;
  const ease=(x)=>x*x*(3-2*x);
  const clamp=(x)=>Math.max(0,Math.min(1,x));
  function demoPose(now) {
    const t=clamp((now-demoStart)/3000);
    const reduced=motion.paused||motion.reduced;
    const travel=reduced?(stillExtended?1:0):ease(clamp(t/.39))*(1-ease(clamp((t-.59)/.4)));
    const spin=reduced?(stillExtended?.9:0):Math.PI*4*(t-Math.sin(t*Math.PI*2)/(Math.PI*2));
    carriage.position.y=selectedPart==='lift'?.72+travel*1.64:1.15;
    jaws.forEach(({jaw,sign})=>jaw.rotation.y=sign*(.06+(selectedPart==='gripper'?travel*.88:0)));
    wrist.rotation.z=selectedPart==='gripper'?-.045*travel:0;
    if(selectedPart==='wheels') wheels.forEach(w=>w.rotation.x=spin);
    if(selectedPart==='intake') {roller.rotation.x=spin;gears.forEach(g=>g.rotation.x=spin);}
    indicatorLights.forEach((led,i)=>{
      const pulse=selectedPart==='electronics'?Math.max(0,1-Math.abs(t-(.27+i*.18))/.13):0;
      // Keep the indicator materials self-lit when other metalwork is highlighted.
      led.emissiveIntensity=1.05+pulse*5+(reduced&&stillExtended?1.5:0);
      if(highlights.has(led))highlights.get(led).emissiveIntensity=led.emissiveIntensity;
    });
    return selectedPart==='electronics'?.66:selectedPart==='chassis'?travel*.92:0;
  }
  function tick(now){
    requestAnimationFrame(tick);
    const delta=Math.min((now-last)/1000,.04);last=now;
    if(!visible||document.hidden)return;
    const active=!motion.paused;
    if(active)time+=delta;
    const lightBlend = motion.paused || motion.reduced ? 1 : 1 - Math.exp(-delta * 5);
    renderer.toneMappingExposure = smooth(renderer.toneMappingExposure, selectedPart ? .9 : 1.05, lightBlend);
    key.intensity = smooth(key.intensity, selectedPart ? 2.55 : 3.2, lightBlend);
    fill.intensity = smooth(fill.intensity, selectedPart ? .95 : 1.5, lightBlend);
    rim.intensity = smooth(rim.intensity, selectedPart ? 1.8 : 2.3, lightBlend);
    const narrative=ease(clamp((progress-.14)/.28));
    const targetExplosion=selectedPart?demoPose(now):manualExplode===null?(motion.reduced?0:(progress>.28&&progress<.85?1:0)):(manualExplode?1:0);
    explosion=smooth(explosion,targetExplosion,motion.paused||motion.reduced?1:1-Math.exp(-delta*6));
    if(manualExplode===null)explodeButton.setAttribute('aria-pressed',String(targetExplosion>0));
    assemblies.forEach(({group,base,offset})=>group.position.copy(base).addScaledVector(offset,explosion));
    const offset=selectedPart||mobile()?0:1-narrative*.7;
    root.position.lerp(rootDestination.copy(screenOffset).multiplyScalar(offset),motion.paused||motion.reduced?1:1-Math.exp(-delta*8));
    root.rotation.y=smooth(root.rotation.y,selectedPart?0:rotateBase+(motion.reduced?0:progress*.7+Math.sin(time*.16)*.1),motion.paused||motion.reduced?1:.08);
    if(active&&!selectedPart){
      const speed=run?2.8:.055;
      wheels.forEach(w=>w.rotation.x+=delta*speed);roller.rotation.x+=delta*(run?5:.08);
      gears.forEach(g=>g.rotation.x+=delta*(run?4:.06));
      carriage.position.y=1.15+(run?Math.sin(time*1.4)*.65:Math.sin(time*.45)*.035);
      jaws.forEach(({jaw,sign})=>jaw.rotation.y=sign*(.18+(run?Math.sin(time*2)*.32:0)));
      wrist.rotation.z=run?Math.sin(time*.75)*.14:0;
      particles.rotation.y=time*.014;
    }
    director.update(now);
    controls.update(delta);renderer.render(scene,camera);
  }
  if(document.documentElement.dataset.page==='robot')selectShot(currentPart());
  document.querySelector('.part-replay').disabled=false;
  requestAnimationFrame(tick);
  container.querySelector('.scene-loading')?.remove();
  container.dataset.ready='true';
  let meshes=0;root.traverse(o=>{if(o.isMesh)meshes+=o.isInstancedMesh?o.count:1;});container.dataset.components=String(meshes);
  return {setProgress(value){progress=value;},renderer,root};
}
