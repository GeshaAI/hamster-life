import {compose,identity,multiply,lookAt,orthographic} from './model3d.js';
import {box,cylinder,sphere,torus,trianglePrism,rotation,segmentMatrix,Batches} from './geometry3d.js';
export const worldX=x=>(x-500)/100;
export const CAMERA={eye:[0,6.2,10],target:[0,1,0],left:-5,right:5,bottom:-2.7,top:2.7,near:.1,far:30};
export const habitatVP=()=>multiply(orthographic(CAMERA.left,CAMERA.right,CAMERA.bottom,CAMERA.top,CAMERA.near,CAMERA.far),lookAt(CAMERA.eye,CAMERA.target));
export function project(point){const m=habitatVP(),v=[...point,1];const p=[0,1,2,3].map(row=>v.reduce((sum,n,k)=>sum+m[k*4+row]*n,0));return {x:(p[0]/p[3]+1)*500,y:(1-p[1]/p[3])*270};}
const color={wood:[.55,.37,.19,1],lightWood:[.67,.48,.27,1],roof:[.40,.27,.15,1],trim:[.77,.65,.43,1],floor:[.70,.57,.35,1],straw:[.82,.71,.47,1],wall:[.77,.80,.66,1],green:[.28,.38,.24,1],paleGreen:[.52,.61,.40,1],metal:[.48,.52,.48,1],clay:[.57,.30,.20,1],dark:[.17,.12,.07,1],cream:[.84,.85,.75,1],seed:[.68,.48,.17,1]};
const CUBE=box(),CYL=cylinder(),BALL=sphere(),RING=torus(),ROOF=trianglePrism();
function addBox(b,size,at,c,q){b.add(CUBE,compose(at,q,size),c);}
function addSphere(b,size,at,c){b.add(BALL,compose(at,undefined,size),c);}
function addBar(b,a,c,r,shade){b.add(CYL,segmentMatrix(a,c,r),shade);}
export function buildHabitat(cage){
 const b=new Batches(),home=worldX(cage.home),wheel=worldX(cage.wheel),bowl=worldX(cage.bowl),bottle=worldX(cage.bottle);
 addBox(b,[10,.18,3.8],[0,-.09,0],color.floor);addBox(b,[10.15,2.65,.12],[0,1.28,-1.96],color.wall);
 for(let x=-4.8;x<4.9;x+=.45)addBox(b,[.035,2.45,.03],[x,1.28,-1.875],color.cream);
 for(const z of [-1.87,1.87]){addBox(b,[10.15,.16,.13],[0,.02,z],color.wood);if(z<0)addBox(b,[10.15,.09,.09],[0,2.55,z],color.trim);}
 for(const x of [-4.98,4.98]){addBox(b,[.13,.16,3.8],[x,.02,0],color.wood);for(const z of [-1.87,1.87])addBox(b,[.1,2.65,.1],[x,1.3,z],color.trim);}
 for(let k=0;k<150;k++){const x=-4.78+(k*1.371)%9.55,z=-1.7+(k*.719)%3.4;addBox(b,[.08+(k%4)*.02,.012,.025],[x,.008,z],k%3?color.straw:color.lightWood,rotation([0,1,0],k*1.41));}
 // House with a real doorway, open interior and a low nest.
 for(const side of [-1,1]){addBox(b,[.14,1.5,1.5],[home+side*.95,.75,-.72],color.lightWood);addBox(b,[.61,1.5,.12],[home+side*.665,.75,.04],color.lightWood);}
 addBox(b,[2.02,1.5,.12],[home,.75,-1.49],color.wood);addBox(b,[.73,.5,.12],[home,1.25,.04],color.lightWood);
 addSphere(b,[.7,.075,.52],[home,.03,-.65],color.straw);
 for(let k=0;k<10;k++)addBox(b,[.5,.02,.03],[home-.45+(k*.137)%.9,.09,-.93+(k*.193)%.6],color.trim,rotation([0,1,0],k));
 b.add(ROOF,compose([home,1.5,-.72],undefined,[2.25,.65,1.75]),color.roof);
 const pitch=Math.atan2(.65,1.125);for(const side of [-1,1])addBox(b,[1.34,.09,1.87],[home+side*.56,1.85,-.72],color.wood,rotation([0,0,1],-side*pitch));
 for(const side of [-1,1])addBox(b,[.06,.98,.05],[home+side*.375,.49,.12],color.trim);addBox(b,[.8,.06,.05],[home,1,.12],color.trim);
 // Low bowl, water container and nozzle are separate from the walking lane.
 b.add(CYL,compose([bowl,.09,.4],undefined,[.48,.18,.48]),color.clay);b.add(CYL,compose([bowl,.19,.4],undefined,[.405,.025,.405]),color.dark);b.add(torus(.435,.055,20,6),compose([bowl,.2,.4],rotation([1,0,0],Math.PI/2)),color.clay);
 addBox(b,[.12,1.9,.13],[bottle,.95,-.7],color.green);addBox(b,[.46,1.2,.46],[bottle,1.65,-.42],color.cream);b.add(CYL,compose([bottle,2.3,-.42],undefined,[.28,.14,.28]),color.green);
 addBox(b,[.4,1.08,.015],[bottle,1.65,-.18],color.dark);addBar(b,[bottle,1.02,-.42],[bottle,.75,.05],.035,color.metal);addBar(b,[bottle,.75,.05],[bottle,.43,.61],.035,color.metal);
 // Wheel support; its disk, rim and spokes rotate together in a separate batch.
 addBox(b,[1.45,.09,.8],[wheel,.04,-.6],color.green);for(const side of [-1,1])addBar(b,[wheel+side*.6,.09,-.75],[wheel,1.16,-.8],.045,color.green);
 // Bridge stays in the same fixed horizontal zone as the layout editor.
 for(let k=0;k<8;k++){const x=.22+k*.12,y=.12+Math.sin(k/7*Math.PI)*.3;addBox(b,[.105,.09,.62],[x,y,-.25],color.lightWood,rotation([0,0,1],Math.cos(k/7*Math.PI)*.4));}
 const rotating=new Batches();rotating.add(CYL,compose([0,0,-.1],rotation([1,0,0],Math.PI/2),[.96,.045,.96]),color.paleGreen);rotating.add(RING,identity(),color.green);
 for(let k=0;k<5;k++){const angle=k*Math.PI*2/5;addBox(rotating,[.92,.035,.04],[Math.cos(angle)*.46,Math.sin(angle)*.46,0],color.paleGreen,rotation([0,0,1],angle));}addSphere(rotating,[.1,.1,.1],[0,0,.05],color.green);
 const food=new Batches();for(let k=0;k<20;k++){const angle=k*2.4,r=Math.sqrt((k+.5)/20)*.33;addSphere(food,[.055,.035,.025],[Math.cos(angle)*r,.025+(1-r/.4)*.06,Math.sin(angle)*r],k%3?color.seed:color.straw);}
 const toy=new Batches();addSphere(toy,[.15,.15,.15],[0,0,0],color.lightWood);toy.add(torus(.152,.012,16,4),identity(),color.straw);
 return {static:b.finish(),wheel:rotating.finish(),food:food.finish(),toy:toy.finish(),water:[{...CUBE,material:{pbrMetallicRoughness:{baseColorFactor:[.27,.53,.61,1],roughnessFactor:.3}}}],shadow:[{...BALL,material:{pbrMetallicRoughness:{baseColorFactor:[.19,.14,.07,.055],roughnessFactor:1}}}],glass:[{...CUBE,material:{pbrMetallicRoughness:{baseColorFactor:[.72,.86,.85,.055],roughnessFactor:.1},doubleSided:true}}]};
}
export function petPresentation(s){const p=s.pet,near=x=>Math.abs(p.x-x)<8;let z=1.05,foot=0,yaw=(p.direction||1)*Math.PI/2,moving=Math.abs(p.x-p.target)>3,inside=false;
 if(['sleep','hide','rest'].includes(p.state)&&near(s.cage.home)){z=-.73;yaw=0;inside=true;}
 else if(p.state==='wheel'&&near(s.cage.wheel)){z=-.08;foot=.2;moving=true;}
 else if(['eat','eatStash','gather','store','nest'].includes(p.state)&&!moving){z=p.state==='eat'||p.state==='gather'?1.12:.12;yaw=Math.PI;}
 else if(p.state==='drink'&&!moving){z=1.23;yaw=Math.PI;}
 else if(p.state==='play'&&!moving){z=1.03;yaw=(Math.sign(s.play.x-p.x)||p.direction)*Math.PI/2;}
 return {x:worldX(p.x),z,foot,yaw,moving,inside};
}
export class Habitat3D{
 constructor(renderer){this.renderer=renderer;this.vp=habitatVP();this.generation=-1;this.layout='';this.parts=null;this.avatar=null;this.lastTime=0;}
 rebuild(cage){const key=['home','wheel','bowl','bottle'].map(k=>cage[k]).join(':');if(key===this.layout&&this.generation===this.renderer.generation)return;if(this.generation===this.renderer.generation&&this.parts)for(const group of Object.values(this.parts))for(const p of group)this.renderer.deleteMesh(p);const source=buildHabitat(cage);this.parts=Object.fromEntries(Object.entries(source).map(([name,list])=>[name,list.map(p=>this.renderer.uploadMesh(p))]));this.layout=key;this.generation=this.renderer.generation;}
 dispose(){if(this.parts&&this.generation===this.renderer.generation)for(const group of Object.values(this.parts))for(const p of group)this.renderer.deleteMesh(p);this.parts=null;this.layout='';}
 render(s,time){const r=this.renderer;if(r.lost||r.gl.isContextLost())return null;this.rebuild(s.cage);r.beginFrame({width:800,height:432,vp:this.vp,eye:CAMERA.eye,background:[.93,.94,.88,1]});
  const draw=(key,world=identity())=>{for(const p of this.parts[key])r.drawMesh(p,world);};draw('static');
  const atWheel=s.alive&&s.pet.state==='wheel'&&Math.abs(s.pet.x-s.cage.wheel)<8;draw('wheel',compose([worldX(s.cage.wheel),1.16,-.45],rotation([0,0,1],atWheel?-time*.004:0)));
  const food=Math.max(0,Math.min(1,s.cage.food/100));if(food>.001)draw('food',compose([worldX(s.cage.bowl),.22,.4],undefined,[1,.2+.8*food,1]));
  const water=Math.max(0,Math.min(1,s.cage.water/100));if(water>.001)draw('water',compose([worldX(s.cage.bottle),1.12+.52*water,-.162],undefined,[.33,1.04*water,.012]));
  if(s.play.remaining>0)draw('toy',compose([worldX(s.play.x),.16,1.12],rotation([0,0,1],time*.002)));
  if(s.alive){const pose=petPresentation(s),dt=Math.max(0,Math.min(.1,(time-this.lastTime)/1000||.033));if(this.state!==s||!this.avatar){this.state=s;this.avatar={...pose};}const k=1-Math.exp(-dt*6);for(const key of ['z','foot'])this.avatar[key]+=(pose[key]-this.avatar[key])*k;this.avatar.yaw+=Math.atan2(Math.sin(pose.yaw-this.avatar.yaw),Math.cos(pose.yaw-this.avatar.yaw))*k;
   const shadowGL=r.gl;shadowGL.enable(shadowGL.BLEND);shadowGL.blendFunc(shadowGL.SRC_ALPHA,shadowGL.ONE_MINUS_SRC_ALPHA);shadowGL.depthMask(false);for(const scale of [1,.8,.6])draw('shadow',compose([pose.x,.004,this.avatar.z],rotation([0,1,0],this.avatar.yaw),[.4*scale,.001,.65*scale]));shadowGL.depthMask(true);shadowGL.disable(shadowGL.BLEND);
   r.drawModel(s,time,{yaw:this.avatar.yaw,moving:pose.moving,base:compose([pose.x,this.avatar.foot,this.avatar.z],undefined,[.78,.78,.78])});}
  const gl=r.gl;gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);draw('glass',compose([0,1.3,1.84],undefined,[9.8,2.5,.01]));gl.depthMask(true);gl.disable(gl.BLEND);this.lastTime=time;return r.canvas;
 }
}
