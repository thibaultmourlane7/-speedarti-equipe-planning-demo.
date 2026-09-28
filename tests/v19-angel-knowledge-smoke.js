const assert=require('node:assert/strict');
global.CustomEvent=class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}};
global.document={
  createElement(){return {textContent:'',style:{}};},
  head:{appendChild(){}}
};
const events=[];
const state={
  session:{activeMemberId:'manager'},
  settings:{edition:'expert'},
  members:[{id:'manager',name:'Sophie',role:'site_manager',status:'active'}],
  projects:[{id:'p1',name:'Chantier Dupont'}],
  assignments:[],reports:[],messages:[],requests:[],
  planningV17:{weather:[],milestones:[],dependencies:[],needs:[]},
  conductorV18:{points:[],plans:[],meetings:[],journals:[],validations:[],memberQualifications:{}}
};
const store={state:structuredClone(state),getState(){return structuredClone(this.state);},update(fn){fn(this.state);}};
const ui={renderSiteManagerDashboard(){return '';},render(){},v18ProjectId:'p1'};
global.window={
  __SpeedArtiDemo:{ui,store},
  dispatchEvent(e){events.push(e);},
  SpeedArtiConductor:{visibleProjectIds(){return ['p1'];},POINT_TYPES:{},createValidation(){}},
  SpeedArtiGanttV19:{getConfig(){return {scale:'month',groupBy:'chantier'};}},
  SpeedArtiClientTransmissionCore:{hasPermission(){return true;},list(){return [];}}
};
require('../planning-v18-ai.js');
const api=window.SpeedArtiConductorAI;
assert.ok(api);
assert.equal(api.version,'1.9.2');
assert.deepEqual(Object.keys(api.knowledgePacks),['teamPlanning']);
const pack=api.knowledgePacks.teamPlanning;
assert.equal(pack.module,'equipe_planning');
for(const domain of ['navigationSimple','organisation','agendaPlanning','terrain','resources','intelligencePlanning','conducteur','documents','clientTransmission'])assert.ok(pack.domains[domain],domain);
assert.ok(pack.artisanLanguage.examples.includes('Qui va où demain ?'));
assert.ok(pack.artisanLanguage.examples.includes('Qu’est-ce que j’ai à traiter ?'));
assert.ok(pack.artisanLanguage.examples.includes('Ouvre le journal chantier.'));
assert.ok(pack.absoluteRules.some(x=>x.includes('deuxième Agenda')));
const ctx=api.angelContext('Montre-moi le planning du mois prochain');
assert.equal(ctx.module,'equipe_planning');
assert.deepEqual(ctx.knowledgePacks,['equipe_planning@1.2.0']);
assert.equal(ctx.gantt.scale,'month');
assert.ok(events.some(e=>e.type==='speedarti:angel:knowledge-pack-ready'&&e.detail.module==='equipe_planning'));
console.log(JSON.stringify({ok:true,module:pack.module,domains:Object.keys(pack.domains).length}));
