import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseGLB,compose,multiply,lookAt,orthographic,normals,worldMatrices} from '../dist/js/model3d.js';
import {Hamster3D} from '../dist/js/hamster3d.js';
import {initialState} from '../dist/js/model.js';
const bytes=await fs.readFile(new URL('../dist/assets/hamster.glb',import.meta.url));
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const model=parseGLB(buffer);
const transform=(m,p)=>[0,1,2].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);
test('загружается настоящая Blender GLB-геометрия, а не рисунок',()=>{
 assert.equal(model.doc.asset.version,'2.0');assert.equal(model.meshes.length,26);
 for(const name of ['HeadController','BodyController','PawPivot_L_Front','PawPivot_R_Front','PawPivot_L_Rear','PawPivot_R_Rear'])assert.ok(model.doc.nodes.some(n=>n.name===name),name);
 let triangles=0;for(const mesh of model.meshes)for(const p of mesh){triangles+=p.indices.length/3;assert.ok(p.positions.length>0);assert.ok(Array.from(p.positions).every(Number.isFinite));assert.ok(Array.from(p.normals).every(Number.isFinite));}assert.ok(triangles>1000&&triangles<30000);
});
test('повреждённая модель и выход за границы GLB отклоняются',()=>{
 assert.throws(()=>parseGLB(new ArrayBuffer(12)));const bad=buffer.slice(0);new DataView(bad).setUint32(8,99,true);assert.throws(()=>parseGLB(bad));const chunk=buffer.slice(0);new DataView(chunk).setUint32(12,0xffffffff,true);assert.throws(()=>parseGLB(chunk));
});
test('матрицы сохраняют перенос и порядок вращения; нормали учитывают масштаб',()=>{
 const rotation=compose([0,0,0],[0,Math.sin(Math.PI/4),0,Math.cos(Math.PI/4)]),shift=compose([2,3,4]);const p=transform(multiply(shift,rotation),[0,0,1]);assert.ok(Math.abs(p[0]-3)<1e-6);assert.ok(Math.abs(p[1]-3)<1e-6);assert.ok(Math.abs(p[2]-4)<1e-6);
 const n=normals(compose([0,0,0],[0,0,0,1],[2,4,5]));assert.equal(n[0],.5);assert.equal(n[4],.25);assert.ok(Math.abs(n[8]-.2)<1e-6);
});
test('ходьба двигает четыре лапы, еда — голову; просмотр не меняет сохранение',()=>{
 const s=initialState(),before=JSON.stringify(s);const standing=worldMatrices(model,s,0,0,false),walking=worldMatrices(model,s,80,0,true);for(let i=0;i<model.doc.nodes.length;i++)if(model.doc.nodes[i].name.startsWith('PawPivot_'))assert.notDeepEqual(standing.get(i),walking.get(i));
 assert.equal(JSON.stringify(s),before);const head=model.doc.nodes.findIndex(n=>n.name==='HeadController');s.pet.state='eat';assert.notDeepEqual(worldMatrices(model,s,1000,0,false).get(head),standing.get(head));
});
test('модель не обрезается камерой при вращении и разных действиях',()=>{
 const vp=multiply(orthographic(-.95,.95,-.95,.95,.1,10),lookAt([0,1.15,4],[0,.46,0]));const s=initialState();
 for(const action of ['explore','eat','groom','sleep']){s.pet.state=action;for(let angle=0;angle<Math.PI*2;angle+=Math.PI/6){const matrices=worldMatrices(model,s,1000,angle,action==='explore');for(const [i,world]of matrices){const node=model.doc.nodes[i];if(node.mesh===undefined)continue;const m=multiply(vp,world);for(const mesh of model.meshes[node.mesh])for(let j=0;j<mesh.positions.length;j+=3){const p=transform(m,mesh.positions.subarray(j,j+3));assert.ok(p.every(v=>Math.abs(v)<1),`${node.name} clipped at angle ${angle}: ${p}`);}}}}
});
function fakeGL(){let count=1;const calls={draws:0,buffers:0};const gl=new Proxy({calls,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>1,getUniformLocation:()=>({}),isContextLost:()=>false,getExtension:()=>({}),createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),bufferData:(_target,data)=>{assert.ok(ArrayBuffer.isView(data));calls.buffers++;},uniformMatrix4fv:(_u,_t,m)=>assert.ok(Array.from(m).every(Number.isFinite)),uniformMatrix3fv:(_u,_t,m)=>assert.ok(Array.from(m).every(Number.isFinite)),drawElements:(_mode,n)=>{assert.ok(n>0);calls.draws++;}}, {get(target,key){if(key in target)return target[key];if(key===key.toUpperCase())return target[key]=count++;return ()=>{};}});return gl;}
test('WebGL получает геометрию всех деталей и восстанавливается после потери контекста',async()=>{
 const gl=fakeGL(),handlers={},canvas={width:0,height:0,getContext:()=>gl,addEventListener:(name,fn)=>handlers[name]=fn};const renderer=new Hamster3D(canvas);const fetchBefore=globalThis.fetch;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>buffer});try{await renderer.load();}finally{globalThis.fetch=fetchBefore;}
 const s=initialState();assert.equal(renderer.render(s,0),canvas);assert.equal(gl.calls.draws,26);assert.equal(gl.calls.buffers,78);handlers.webglcontextlost({preventDefault(){}});assert.equal(renderer.render(s,0),null);handlers.webglcontextrestored();assert.equal(renderer.render(s,0),canvas);renderer.dispose();
});
test('отсутствие WebGL обрабатывается явным отказом',()=>{assert.throws(()=>new Hamster3D({getContext:()=>null}),/WebGL unavailable/);});
