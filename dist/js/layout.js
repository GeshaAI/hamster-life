// Geometry in the 1000 x 540 canvas. No DOM or network dependencies.
export const ITEMS={home:{name:'Домик',half:122,top:194,bottom:425},wheel:{name:'Колесо',half:114,top:181,bottom:437},bowl:{name:'Кормушка',half:54,top:390,bottom:444},bottle:{name:'Поилка',half:28,top:127,bottom:338}};
const bridge={left:518,right:612,top:394,bottom:432};
function shapes(key,x){
 if(key==='wheel')return [{circle:true,x,y:295,r:108},{left:x-76,right:x+76,top:425,bottom:438}];
 if(key==='bottle')return [{left:x-28,right:x+28,top:127,bottom:267},{left:x-8,right:x+5,top:264,bottom:335},{left:x-20,right:x+3,top:320,bottom:338}];
 const o=ITEMS[key];return [{left:x-o.half,right:x+o.half,top:o.top,bottom:o.bottom}];
}
function overlap(a,b){
 if(a.circle&&b.circle)return (a.x-b.x)**2+(a.y-b.y)**2<(a.r+b.r+2)**2;
 if(b.circle)return overlap(b,a);
 if(a.circle){const dx=a.x-Math.min(b.right,Math.max(b.left,a.x)),dy=a.y-Math.min(b.bottom,Math.max(b.top,a.y));return dx*dx+dy*dy<(a.r+2)**2;}
 return a.left<b.right+4&&a.right>b.left-4&&a.top<b.bottom+4&&a.bottom>b.top-4;
}
export class CageLayout {
 static defaults(){return {home:165,wheel:760,bowl:390,bottle:895};}
 static snapshot(cage){return Object.fromEntries(Object.keys(ITEMS).map(key=>[key,cage[key]]));}
 static validate(layout){
  for(const [key,item]of Object.entries(ITEMS)){
   const x=layout?.[key];if(!Number.isFinite(x)||x-item.half<20||x+item.half>980)return {ok:false,message:'Предмет должен оставаться внутри клетки.'};
   if(shapes(key,x).some(a=>overlap(a,bridge)))return {ok:false,message:'Здесь мешает деревянный мостик.'};
  }
  const keys=Object.keys(ITEMS);for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)if(shapes(keys[i],layout[keys[i]]).some(a=>shapes(keys[j],layout[keys[j]]).some(b=>overlap(a,b))))return {ok:false,message:'Предметы слишком близко друг к другу.'};
  return {ok:true,message:'Место свободно.'};
 }
 static move(layout,key,x){if(!Object.hasOwn(ITEMS,key)||!Number.isFinite(x))return {ok:false,message:'Не удалось определить место.'};const candidate={...layout,[key]:Math.round(x/5)*5},result=this.validate(candidate);return {...result,layout:result.ok?candidate:layout,candidate:candidate[key]};}
 static hit(layout,x,y){return Object.entries(ITEMS).reverse().find(([key,o])=>Math.abs(x-layout[key])<=o.half+10&&y>=o.top-10&&y<=o.bottom+10)?.[0]||null;}
 static commit(state,layout){if(!state.alive||!this.validate(layout).ok)return false;Object.assign(state.cage,this.snapshot(layout));state.pet.timer=0;state.pet.target=state.pet.x;return true;}
}
export function canvasPoint(clientX,clientY,rect,fit='contain'){
 if(!rect||rect.width<=0||rect.height<=0)return null;
 const scale=(fit==='cover'?Math.max:Math.min)(rect.width/1000,rect.height/540);
 const left=rect.left+(rect.width-1000*scale)/2,top=rect.top+(rect.height-540*scale)/2;
 const x=(clientX-left)/scale,y=(clientY-top)/scale;
 return x>=0&&x<=1000&&y>=0&&y<=540?{x,y}:null;
}
