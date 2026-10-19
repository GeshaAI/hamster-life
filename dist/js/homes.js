import {initialState,SimulationEngine,EventJournal,CHARACTERS,COATS,normalizeName} from './model.js';
import {SaveManager} from './save.js';
export class HomeManager {
 static limit=3;
 constructor(world){this.world=world;}
 get active(){return this.world.homes.find(home=>home.id===this.world.activeId);}
 static validate(raw){
  if(raw?.version===1)return {version:2,activeId:'home1',homes:[{id:'home1',state:SaveManager.validate(raw)}]};
  if(raw?.version!==2||!Array.isArray(raw.homes)||raw.homes.length<1||raw.homes.length>this.limit)throw Error('Неподдерживаемый мир');
  const seen=new Set();
  const homes=raw.homes.map(home=>{
   if(!home||typeof home.id!=='string'||!/^home[1-3]$/.test(home.id)||seen.has(home.id))throw Error('Повреждён список домиков');
   seen.add(home.id);return {id:home.id,state:SaveManager.validate(home.state)};
  });
  if(!seen.has(raw.activeId))throw Error('Не найден выбранный домик');
  return {version:2,activeId:raw.activeId,homes};
 }
 static load(storage){
  try{const raw=storage.getItem(SaveManager.key);return {manager:new HomeManager(raw?this.validate(JSON.parse(raw)):this.validate(initialState())),blocked:false,message:null};}
  catch{return {manager:new HomeManager(this.validate(initialState())),blocked:true,message:'Сохранение мира повреждено или недоступно. Автозапись остановлена; исходная запись не заменяется. Восстановите резервный файл через настройки.'};}
 }
 save(storage){try{storage.setItem(SaveManager.key,JSON.stringify(this.world));return true;}catch{return false;}}
 resumeAll(now=Date.now()){return new Map(this.world.homes.map(home=>[home.id,new SimulationEngine(home.state).resume(now)]));}
 activate(id,now=Date.now()){
  if(!this.world.homes.some(home=>home.id===id))throw Error('Домик не найден');
  this.resumeAll(now);this.world.activeId=id;return new SimulationEngine(this.active.state);
 }
 add({name,coat,character},now=Date.now()){
  if(this.world.homes.length>=HomeManager.limit)throw Error('Все три жилища уже заняты. Текущие питомцы остаются с вами.');
  name=normalizeName(name);if(!name||!Object.hasOwn(COATS,coat)||!Object.hasOwn(CHARACTERS,character))throw Error('Введите имя и выберите окрас и характер.');
  const state=initialState(now);state.name=name;state.coat=coat;state.bond.character=character;state.seed=(now+7919*this.world.homes.length)>>>0;
  state.journal=[{at:now,text:`${name}: новая жизнь в отдельном домике.`}];
  const id=['home1','home2','home3'].find(key=>!this.world.homes.some(home=>home.id===key));
  const home={id,state};this.world.homes.push(home);return home;
 }
 rename(name){name=normalizeName(name);if(!name)throw Error('Имя не должно быть пустым.');this.active.state.name=name;EventJournal.add(this.active.state,'Имя питомца изменено.');}
 replaceActive(raw){const state=SaveManager.validate(raw);this.active.state=state;return new SimulationEngine(state);}
}
