const assert = require('node:assert/strict');

global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
};
const events=[];
global.window = { dispatchEvent(event) { events.push(event); } };

const initial = {
  company:{id:'c1',name:'Demo'},
  session:{activeMemberId:'owner'},
  settings:{edition:'standard',rolePermissions:{owner:[],site_manager:[],team_lead:[],worker:[]}},
  members:[
    {id:'owner',name:'Dirigeant',role:'owner',status:'active',permissionOverrides:{},projectAccessMode:'all',projectAccessIds:[],availability:{workingDays:[1,2,3,4,5],unavailablePeriods:[]}},
    {id:'manager',name:'Conducteur',role:'site_manager',status:'active',permissionOverrides:{},projectAccessMode:'all',projectAccessIds:[],availability:{workingDays:[1,2,3,4,5],unavailablePeriods:[]}},
    {id:'lead',name:'Chef',role:'team_lead',status:'active',permissionOverrides:{},projectAccessMode:'assigned',projectAccessIds:[],availability:{workingDays:[1,2,3,4,5],unavailablePeriods:[]}},
    {id:'worker',name:'Ouvrier',role:'worker',status:'active',permissionOverrides:{},projectAccessMode:'assigned',projectAccessIds:[],availability:{workingDays:[1,2,3,4,5],unavailablePeriods:[]}}
  ],
  projects:[{id:'p1',name:'Chantier Dupont',client:'M. Dupont',status:'in_progress'}],
  assignments:[{id:'a1',projectId:'p1',title:'Couverture',start:'2026-09-27T08:00:00Z',end:'2026-09-27T17:00:00Z',memberIds:['lead','worker'],crewIds:[]}],
  crews:[],reports:[{id:'r1',projectId:'p1',date:'2026-09-27T16:00:00Z',progress:80,summary:'Charpente terminée',attachments:[]}],
  messages:[],requests:[],tasks:[],notifications:[],suggestions:[],planningV17:{weather:[],milestones:[],needs:[]}
};
const store={
  state:structuredClone(initial),
  getState(){return structuredClone(this.state);},
  update(fn){fn(this.state);}
};
window.__SpeedArtiDemo={store};

require('../planning-v18-core.js');
require('../planning-v18-client-transmission-core.js');

const conductor=window.SpeedArtiConductor,tx=window.SpeedArtiClientTransmissionCore;
assert.ok(conductor&&tx);
assert.equal(tx.hasPermission(),true,'Le dirigeant doit avoir le droit par défaut');

const privateProblem=conductor.createPoint({projectId:'p1',type:'problem',description:'Note interne sensible',priority:'high'});
assert.throws(()=>tx.createDraft({projectId:'p1',publicationTitle:'Test',items:[{entityType:'site_point',entityId:privateProblem.id}]}),/privé|validé/i);

const reserve=conductor.createPoint({projectId:'p1',type:'reservation',description:'Reprise finition rive',priority:'normal'});
conductor.transitionPoint(reserve.id,'validated');
tx.setClientContext({projectId:'p1',clientId:'client_1',displayName:'M. Dupont',portalProjectId:'portal_p1'});

const draft=tx.createDraft({
  projectId:'p1',
  publicationTitle:'Avancement toiture',
  comment:'Charpente terminée, démarrage couverture lundi.',
  items:[
    {entityType:'site_point',entityId:reserve.id},
    {entityType:'progress_update',entityId:'r1'},
    {entityType:'photo_group',entityId:'photos_demo',title:'Photos chantier — 2',fileIds:['file_1','file_2'],sourceEntityIds:[reserve.id]}
  ]
});
assert.equal(draft.status,'prepared');
assert.equal(draft.client.clientId,'client_1');
assert.equal(draft.bordereau.items.length,3);
const frozenTitle=draft.bordereau.items[0].title;

conductor.updatePoint(reserve.id,{description:'Description modifiée après préparation'});
let state=store.getState();
const stored=state.conductorV18.clientTransmissions.find(t=>t.id===draft.id);
assert.equal(stored.bordereau.items[0].title,frozenTitle,'Le bordereau doit rester figé');

assert.throws(()=>tx.prepareSend(draft.id,false),/validation humaine/i);
const outbound=tx.prepareSend(draft.id,true);
assert.equal(outbound.clientId,'client_1');
state=store.getState();
let sentState=state.conductorV18.clientTransmissions.find(t=>t.id===draft.id);
assert.equal(sentState.status,'ready_for_client_interface');
assert.equal(sentState.sentAt,null,'Ne pas inventer le statut envoyé');

tx.applyReceipt({transmissionId:draft.id,status:'sent',at:'2026-09-27T15:00:00Z',source:'client_interface',connectorMessageId:'msg_1'});
tx.applyReceipt({transmissionId:draft.id,status:'consulted',at:'2026-09-27T15:10:00Z',source:'client_interface'});
state=store.getState();
sentState=state.conductorV18.clientTransmissions.find(t=>t.id===draft.id);
assert.equal(sentState.status,'consulted');
assert.equal(sentState.consultedAt,'2026-09-27T15:10:00Z');

store.state.session.activeMemberId='worker';
assert.equal(tx.hasPermission(),false,'Un ouvrier ne doit pas publier par défaut');
store.state.session.activeMemberId='lead';
assert.equal(tx.hasPermission(),false,"Un chef d'équipe ne doit pas publier sans autorisation");
store.state.members.find(m=>m.id==='lead').permissionOverrides.share_with_client=true;
assert.equal(tx.hasPermission(),true,"L'autorisation individuelle doit fonctionner");

assert.ok(events.some(e=>e.type==='speedarti:client-transmission:outbound-ready'));
console.log(JSON.stringify({ok:true,transmissionId:draft.id,status:sentState.status,receipts:state.conductorV18.clientTransmissionReceipts.length}));