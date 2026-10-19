// All rates are game design, not veterinary predictions. No network dependencies.
export const VERSION = '0.1.1';
export const clamp = (n, min=0, max=100) => Math.min(max, Math.max(min,n));
export const LABELS = {explore:'исследует клетку',eat:'ест зёрнышки',drink:'пьёт воду',sleep:'спит в домике',wheel:'бежит в колесе',groom:'умывается',hide:'отдыхает в укрытии',dead:'жизнь завершилась'};
export function initialState(now=Date.now()) {return {version:1,lastSeen:now,mode:'child',name:'Пончик',age:30*86400,elapsed:0,alive:true,deathReason:null,needs:{hunger:46,thirst:32,energy:78,stress:12,health:100},cage:{food:80,water:90,clean:95,home:165,wheel:760,bowl:390,bottle:895},pet:{x:505,state:'explore',target:505,timer:0,sleeping:false,direction:1},journal:[{at:now,text:'Пончик поселился в новом домике.'}],seed:7351};}
export class EventJournal {static add(s,text){s.journal.push({at:s.lastSeen,text});s.journal=s.journal.slice(-100);}}
export class TimeSystem {
 static interval(last,now){if(!Number.isFinite(last)||!Number.isFinite(now))return {seconds:0,warning:'Время сохранения повреждено.'};const d=(now-last)/1000;return {seconds:clamp(d,0,30*86400),warning:d<0?'Часы переведены назад. Отрицательное время не учитывалось.':d>30*86400?'Прошло больше 30 дней. Рассчитаны первые 30 дней.':null};}
}
export class CageSystem {static step(s,dt){s.cage.clean=clamp(s.cage.clean-dt/3600*1.1);} static refill(s,kind){s.cage[kind]=100;}}
export class NeedsSystem {
 static step(s,dt){const n=s.needs,h=dt/3600,sleep=s.pet.state==='sleep';n.hunger=clamp(n.hunger+h*9);n.thirst=clamp(n.thirst+h*14);n.energy=clamp(n.energy+h*(sleep?32:s.pet.state==='wheel'?-25:-12));n.stress=clamp(n.stress+h*(s.cage.clean<25?6:-3));const bad=n.hunger>85||n.thirst>85||s.cage.clean<15;const old=s.mode==='realistic'&&s.age>90*86400;n.health=clamp(n.health+h*(bad?-12:old?-2:3));if(s.mode==='child')n.health=Math.max(25,n.health);if(n.health<=0&&s.mode==='realistic'){s.alive=false;s.deathReason=n.thirst>85?'длительная нехватка воды':n.hunger>85?'длительная нехватка еды':s.cage.clean<15?'длительно грязная клетка':'старение';s.pet.state='dead';EventJournal.add(s,`Пончик ушёл из жизни. Причина в игровой модели: ${s.deathReason}.`);}}
}
function random(s){s.seed=(s.seed*1664525+1013904223)>>>0;return s.seed/4294967296;}
export class HamsterAI {
 static choose(s){const n=s.needs,p=s.pet,c=s.cage;let state,target;
 if(n.thirst>42&&c.water>0){state='drink';target=c.bottle;}
 else if(n.hunger>38&&c.food>0){state='eat';target=c.bowl;}
 else if(n.energy<24||(p.state==='sleep'&&n.energy<88)){state='sleep';target=c.home;}
 else if(n.stress>65){state='hide';target=c.home;}
 else if(n.health<45){state='sleep';target=c.home;}
 else {const r=random(s);state=r<.38&&n.energy>45?'wheel':r<.55?'groom':'explore';target=state==='wheel'?c.wheel:state==='groom'?p.x:clamp(100+random(s)*800,70,930);}
 if(state!==p.state&&['sleep','wheel','eat','drink'].includes(state))EventJournal.add(s,{sleep:'Пончик устроился поспать.',wheel:'Пончик выбрал колесо.',eat:'Пончик отправился к кормушке.',drink:'Пончик отправился к поилке.'}[state]);
 p.state=state;p.target=target;p.timer=state==='sleep'?1800:state==='wheel'?35:state==='groom'?12:25;
 }
 static step(s,dt){const p=s.pet,n=s.needs,c=s.cage;
 const urgent=(n.thirst>65&&c.water>0&&p.state!=='drink')||(n.hunger>65&&c.food>0&&p.state!=='eat')||(n.energy<15&&!['sleep','eat','drink'].includes(p.state));
 if(p.timer<=0||urgent)this.choose(s);
 const delta=p.target-p.x;p.direction=delta<0?-1:delta>0?1:p.direction;const travel=Math.abs(delta)/70;const arrived=travel<=dt;p.x+=Math.sign(delta)*Math.min(Math.abs(delta),70*dt);
 if(!arrived)return;const actionTime=Math.max(0,dt-travel);p.timer-=actionTime;
 if(p.state==='eat'){const amount=Math.min(c.food,n.hunger,actionTime*2);c.food-=amount;n.hunger=clamp(n.hunger-amount);if(n.hunger<8||c.food<=0)p.timer=0;}
 if(p.state==='drink'){const amount=Math.min(c.water,n.thirst,actionTime*3);c.water-=amount;n.thirst=clamp(n.thirst-amount);if(n.thirst<8||c.water<=0)p.timer=0;}
 if(p.state==='groom'||p.state==='hide')n.stress=clamp(n.stress-actionTime*.12);
 if(p.state==='sleep'&&n.energy>=88)p.timer=0;
 }
}
export class SimulationEngine {
 constructor(state=initialState()){this.state=state;}
 advance(seconds,offline=false){const s=this.state;let remaining=clamp(seconds,0,30*86400);const actual=remaining;while(remaining>0){const dt=Math.min(remaining,offline?30:.5);s.lastSeen+=dt*1000;if(s.alive){s.age+=dt;s.elapsed+=dt;CageSystem.step(s,dt);NeedsSystem.step(s,dt);if(s.alive)HamsterAI.step(s,dt);}remaining-=dt;}
 if(offline&&actual>60)EventJournal.add(s,`Пока вас не было: прошло ${Math.round(actual/60)} мин. ${s.mode==='child'?'Защита детского режима сохранила здоровье не ниже 25%.':'Жизнь рассчитана по запасам и потребностям.'}`);
 }
 resume(now=Date.now()){const result=TimeSystem.interval(this.state.lastSeen,now);this.advance(result.seconds,true);if(result.warning)EventJournal.add(this.state,result.warning);this.state.lastSeen=now;return result;}
}
export class InteractionSystem {
 static act(s,action){if(!s.alive)return 'Пончик больше не нуждается в уходе. Его дневник сохранён.';let text;
 if(action==='food'||action==='water'){CageSystem.refill(s,action);s.pet.timer=0;text=action==='food'?'Кормушка наполнена. Пончик поест, когда проголодается.':'В поилке свежая вода.';}
 if(action==='clean'){s.cage.clean=100;text='Подстилка заменена, клетка чистая.';}
 if(action==='pet'){s.needs.stress=clamp(s.needs.stress+(s.pet.state==='sleep'?12:-10));text=s.pet.state==='sleep'?'Пончик спит. Лучше дать ему отдохнуть.':'Вы тихо поговорили с Пончиком. Он успокоился.';}
 if(text)EventJournal.add(s,text);return text;
 }
}
