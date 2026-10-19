import {initialState,clamp} from './model.js';
export class SaveManager {
 static key='hamster-life-v1';
 static validate(raw){if(!raw||raw.version!==1||!['child','realistic'].includes(raw.mode)||typeof raw.alive!=='boolean')throw Error('Неподдерживаемое сохранение');const s=initialState();
 for(const k of ['lastSeen','age','elapsed','seed']){if(!Number.isFinite(raw[k])||raw[k]<0)throw Error('Повреждено поле '+k);s[k]=raw[k];}
 s.mode=raw.mode;s.alive=raw.alive;s.name=typeof raw.name==='string'?raw.name.slice(0,30):'Пончик';s.deathReason=typeof raw.deathReason==='string'?raw.deathReason.slice(0,150):null;
 for(const k of Object.keys(s.needs)){if(!Number.isFinite(raw.needs?.[k]))throw Error('Повреждены потребности');s.needs[k]=clamp(raw.needs[k]);}
 for(const k of Object.keys(s.cage)){if(!Number.isFinite(raw.cage?.[k]))throw Error('Повреждена клетка');s.cage[k]=clamp(raw.cage[k],0,['home','wheel','bowl','bottle'].includes(k)?950:100);}
 s.pet.x=Number.isFinite(raw.pet?.x)?clamp(raw.pet.x,60,940):505;s.pet.target=s.pet.x;s.pet.state=s.alive?'explore':'dead';s.journal=Array.isArray(raw.journal)?raw.journal.filter(e=>Number.isFinite(e?.at)&&typeof e?.text==='string').slice(-100).map(e=>({at:e.at,text:e.text.slice(0,300)})):[];return s;
 }
 static load(storage){try{const raw=storage.getItem(this.key);if(!raw)return {state:initialState(),message:null};return {state:this.validate(JSON.parse(raw)),message:null};}catch{return {state:initialState(),message:'Сохранение не удалось прочитать. Начата новая жизнь; повреждённая запись не перезаписывается автоматически.',blocked:true};}}
 static save(s,storage){try{storage.setItem(this.key,JSON.stringify(s));return true;}catch{return false;}}
}
