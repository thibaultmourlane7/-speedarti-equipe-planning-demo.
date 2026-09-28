const assert=require('node:assert/strict');
global.document={
  createElement(){return {textContent:'',style:{}};},
  head:{appendChild(){}},
  addEventListener(){},
};
const state={
  session:{activeMemberId:'manager'},
  members:[{id:'manager',name:'Conducteur',role:'site_manager',status:'active',projectAccessMode:'all'}],
  projects:[{id:'p1',name:'Chantier Dupont',requiredSkills:['Couverture']}],
  crews:[],
  assignments:[
    {id:'a1',projectId:'p1',title:'Charpente',start:'2026-09-28T08:00:00Z',end:'2026-10-02T17:00:00Z',memberIds:['manager'],crewIds:[],status:'planned'},
    {id:'a2',projectId:'p1',title:'Couverture',start:'2026-10-05T08:00:00Z',end:'2026-10-09T17:00:00Z',memberIds:['manager'],crewIds:[],status:'planned'}
  ],
  planningV17:{
    milestones:[{id:'m1',projectId:'p1',label:"Hors d'eau",date:'2026-10-09'}],
    dependencies:[{id:'d1',projectId:'p1',predecessorLabel:'Charpente',successorLabel:'Couverture'}]
  }
};
const store={
  state:structuredClone(state),
  getState(){return structuredClone(this.state);},
  update(fn){fn(this.state);}
};
const ui={
  renderPlanning(){return '<div>ancien planning</div>';},
  render(){},
  openAssignmentForm(){}
};
global.window={
  __SpeedArtiDemo:{ui,store},
  SpeedArtiConductor:{visibleProjectIds(){return ['p1'];}}
};
require('../planning-v19-gantt.js');
assert.ok(window.SpeedArtiGanttV19);
assert.deepEqual(window.SpeedArtiGanttV19.scales,['week','month','year','n3']);
assert.equal(window.SpeedArtiGanttV19.sourceOfTruth,'Agenda Chantier');
const html=ui.renderPlanning(store.getState());
for(const label of ['Planning Gantt','Semaine','Mois','Année','N+3','Charpente','Couverture'])assert.ok(html.includes(label),label);
assert.ok(html.includes("Hors d&#39;eau")||html.includes("Hors d'eau"));
assert.ok(html.includes('v19-deps'));
assert.equal(window.SpeedArtiGanttV19.getConfig().scale,'week');
console.log(JSON.stringify({ok:true,scales:window.SpeedArtiGanttV19.scales}));
