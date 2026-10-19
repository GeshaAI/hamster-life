// Reusable low-polygon geometry for the local habitat. No browser dependencies.
import {compose,normals} from './model3d.js';
const mesh=(p,n,i)=>({positions:new Float32Array(p),normals:new Float32Array(n),indices:new Uint16Array(i)});
export function box(){
 const p=[],n=[],i=[];
 for(const [normal,u,v]of [[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]]){
  const base=p.length/3;for(const [a,b]of [[-1,-1],[1,-1],[1,1],[-1,1]]){p.push(...normal.map((x,k)=>(x+a*u[k]+b*v[k])*.5));n.push(...normal);}i.push(base,base+1,base+2,base,base+2,base+3);
 }return mesh(p,n,i);
}
export function cylinder(segments=16){
 const p=[],n=[],i=[];
 for(let s=0;s<=segments;s++){const a=s/segments*Math.PI*2,x=Math.cos(a),z=Math.sin(a);p.push(x,-.5,z,x,.5,z);n.push(x,0,z,x,0,z);if(s<segments){const k=s*2;i.push(k,k+1,k+3,k,k+3,k+2);}}
 for(const sign of [-1,1]){const base=p.length/3;p.push(0,sign*.5,0);n.push(0,sign,0);for(let s=0;s<=segments;s++){const a=s/segments*Math.PI*2;p.push(Math.cos(a),sign*.5,Math.sin(a));n.push(0,sign,0);if(s<segments){if(sign>0)i.push(base,base+s+2,base+s+1);else i.push(base,base+s+1,base+s+2);}}}return mesh(p,n,i);
}
export function sphere(segments=12,rings=8){
 const p=[],n=[],i=[];for(let r=0;r<=rings;r++){const v=r/rings*Math.PI;for(let s=0;s<=segments;s++){const u=s/segments*Math.PI*2,x=Math.sin(v)*Math.cos(u),y=Math.cos(v),z=Math.sin(v)*Math.sin(u);p.push(x,y,z);n.push(x,y,z);if(r<rings&&s<segments){const a=r*(segments+1)+s,b=a+segments+1;i.push(a,a+1,b,a+1,b+1,b);}}}return mesh(p,n,i);
}
export function torus(radius=.95,tube=.07,segments=24,sides=6){
 const p=[],n=[],i=[];for(let a=0;a<=segments;a++){const u=a/segments*Math.PI*2;for(let b=0;b<=sides;b++){const v=b/sides*Math.PI*2,cv=Math.cos(v),sv=Math.sin(v);p.push((radius+tube*cv)*Math.cos(u),(radius+tube*cv)*Math.sin(u),tube*sv);n.push(cv*Math.cos(u),cv*Math.sin(u),sv);if(a<segments&&b<sides){const k=a*(sides+1)+b,q=k+sides+1;i.push(k,q,q+1,k,q+1,k+1);}}}return mesh(p,n,i);
}
export function trianglePrism(){
 const p=[-.5,0,.5,.5,0,.5,0,1,.5,0,1,-.5,.5,0,-.5,-.5,0,-.5],n=[0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1],i=[0,1,2,3,4,5];
 const points=[[-.5,0],[.5,0],[0,1]];for(let k=0;k<3;k++){const a=points[k],b=points[(k+1)%3],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),base=p.length/3;p.push(a[0],a[1],-.5,b[0],b[1],-.5,b[0],b[1],.5,a[0],a[1],.5);for(let v=0;v<4;v++)n.push(dy/l,-dx/l,0);i.push(base,base+1,base+2,base,base+2,base+3);}return mesh(p,n,i);
}
export const rotation=(axis,angle)=>axis.map(v=>v*Math.sin(angle/2)).concat(Math.cos(angle/2));
export function segmentMatrix(a,b,radius){const direction=b.map((v,i)=>v-a[i]),length=Math.hypot(...direction),d=direction.map(v=>v/length);let q;if(d[1]<-.99999)q=[1,0,0,0];else{q=[d[2],0,-d[0],1+d[1]];const norm=Math.hypot(...q);q=q.map(v=>v/norm);}return compose(a.map((v,i)=>(v+b[i])*.5),q,[radius,length,radius]);}
export class Batches{
 constructor(){this.groups=new Map();}
 add(source,matrix,color,rough=.85){const key=color.join(',')+':'+rough;let batch=this.groups.get(key);if(!batch){batch={p:[],n:[],i:[],color,rough};this.groups.set(key,batch);}const normal=normals(matrix),base=batch.p.length/3;if(base+source.positions.length/3>65535)throw Error('Habitat batch exceeds mobile index budget');
  for(let k=0;k<source.positions.length;k+=3){const[x,y,z]=source.positions.subarray(k,k+3);for(let row=0;row<3;row++)batch.p.push(matrix[row]*x+matrix[4+row]*y+matrix[8+row]*z+matrix[12+row]);const a=source.normals.subarray(k,k+3),n=[0,1,2].map(row=>normal[row]*a[0]+normal[3+row]*a[1]+normal[6+row]*a[2]),length=Math.hypot(...n)||1;batch.n.push(...n.map(v=>v/length));}
  batch.i.push(...Array.from(source.indices,v=>base+v));return this;
 }
 finish(){return [...this.groups.values()].map(b=>({...mesh(b.p,b.n,b.i),material:{pbrMetallicRoughness:{baseColorFactor:b.color,roughnessFactor:b.rough},doubleSided:false}}));}
}
