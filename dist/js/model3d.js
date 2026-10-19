// Small GLB/WebGL adapter for this project's untextured Blender model.
// No network services or third-party runtime. Column-major matrices throughout.
export const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function multiply(a,b){const out=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];return out;}
export function quaternion(a,b){const[x,y,z,w]=a,[u,v,q,p]=b;return [w*u+x*p+y*q-z*v,w*v-x*q+y*p+z*u,w*q+x*v-y*u+z*p,w*p-x*u-y*v-z*q];}
export function compose(t=[0,0,0],q=[0,0,0,1],s=[1,1,1]){const[x,y,z,w]=q,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;return new Float32Array([(1-yy-zz)*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,(xy-wz)*s[1],(1-xx-zz)*s[1],(yz+wx)*s[1],0,(xz+wy)*s[2],(yz-wx)*s[2],(1-xx-yy)*s[2],0,...t,1]);}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const unit=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);};
export function lookAt(eye,target){const z=unit(eye.map((v,i)=>v-target[i])),x=unit(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
export function orthographic(left,right,bottom,top,near,far){return new Float32Array([2/(right-left),0,0,0,0,2/(top-bottom),0,0,0,0,-2/(far-near),0,-(right+left)/(right-left),-(top+bottom)/(top-bottom),-(far+near)/(far-near),1]);}
export function normals(m){const a=[m[0],m[1],m[2]],b=[m[4],m[5],m[6]],c=[m[8],m[9],m[10]],bc=cross(b,c),det=dot(a,bc);if(Math.abs(det)<1e-12)return new Float32Array(9);return new Float32Array([...bc,...cross(c,a),...cross(a,b)].map(x=>x/det));}
export function parseGLB(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<28)throw Error('Incomplete GLB');
 const view=new DataView(buffer);if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('Invalid GLB header');
 let doc,bin;for(let offset=12;offset<buffer.byteLength;){if(offset+8>buffer.byteLength)throw Error('Incomplete GLB chunk');const length=view.getUint32(offset,true),kind=view.getUint32(offset+4,true);offset+=8;if(length%4||offset+length>buffer.byteLength)throw Error('Invalid GLB chunk');if(kind===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,length)));if(kind===0x004e4942)bin=buffer.slice(offset,offset+length);offset+=length;}
 if(!doc||!bin||doc.asset?.version!=='2.0'||doc.buffers?.length!==1||doc.buffers[0].uri||doc.buffers[0].byteLength>bin.byteLength)throw Error('Unsupported GLB buffer');
 if(doc.skins?.length||doc.textures?.length||doc.extensionsRequired?.length)throw Error('This viewer requires the untextured project model');
 const constructors={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 function accessor(index){const a=doc.accessors?.[index],b=doc.bufferViews?.[a?.bufferView],Type=constructors[a?.componentType],width=widths[a?.type];if(!a||!b||!Type||!width||a.sparse||b.buffer!==0||!Number.isInteger(a.count)||a.count<0)throw Error('Unsupported GLB accessor');const bytes=Type.BYTES_PER_ELEMENT,offset=(b.byteOffset||0)+(a.byteOffset||0),stride=b.byteStride||width*bytes,last=offset+Math.max(0,a.count-1)*stride+width*bytes;if(stride<width*bytes||offset%bytes||last>(b.byteOffset||0)+b.byteLength||last>bin.byteLength)throw Error('GLB accessor outside buffer');if(stride===width*bytes)return new Type(bin,offset,a.count*width);const out=new Type(a.count*width);for(let i=0;i<a.count;i++)out.set(new Type(bin,offset+i*stride,width),i*width);return out;}
 const meshes=doc.meshes.map(mesh=>mesh.primitives.map(p=>{if((p.mode??4)!==4||p.targets)throw Error('Unsupported GLB primitive');const positions=accessor(p.attributes.POSITION),normals=accessor(p.attributes.NORMAL),indices=accessor(p.indices);if(!(positions instanceof Float32Array)||!(normals instanceof Float32Array)||positions.length!==normals.length||positions.length%3||indices.length%3||!Array.from(indices).every(i=>i<positions.length/3))throw Error('Invalid mesh');return {positions,normals,indices,material:doc.materials?.[p.material]||{}};}));
 const roots=doc.scenes?.[doc.scene||0]?.nodes;if(!Array.isArray(roots))throw Error('Missing GLB scene');const active=new Set();function visit(i){if(!doc.nodes[i]||active.has(i))throw Error('Invalid node graph');active.add(i);for(const child of doc.nodes[i].children||[])visit(child);active.delete(i);}roots.forEach(visit);
 return {doc,meshes,roots};
}
export function pose(node,state,time,moving=false){
 const p=[...(node.translation||[0,0,0])],s=[...(node.scale||[1,1,1])];let q=node.rotation||[0,0,0,1];const name=node.name||'',sleeping=['sleep','rest'].includes(state.pet.state),action=state.pet.state;
 const rx=angle=>{q=quaternion(q,[Math.sin(angle/2),0,0,Math.cos(angle/2)]);};
 if(name==='BodyController')s[1]*=1+Math.sin(time*.0025)*.018;
 if(name==='HeadController')rx(sleeping?.16:action==='drink'&&!moving?.18+Math.sin(time*.016)*.025:['eat','eatStash'].includes(action)&&!moving?.1+Math.sin(time*.019)*.05:action==='groom'&&!moving?.16:Math.sin(time*.002)*.035);
 if(name.startsWith('PawPivot_')){const front=name.endsWith('Front'),diagonal=(name.includes('_L_')===front)?1:-1;if(moving){rx(Math.sin(time*.021)*.32*diagonal);p[1]+=Math.max(0,Math.sin(time*.021)*diagonal)*.035;}else if(front&&['groom','eat','eatStash','gather','nest'].includes(action)){p[1]+=.08+(action==='groom'?.055:0)+Math.sin(time*.02)*.015;p[2]+=.05;rx(-.45);}}
 if(name.startsWith('Eye')){const blink=time%5100>4940;if(sleeping||blink){if(name.includes('Highlight'))s.fill(.001);else s[1]*=.12;}}
 if(name.startsWith('Cheek'))s[0]*=1+(state.pet.carry||0)*.035;
 return node.matrix?new Float32Array(node.matrix):compose(p,q,s);
}
export function worldMatrices(model,state,time,yaw,moving=false){const sleeping=['sleep','rest'].includes(state.pet.state),root=compose([0,moving?Math.abs(Math.sin(time*.021))*.018:0,0],[0,Math.sin(yaw/2),0,Math.cos(yaw/2)],[1,sleeping?.87:1,1]),result=new Map();function walk(i,parent){const matrix=multiply(parent,pose(model.doc.nodes[i],state,time,moving));result.set(i,matrix);for(const child of model.doc.nodes[i].children||[])walk(child,matrix);}model.roots.forEach(i=>walk(i,root));return result;}
