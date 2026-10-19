import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PoseAnimator,animationTarget,parseGLB,worldMatrices} from '../dist/js/model3d.js';
import {initialState} from '../dist/js/model.js';
const bytes=await fs.readFile(new URL('../dist/assets/hamster.glb',import.meta.url));
const model=parseGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const weights=['walk','sleep','eat','drink','groom','work'];
test('сон и еда не включаются во время пути к предмету',()=>{
 const s=initialState();for(const action of ['sleep','rest','eat','drink','groom','nest']){s.pet.state=action;const a=animationTarget(s,true);assert.equal(a.walk,1);assert.equal(weights.filter(k=>k!=='walk').reduce((sum,k)=>sum+a[k],0),0);}
});
test('переход ходьба → сон не меняет позу мгновенно и затем закрывает глаза',()=>{
 const s=initialState(),animator=new PoseAnimator();s.pet.state='explore';animator.sample(s,0,true);const before=animator.sample(s,100,true);
 s.pet.state='sleep';const start=animator.sample(s,100,false);assert.deepEqual(start,before);
 for(let t=116;t<=1100;t+=16){const a=animator.sample(s,t,false);assert.ok(a.sleep>=0&&a.sleep<=1);assert.ok(a.walk>=0&&a.walk<=1);assert.ok(Math.abs(weights.reduce((sum,k)=>sum+a[k],0)-1)<1e-10);}
 const end=animator.sample(s,1100,false);assert.ok(end.sleep>.999);assert.ok(end.walk<.001);
 const eye=model.doc.nodes.findIndex(n=>n.name.startsWith('Eye')&&!n.name.includes('Highlight'));assert.ok(eye>=0);
 const first=worldMatrices(model,s,100,0,false,start).get(eye),last=worldMatrices(model,s,1100,0,false,end).get(eye);assert.notDeepEqual(first,last);
});
test('возобновление вкладки и неверные часы не прокручивают анимацию на часы вперёд',()=>{
 const s=initialState(),a=new PoseAnimator();a.sample(s,1000,true);const before=a.sample(s,1016,true),after=a.sample(s,1e9,true);assert.ok(after.time-before.time<=100);assert.ok(after.gait-before.gait<=2.1+1e-8);
 const backwards=a.sample(s,-100,true);assert.equal(backwards.time,after.time);assert.equal(backwards.gait,after.gait);assert.ok(Object.values(a.sample(s,NaN,true)).every(Number.isFinite));
});
test('смена жилища сбрасывает визуальную позу; демонстрация использует стабильный ключ',()=>{
 const first=initialState(),second=initialState(),a=new PoseAnimator();first.pet.state='sleep';a.sample(first,0);second.pet.state='drink';const switched=a.sample(second,100);assert.equal(switched.sleep,0);assert.equal(switched.drink,1);
 const viewer={};a.sample({...second,pet:{...second.pet}},200,false,viewer);const next=a.sample({...second,pet:{...second.pet,state:'groom'}},216,false,viewer);assert.ok(next.drink>0&&next.drink<1);assert.ok(next.groom>0&&next.groom<1);
});
test('переход имеет одинаковую длительность при 30 и 60 кадрах в секунду',()=>{
 function sample(fps){const s=initialState(),a=new PoseAnimator();a.sample(s,0,true);s.pet.state='eat';for(let i=1;i<=fps;i++)a.sample(s,i*1000/fps,false);return a.weights;}
 const a=sample(30),b=sample(60);for(const k of weights)assert.ok(Math.abs(a[k]-b[k])<1e-10,k);
});
test('все переходы реальной GLB дают конечные матрицы и не меняют сохранение',()=>{
 const s=initialState(),a=new PoseAnimator();let time=0;
 for(const action of ['explore','eat','groom','sleep','drink','nest','wheel','rest']){s.pet.state=action;const snapshot=JSON.stringify(s);
  for(let frame=0;frame<30;frame++){time+=16;const moving=action==='explore'||action==='wheel',pose=a.sample(s,time,moving);for(const matrix of worldMatrices(model,s,time,1,moving,pose).values())assert.ok(Array.from(matrix).every(Number.isFinite));}
  assert.equal(JSON.stringify(s),snapshot);
 }
});
