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
const modelStatus = document.getElementById('modelStatus');
const customModelInput = document.getElementById('customModelInput');
// Skutečný 3D model, nikoliv 2D obrázek.
// Primárně se načítá nově vygenerovaný realistický GLB model; následně dva záložní zdroje.
const MODEL_SOURCES = [
  {
    label: 'Realistický kůň • Higgsfield GLB',
    url: 'https://d8j0ntlcm91z4.cloudfront.net/user_3Lgrgq0ipgSSAd6kz8hX86Ndvrj/hf_20261105_135615_807798fc-1853-46a8-877b-ab7c20617972.glb',
    source: 'https://three.ws/viewer?src=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_3Lgrgq0ipgSSAd6kz8hX86Ndvrj%2Fhf_20261105_135615_807798fc-1853-46a8-877b-ab7c20617972.glb'
  },
  {
    label: 'Standing Horse • Innerscene (záložní zdroj)',
    url: 'https://files.innerscene.com/library/standing-horse-01d8563f/0107d59ef4ff275f0158/horse-original.glb',
    source: 'https://www.innerscene.com/tools/library/3d-parts/standing-horse-01d8563f'
  },
  {
    label: 'Horse Standing • Innerscene (záložní zdroj)',
    url: 'https://files.innerscene.com/library/horse-standing-365496af/82c54e2a17480f87f492/horse-standing.glb',
    source: 'https://www.innerscene.com/tools/library/3d-parts/horse-standing-365496af'
  }
];


const INFO = {
  median: {
    name:'Mediánní rovina', color:'#ff6a95',
    description:'Prochází podélně středem těla a rozděluje koně na pravou a levou polovinu. Je to jedna konkrétní sagitální rovina – střední (midsagitální).',
    pills:['Pravá polovina','Levá polovina'], visible:true, geometry:[3.65,2.66],
    rotation:[0,0,0],position:[-.22,1.31,0],short:'MEDIÁNNÍ'
  },
  sagittal: {
    name:'Sagitální rovina', color:'#ffd166',
    description:'Je rovnoběžná s mediánní rovinou. Pokud neprochází středem těla, dělí koně na nestejně velkou pravou a levou část.',
    pills:['Pravá část','Levá část'],visible:false, geometry:[3.55,2.48],
    rotation:[0,0,0],position:[-.22,1.31,.36],short:'SAGITÁLNÍ'
  },
  dorsal: {
    name:'Dorzální rovina',color:'#48ddc4',
    description:'Podélná rovina přibližně rovnoběžná s hřbetem stojícího koně. Rozděluje trup na dorzální (hřbetní) a ventrální (břišní) část. Také se nazývá frontální.',
    pills:['Dorzálně – ke hřbetu','Ventrálně – k břichu'],visible:false, geometry:[3.6,1.65],
    rotation:[-Math.PI/2,0,0],position:[-.22,1.36,0],short:'DORZÁLNÍ'
  },
  transverse: {
    name:'Transverzální rovina',color:'#899fff',
    description:'Příčná rovina kolmá na podélnou osu trupu. Odděluje kraniální část (směrem k hlavě) od kaudální části (směrem k ocasu).',
    pills:['Kraniálně – k hlavě','Kaudálně – k ocasu'],visible:true,geometry:[1.70,2.64],
    rotation:[0,Math.PI/2,0],position:[-.10,1.32,0],short:'TRANSVERZÁLNÍ'
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
let modelVertexSamples=[]; // Reálné body viditelné geometrie; ne nepřesná obálka importovaného GLB.
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

// Popisek není Sprite (který by se vždy otáčel za kamerou), ale skutečná
// průhledná destička vložená do lokálních souřadnic anatomické roviny.
// Přední i zadní strana mají vlastní, správně orientovaný nápis.
function createEmbeddedPlaneLabel(name, hex) {
  const canvas=document.createElement('canvas');
  canvas.width=1024;
  canvas.height=240;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  ctx.clearRect(0,0,1024,240);
  ctx.fillStyle='rgba(8,23,33,0.92)';
  ctx.beginPath();
  ctx.roundRect(12,12,1000,216,34);
  ctx.fill();
  ctx.strokeStyle=hex;
  ctx.lineWidth=8;
  ctx.stroke();
  ctx.fillStyle=hex;
  ctx.fillRect(47,54,13,133);
  ctx.font='800 107px system-ui, Arial, sans-serif';
  ctx.textBaseline='middle';
  ctx.textAlign='left';
  ctx.fillText(name,96,121,873);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()||1);
  const geometry=new THREE.PlaneGeometry(1,1);
  const material=new THREE.MeshBasicMaterial({
    map:texture,transparent:true,opacity:1,side:THREE.FrontSide,
    depthWrite:false,depthTest:true,toneMapped:false
  });
  const front=new THREE.Mesh(geometry,material);
  const back=new THREE.Mesh(geometry,material);
  // Druhý štítek je zrcadlově umístěn a otočen ke druhé straně roviny.
  // Text tak není při pohledu zezadu převrácený.
  back.rotation.y=Math.PI;
  front.renderOrder=13;
  back.renderOrder=13;
  const labels=new THREE.Group();
  labels.add(front,back);
  labels.userData.front=front;
  labels.userData.back=back;
  return labels;
}
function positionEmbeddedPlaneLabel(group,key,width,height){
  const labels=group.userData.label;
  if(!labels)return;
  const labelWidth=Math.min(1.22,width*.73);
  const labelHeight=Math.min(.29,height*.22,labelWidth*.255);
  const insetX=Math.max(.055,width*.035);
  const insetY=Math.max(.055,height*.035);
  const rightAligned=key==='sagittal'||key==='transverse';
  const bottomAligned=key==='dorsal';
  const x=(rightAligned?1:-1)*(width/2-labelWidth/2-insetX);
  const y=(bottomAligned?-1:1)*(height/2-labelHeight/2-insetY);
  const front=labels.userData.front,back=labels.userData.back;
  front.scale.set(labelWidth,labelHeight,1);
  back.scale.set(labelWidth,labelHeight,1);
  // Popisky leží uvnitř barevné roviny, pár milimetrů nad jejím povrchem.
  front.position.set(x,y,.012);
  back.position.set(-x,y,-.012);
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
      color:p.color,transparent:true,opacity:.96,depthWrite:false
    }));
    frame.renderOrder=6;
    plane.add(frame);
    const label=createEmbeddedPlaneLabel(p.short,p.color);
    if(label){
      plane.add(label); // DŮLEŽITÉ: stejná orientace a otáčení jako samotná rovina.
      group.userData.label=label;
    }
    group.add(plane);
    group.position.set(...p.position);group.rotation.set(...p.rotation);
    group.userData.surface=plane;
    scene.add(group);
    planeGroups.set(key,group);
    positionEmbeddedPlaneLabel(group,key,...p.geometry);
  });
  refreshPlanes();
}

function refreshPlanes(){
  Object.entries(INFO).forEach(([key,p])=>{
    const group=planeGroups.get(key);if(!group)return;
    // Detailní záběry zachovávají uživatelské přepínače, ale schovají plošné překryvy.
    const shown=p.visible && activeFocus==='all';
    group.visible=shown;
    if(group.userData.label)group.userData.label.visible=labelsVisible;
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
  arrowGroups.forEach(group=>{scene.remove(group);group.traverse(node=>{if(node.geometry)node.geometry.dispose();});});
  arrowGroups.clear();
  const c=modelCenter, b=modelBounds, s=b.getSize(new THREE.Vector3());
  const starts={
    cranial: new THREE.Vector3(c.x-s.x*.12,b.min.y+s.y*.68,b.max.z+s.z*.18),
    caudal: new THREE.Vector3(c.x+s.x*.07,b.min.y+s.y*.68,b.max.z+s.z*.18),
    dorsal: new THREE.Vector3(c.x,b.min.y+s.y*.57,b.max.z+s.z*.22),
    ventral: new THREE.Vector3(c.x,b.min.y+s.y*.47,b.max.z+s.z*.22)
  };
  Object.entries(DIRECTIONS).forEach(([key,d])=>{
    const group=new THREE.Group(), color=0xe8c18a;
    const start=starts[key];
    const length=(key==='cranial'||key==='caudal')?s.x*.21:s.y*.29;
    const arrow=new THREE.ArrowHelper(d.vector,start,length,color,length*.23,length*.12);
    arrow.line.material.depthTest=false;arrow.cone.material.depthTest=false;
    arrow.line.renderOrder=8;arrow.cone.renderOrder=9;
    group.add(arrow);
    const end=start.clone().addScaledVector(d.vector,length*1.2);
    const label=createLabel(d.label,'#e7c18a',{width:.96,height:.25});
    if(label){label.position.copy(end);label.position.z+=.05;group.add(label);}
    group.visible=false;scene.add(group);arrowGroups.set(key,group);
  });
  refreshDirections();
}
// Roviny jsou odvozeny ze skutečného prostorového obalu načteného modelu,
// nikoli z pevně zadaných souřadnic starého schematického koně.
function placePlanesAroundModel(){
  const b=modelBounds, s=b.getSize(new THREE.Vector3()), c=modelCenter;
  const specs={
    median:{size:[s.x*1.10,s.y*1.15],pos:[c.x,c.y,c.z],rot:[0,0,0]},
    sagittal:{size:[s.x*1.10,s.y*1.15],pos:[c.x,c.y,c.z+s.z*.31],rot:[0,0,0]},
    dorsal:{size:[s.x*1.10,s.z*1.95],pos:[c.x,b.min.y+s.y*.54,c.z],rot:[-Math.PI/2,0,0]},
    transverse:{size:[s.z*1.95,s.y*1.15],pos:[c.x,c.y,c.z],rot:[0,Math.PI/2,0]}
  };
  Object.entries(specs).forEach(([key,p])=>{
    const group=planeGroups.get(key), surface=group.userData.surface;
    const old=surface.geometry;surface.geometry=new THREE.PlaneGeometry(...p.size);old.dispose();
    // hrany byly vytvořeny ze staré geometrie, proto je nutné je také přepočítat
    surface.children.forEach(ch=>{
      if(ch.isLineSegments){ch.geometry.dispose();ch.geometry=new THREE.EdgesGeometry(surface.geometry);}
    });
    group.position.set(...p.pos);group.rotation.set(...p.rot);
    positionEmbeddedPlaneLabel(group,key,...p.size);
  });
  refreshPlanes();
}
function setDynamicFocus(){
  const b=modelBounds, s=b.getSize(new THREE.Vector3()), c=modelCenter;
  FOCUS.head.point.set(b.min.x+s.x*.19,b.min.y+s.y*.76,c.z);
  FOCUS.head.span=Math.max(.75,s.y*.62);
  FOCUS.foreleg.point.set(b.min.x+s.x*.32,b.min.y+s.y*.33,c.z+s.z*.13);
  FOCUS.foreleg.span=Math.max(.9,s.y*.81);
  FOCUS.hindleg.point.set(b.min.x+s.x*.77,b.min.y+s.y*.34,c.z+s.z*.13);
  FOCUS.hindleg.span=Math.max(.9,s.y*.85);
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

// Vlastní 3D model může obsahovat neviditelné pomocné objekty nebo nepřesné
// hranice GLB. Změříme proto skutečné viditelné vrcholy, místo spoléhání
// výhradně na Box3.setFromObject() v režimu approximate.
function visibleVertexSamples(object, samplePerMesh=3000){
  object.updateWorldMatrix(true,true);
  const vertices=[];
  const point=new THREE.Vector3();
  object.traverse(node=>{
    if(!node.isMesh || !node.visible || !node.geometry?.attributes?.position)return;
    let ancestor=node.parent;
    while(ancestor && ancestor!==object){if(!ancestor.visible)return;ancestor=ancestor.parent;}
    const attr=node.geometry.attributes.position;
    const stride=Math.max(1,Math.ceil(attr.count/samplePerMesh));
    for(let i=0;i<attr.count;i+=stride){
      point.fromBufferAttribute(attr,i);
      if(node.isSkinnedMesh && node.skeleton)node.applyBoneTransform(i,point);
      point.applyMatrix4(node.matrixWorld);
      if(Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z))vertices.push(point.clone());
    }
  });
  return vertices;
}
function measuredBounds(object){
  const points=visibleVertexSamples(object);
  if(points.length<16){
    return new THREE.Box3().setFromObject(object,true);
  }
  // Ojedinělý chybový polygon několik metrů od koně nesmí posunout kameru.
  const quantile=(sorted,q)=>sorted[Math.max(0,Math.min(sorted.length-1,Math.floor((sorted.length-1)*q)))];
  const cut=points.length>300?.005:0;
  const box=new THREE.Box3();
  const ranges=['x','y','z'].map(axis=>{
    const ordered=points.map(v=>v[axis]).sort((a,b)=>a-b);
    return [quantile(ordered,cut),quantile(ordered,1-cut)];
  });
  box.min.set(ranges[0][0],ranges[1][0],ranges[2][0]);
  box.max.set(ranges[0][1],ranges[1][1],ranges[2][1]);
  const sz=box.getSize(new THREE.Vector3());
  box.expandByVector(new THREE.Vector3(
    Math.max(.001,sz.x*.035),Math.max(.001,sz.y*.035),Math.max(.001,sz.z*.035)
  ));
  return box;
}
// VERZE 3.5: ortografická kamera – žádné perspektivní posunutí ani
// závislost na velikosti importovaných souřadnic, DPI nebo typu prohlížeče.
let projectionSpan = 5;
let manuallyZoomed = false;
let lastCanvasWidth = 0, lastCanvasHeight = 0;
const orbitRadius = 10;
function applyOrthoSpan(span) {
  if (!camera) return;
  const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
  const aspect = w/h;
  projectionSpan = Math.max(.2, span);
  camera.left = -projectionSpan*aspect/2;
  camera.right = projectionSpan*aspect/2;
  camera.top = projectionSpan/2;
  camera.bottom = -projectionSpan/2;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
}
function currentCameraDirection() {
  const offset=camera.position.clone().sub(controls.target);
  return offset.lengthSq()>1e-6 ? offset.normalize() : defaultOrbit.clone();
}
function getFramingSpan(key='all', direction=defaultOrbit) {
  const aspect=Math.max(.2,root.clientWidth/Math.max(1,root.clientHeight));
  if(key!=='all') {
    const span=FOCUS[key]?.span||1.25;
    return Math.max(.6, span*1.15, span*.75/aspect);
  }
  if(modelBounds.isEmpty())return 5;
  const dir=direction.clone().normalize();
  const worldUp=Math.abs(dir.y)>.98 ? new THREE.Vector3(0,0,-1) : new THREE.Vector3(0,1,0);
  const right=new THREE.Vector3().crossVectors(worldUp,dir).normalize();
  const up=new THREE.Vector3().crossVectors(dir,right).normalize();
  const min=modelBounds.min, max=modelBounds.max;
  let halfW=0, halfH=0;
  const p=new THREE.Vector3();
  for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
    p.set(x,y,z).sub(modelCenter);
    halfW=Math.max(halfW,Math.abs(p.dot(right)));
    halfH=Math.max(halfH,Math.abs(p.dot(up)));
  }
  // Ponecháme 22–27 % prázdného prostoru okolo celého koně.
  return Math.max(.75, halfH*2/.72, halfW*2/(aspect*.76));
}
function fitHorseDeterministically(force=false) {
  if(!isReady || !camera || !controls || activeFocus!=='all')return;
  if(manuallyZoomed&&!force)return;
  const dir=currentCameraDirection();
  const dest=modelCenter.clone();
  cameraTween=null;
  controls.target.copy(dest);
  camera.position.copy(dest).addScaledVector(dir,orbitRadius);
  applyOrthoSpan(getFramingSpan('all',dir));
  camera.lookAt(dest);
  controls.update();
}
function scheduleVisualFit(){
  if(!isReady||cameraTween||activeFocus!=='all'||manuallyZoomed)return;
  requestAnimationFrame(()=>{
    if(isReady&&!cameraTween&&activeFocus==='all'&&!manuallyZoomed){
      // Otáčení zachová bod uprostřed; aktualizuje se jen šířka záběru.
      controls.target.copy(modelCenter);
      applyOrthoSpan(getFramingSpan('all',currentCameraDirection()));
      controls.update();
    }
  });
}
function fitCurrentRotation(){
  if(!isReady || cameraTween || activeFocus!=='all' || manuallyZoomed)return;
  const needed=getFramingSpan('all',currentCameraDirection());
  if(Math.abs(needed-projectionSpan)>.01)applyOrthoSpan(needed);
}
function moveCamera(key=activeFocus,view=activeView,animated=true){
  if(!camera||!controls)return;
  activeFocus=key;activeView=view;
  const target=key==='all'?modelCenter.clone():FOCUS[key].point.clone();
  const dir=(viewDirections[view]||viewDirections.iso).clone().normalize();
  const position=target.clone().addScaledVector(dir,orbitRadius);
  const span=getFramingSpan(key,dir);
  const previousEffectiveSpan=projectionSpan/Math.max(.01,camera.zoom);
  if(cameraTween){cameraTween=null;}
  camera.zoom=1;applyOrthoSpan(previousEffectiveSpan);
  manuallyZoomed=false;
  controls.autoRotate=false;
  document.getElementById('autoRotate').checked=false;
  if(!animated){
    cameraTween=null;
    controls.target.copy(target);
    camera.position.copy(position);
    applyOrthoSpan(span);
    camera.lookAt(target);
    controls.update();
  } else {
    cameraTween={started:performance.now(),duration:800,
      fromPos:camera.position.clone(),toPos:position,
      fromTarget:controls.target.clone(),toTarget:target,
      fromSpan:projectionSpan,toSpan:span};
  }
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
  const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);
  const changed=w!==lastCanvasWidth||h!==lastCanvasHeight;
  lastCanvasWidth=w;lastCanvasHeight=h;
  // CSS pixel dimensions MUST match the camera viewport. Retina DPR may make
  // the WebGL drawing buffer 2x bigger, but must NOT double its layout size.
  renderer.setSize(w,h,false);
  renderer.domElement.style.width = `${w}px`;
  renderer.domElement.style.height = `${h}px`;
  if(changed && isReady && activeFocus==='all' && !manuallyZoomed && !cameraTween){
    applyOrthoSpan(getFramingSpan('all',currentCameraDirection()));
    controls.target.copy(modelCenter);
    controls.update();
  }else {
    // Wheel zoom používá camera.zoom a nesmí se na resize zrušit.
    const prevZoom=camera.zoom;applyOrthoSpan(projectionSpan);camera.zoom=prevZoom;camera.updateProjectionMatrix();
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
  document.getElementById('resetCamera').addEventListener('click',()=>moveCamera('all','iso',false));
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
function finishHorse(gltf,label){
  if(horse){scene.remove(horse);}
  horse=new THREE.Group();
  const body=gltf.scene;
  // Některé generátory ukládají vlastní transformační matici kořenového uzlu.
  // Bez automatic update pak body.position/scale vypadají změněně, ale neaplikují se.
  if(!body.matrixAutoUpdate){
    body.matrix.decompose(body.position,body.quaternion,body.scale);
    body.matrixAutoUpdate=true;
  }
  body.updateMatrix();
  horse.add(body);
  scene.add(horse);
  body.traverse(node=>{
    if(!node.isMesh)return;
    node.castShadow=false;
    node.frustumCulled=true;
    if(node.material){
      const mats=Array.isArray(node.material)?node.material:[node.material];
      mats.forEach(mat=>{mat.side=THREE.DoubleSide;mat.needsUpdate=true;});
    }
  });
  let bounds=measuredBounds(horse);
  let size=bounds.getSize(new THREE.Vector3());
  if(size.y>size.z*1.13 && size.z>size.x*1.6){
    body.rotation.x=-Math.PI/2;
    body.updateWorldMatrix(true,true);
    bounds=measuredBounds(horse);size=bounds.getSize(new THREE.Vector3());
  }
  if(size.z>size.x*1.15){
    body.rotation.y=-Math.PI/2;
    body.updateWorldMatrix(true,true);
    bounds=measuredBounds(horse);size=bounds.getSize(new THREE.Vector3());
  }
  // Normalizace a vystředění podle *skutečných viditelných* vrcholů.
  const length=Math.max(.001,size.x,size.z);
  const scale=Math.min(3.45/length,2.5/Math.max(.001,size.y));
  body.scale.multiplyScalar(scale); // zachovat původní velikostní transformaci z GLB
  body.updateWorldMatrix(true,true);
  bounds=measuredBounds(horse);
  const center=bounds.getCenter(new THREE.Vector3());
  body.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));
  body.updateWorldMatrix(true,true);
  modelBounds.copy(measuredBounds(horse));
  modelBounds.getCenter(modelCenter);
  modelVertexSamples=visibleVertexSamples(horse);
  controls.minDistance=.5;
  controls.maxDistance=2000; // auto-fit má prostor oddálit i chybně škálované GLB
  placePlanesAroundModel();setDynamicFocus();createDirections();
  isReady=true;loading.hidden=true;errorPanel.hidden=true;
  modelStatus.textContent=label;
  moveCamera('all','iso',false);
  handleResize();
  fitHorseDeterministically(true);
}

function loadRemoteModel(index=0){
  if(index>=MODEL_SOURCES.length){
    loading.hidden=true;errorPanel.hidden=false;
    const p=errorPanel.querySelector('p');
    p.textContent='Model se nepodařilo načíst ani ze vzdáleného zdroje. Stáhni GLB model podle README a nahraj jej na GitHub do models/realisticky-kun.glb, nebo níže vyber soubor GLB z počítače.';
    modelStatus.textContent='Model se nepodařilo načíst';
    return;
  }
  const source=MODEL_SOURCES[index];
  modelStatus.textContent='Načítám: '+source.label;
  const loader=new GLTFLoader();
  loader.load(source.url, gltf=>finishHorse(gltf,source.label), undefined, error=>{
    console.warn('Zdroj modelu '+source.url+' není dostupný:',error);
    loadRemoteModel(index+1);
  });
}
function loadCustomFile(file){
  if(!file)return;
  if(!/\.glb$/i.test(file.name)){alert('Vyber soubor modelu ve formátu .glb');return;}
  const blobUrl=URL.createObjectURL(file);
  loading.hidden=false;errorPanel.hidden=true;
  loading.querySelector('strong').textContent='Načítám vlastní 3D model…';
  new GLTFLoader().load(blobUrl,gltf=>{
    URL.revokeObjectURL(blobUrl);
    finishHorse(gltf,'Vlastní model · '+file.name);
  },undefined,err=>{
    URL.revokeObjectURL(blobUrl);showError(err);
  });
}
function init(){
  if(!root)return;
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-3,3,3,-3,.01,1000);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.38;
  root.appendChild(renderer.domElement);
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  controls=new OrbitControls(camera,renderer.domElement);
  controls.target.copy(modelCenter);
  camera.position.copy(modelCenter).addScaledVector(defaultOrbit,6.1);
  controls.enableDamping=false; // Bez zbytkového posunu kamery při resetu v Safari.
  controls.enablePan=false; // DŮLEŽITÉ: otáčení nemůže koně odsunout mimo střed.
  controls.zoomToCursor=false;
  renderer.domElement.addEventListener('wheel',()=>{manuallyZoomed=true;},{passive:true});
  renderer.domElement.addEventListener('touchstart',e=>{
    if(e.touches.length>1)manuallyZoomed=true;
  },{passive:true});
  controls.minDistance=.8;controls.maxDistance=2000;
  controls.minPolarAngle=.045;controls.maxPolarAngle=Math.PI-.045;
  controls.autoRotateSpeed=.8;
  controls.update();
  controls.addEventListener('start',()=>{
    cameraTween=null;
    document.querySelectorAll('.view-btn').forEach(btn=>{
      btn.classList.remove('selected');btn.setAttribute('aria-pressed','false');
    });
  });
  controls.addEventListener('end',()=>{
    // Po ručním otočení udržet celou siluetu koně ve viewportu.
    if(isReady && activeFocus==='all' && !manuallyZoomed)scheduleVisualFit();
  });
  scene.add(new THREE.HemisphereLight(0xd1e5fa,0x615243,2.65));
  const key=new THREE.DirectionalLight(0xffe9d0,3.0);key.position.set(-3.5,6,4);scene.add(key);
  const fill=new THREE.DirectionalLight(0x9cbde5,1.55);fill.position.set(2,4,-5);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,.8);rim.position.set(3,5,4);scene.add(rim);
  const grid=new THREE.GridHelper(8,20,0x456373,0x294756);
  grid.position.y=-.015;grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
  createPlanes();setupUI();handleResize();
  new ResizeObserver(handleResize).observe(root);
  window.addEventListener('resize',handleResize);

  // Model umístěný v repozitáři má přednost a není závislý na externím serveru.
  new GLTFLoader().load('./models/realisticky-kun.glb',
    gltf=>finishHorse(gltf,'Lokální realistický model'),undefined,
    ()=>loadRemoteModel(0));
  customModelInput.addEventListener('change',()=>loadCustomFile(customModelInput.files?.[0]));
  document.getElementById('flipHorse').addEventListener('click',()=>{
    if(!horse || !isReady)return;
    horse.rotation.y+=Math.PI;
    horse.updateWorldMatrix(true,true);
    modelBounds.copy(measuredBounds(horse));
    modelBounds.getCenter(modelCenter);
    modelVertexSamples=visibleVertexSamples(horse);
    placePlanesAroundModel();setDynamicFocus();createDirections();
    moveCamera('all','iso',false);
  });

  function animate(time){
    requestAnimationFrame(animate);
    if(cameraTween){
      const t=Math.min(1,Math.max(0,(time-cameraTween.started)/cameraTween.duration));
      const s=t*t*(3-2*t);
      camera.position.lerpVectors(cameraTween.fromPos,cameraTween.toPos,s);
      controls.target.lerpVectors(cameraTween.fromTarget,cameraTween.toTarget,s);
      applyOrthoSpan(THREE.MathUtils.lerp(cameraTween.fromSpan,cameraTween.toSpan,s));
      if(t>=1){cameraTween=null;}
    }
    controls.update();
    fitCurrentRotation();
    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
}
try{init();}catch(error){showError(error);}
