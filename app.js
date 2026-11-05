import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Souřadnice výukového modelu: -X = hlava, +X = ocas, +Y = hřbet, -Y = břicho.
const root = document.getElementById('canvasRoot');
const loading = document.getElementById('loading');
const errorPanel = document.getElementById('errorPanel');
const opacityRange = document.getElementById('opacityRange');
const opacityValue = document.getElementById('opacityValue');
const infoTitle = document.getElementById('infoTitle');
const infoDot = document.getElementById('infoDot');
const infoDescription = document.getElementById('infoDescription');
const infoPills = document.getElementById('infoPills');
const count = document.getElementById('planeCount');

const INFO = {
  median: {
    name:'Mediánní rovina', color:'#ef8fba',
    description:'Prochází podélně středem těla a rozděluje koně na pravou a levou polovinu. Je to jedna konkrétní sagitální rovina – střední (midsagitální).',
    pills:['Pravá polovina','Levá polovina'], visible:true, geometry:[3.65,2.66],
    rotation:[0,0,0],position:[-.22,1.31,0],label:[-.95,2.70,.03],short:'MEDIÁNNÍ'
  },
  sagittal: {
    name:'Sagitální rovina', color:'#f0b967',
    description:'Je rovnoběžná s mediánní rovinou. Pokud neprochází středem těla, dělí koně na nestejně velkou pravou a levou část.',
    pills:['Pravá část','Levá část'],visible:false, geometry:[3.55,2.48],
    rotation:[0,0,0],position:[-.22,1.31,.36],label:[-.45,2.58,.36],short:'SAGITÁLNÍ'
  },
  dorsal: {
    name:'Dorzální rovina',color:'#55d4cb',
    description:'Podélná rovina přibližně rovnoběžná s hřbetem stojícího koně. Rozděluje trup na dorzální (hřbetní) a ventrální (břišní) část. Také se nazývá frontální.',
    pills:['Dorzálně – ke hřbetu','Ventrálně – k břichu'],visible:false, geometry:[3.6,1.65],
    rotation:[-Math.PI/2,0,0],position:[-.22,1.36,0],label:[-1.64,1.40,.81],short:'DORZÁLNÍ'
  },
  transverse: {
    name:'Transverzální rovina',color:'#ac99f2',
    description:'Příčná rovina kolmá na podélnou osu trupu. Odděluje kraniální část (směrem k hlavě) od kaudální části (směrem k ocasu).',
    pills:['Kraniálně – k hlavě','Kaudálně – k ocasu'],visible:true,geometry:[1.70,2.64],
    rotation:[0,Math.PI/2,0],position:[-.10,1.32,0],label:[-.10,2.70,.67],short:'PŘÍČNÁ'
  }
};

const DIRECTIONS = {
  cranial:{name:'Kraniální',description:'Kraniální směr míří k hlavě (cranium). Používá se na trupu a krku. Například plec leží kraniálně od kyčle.',vector:new THREE.Vector3(-1,0,0),origin:[-.42,2.11,.52],length:.79,label:'KRANIÁLNĚ'},
  caudal:{name:'Kaudální',description:'Kaudální směr míří k ocasu (cauda). Například kyčel leží kaudálně od plece.',vector:new THREE.Vector3(1,0,0),origin:[.04,2.11,.52],length:.75,label:'KAUDÁLNĚ'},
  dorsal:{name:'Dorzální',description:'Dorzální směr vede ke hřbetu (dorsum), tedy nahoru u stojícího koně. Na trupu je hřbet dorzálně od břicha.',vector:new THREE.Vector3(0,1,0),origin:[-.17,1.66,.55],length:.64,label:'DORZÁLNĚ'},
  ventral:{name:'Ventrální',description:'Ventrální směr vede k břichu (venter), tedy dolů u stojícího koně. Břicho je ventrálně od páteře.',vector:new THREE.Vector3(0,-1,0),origin:[-.17,1.27,.55],length:.61,label:'VENTRÁLNĚ'}
};

const FOCUS = {
  all:{name:'Celý kůň',note:'Celý kůň – anatomické roviny a směry na trupu.',
    point:null, span:null},
  head:{name:'Hlava',note:'Hlava: směrem k nozdrám se používá termín rostrální; směrem k týlu kaudální.',
    point:new THREE.Vector3(-1.50,1.96,0),span:1.22},
  foreleg:{name:'Přední končetina',note:'Přední končetina: proximální / distální; od karpu distálně dorzální / palmární.',
    point:new THREE.Vector3(-.73,.67,.26),span:1.65},
  hindleg:{name:'Zadní končetina',note:'Zadní končetina: proximální / distální; od hlezna distálně dorzální / plantární.',
    point:new THREE.Vector3(.77,.72,.26),span:1.77}
};

const defaultOrbit = new THREE.Vector3(-.28,.25,1).normalize();
const viewDirections = {
  iso:defaultOrbit,
  side:new THREE.Vector3(0,.08,1).normalize(),
  front:new THREE.Vector3(-1,.10,0).normalize(),
  top:new THREE.Vector3(-.02,1,.015).normalize()
};

let renderer,scene,camera,controls;
let horse = null,modelBounds = new THREE.Box3();
let modelCenter = new THREE.Vector3(-.23,1.20,0);
let cameraTween=null, activeFocus='all', activeView='iso';
let labelsVisible=true,selectedDirection=null,showAllDirections=false;
let isReady=false;
const planeGroups = new Map();
const arrowGroups = new Map();

function createLabel(text, hex, opts={}) {
  const cvs=document.createElement('canvas');
  cvs.width=512;cvs.height=128;
  const ctx=cvs.getContext('2d');if(!ctx)return null;
  ctx.fillStyle='rgba(9,27,39,.94)';
  ctx.beginPath();ctx.roundRect(11,13,490,101,17);ctx.fill();
  ctx.strokeStyle=hex;ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle=hex;ctx.beginPath();ctx.arc(45,63,9,0,Math.PI*2);ctx.fill();
  ctx.font='700 37px system-ui,Arial';ctx.textBaseline='middle';ctx.fillStyle='#f5f8fb';
  ctx.fillText(text,68,65,421);
  const map=new THREE.CanvasTexture(cvs);map.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthTest:false,depthWrite:false}));
  sprite.scale.set(opts.width||1.0,opts.height||.25,1);
  sprite.renderOrder=12;
  return sprite;
}

function createPlanes() {
  Object.entries(INFO).forEach(([key,p])=>{
    const group=new THREE.Group();
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(...p.geometry),new THREE.MeshBasicMaterial({
      color:p.color,side:THREE.DoubleSide,transparent:true,opacity:.3,depthWrite:false,
      polygonOffset:true,polygonOffsetFactor:-1
    }));
    plane.renderOrder=5;
    const frame=new THREE.LineSegments(new THREE.EdgesGeometry(plane.geometry),new THREE.LineBasicMaterial({
      color:p.color,transparent:true,opacity:.91,depthWrite:false
    }));
    frame.renderOrder=6;plane.add(frame);group.add(plane);
    group.position.set(...p.position);group.rotation.set(...p.rotation);
    const label=createLabel(p.short,p.color);
    if(label) {label.position.set(...p.label);scene.add(label);group.userData.label=label;}
    group.userData.surface=plane;
    scene.add(group);
    planeGroups.set(key,group);
  });
  refreshPlanes();
}

function refreshPlanes(){
  Object.entries(INFO).forEach(([key,p])=>{
    const group=planeGroups.get(key);if(!group)return;
    // Detailní záběry zachovávají uživatelské přepínače, ale schovají plošné překryvy.
    const shown=p.visible && activeFocus==='all';
    group.visible=shown;
    if(group.userData.label)group.userData.label.visible=shown && labelsVisible;
    const btn=document.querySelector(`.plane-toggle[data-plane="${key}"]`);
    if(btn){btn.classList.toggle('active',p.visible);btn.setAttribute('aria-pressed',String(p.visible));}
  });
  count.textContent=`${Object.values(INFO).filter(p=>p.visible).length} / 4`;
}

function showInfo(key){
  const p=INFO[key];infoTitle.textContent=p.name;infoDot.style.background=p.color;
  infoDescription.textContent=p.description;
  infoPills.replaceChildren();
  p.pills.forEach(label=>{const span=document.createElement('span');span.textContent=label;infoPills.appendChild(span);});
}
function togglePlane(key,visible){INFO[key].visible=visible;refreshPlanes();showInfo(key);}
function setAllPlanes(visible){Object.keys(INFO).forEach(k=>{INFO[k].visible=visible;});refreshPlanes();showInfo(visible?'median':'transverse');}
function updateOpacity(){
  const t=Number(opacityRange.value);opacityValue.value=`${t} %`;
  planeGroups.forEach(group=>{group.userData.surface.material.opacity=(100-t)/100;});
}

function createDirections(){
  Object.entries(DIRECTIONS).forEach(([key,d])=>{
    const group=new THREE.Group();
    const color=0xe8c18a;
    const start=new THREE.Vector3(...d.origin);
    const arrow=new THREE.ArrowHelper(d.vector,start,d.length,color,.17,.095);
    arrow.line.material.depthTest=false;
    arrow.cone.material.depthTest=false;
    arrow.line.renderOrder=8;arrow.cone.renderOrder=9;
    group.add(arrow);
    const end=start.clone().addScaledVector(d.vector,d.length+.13);
    const label=createLabel(d.label,'#e7c18a',{width:.91,height:.23});
    if(label){label.position.copy(end);label.position.z+=.07;group.add(label);}
    group.visible=false;
    scene.add(group);
    arrowGroups.set(key,group);
  });
}
function refreshDirections(){
  arrowGroups.forEach((group,key)=>{group.visible=activeFocus==='all' && (showAllDirections||selectedDirection===key);});
  document.querySelectorAll('.direction-btn').forEach(btn=>{
    const on=btn.dataset.direction===selectedDirection;
    btn.classList.toggle('selected',on);btn.setAttribute('aria-pressed',String(on));
  });
}
function chooseDirection(key){
  selectedDirection=selectedDirection===key?null:key;
  const info=document.getElementById('directionExplanation');
  if(selectedDirection){
    const d=DIRECTIONS[selectedDirection];
    info.textContent=`${d.name}: ${d.description} Na hlavě se před očima používá rostrální; na končetinách navíc proximální, distální, palmární a plantární.`;
  }else info.textContent='Na trupu se směry vztahují k hlavě, ocasu, hřbetu a břichu. Na hlavě a distálních částech končetin se používají také další odborné termíny.';
  refreshDirections();
}

// Přesné optické zarámování: zohledňuje všechny rohy 3D modelu, hloubku,
// perspektivu i skutečný poměr stran zobrazovacího pole. Žádné odhady podle šířky.
function fullDistance(direction = defaultOrbit){
  if(!camera || modelBounds.isEmpty()) return 8.5;

  const width = Math.max(1, root.clientWidth);
  const height = Math.max(1, root.clientHeight);
  const aspect = width / height;
  const verticalTan = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
  const horizontalTan = verticalTan * aspect;
  const towardCamera = direction.clone().normalize();
  // Při pohledu shora změň pomocný vektor, aby projekce zůstala numericky stabilní.
  const referenceUp = Math.abs(towardCamera.y) > .97
    ? new THREE.Vector3(0,0,1) : new THREE.Vector3(0,1,0);
  const right = new THREE.Vector3().crossVectors(referenceUp,towardCamera).normalize();
  const up = new THREE.Vector3().crossVectors(towardCamera,right).normalize();
  const center = modelCenter;
  const min = modelBounds.min, max = modelBounds.max;
  const point = new THREE.Vector3(), offset = new THREE.Vector3();
  let distance = 0;

  // Bezpečná plocha: model se musí celý vejít do vnitřních 72 % šířky
  // a 63 % výšky viewportu; nepřekryjí ho ani dolní ovládací tlačítka.
  const useHorizontal = .72;
  const useVertical = .63;
  for(const x of [min.x,max.x]){
    for(const y of [min.y,max.y]){
      for(const z of [min.z,max.z]){
        point.set(x,y,z);
        offset.subVectors(point,center);
        const depthTowardCamera = offset.dot(towardCamera);
        const horizontalNeed = Math.abs(offset.dot(right)) / (horizontalTan * useHorizontal);
        const verticalNeed = Math.abs(offset.dot(up)) / (verticalTan * useVertical);
        // Kamera musí být před nejbližším rohem modelu a jeho projekce
        // nesmí přesahovat dostupnou šířku nebo výšku.
        distance = Math.max(distance, depthTowardCamera + horizontalNeed,
          depthTowardCamera + verticalNeed);
      }
    }
  }
  return Math.max(4.0, distance * 1.08);
}
function focusDistance(key,direction){
  if(key==='all')return fullDistance(direction);
  const h=Math.max(250,root.clientHeight),w=Math.max(250,root.clientWidth);
  const f=THREE.MathUtils.degToRad(camera.fov/2);
  const horizontal=Math.atan(Math.tan(f)*w/h);
  return Math.max(FOCUS[key].span/(2*Math.tan(f)),(FOCUS[key].span*.64)/(2*Math.tan(horizontal)))*1.65;
}
function currentCameraDirection(){
  const offset = camera.position.clone().sub(controls.target);
  return offset.lengthSq() > 1e-6 ? offset.normalize() : defaultOrbit.clone();
}
// Posun modelu pomocí kolečka je záměrný. Po ručním zoomu proto
// automatické oddalování vypneme až do kliknutí na „Celý kůň“ / reset.
let manuallyZoomed = false;
function fitCurrentRotation(){
  if(!isReady || cameraTween || activeFocus!=='all' || manuallyZoomed)return;
  controls.target.copy(modelCenter);
  const dir = currentCameraDirection();
  const required = fullDistance(dir);
  const actual = camera.position.distanceTo(modelCenter);
  if(actual < required){
    camera.position.copy(modelCenter).addScaledVector(dir,required);
  }
}
function moveCamera(key=activeFocus,view=activeView,animated=true){
  if(!camera||!controls)return;
  activeFocus=key;activeView=view;
  const target=key==='all'?modelCenter.clone():FOCUS[key].point.clone();
  const dir=viewDirections[view]||viewDirections.iso;
  const distance=focusDistance(key,dir);
  manuallyZoomed=false;
  // Full-view and regional orbit are about their *own* center, never the old position.
  const position=target.clone().addScaledVector(dir,distance);
  controls.autoRotate=false;
  document.getElementById('autoRotate').checked=false;
  if(!animated){controls.target.copy(target);camera.position.copy(position);cameraTween=null;controls.update();}
  else cameraTween={started:performance.now(),duration:850,
    fromPos:camera.position.clone(),toPos:position,
    fromTarget:controls.target.clone(),toTarget:target};
  document.querySelectorAll('.view-btn').forEach(btn=>{
    const selected=btn.dataset.view===view;
    btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));
  });
  document.querySelectorAll('.focus-btn').forEach(btn=>{
    const selected=btn.dataset.focus===key;
    btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));
  });
  document.getElementById('focusNote').textContent=FOCUS[key].note;
  const focusBadge=document.getElementById('focusBadge');
  focusBadge.textContent=`◎ ${FOCUS[key].name}`;
  focusBadge.hidden=key==='all';
  refreshPlanes();refreshDirections();
}
function handleResize(){
  if(!camera||!renderer)return;
  const width=Math.max(1,root.clientWidth),height=Math.max(1,root.clientHeight);
  camera.aspect=width/height;
  camera.updateProjectionMatrix();
  renderer.setSize(width,height,false);
  if(isReady && !cameraTween && !manuallyZoomed){
    const direction = currentCameraDirection();
    const target = activeFocus==='all' ? modelCenter : FOCUS[activeFocus].point;
    const wanted = focusDistance(activeFocus,direction);
    controls.target.copy(target);
    camera.position.copy(target).addScaledVector(direction,wanted);
    controls.update();
  }
}
function showError(err){
  console.error('Anatomie koně:',err);
  loading.hidden=true;errorPanel.hidden=false;
}
function setupUI(){
  document.querySelectorAll('.plane-toggle').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.plane;togglePlane(key,!INFO[key].visible);
  }));
  document.getElementById('showAll').addEventListener('click',()=>setAllPlanes(true));
  document.getElementById('hideAll').addEventListener('click',()=>setAllPlanes(false));
  document.querySelectorAll('.focus-btn').forEach(btn=>btn.addEventListener('click',()=>moveCamera(btn.dataset.focus,'side')));
  document.querySelectorAll('.direction-btn').forEach(btn=>btn.addEventListener('click',()=>chooseDirection(btn.dataset.direction)));
  document.getElementById('showDirections').addEventListener('change',e=>{
    showAllDirections=e.target.checked;refreshDirections();
  });
  document.querySelectorAll('.view-btn').forEach(btn=>btn.addEventListener('click',()=>moveCamera(activeFocus,btn.dataset.view)));
  document.getElementById('resetCamera').addEventListener('click',()=>moveCamera('all','iso'));
  document.getElementById('resetCamera').title='Zobrazit celého koně uprostřed';
  opacityRange.addEventListener('input',updateOpacity);
  document.getElementById('showLabels').addEventListener('change',e=>{labelsVisible=e.target.checked;refreshPlanes();});
  document.getElementById('autoRotate').addEventListener('change',e=>{
    cameraTween=null;controls.autoRotate=e.target.checked;
  });
  window.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    const index=Number(e.key)-1, keys=Object.keys(INFO);
    if(index>=0 && index<4){const k=keys[index];togglePlane(k,!INFO[k].visible);}
    else if(e.key.toLowerCase()==='r')moveCamera('all','iso');
  });
  showInfo('median');updateOpacity();
}
function finishHorse(gltf){
  horse=gltf.scene;
  horse.traverse(node=>{
    if(node.isMesh){
      node.castShadow=false;
      if(node.material){node.material.side=THREE.DoubleSide;node.material.needsUpdate=true;}
    }
  });
  scene.add(horse);
  modelBounds.setFromObject(horse);modelBounds.getCenter(modelCenter);
  isReady=true;loading.hidden=true;
  moveCamera('all','iso',false);
  handleResize();
}
function init(){
  if(!root)return;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(35,1,.035,160);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.38;
  root.appendChild(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);
  controls.target.copy(modelCenter);
  camera.position.copy(modelCenter).addScaledVector(defaultOrbit,6.1);
  controls.enableDamping=true;controls.dampingFactor=.065;
  controls.enablePan=false; // DŮLEŽITÉ: otáčení nemůže koně odsunout mimo střed.
  controls.zoomToCursor=false;
  renderer.domElement.addEventListener('wheel',()=>{manuallyZoomed=true;},{passive:true});
  renderer.domElement.addEventListener('touchstart',e=>{
    if(e.touches.length>1)manuallyZoomed=true;
  },{passive:true});
  controls.minDistance=.8;controls.maxDistance=35;
  controls.minPolarAngle=.045;controls.maxPolarAngle=Math.PI-.045;
  controls.autoRotateSpeed=.8;
  controls.update();
  controls.addEventListener('start',()=>{
    cameraTween=null;
    document.querySelectorAll('.view-btn').forEach(btn=>{
      btn.classList.remove('selected');btn.setAttribute('aria-pressed','false');
    });
  });
  scene.add(new THREE.HemisphereLight(0xd1e5fa,0x615243,2.65));
  const key=new THREE.DirectionalLight(0xffe9d0,3.0);key.position.set(-3.5,6,4);scene.add(key);
  const fill=new THREE.DirectionalLight(0x9cbde5,1.55);fill.position.set(2,4,-5);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,.8);rim.position.set(3,5,4);scene.add(rim);
  const grid=new THREE.GridHelper(8,20,0x456373,0x294756);
  grid.position.y=-.015;grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
  createPlanes();createDirections();setupUI();handleResize();
  new ResizeObserver(handleResize).observe(root);
  window.addEventListener('resize',handleResize);

  const loader=new GLTFLoader();
  loader.load('./kun-detail.glb',finishHorse,undefined,err=>{
    console.warn('Detailní model není dostupný. Používám záložní model.',err);
    loader.load('./models/kun.glb',finishHorse,undefined,showError);
  });

  function animate(time){
    requestAnimationFrame(animate);
    if(cameraTween){
      const t=Math.min(1,Math.max(0,(time-cameraTween.started)/cameraTween.duration));
      const s=t*t*(3-2*t);
      camera.position.lerpVectors(cameraTween.fromPos,cameraTween.toPos,s);
      controls.target.lerpVectors(cameraTween.fromTarget,cameraTween.toTarget,s);
      if(t>=1)cameraTween=null;
    }
    controls.update();
    fitCurrentRotation();
    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
}
try{init();}catch(error){showError(error);}
