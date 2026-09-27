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
        const replaced=[];
        for(const p of c.plans.filter(p=>p.projectId===plan.projectId&&p.name===plan.name&&p.id!==id&&p.active)){p.active=false;p.status='replaced';p.history.unshift(historyEntry(state.session.activeMemberId,'plan.replaced','Remplacé par '+plan.revisionLabel));replaced.push(p);}
        plan.validatedAt=plan.validatedAt||now();plan.validatedBy=plan.validatedBy||state.session.activeMemberId;
        if(replaced.length&&Array.isArray(state.notifications))state.notifications.unshift({id:uid('notification'),type:'info',title:'Nouvelle révision active',body:plan.name+' — révision '+plan.revisionLabel+' remplace '+replaced.map(p=>p.revisionLabel).join(', '),priority:'normal',createdAt:now(),read:false,entityType:'plan',entityId:plan.id});
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
      if(v.entityType==='meeting_minutes'){
        const meeting=c.meetings.find(m=>m.id===v.entityId);
        if(meeting){meeting.minutesStatus=status;meeting.minutesReviewedAt=now();meeting.minutesReviewedBy=state.session.activeMemberId;}
      }
      if(v.entityType==='site_journal'){
        const journal=c.journals.find(j=>j.id===v.entityId);
        if(journal){journal.status=status; journal.reviewedAt=now();journal.reviewedBy=state.session.activeMemberId;}
      }
      result=clone(v);
    },{action:'conductor.validation.'+status,entityType:'validation',entityId:id});
    return result;
  }

  function createChecklistTemplate(input){
    let result;
    demo.store.update(state=>{
      const c=ensure(state);
      const name=cleanText(input.name,220);
      const items=(Array.isArray(input.items)?input.items:[]).map((item,index)=>({
        id:item.id||uid('check_item'),
        label:cleanText(item.label,500),
        required:item.required!==false,
        requiresPhoto:item.requiresPhoto===true,
        order:index
      })).filter(item=>item.label);
      if(!name||!items.length) throw new Error('Nom et au moins un contrôle sont obligatoires.');
      result={id:uid('check_template'),name,category:cleanText(input.category,120),blocking:input.blocking===true,items,createdAt:now(),createdBy:state.session.activeMemberId,status:'active'};
      c.checklistTemplates.unshift(result);
    },{action:'conductor.checklist.template.created',entityType:'checklist_template',entityId:'new'});
    return clone(result);
  }

  function startChecklist(input){
    let result;
    demo.store.update(state=>{
      const c=ensure(state);
      assertProjectAccess(state,input.projectId);
      const template=c.checklistTemplates.find(t=>t.id===input.templateId&&t.status==='active');
      if(!template) throw new Error('Modèle de contrôle introuvable.');
      result={
        id:uid('check_run'),projectId:input.projectId,templateId:template.id,templateName:template.name,
        pointId:input.pointId||null,status:'in_progress',startedAt:now(),startedBy:state.session.activeMemberId,
        completedAt:null,validatedAt:null,validatedBy:null,
        answers:template.items.map(item=>({itemId:item.id,label:item.label,required:item.required,requiresPhoto:item.requiresPhoto,answer:null,comment:'',attachmentIds:[]}))
      };
      c.checklistRuns.unshift(result);
    },{action:'conductor.checklist.started',entityType:'checklist_run',entityId:input.templateId});
    return clone(result);
  }

  function answerChecklist(runId,itemId,input){
    let result;
    demo.store.update(state=>{
      const c=ensure(state),run=c.checklistRuns.find(r=>r.id===runId);
      if(!run) throw new Error('Contrôle introuvable.');
      assertProjectAccess(state,run.projectId);
      if(run.status!=='in_progress') throw new Error('Ce contrôle est déjà terminé.');
      const answer=run.answers.find(a=>a.itemId===itemId);
      if(!answer) throw new Error('Ligne de contrôle introuvable.');
      const value=input.answer==null?null:cleanText(input.answer,10);
      if(value!==null&&!['yes','no','na'].includes(value)) throw new Error('Réponse de contrôle invalide.');
      answer.answer=value;
      answer.comment=cleanText(input.comment,1500);
      if(input.attachmentIds!==undefined) answer.attachmentIds=cleanArray(input.attachmentIds);
      result=clone(run);
    },{action:'conductor.checklist.answered',entityType:'checklist_run',entityId:runId});
    return result;
  }

  function completeChecklist(runId){
    let result;
    demo.store.update(state=>{
      const c=ensure(state),run=c.checklistRuns.find(r=>r.id===runId);
      if(!run) throw new Error('Contrôle introuvable.');
      assertProjectAccess(state,run.projectId);
      const template=c.checklistTemplates.find(t=>t.id===run.templateId);
      const missing=run.answers.filter(a=>a.required&&!a.answer);
      if(missing.length) throw new Error(missing.length+' contrôle(s) obligatoire(s) sans réponse.');
      const photoMissing=run.answers.filter(a=>a.requiresPhoto&&a.answer==='yes'&&!(a.attachmentIds||[]).length);
      if(photoMissing.length) throw new Error(photoMissing.length+' preuve(s) photo obligatoire(s) manquante(s).');
      const failed=run.answers.filter(a=>a.answer==='no');
      run.status=failed.length?'completed_with_issues':'completed';
      run.completedAt=now();
      if(template?.blocking&&failed.length){
        c.validations.unshift({
          id:uid('validation'),projectId:run.projectId,type:'quality_block',
          title:'Contrôle obligatoire à valider',description:failed.map(x=>x.label).join(' · '),
          entityType:'checklist_run',entityId:run.id,status:'pending',createdAt:now(),
          createdBy:state.session.activeMemberId,reviewedAt:null,reviewedBy:null,decisionNote:''
        });
      }
      result=clone(run);
    },{action:'conductor.checklist.completed',entityType:'checklist_run',entityId:runId});
    return result;
  }

  function createMeeting(input){
    let result;
    demo.store.update(state=>{
      const c=ensure(state);
      assertProjectAccess(state,input.projectId);
      result={
        id:uid('meeting'),projectId:input.projectId,title:cleanText(input.title||'Réunion de chantier',220),
        startedAt:input.startedAt||now(),endedAt:null,status:'in_progress',
        participantIds:cleanArray(input.participantIds),notes:cleanText(input.notes,12000),
        dictation:cleanText(input.dictation,12000),decisions:[],actions:[],attachmentIds:[],
        planId:input.planId||null,pointIds:cleanArray(input.pointIds),
        createdBy:state.session.activeMemberId,createdAt:now(),updatedAt:now(),
        minutesDraft:null,minutesStatus:null,angelRequestId:null
      };
      c.meetings.unshift(result);
    },{action:'conductor.meeting.created',entityType:'meeting',entityId:'new'});
    return clone(result);
  }

  function updateMeeting(id,patch){
    let result;
    demo.store.update(state=>{
      const c=ensure(state),m=c.meetings.find(x=>x.id===id);
      if(!m) throw new Error('Réunion introuvable.');
      assertProjectAccess(state,m.projectId);
      if(patch.notes!==undefined)m.notes=cleanText(patch.notes,12000);
      if(patch.dictation!==undefined)m.dictation=cleanText(patch.dictation,12000);
      if(patch.participantIds!==undefined)m.participantIds=cleanArray(patch.participantIds);
      if(patch.decisions!==undefined)m.decisions=(Array.isArray(patch.decisions)?patch.decisions:[]).map(x=>({id:x.id||uid('decision'),text:cleanText(x.text,2500),createdAt:x.createdAt||now()})).filter(x=>x.text);
      if(patch.actions!==undefined)m.actions=(Array.isArray(patch.actions)?patch.actions:[]).map(x=>({id:x.id||uid('meeting_action'),text:cleanText(x.text,2500),assigneeId:x.assigneeId||null,dueAt:x.dueAt||null,status:x.status||'open'})).filter(x=>x.text);
      if(patch.attachmentIds!==undefined)m.attachmentIds=cleanArray(patch.attachmentIds);
      if(patch.pointIds!==undefined)m.pointIds=cleanArray(patch.pointIds);
      if(patch.status==='completed'){m.status='completed';m.endedAt=now();}
      m.updatedAt=now();result=clone(m);
    },{action:'conductor.meeting.updated',entityType:'meeting',entityId:id});
    return result;
  }

  function prepareMeetingMinutes(id){
    let result;
    demo.store.update(state=>{
      const c=ensure(state),m=c.meetings.find(x=>x.id===id);
      if(!m) throw new Error('Réunion introuvable.');
      assertProjectAccess(state,m.projectId);
      const relatedPoints=c.points.filter(p=>m.pointIds.includes(p.id));
      m.minutesDraft={
        generatedAt:now(),source:'structured_local_context',
        title:m.title,date:m.startedAt,participantIds:[...m.participantIds],
        notes:m.notes,dictation:m.dictation,decisions:clone(m.decisions),actions:clone(m.actions),
        points:relatedPoints.map(p=>({id:p.id,type:p.type,description:p.description,status:p.status}))
      };
      m.minutesStatus='pending_validation';
      const existing=c.validations.find(v=>v.entityType==='meeting_minutes'&&v.entityId===m.id&&v.status==='pending');
      if(!existing)c.validations.unshift({id:uid('validation'),projectId:m.projectId,type:'meeting_minutes',title:'Compte rendu de réunion à valider',description:m.title,entityType:'meeting_minutes',entityId:m.id,status:'pending',createdAt:now(),createdBy:state.session.activeMemberId,reviewedAt:null,reviewedBy:null,decisionNote:''});
      result=clone(m.minutesDraft);
    },{action:'conductor.meeting.minutes.prepared',entityType:'meeting_minutes',entityId:id});
    return result;
  }

  function prepareDailyJournal(projectId,dateValue){
    let result;
    demo.store.update(state=>{
      const c=ensure(state);assertProjectAccess(state,projectId);
      const target=(dateValue?new Date(dateValue):new Date());
      if(Number.isNaN(+target)) throw new Error('Date de journal invalide.');
      const sameDay=v=>{const d=new Date(v);return d.getFullYear()===target.getFullYear()&&d.getMonth()===target.getMonth()&&d.getDate()===target.getDate();};
      const reports=(state.reports||[]).filter(r=>r.projectId===projectId&&sameDay(r.date));
      const messages=(state.messages||[]).filter(m=>m.projectId===projectId&&sameDay(m.createdAt));
      const requests=(state.requests||[]).filter(r=>r.projectId===projectId&&sameDay(r.createdAt));
      const points=c.points.filter(p=>p.projectId===projectId&&sameDay(p.createdAt||p.updatedAt));
      const assignments=(state.assignments||[]).filter(a=>a.projectId===projectId&&(sameDay(a.start)||sameDay(a.end)||(new Date(a.start)<=target&&new Date(a.end)>=target)));
      const weather=(state.planningV17?.weather||[]).filter(w=>w.projectId===projectId&&(w.date?sameDay(w.date):true));
      const existing=c.journals.find(j=>j.projectId===projectId&&j.date===target.toISOString().slice(0,10)&&['draft','pending'].includes(j.status));
      const journal=existing||{id:uid('journal'),projectId,date:target.toISOString().slice(0,10),createdAt:now(),createdBy:state.session.activeMemberId,status:'draft'};
      journal.generatedAt=now();
      journal.sources={reportIds:reports.map(x=>x.id),messageIds:messages.map(x=>x.id),requestIds:requests.map(x=>x.id),pointIds:points.map(x=>x.id),assignmentIds:assignments.map(x=>x.id)};
      journal.summary={
        reports:reports.map(r=>({progress:r.progress,summary:r.summary,problems:r.problems,materials:r.materials})),
        messages:messages.map(m=>m.body),
        requests:requests.map(r=>({type:r.type,title:r.title,description:r.description,status:r.status})),
        points:points.map(p=>({type:p.type,description:p.description,status:p.status,priority:p.priority})),
        assignments:assignments.map(a=>({title:a.title,start:a.start,end:a.end})),
        weather:weather.map(w=>({summary:w.summary,riskLevel:w.riskLevel,windKmh:w.windKmh,precipitationRiskPct:w.precipitationRiskPct}))
      };
      journal.status='pending';
      if(!existing)c.journals.unshift(journal);
      const v=c.validations.find(v=>v.entityType==='site_journal'&&v.entityId===journal.id&&v.status==='pending');
      if(!v)c.validations.unshift({id:uid('validation'),projectId,type:'site_journal',title:'Journal chantier à valider',description:'Synthèse du '+journal.date,entityType:'site_journal',entityId:journal.id,status:'pending',createdAt:now(),createdBy:state.session.activeMemberId,reviewedAt:null,reviewedBy:null,decisionNote:''});
      result=clone(journal);
    },{action:'conductor.journal.prepared',entityType:'site_journal',entityId:projectId});
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
    createValidation,reviewValidation,
    createChecklistTemplate,startChecklist,answerChecklist,completeChecklist,
    createMeeting,updateMeeting,prepareMeetingMinutes,prepareDailyJournal
  };
  window.SpeedArtiConductor=api;
  demo.store.update(state=>{ensure(state);},{action:'conductor.schema.ready',entityType:'conductor',entityId:'v18'});
  window.dispatchEvent(new CustomEvent('speedarti:conductor:ready',{detail:{version:api.version}}));
})();