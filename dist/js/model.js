import {CageLayout} from './layout.js';
// All rates are game design, not veterinary predictions. No network dependencies.
export const VERSION = '0.4.2';
export const clamp = (n, min=0, max=100) => Math.min(max, Math.max(min,n));
export const COATS={golden:{name:'Золотистый',light:'#e5c79e',mid:'#ddba8d',dark:'#ad7a4e'},snow:{name:'Светлый',light:'#f5f1e6',mid:'#dedbd0',dark:'#a7a295'},gray:{name:'Серый',light:'#cbd0d2',mid:'#9ca6ad',dark:'#5c6872'}};
export const normalizeName=value=>typeof value==='string'?Array.from(value.trim()).slice(0,24).join(''):'';
export function petText(s,text){return String(text).replaceAll('Пончика','питомца').replaceAll('Пончику','питомцу').replaceAll('Пончике','питомце').replaceAll('Пончиком','питомцем').replaceAll('Пончик',s.name);}
export const CHARACTERS = {
 curious: {name:'Любопытный', wheel:.28, speed:70, trustGain:4},
 energetic: {name:'Непоседа', wheel:.55, speed:85, trustGain:3},
 shy: {name:'Осторожный', wheel:.18, speed:55, trustGain:2}
};
export const AILMENTS = {dirty:{name:'Недомогание из-за грязи',cause:'Долго не менялась подстилка.',advice:'Уберите клетку, проверьте корм и воду, дайте спокойно отдохнуть.'},deprivation:{name:'Недомогание из-за нехватки ухода',cause:'Долго не хватало еды или воды.',advice:'Наполните кормушку и поилку. Пончику нужно время, чтобы поесть, попить и восстановиться.'},stress:{name:'Недомогание из-за стресса',cause:'Пончик долго был сильно встревожен.',advice:'Дайте ему отдохнуть в домике, не будите. Проверьте чистоту, корм и воду.'}};
export const LABELS = {explore:'исследует клетку',eat:'ест зёрнышки',drink:'пьёт воду',sleep:'спит в домике',rest:'отдыхает и набирается сил',play:'играет с мячиком',wheel:'бежит в колесе',groom:'умывается',hide:'отдыхает в укрытии',nest:'обустраивает гнездо',gather:'собирает зёрнышки',store:'несёт еду в домик',eatStash:'ест из своего запаса',dead:'жизнь завершилась'};
export function initialState(now=Date.now()) {
 return {version:1,lastSeen:now,mode:'child',name:'Пончик',coat:'golden',age:30*86400,elapsed:0,alive:true,deathReason:null,
  needs:{hunger:46,thirst:32,energy:78,stress:12,health:100},
  bond:{character:'curious',trust:20,lastContact:now-60000},
  illness:{kind:null,severity:0,exposure:{dirty:0,deprivation:0,stress:0}},
  play:{remaining:0,x:500,engaged:0,cooldownUntil:0},
  cage:{food:80,water:90,clean:95,...CageLayout.defaults(),nest:20,stash:0},
  pet:{x:505,state:'explore',target:505,timer:0,sleeping:false,direction:1,carry:0},
  journal:[{at:now,text:'Пончик поселился в новом домике.'}],seed:7351};
}
export class EventJournal {static add(s,text){s.journal.push({at:s.lastSeen,text:petText(s,text)});s.journal=s.journal.slice(-100);}}
export class TimeSystem {
 static interval(last,now){if(!Number.isFinite(last)||!Number.isFinite(now))return {seconds:0,warning:'Время сохранения повреждено.'};const d=(now-last)/1000;return {seconds:clamp(d,0,30*86400),warning:d<0?'Часы переведены назад. Отрицательное время не учитывалось.':d>30*86400?'Прошло больше 30 дней. Рассчитаны первые 30 дней.':null};}
}
export class CageSystem {
 static step(s,dt){s.cage.clean=clamp(s.cage.clean-dt/3600*1.1);s.cage.nest=clamp(s.cage.nest-dt/3600*.4);}
 static refill(s,kind){s.cage[kind]=100;}
}
export class NeedsSystem {
 static step(s,dt){const n=s.needs,h=dt/3600,sleep=['sleep','rest'].includes(s.pet.state)&&Math.abs(s.pet.x-s.pet.target)<1;
  n.hunger=clamp(n.hunger+h*9);n.thirst=clamp(n.thirst+h*14);
  n.energy=clamp(n.energy+h*(sleep?26+s.cage.nest*.08:s.pet.state==='wheel'?-25:-12));
  n.stress=clamp(n.stress+h*(s.cage.clean<25?6:-3));
  const bad=n.hunger>85||n.thirst>85||s.cage.clean<15;
  const old=s.mode==='realistic'&&s.age>90*86400;
  const penalty=s.illness.kind?2+s.illness.severity*.05:0;
  const restore=s.illness.kind&&HealthSystem.careReady(s)?5:3;
  n.health=clamp(n.health+h*((bad?-12:old?-2:restore)-penalty));
  if(s.mode==='child')n.health=Math.max(25,n.health);
  if(n.health<=0&&s.mode==='realistic'){
   s.alive=false;s.deathReason=n.thirst>85?'длительная нехватка воды':n.hunger>85?'длительная нехватка еды':s.cage.clean<15?'длительно грязная клетка':s.illness.kind?'затянувшееся игровое недомогание':'старение';
   s.pet.state='dead';EventJournal.add(s,`Пончик ушёл из жизни. Причина в игровой модели: ${s.deathReason}.`);
  }
 }
}
export class HealthSystem {
 static risks(s){return {dirty:s.cage.clean<25,deprivation:s.needs.hunger>75||s.needs.thirst>75,stress:s.needs.stress>70};}
 static careReady(s){const n=s.needs;return s.cage.clean>=50&&n.hunger<45&&n.thirst<45&&n.energy>=30&&n.stress<55;}
 static step(s,dt){
  if(!s.alive)return;
  const ill=s.illness,risk=this.risks(s),thresholds={dirty:7200,deprivation:3600,stress:7200};
  for(const key of Object.keys(thresholds))ill.exposure[key]=clamp(ill.exposure[key]+(risk[key]?dt:-dt*2),0,8*3600);
  if(!ill.kind){
   const kind=['deprivation','dirty','stress'].find(key=>risk[key]&&ill.exposure[key]>=thresholds[key]);
   if(kind){ill.kind=kind;ill.severity=20;s.pet.timer=0;EventJournal.add(s,`Игровое недомогание: ${AILMENTS[kind].name.toLowerCase()}. ${AILMENTS[kind].cause}`);}
   return;
  }
  const before=ill.severity;
  if(Object.values(risk).some(Boolean))ill.severity=clamp(ill.severity+dt/3600*8);
  else if(this.careReady(s))ill.severity=clamp(ill.severity-dt/3600*6);
  if(before<60&&ill.severity>=60)EventJournal.add(s,'Недомогание усилилось. Откройте здоровье: там указано, какой уход нужен.');
  if(ill.severity===0){ill.kind=null;for(const key of Object.keys(ill.exposure))ill.exposure[key]=0;s.pet.timer=0;EventJournal.add(s,'Пончик восстановился после игрового недомогания. Можно снова исследовать клетку.');}
 }
 static report(s){
  if(!s.alive)return {title:'Память о Пончике',detail:s.deathReason||'Жизнь завершилась.',advice:'История жизни сохранена в дневнике.',severity:0,recovering:false};
  const ill=s.illness;
  if(ill.kind){const info=AILMENTS[ill.kind];return {title:info.name,detail:info.cause,advice:info.advice,severity:Math.ceil(ill.severity),recovering:this.careReady(s)};}
  const risk=this.risks(s);
  return {title:Object.values(risk).some(Boolean)?'Пончику нужен уход':'Самочувствие спокойное',detail:'Признаков игрового недомогания пока нет.',advice:risk.deprivation?'Проверьте корм и воду.':risk.dirty?'Пора убрать клетку.':risk.stress?'Дайте спокойно отдохнуть в домике.':'Поддерживайте запасы и чистоту, не мешайте спать.',severity:0,recovering:false};
 }
}
export class PlaySystem {
 static canStart(s){
  const n=s.needs;
  if(!s.alive)return {ok:false,message:'Жизнь питомца завершилась. Его дневник сохранён.'};
  if(s.play.remaining>0)return {ok:false,message:'Мячик уже в клетке.'};
  if(s.illness.kind||n.health<60)return {ok:false,message:'Сейчас питомцу нужен уход и спокойный отдых.'};
  if(['sleep','rest'].includes(s.pet.state)||n.energy<45)return {ok:false,message:'Питомец устал или спит. Дайте ему отдохнуть.'};
  if(n.hunger>38||n.thirst>42)return {ok:false,message:'Сначала питомцу нужно поесть и попить.'};
  if(n.stress>60)return {ok:false,message:'Питомец встревожен. Лучше сначала тихо поговорить и дать ему покой.'};
  if(s.elapsed<s.play.cooldownUntil)return {ok:false,message:'После игры нужна небольшая пауза. Попробуйте чуть позже.'};
  return {ok:true,message:'Можно спокойно поиграть.'};
 }
 static start(s){const ready=this.canStart(s);if(!ready.ok)return ready;
  s.play={remaining:30,x:clamp(s.pet.x+(s.pet.x>770?-160:160),70,930),engaged:0,cooldownUntil:s.elapsed+90};
  s.pet.timer=0;EventJournal.add(s,'Вы предложили питомцу деревянный мячик.');
  return {ok:true,message:'Коснитесь клетки или двигайте мячик пальцем. Питомец сам решает, когда подойти.'};
 }
 static move(s,x){if(!s.alive||s.play.remaining<=0||!Number.isFinite(x))return false;s.play.x=clamp(x,70,930);s.pet.timer=0;return true;}
 static end(s,reason='stopped'){
  if(s.play.remaining<=0)return;
  s.play.remaining=0;s.pet.timer=0;
  if(!s.alive)return;
  if(s.pet.state==='play'){s.pet.state='groom';s.pet.target=s.pet.x;}
  if(reason==='finished'&&s.play.engaged>=3){s.bond.trust=clamp(s.bond.trust+3);EventJournal.add(s,'Пончик спокойно поиграл с мячиком и стал чуть увереннее рядом с вами.');}
  else EventJournal.add(s,reason==='care'?'Игра закончена: питомцу нужен уход или отдых.':'Мячик убран. Питомец возвращается к своим делам.');
 }
 static step(s,dt){if(s.play.remaining<=0)return;
  if(!s.alive){this.end(s,'dead');return;}
  if(s.illness.kind||s.needs.health<60||s.needs.energy<25||s.needs.hunger>65||s.needs.thirst>65||s.needs.stress>70){this.end(s,'care');return;}
  if(s.play.remaining<=dt)this.end(s,'finished');else s.play.remaining-=dt;
 }
}
function random(s){s.seed=(s.seed*1664525+1013904223)>>>0;return s.seed/4294967296;}
export class HamsterAI {
 static choose(s){const n=s.needs,p=s.pet,c=s.cage,character=CHARACTERS[s.bond.character];let state,target;
  if(n.thirst>42&&c.water>0){state='drink';target=c.bottle;}
  else if(n.hunger>38&&(c.food>0||c.stash>0)){state=c.food>0?'eat':'eatStash';target=c.food>0?c.bowl:c.home;}
  else if(p.carry>0&&c.stash<100){state='store';target=c.home;}
  else if(n.energy<24||(p.state==='sleep'&&n.energy<88)){state='sleep';target=c.home;}
  else if(n.stress>(s.bond.character==='shy'?50:65)){state='hide';target=c.home;}
  else if(s.illness.kind){state='rest';target=c.home;}
  else if(n.health<45){state='sleep';target=c.home;}
  else if(s.play.remaining>0){state='play';target=clamp(s.play.x-Math.sign(s.play.x-p.x||p.direction)*45,60,940);}
  else if(c.nest<80&&n.energy>35){state='nest';target=c.home;}
  else if(c.stash<12&&c.food>20&&n.hunger<30&&n.energy>40){state='gather';target=c.bowl;}
  else {const r=random(s);state=r<character.wheel&&n.energy>45?'wheel':r<character.wheel+.18?'groom':'explore';target=state==='wheel'?c.wheel:state==='groom'?p.x:clamp(100+random(s)*800,70,930);}
  const messages={rest:'Пончик отдыхает в домике из-за недомогания.',sleep:'Пончик устроился поспать.',wheel:'Пончик выбрал колесо.',eat:'Пончик отправился к кормушке.',drink:'Пончик отправился к поилке.',nest:'Пончик обустраивает уютное гнездо.',store:'Пончик несёт зёрнышки в свой тайник.',eatStash:'Кормушка пуста — Пончик нашёл свой запас.'};
  if(state!==p.state&&messages[state])EventJournal.add(s,messages[state]);
  p.state=state;p.target=target;p.timer=['sleep','rest'].includes(state)?1800:state==='wheel'?35:state==='groom'?12:25;
 }
 static step(s,dt){const p=s.pet,n=s.needs,c=s.cage;
  const urgent=(n.thirst>65&&c.water>0&&p.state!=='drink')||(n.hunger>65&&(c.food>0||c.stash>0)&&!['eat','eatStash'].includes(p.state))||(n.energy<15&&!['sleep','rest','eat','eatStash','drink','store'].includes(p.state));
  if(p.timer<=0||urgent)this.choose(s);
  const delta=p.target-p.x,speed=CHARACTERS[s.bond.character].speed*(s.illness.kind ? .65 : 1)*(s.mode==='realistic'&&s.age>90*86400 ? .8 : 1);
  p.direction=delta<0?-1:delta>0?1:p.direction;
  const travel=Math.abs(delta)/speed,arrived=travel<=dt;
  p.x+=Math.sign(delta)*Math.min(Math.abs(delta),speed*dt);
  if(!arrived)return;
  const actionTime=Math.max(0,dt-travel);p.timer-=actionTime;
  if(p.state==='eat'||p.state==='eatStash'){
   const source=p.state==='eat'?'food':'stash',amount=Math.min(c[source],n.hunger,actionTime*2);
   c[source]-=amount;n.hunger=clamp(n.hunger-amount);if(n.hunger<8||c[source]<=0)p.timer=0;
  }
  if(p.state==='drink'){const amount=Math.min(c.water,n.thirst,actionTime*3);c.water-=amount;n.thirst=clamp(n.thirst-amount);if(n.thirst<8||c.water<=0)p.timer=0;}
  if(p.state==='nest'){c.nest=clamp(c.nest+actionTime*6);if(c.nest>=90)p.timer=0;}
  if(p.state==='gather'){const amount=Math.min(c.food,6-p.carry,actionTime);c.food-=amount;p.carry+=amount;if(p.carry>=6||c.food<=0)p.timer=0;}
  if(p.state==='store'&&p.carry>0&&actionTime>0){const amount=Math.min(p.carry,100-c.stash);c.stash+=amount;p.carry-=amount;p.timer=0;EventJournal.add(s,`В домике спрятано ${Math.round(c.stash)} единиц корма.`);}
  if(p.state==='play'){p.direction=Math.sign(s.play.x-p.x)||p.direction;s.play.engaged=clamp(s.play.engaged+actionTime,0,30);n.stress=clamp(n.stress-actionTime*.25);n.energy=clamp(n.energy-actionTime*.12);}
  if(p.state==='groom'||p.state==='hide')n.stress=clamp(n.stress-actionTime*.12);
  if(p.state==='sleep'&&n.energy>=88)p.timer=0;
 }
}
export class SimulationEngine {
 constructor(state=initialState()){this.state=state;}
 advance(seconds,offline=false){const s=this.state;let remaining=clamp(seconds,0,30*86400);const actual=remaining;
  while(remaining>0){const dt=Math.min(remaining,offline?30:.5);s.lastSeen+=dt*1000;
   if(s.alive){s.age+=dt;s.elapsed+=dt;CageSystem.step(s,dt);HealthSystem.step(s,dt);NeedsSystem.step(s,dt);if(s.alive)HamsterAI.step(s,dt);PlaySystem.step(s,dt);}
   remaining-=dt;
  }
  if(offline&&actual>60)EventJournal.add(s,`Пока вас не было: прошло ${Math.round(actual/60)} мин. ${s.mode==='child'?'Защита детского режима сохранила здоровье не ниже 25%.':'Жизнь рассчитана по запасам и потребностям.'}`);
 }
 resume(now=Date.now()){const result=TimeSystem.interval(this.state.lastSeen,now);this.advance(result.seconds,true);if(result.warning)EventJournal.add(this.state,result.warning);this.state.lastSeen=now;if(this.state.bond.lastContact>now)this.state.bond.lastContact=now-30000;return result;}
}
export class InteractionSystem {
 static act(s,action){if(!s.alive)return 'Пончик больше не нуждается в уходе. Его дневник сохранён.';let text;
  if(action==='food'||action==='water'){
   if(s.cage[action]<25)s.bond.trust=clamp(s.bond.trust+1);
   CageSystem.refill(s,action);s.pet.timer=0;text=action==='food'?'Кормушка наполнена. Пончик поест, когда проголодается.':'В поилке свежая вода.';
  }
  if(action==='clean'){s.cage.clean=100;text='Подстилка заменена, клетка чистая. Гнездо осталось уютным.';}
  if(action==='pet'){
   if(s.lastSeen-s.bond.lastContact<30000)return 'Дайте Пончику немного времени. Он уже услышал вас.';
   s.bond.lastContact=s.lastSeen;
   if(['sleep','rest'].includes(s.pet.state)){
    s.needs.stress=clamp(s.needs.stress+12);s.bond.trust=clamp(s.bond.trust-4);
    text='Пончик отдыхает. Беспокойство снижает доверие — дайте ему отдохнуть.';
   }else{
    s.needs.stress=clamp(s.needs.stress-(6+s.bond.trust*.08));s.bond.trust=clamp(s.bond.trust+CHARACTERS[s.bond.character].trustGain);
    text=s.bond.trust>=60?'Пончик узнаёт ваш голос и чувствует себя спокойнее.':'Вы тихо поговорили с Пончиком. Он постепенно привыкает к вам.';
   }
  }
  if(text)EventJournal.add(s,text);return text;
 }
}
