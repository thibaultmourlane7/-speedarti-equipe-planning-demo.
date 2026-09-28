const assert=require('node:assert/strict');
global.document={
  createElement(){return {textContent:'',className:'',setAttribute(){},innerHTML:''};},
  head:{appendChild(){}},
  addEventListener(){}
};
global.File=class File{};
const state={
  company:{name:'Demo'},
  session:{activeMemberId:'worker'},
  settings:{edition:'standard'},
  members:[
    {id:'worker',name:'Marc',role:'worker',status:'active',projectAccessMode:'assigned'},
    {id:'manager',name:'Sophie',role:'site_manager',status:'active',projectAccessMode:'all'}
  ],
  projects:[{id:'p1',name:'Dupont',client:'M. Dupont',address:'1 rue Test',status:'in_progress'}],
  crews:[],
  assignments:[{id:'a1',projectId:'p1',title:'Couverture',start:'2026-09-28T08:00:00Z',end:'2026-09-28T17:00:00Z',memberIds:['worker'],crewIds:[],notes:'Préparer les liteaux'}],
  tasks:[],reports:[],requests:[],messages:[],suggestions:[],notifications:[],
  planningV17:{weather:[],resources:[],resourceReservations:[]},
  conductorV18:{points:[],plans:[],validations:[],meetings:[],journals:[],scheduleNotices:[],clientTransmissions:[]}
};
const store={state:structuredClone(state),getState(){return structuredClone(this.state);},update(fn){fn(this.state);}};
const root={querySelector(){return null;},appendChild(){}};
const ui={
  root,view:'dashboard',modal:null,
  renderDashboard(){return '<div>legacy dashboard</div>';},
  renderPlanning(){return '<section class="panel v19-panel">Gantt</section><article class="panel">legacy planning</article>';},
  renderTerrain(){return '<div>terrain</div>';},
  renderPilotage(){return '<div>pilotage</div>';},
  pageTitle(){return 'Accueil';},
  render(){},
  notify(){},
  openAssignmentForm(){}
};
global.window={
  __SpeedArtiDemo:{ui,store},
  SpeedArtiConductor:{
    visibleProjectIds(){return ['p1'];},
    POINT_TYPES:{problem:'Problème',reservation:'Réserve',quality:'Qualité',safety:'Sécurité',request:'Autre'}
  }
};
require('../planning-v19-ux-simple.js');
assert.ok(window.SpeedArtiUX191);
assert.equal(window.SpeedArtiUX191.version,'1.9.3');
assert.deepEqual(window.SpeedArtiUX191.sections,['today','planning','projects','attention','gantt','reservations','nonconformities','quality','safety','meetings','journal','client']);
assert.deepEqual(store.getState().planningV191.navGroups,{organisation:false,site:false,admin:false});

let html=ui.renderDashboard(store.getState());
for(const label of ['Aujourd’hui','Rapport','Problème','Matériel'])assert.ok(html.includes(label),label);

ui.v191Section='planning';
html=ui.renderDashboard(store.getState());
assert.ok(html.includes('Planning simple'));
assert.ok(html.includes('Semaine'));
assert.ok(html.includes('Mois'));
assert.ok(!html.includes('Vue avancée → Gantt'),'Un ouvrier ne doit pas voir le Gantt avancé par défaut');

ui.v191Section='projects';
html=ui.renderDashboard(store.getState());
assert.ok(html.includes('Mes chantiers'));
assert.ok(html.includes('Dupont'));

ui.v191Section='client';
html=ui.renderDashboard(store.getState());
assert.ok(html.includes('Suivi client'));

store.state.session.activeMemberId='manager';
ui.v191Section='gantt';
html=ui.renderDashboard(store.getState());
assert.ok(html.includes('Gantt avancé'));

ui.v191Section='attention';
html=ui.renderDashboard(store.getState());
assert.ok(html.includes('À traiter'));

console.log(JSON.stringify({ok:true,sections:window.SpeedArtiUX191.sections}));
