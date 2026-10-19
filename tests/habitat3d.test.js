import test from 'node:test';
import assert from 'node:assert/strict';
import {box,cylinder,sphere,torus,trianglePrism,Batches,segmentMatrix} from '../dist/js/geometry3d.js';
import {buildHabitat,worldX,project,petPresentation} from '../dist/js/habitat3d.js';
import {initialState} from '../dist/js/model.js';
import {CageLayout,canvasPoint} from '../dist/js/layout.js';
import {compose} from '../dist/js/model3d.js';
const xyz=(data,i)=>Array.from(data.subarray(i*3,i*3+3));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
test('примитивы имеют корректные индексы, нормали и наружный порядок граней',()=>{
 for(const shape of [box(),cylinder(),sphere(),torus(),trianglePrism()]){assert.equal(shape.positions.length,shape.normals.length);assert.ok(Array.from(shape.positions).every(Number.isFinite));assert.ok(Array.from(shape.indices).every(i=>i<shape.positions.length/3));for(let k=0;k<shape.indices.length;k+=3){const ids=Array.from(shape.indices.subarray(k,k+3)),[a,b,c]=ids.map(i=>xyz(shape.positions,i)),u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),normal=cross(u,v);if(Math.hypot(...normal)<1e-7)continue;const shade=ids.map(i=>xyz(shape.normals,i)).reduce((n,v)=>n.map((x,i)=>x+v[i]),[0,0,0]);assert.ok(dot(normal,shade)>0,'winding faces outward');}}
});
test('пакетирование объединяет детали по материалу и преобразует нормали',()=>{const b=new Batches(),color=[.5,.3,.2,1];b.add(box(),compose([2,0,0],undefined,[2,1,.5]),color).add(box(),compose([-2,0,0]),color);const meshes=b.finish();assert.equal(meshes.length,1);assert.equal(meshes[0].positions.length,144);for(let i=0;i<meshes[0].normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...meshes[0].normals.subarray(i,i+3))-1)<1e-6);});
test('сегменты цилиндров ориентируются от одной точки к другой',()=>{for(const [a,b]of [[[0,0,0],[0,2,0]],[[0,0,0],[0,-2,0]],[[1,2,3],[4,6,8]]]){const m=segmentMatrix(a,b,.1);for(const side of [-.5,.5]){const p=[m[4]*side+m[12],m[5]*side+m[13],m[6]*side+m[14]],target=side<0?a:b;assert.ok(p.every((v,i)=>Math.abs(v-target[i])<1e-6));}}});
test('геометрия всей клетки детерминирована и помещается в мобильные индексы',()=>{
 const s=initialState(),before=JSON.stringify(s),a=buildHabitat(s.cage),b=buildHabitat(s.cage);assert.deepEqual(a,b);assert.equal(JSON.stringify(s),before);let triangles=0;for(const group of Object.values(a))for(const p of group){assert.ok(p.positions.length/3<65536);assert.ok(Array.from(p.positions).every(Number.isFinite));assert.ok(Array.from(p.indices).every(i=>i<p.positions.length/3));triangles+=p.indices.length/3;}assert.ok(triangles<15000);assert.ok(a.static.length<20,'batched furniture limits draw calls');
});
test('камера сохраняет горизонтальные координаты касаний мячика',()=>{const rect={left:10,top:20,width:500,height:270};for(const x of [70,165,390,500,760,895,930]){const projected=project([worldX(x),.16,1.12]);assert.ok(Math.abs(projected.x-x)<1e-4);const point=canvasPoint(10+projected.x*.5,20+projected.y*.5,rect);assert.ok(point);assert.ok(Math.abs(point.x-x)<1e-4);}});
test('перестановка меняет 3D-предметы без изменения потребностей или ресурсов',()=>{const s=initialState(),before=JSON.stringify(s),layout=CageLayout.snapshot(s.cage);const moved=CageLayout.move(layout,'home',185);assert.equal(moved.ok,true);const a=buildHabitat(s.cage),b=buildHabitat({...s.cage,...moved.layout});assert.notDeepEqual(a.static,b.static);assert.equal(JSON.stringify(s),before);});
test('колесо включает ходьбу на месте, сон помещает питомца внутрь домика',()=>{const s=initialState();s.pet.state='wheel';s.pet.x=s.pet.target=s.cage.wheel;const wheel=petPresentation(s);assert.equal(wheel.moving,true);assert.ok(wheel.foot>0);s.pet.state='sleep';s.pet.x=s.pet.target=s.cage.home;const sleep=petPresentation(s);assert.equal(sleep.inside,true);assert.ok(sleep.z<0);assert.equal(sleep.moving,false);});
test('еда и вода разворачивают мордочку к оборудованию и не меняют жизнь',()=>{for(const action of ['eat','drink']){const s=initialState();s.pet.state=action;s.pet.x=s.pet.target=s.cage[action==='eat'?'bowl':'bottle'];const before=JSON.stringify(s),pose=petPresentation(s);assert.equal(pose.yaw,Math.PI);assert.ok(pose.z>0);assert.equal(JSON.stringify(s),before);}});
import {Hamster3D} from '../dist/js/hamster3d.js';
import {Habitat3D} from '../dist/js/habitat3d.js';
import {parseGLB} from '../dist/js/model3d.js';
import fs from 'node:fs/promises';
test('3D-клетка переиспользует буферы, обновляет планировку и восстанавливает контекст',async()=>{
 const handlers={},calls={uploads:0,deletes:0,draws:0};let id=1;const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>1,getUniformLocation:()=>({}),isContextLost:()=>false,getExtension:()=>({}),createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),bufferData:()=>calls.uploads++,deleteBuffer:()=>calls.deletes++,drawElements:()=>calls.draws++,uniformMatrix4fv:(_u,_t,m)=>assert.ok(Array.from(m).every(Number.isFinite)),uniformMatrix3fv:(_u,_t,m)=>assert.ok(Array.from(m).every(Number.isFinite))},{get(target,key){if(key in target)return target[key];if(key===key.toUpperCase())return target[key]=id++;return ()=>{};}});
 const canvas={width:0,height:0,getContext:()=>gl,addEventListener:(key,fn)=>handlers[key]=fn},renderer=new Hamster3D(canvas);const bytes=await fs.readFile(new URL('../dist/assets/hamster.glb',import.meta.url));renderer.model=parseGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));renderer.upload();const world=new Habitat3D(renderer),state=initialState(),before=JSON.stringify(state);
 assert.equal(world.render(state,1000),canvas);assert.equal(canvas.width,800);assert.equal(canvas.height,432);assert.ok(calls.draws>26);const uploads=calls.uploads;world.render(state,1033);assert.equal(calls.uploads,uploads,'does not upload the entire cage every frame');assert.equal(JSON.stringify(state),before);
 state.cage.home=185;world.render(state,1066);assert.ok(calls.uploads>uploads);assert.ok(calls.deletes>0);const lastUploads=calls.uploads;handlers.webglcontextlost({preventDefault(){}});assert.equal(world.render(state,1100),null);handlers.webglcontextrestored();world.render(state,1133);assert.ok(calls.uploads>lastUploads);
});
