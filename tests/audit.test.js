import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,SimulationEngine} from '../dist/js/model.js';
test('при одновременных сильных голоде и жажде доходит до воды, затем еды',()=>{
 const s=initialState(1000000000000);s.needs.hunger=95;s.needs.thirst=95;s.pet.x=500;s.cage.nest=100;
 new SimulationEngine(s).advance(180);
 assert.ok(s.needs.thirst<40,`жажда ${s.needs.thirst}`);
 assert.ok(s.needs.hunger<40,`голод ${s.needs.hunger}`);
});
import {NeedsSystem} from '../dist/js/model.js';
test('энергия сна восстанавливается только после прибытия в домик',()=>{
 const s=initialState();s.pet.state='sleep';s.pet.target=s.cage.home;s.pet.x=900;s.needs.energy=10;
 NeedsSystem.step(s,1);assert.ok(s.needs.energy<=10,'ещё идёт — не должен спать');
 s.pet.x=s.cage.home;NeedsSystem.step(s,60);assert.ok(s.needs.energy>10);
});
import {HomeManager} from '../dist/js/homes.js';
import {SaveManager} from '../dist/js/save.js';
test('прототип main переносится без потери возраста, потребностей и запасов',()=>{
 const old={hunger:33,thirst:44,energy:55,food:12,water:34,age:20,saved:1000000000000};const values=new Map([['hamster-life-web-v1',JSON.stringify(old)]]);
 const result=HomeManager.load({getItem:k=>values.get(k)||null});assert.equal(result.blocked,false);const s=result.manager.active.state;
 assert.equal(s.needs.hunger,67);assert.equal(s.needs.thirst,56);assert.equal(s.cage.food,12);assert.equal(s.cage.water,34);assert.equal(s.elapsed,1200);assert.equal(s.lastSeen,old.saved);assert.ok(values.has('hamster-life-web-v1'));
});
test('сохранённый мир имеет приоритет перед устаревшим прототипом',()=>{
 const world=HomeManager.validate(initialState());world.homes[0].state.name='Бублик';
 const values=new Map([[SaveManager.key,JSON.stringify(world)],['hamster-life-web-v1','broken']]);
 const loaded=HomeManager.load({getItem:k=>values.get(k)||null});assert.equal(loaded.manager.active.state.name,'Бублик');assert.equal(loaded.blocked,false);
});
test('повреждённый прототип блокирует перезапись и не изменяется',()=>{
 const values=new Map([['hamster-life-web-v1','{"hunger":"bad"}']]);const before=values.get('hamster-life-web-v1');
 assert.equal(HomeManager.load({getItem:k=>values.get(k)||null}).blocked,true);assert.equal(values.get('hamster-life-web-v1'),before);
});
