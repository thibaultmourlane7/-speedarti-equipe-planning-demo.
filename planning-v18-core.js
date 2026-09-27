/* SpeedArti — Suivi chantier / Conducteur v1.8
   Moteur métier transverse. Aucune UI dans ce fichier. */
(()=>{
  const demo=window.__SpeedArtiDemo;
  if(!demo?.store) return;

  const POINT_TYPES=Object.freeze({
    task:'Tâche',
    problem:'Problème',
    reservation:'Réserve',
    opr:'OPR',
    non_conformity:'Non-conformité',
    quality:'Contrôle qualité',
    safety:'Sécurité',
    request:'Demande',
    photo:'Photo',
    decision:'Décision'
  });
  const PRIORITIES=Object.freeze(['low','normal','high','urgent']);
  const DEFAULT_STATUSES=Object.freeze(['open','in_progress','resolved','validated']);
  const NC_STATUSES=Object.freeze(['open','corrective_action','corrected','controlled','validated']);
  const PLAN_STATUSES=Object.freeze(['draft','to_validate','validated','active','replaced','archived']);
  const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
  const now=()=>new Date().toISOString();
  const clone=v=>structuredClone(v);

  function ensure(state){
    state.conductorV18??={};
    const c=state.conductorV18;
    c.schemaVersion='1.8.0';
    c.points??=[];
    c.plans??=[];
    c.checklistTemplates??=[];
    c.checklistRuns??=[];
    c.meetings??=[];
    c.journals??=[];
    c.validations??=[];
    c.documentHistory??=[];
    c.dailySummaries??=[];
    c.connectorStatus??={};
    c.presenceActuals??=[];
    c.photoClassifications??=[];
    c.memberQualifications??={};
    c.offlineQueue??=[];
    return c;
  }

  function projectExists(state,projectId){
    return !!state.projects?.some(p=>p.id===projectId);
  }
  function visibleProjectIds(state){
    const member=state.members?.find(m=>m.id===state.session?.activeMemberId);
    if(!member) return new Set();
    if(member.projectAccessMode==='all') return new Set((state.projects||[]).map(p=>p.id));
    if(member.projectAccessMode==='selected') return new Set(member.projectAccessIds||[]);
    const assigned=new Set();
    for(const a of state.assignments||[]){
      const ids=new Set(a.memberIds||[]);
      for(const cid of a.crewIds||[]){
        const crew=state.crews?.find(c=>c.id===cid);
        for(const mid of crew?.memberIds||[]) ids.add(mid);
      }
      if(ids.has(member.id)) assigned.add(a.projectId);
    }
    if(member.role==='owner'||member.role==='associate'||member.role==='site_manager') {
      if(member.projectAccessMode!=='assigned') return new Set((state.projects||[]).map(p=>p.id));
    }
    return assigned;
  }
  function assertProjectAccess(state,projectId){
    if(!projectExists(state,projectId)) throw new Error('Chantier introuvable.');
    if(!visibleProjectIds(state).has(projectId)) throw new Error('Chantier non autorisé pour ce profil.');
  }
  function cleanText(v,max=4000){return String(v??'').trim().slice(0,max);}
  function cleanArray(v){return Array.isArray(v)?v.map(x=>cleanText(x,160)).filter(Boolean):[];}
  function position(v){
    if(!v) return null;
    const x=Number(v.xPct),y=Number(v.yPct),page=Number(v.page||1);
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>100||y<0||y>100) throw new Error('Position sur plan invalide.');
    return {xPct:Math.round(x*100)/100,yPct:Math.round(y*100)/100,page:Number.isFinite(page)&&page>0?Math.floor(page):1};
  }
  function pointStatuses(type){return type==='non_conformity'?NC_STATUSES:DEFAULT_STATUSES;}
  function validateStatus(type,status){
    if(!pointStatuses(type).includes(status)) throw new Error('Statut incompatible avec ce type de point.');
  }
  function historyEntry(actorId,action,details=''){
    return {id:uid('hist'),actorId,action,details:cleanText(details,1000),at:now()};
  }
  function normalizePoint(state,input,existing=null){
    const type=cleanText(input.type||existing?.type);
    if(!POINT_TYPES[type]) throw new Error('Type de Point chantier invalide.');
    const projectId=cleanText(input.projectId||existing?.projectId);
    assertProjectAccess(state,projectId);
    const status=cleanText(input.status||existing?.status||'open');
    validateStatus(type,status);
    const priority=cleanText(input.priority||existing?.priority||'normal');
    if(!PRIORITIES.includes(priority)) throw new Error('Priorité invalide.');
    const dueAt=input.dueAt===null||input.dueAt===''?null:(input.dueAt||existing?.dueAt||null);
    if(dueAt&&Number.isNaN(+new Date(dueAt))) throw new Error('Échéance invalide.');
    const planId=input.planId===undefined?(existing?.planId||null):(input.planId||null);
    if(planId){
      const plan=ensure(state).plans.find(p=>p.id===planId);
      if(!plan||plan.projectId!==projectId) throw new Error('Plan incompatible avec le chantier.');
    }
    return {
      id:existing?.id||uid('point'),
      projectId,
      type,
      planId,
      planRevisionId:input.planRevisionId===undefined?(existing?.planRevisionId||null):(input.planRevisionId||null),
      planPosition:input.planPosition===undefined?(existing?.planPosition||null):position(input.planPosition),
      trade:cleanText(input.trade===undefined?existing?.trade:input.trade,160),
      zone:cleanText(input.zone===undefined?existing?.zone:input.zone,160),
      description:cleanText(input.description===undefined?existing?.description:input.description,5000),
      voiceTranscript:cleanText(input.voiceTranscript===undefined?existing?.voiceTranscript:input.voiceTranscript,5000),
      attachmentIds:input.attachmentIds===undefined?cleanArray(existing?.attachmentIds):cleanArray(input.attachmentIds),
      assigneeId:input.assigneeId===undefined?(existing?.assigneeId||null):(input.assigneeId||null),
      dueAt,
      priority,
      status,
      authorId:existing?.authorId||state.session.activeMemberId,
      createdAt:existing?.createdAt||now(),
      updatedAt:now(),
      source:cleanText(input.source||existing?.source||'manual',80),
      sourceAngelId:input.sourceAngelId===undefined?(existing?.sourceAngelId||null):(input.sourceAngelId||null),
      checklistRunId:input.checklistRunId===undefined?(existing?.checklistRunId||null):(input.checklistRunId||null),
      correctiveAction:cleanText(input.correctiveAction===undefined?existing?.correctiveAction:input.correctiveAction,4000),
      beforeAttachmentIds:input.beforeAttachmentIds===undefined?cleanArray(existing?.beforeAttachmentIds):cleanArray(input.beforeAttachmentIds),
      afterAttachmentIds:input.afterAttachmentIds===undefined?cleanArray(existing?.afterAttachmentIds):cleanArray(input.afterAttachmentIds),
      history:existing?.history?clone(existing.history):[]
    };
  }

  function createPoint(input){
    let created;
    demo.store.update(state=>{
      const c=ensure(state);
      created=normalizePoint(state,input);
      created.history.unshift(historyEntry(state.session.activeMemberId,'created'));
      c.points.unshift(created);
    },{action:'conductor.point.created',entityType:'site_point',entityId:input.projectId||'new',details:input.type||''});
    window.dispatchEvent(new CustomEvent('speedarti:conductor:point-created',{detail:clone(created)}));
    return clone(created);
  }
  function updatePoint(id,patch){
    let result;
    demo.store.update(state=>{
      const c=ensure(state),idx=c.points.findIndex(p=>p.id===id);
      if(idx<0) throw new Error('Point chantier introuvable.');
      const previous=c.points[idx];
      assertProjectAccess(state,previous.projectId);
      result=normalizePoint(state,{...previous,...patch},previous);
      result.history.unshift(historyEntry(state.session.activeMemberId,'updated',patch.changeReason||''));
      c.points[idx]=result;
    },{action:'conductor.point.updated',entityType:'site_point',entityId:id});
    return clone(result);
  }
  function transitionPoint(id,status,details=''){
    let result;
    demo.store.update(state=>{
      const c=ensure(state),point=c.points.find(p=>p.id===id);
      if(!point) throw new Error('Point chantier introuvable.');
      assertProjectAccess(state,point.projectId);
      validateStatus(point.type,status);
      if(point.type==='non_conformity'){
        const order=NC_STATUSES;
        const from=order.indexOf(point.status),to=order.indexOf(status);
        if(to>from+1) throw new Error('Étape de non-conformité intermédiaire obligatoire.');
        if(status==='corrective_action'&&!cleanText(details)&&!point.correctiveAction) throw new Error('Décrivez l’action corrective.');
      }
      point.status=status;
      if(point.type==='non_conformity'&&status==='corrective_action'&&details) point.correctiveAction=cleanText(details,4000);
      point.updatedAt=now();
      point.history.unshift(historyEntry(state.session.activeMemberId,'status:'+status,details));
      result=clone(point);
    },{action:'conductor.point.status',entityType:'site_point',entityId:id,details:status});
    return result;
  }
  function listPoints(filters={}){
    const state=demo.store.getState(),allowed=visibleProjectIds(state);
    return clone(ensure(state).points.filter(p=>{
      if(!allowed.has(p.projectId)) return false;
      if(filters.projectId&&p.projectId!==filters.projectId) return false;
      if(filters.type&&p.type!==filters.type) return false;
      if(filters.status&&p.status!==filters.status) return false;
      if(filters.openOnly&&['resolved','validated'].includes(p.status)) return false;
      return true;
    }));
  }

  function registerPlan(input){
    let result;
    demo.store.update(state=>{
      const c=ensure(state);
      const projectId=cleanText(input.projectId);
      assertProjectAccess(state,projectId);
      if(!input.name) throw new Error('Nom du plan obligatoire.');
      const revision=cleanText(input.revisionLabel||'A',40);
      const status=cleanText(input.status||'draft');
      if(!PLAN_STATUSES.includes(status)) throw new Error('État documentaire invalide.');
      result={
        id:uid('plan'),projectId,name:cleanText(input.name,220),fileName:cleanText(input.fileName,260),
        mimeType:cleanText(input.mimeType,100),revisionLabel:revision,status,
        active:status==='active',replacesPlanId:input.replacesPlanId||null,
        documentId:input.documentId||null,remoteUrl:input.remoteUrl||null,
        createdAt:now(),createdBy:state.session.activeMemberId,validatedAt:null,validatedBy:null,history:[]
      };
      result.history.unshift(historyEntry(state.session.activeMemberId,'plan.created','Révision '+revision));
      if(result.active) for(const p of c.plans.filter(p=>p.projectId===projectId&&p.name===result.name&&p.active)){p.active=false;p.status='replaced';}
      c.plans.unshift(result);
      c.documentHistory.unshift({id:uid('doch'),projectId,planId:result.id,action:'created',at:now(),actorId:state.session.activeMemberId,revisionLabel:revision});
    },{action:'conductor.plan.created',entityType:'plan',entityId:input.projectId||'new'});
    return clone(result);
  }
  function setPlanStatus(id,status){
    if(!PLAN_STATUSES.includes(status)) throw new Error('État documentaire invalide.');
    let result;
    demo.store.update(state=>{
      const c=ensure(state),plan=c.plans.find(p=>p.id===id);
      if(!plan) throw new Error('Plan introuvable.');
      assertProjectAccess(state,plan.projectId);
      if(status==='active'){
        for(const p of c.plans.filter(p=>p.projectId===plan.projectId&&p.name===plan.name&&p.id!==id&&p.active)){p.active=false;p.status='replaced';p.history.unshift(historyEntry(state.session.activeMemberId,'plan.replaced','Remplacé par '+plan.revisionLabel));}
        plan.validatedAt=plan.validatedAt||now();plan.validatedBy=plan.validatedBy||state.session.activeMemberId;
      }
      plan.status=status;plan.active=status==='active';
      plan.history.unshift(historyEntry(state.session.activeMemberId,'plan.status:'+status));
      c.documentHistory.unshift({id:uid('doch'),projectId:plan.projectId,planId:id,action:'status:'+status,at:now(),actorId:state.session.activeMemberId,revisionLabel:plan.revisionLabel});
      result=clone(plan);
    },{action:'conductor.plan.status',entityType:'plan',entityId:id,details:status});
    return result;
  }

  function createValidation(input){
    let result;
    demo.store.update(state=>{
      const c=ensure(state);
      if(input.projectId) assertProjectAccess(state,input.projectId);
      result={id:uid('validation'),projectId:input.projectId||null,type:cleanText(input.type,100),title:cleanText(input.title,240),description:cleanText(input.description,2000),entityType:cleanText(input.entityType,100),entityId:cleanText(input.entityId,180),status:'pending',createdAt:now(),createdBy:state.session.activeMemberId,reviewedAt:null,reviewedBy:null,decisionNote:''};
      c.validations.unshift(result);
    },{action:'conductor.validation.created',entityType:'validation',entityId:input.entityId||'new'});
    return clone(result);
  }
  function reviewValidation(id,status,note=''){
    if(!['approved','rejected'].includes(status)) throw new Error('Décision invalide.');
    let result;
    demo.store.update(state=>{
      const v=ensure(state).validations.find(x=>x.id===id);
      if(!v) throw new Error('Validation introuvable.');
      if(v.projectId) assertProjectAccess(state,v.projectId);
      v.status=status;v.reviewedAt=now();v.reviewedBy=state.session.activeMemberId;v.decisionNote=cleanText(note,2000);
      result=clone(v);
    },{action:'conductor.validation.'+status,entityType:'validation',entityId:id});
    return result;
  }

  const api={
    version:'1.8.0',
    POINT_TYPES,DEFAULT_STATUSES,NC_STATUSES,PLAN_STATUSES,
    ensureState:()=>{let out;demo.store.update(s=>{out=clone(ensure(s));},{action:'conductor.schema.ensure',entityType:'conductor',entityId:'v18'});return out;},
    getState:()=>clone(ensure(demo.store.getState())),
    visibleProjectIds:()=>[...visibleProjectIds(demo.store.getState())],
    createPoint,updatePoint,transitionPoint,listPoints,
    registerPlan,setPlanStatus,
    createValidation,reviewValidation
  };
  window.SpeedArtiConductor=api;
  demo.store.update(state=>{ensure(state);},{action:'conductor.schema.ready',entityType:'conductor',entityId:'v18'});
  window.dispatchEvent(new CustomEvent('speedarti:conductor:ready',{detail:{version:api.version}}));
})();