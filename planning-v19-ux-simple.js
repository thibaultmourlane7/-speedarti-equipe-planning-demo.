/* SpeedArti Équipe & Planning — UX simple V1.9.1
   Façade progressive : ne supprime aucun moteur métier existant. */
(()=>{
  const demo=window.__SpeedArtiDemo;
  if(!demo?.ui||!demo?.store||window.__SpeedArtiUX191) return;
  window.__SpeedArtiUX191=true;
  const ui=demo.ui,store=demo.store;
  const conductor=()=>window.SpeedArtiConductor;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowIso=()=>new Date().toISOString();
  const DAY=86400000;
  const fmtDate=v=>{try{return new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(v));}catch{return '—';}};
  const fmtTime=v=>{try{return new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch{return '—';}};
  const sameDay=(a,b)=>{const x=new Date(a),y=new Date(b);return x.getFullYear()===y.getFullYear()&&x.getMonth()===y.getMonth()&&x.getDate()===y.getDate();};
  const startDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
  const startWeek=d=>{const x=startDay(d),n=(x.getDay()+6)%7;x.setDate(x.getDate()-n);return x;};
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
  const startMonth=d=>{const x=startDay(d);x.setDate(1);return x;};
  const addMonths=(d,n)=>{const x=new Date(d);x.setMonth(x.getMonth()+n);return x;};
  const endMonth=d=>{const x=startMonth(d);x.setMonth(x.getMonth()+1);return x;};

  function ensure(s){
    s.planningV191??={};
    const x=s.planningV191;
    x.simpleScale??='week';
    x.anchorDate??=nowIso();
    x.navGroups??={organisation:false,site:false,admin:false};
    return x;
  }
  store.update(st=>{ensure(st);},{action:'ux193.navigation.schema.ready',entityType:'navigation',entityId:'sidebar-groups'});

  function active(s){return s.members?.find(m=>m.id===s.session?.activeMemberId)||null;}
  function role(m){return m?.role||'worker';}
  function isField(m){return ['worker','subcontractor'].includes(role(m));}
  function isManager(m){return ['owner','associate','site_manager','team_lead','secretary'].includes(role(m));}
  function name(s,id){return s.members?.find(m=>m.id===id)?.name||'Collaborateur';}
  function projectName(s,id){return s.projects?.find(p=>p.id===id)?.name||'Chantier';}
  function resolveMembers(s,a){
    const ids=new Set(a.memberIds||[]);
    for(const cid of a.crewIds||[]){const c=s.crews?.find(x=>x.id===cid);for(const id of c?.memberIds||[])ids.add(id);}
    return [...ids];
  }
  function visibleProjectIds(s){
    if(conductor()?.visibleProjectIds){try{return new Set(conductor().visibleProjectIds());}catch{}}
    const m=active(s);if(!m)return new Set();
    if(m.projectAccessMode==='all'||['owner','associate','site_manager'].includes(m.role))return new Set((s.projects||[]).map(p=>p.id));
    if(m.projectAccessMode==='selected')return new Set(m.projectAccessIds||[]);
    const out=new Set();
    for(const a of s.assignments||[])if(resolveMembers(s,a).includes(m.id))out.add(a.projectId);
    return out;
  }
  function projects(s){const ids=visibleProjectIds(s);return (s.projects||[]).filter(p=>ids.has(p.id));}
  function assignments(s){
    const ids=visibleProjectIds(s),m=active(s);
    return (s.assignments||[]).filter(a=>ids.has(a.projectId)&&(!isField(m)||resolveMembers(s,a).includes(m.id))).sort((a,b)=>new Date(a.start)-new Date(b.start));
  }
  function ext(s){
    const c=s.conductorV18||{};
    return {
      points:c.points||[],plans:c.plans||[],validations:c.validations||[],meetings:c.meetings||[],
      journals:c.journals||[],scheduleNotices:c.scheduleNotices||[],clientTransmissions:c.clientTransmissions||[],
      memberQualifications:c.memberQualifications||{},offlineQueue:c.offlineQueue||[]
    };
  }
  function progressFor(s,projectId){
    const r=(s.reports||[]).filter(x=>x.projectId===projectId).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    return r?.progress??null;
  }
  function todayAssignment(s){
    const list=assignments(s),today=list.filter(a=>sameDay(a.start,new Date()));
    return today[0]||list.find(a=>new Date(a.end)>=new Date())||null;
  }
  function weatherFor(s,projectId){
    const w=s.planningV17?.weather;
    return Array.isArray(w)?w.find(x=>x.projectId===projectId):null;
  }
  function resourceLabels(s,a){
    const reservations=(s.planningV17?.resourceReservations||[]).filter(r=>r.assignmentId===a?.id);
    return (s.planningV17?.resources||[]).filter(r=>reservations.some(x=>x.resourceId===r.id)).map(r=>r.label);
  }
  function openPoints(s,projectId){
    return ext(s).points.filter(p=>p.projectId===projectId&&!['resolved','validated'].includes(p.status));
  }
  function pendingValidations(s,projectId){
    return ext(s).validations.filter(v=>(!projectId||v.projectId===projectId)&&v.status==='pending');
  }

  const legacyDashboard=ui.renderDashboard.bind(ui);
  const legacyPlanning=ui.renderPlanning.bind(ui);
  const legacyTerrain=ui.renderTerrain.bind(ui);
  const legacyPilotage=ui.renderPilotage.bind(ui);
  const legacyPageTitle=ui.pageTitle.bind(ui);
  const originalRender=ui.render.bind(ui);

  ui.v191Section=ui.v191Section||'today';
  ui.v191ProjectTab=ui.v191ProjectTab||'summary';
  ui.v191ProjectId=ui.v191ProjectId||null;
  ui.v191PlanningAdvanced=false;
  ui.v191LegacyDashboard=false;

  function sectionLabel(){
    return {today:"Aujourd’hui",planning:'Planning',projects:'Chantiers',attention:'À traiter',gantt:'Gantt avancé',reservations:'Réserves / OPR',nonconformities:'Non-conformités',quality:'Qualité',safety:'Sécurité',meetings:'Réunions',journal:'Journal chantier',client:'Suivi client'}[ui.v191Section]||"Aujourd’hui";
  }
  ui.pageTitle=function(){
    if(this.view==='dashboard'&&!this.v191LegacyDashboard)return sectionLabel();
    return legacyPageTitle();
  };

  function renderToday(s){
    const m=active(s),a=todayAssignment(s),p=a?s.projects.find(x=>x.id===a.projectId):null;
    const team=a?resolveMembers(s,a).map(id=>name(s,id)):[];
    const weather=a?weatherFor(s,a.projectId):null,resources=resourceLabels(s,a);
    const c=ext(s),notice=c.scheduleNotices.find(n=>n.memberId===m?.id&&n.status==='unread');
    const tasks=(s.tasks||[]).filter(t=>t.status!=='completed'&&(t.assigneeId===m?.id||['owner','associate','site_manager'].includes(m?.role))).slice(0,4);
    return '<section class="v191-hero"><div><span class="eyebrow">Aujourd’hui</span><h2>'+(a?esc(p?.name||a.title):'Rien de prévu pour le moment')+'</h2><p>'+(a?esc(p?.address||'Adresse non renseignée'):'Votre prochaine intervention apparaîtra ici.')+'</p></div><strong>'+fmtDate(new Date())+'</strong></section>'+
      (a?'<section class="v191-today-card"><div class="v191-today-time"><strong>'+fmtTime(a.start)+'</strong><span>→ '+fmtTime(a.end)+'</span></div><div class="v191-today-main"><h3>'+esc(a.title)+'</h3><div class="v191-info-grid"><div><span>Avec qui ?</span><strong>'+esc(team.join(' · ')||'Équipe non affectée')+'</strong></div><div><span>Matériel / engin</span><strong>'+esc(resources.join(' · ')||'Rien de particulier indiqué')+'</strong></div><div><span>Météo</span><strong>'+esc(weather?.summary||'Aucune donnée météo reçue')+'</strong></div><div><span>Consigne</span><strong>'+esc(a.notes||'Aucune consigne particulière')+'</strong></div></div></div></section>':'')+
      (notice?'<section class="v191-notice"><div><strong>Changement important</strong><p>'+esc(notice.title)+' · '+esc(notice.body)+'</p></div><div><button class="primary" data-v18-field-action="ack-notice" data-id="'+esc(notice.id)+'">Vu</button><button class="secondary" data-v18-field-action="problem-notice" data-id="'+esc(notice.id)+'">J’ai un problème</button></div></section>':'')+
      '<section class="v191-big-actions">'+
        '<button data-action="open-report"><span>📝</span><strong>Rapport</strong><small>Dire ce qui a été fait</small></button>'+
        '<button data-v191-action="signal"><span>⚠️</span><strong>Problème</strong><small>Signaler quelque chose</small></button>'+
        '<button data-action="open-material-request"><span>🧰</span><strong>Matériel</strong><small>Faire une demande</small></button>'+
      '</section>'+
      '<section class="v191-simple-block"><div class="v191-title"><div><h3>À ne pas oublier</h3><p>Seulement ce qui vous concerne.</p></div><button class="ghost" data-v191-nav="attention">Tout voir</button></div>'+
        (tasks.length?tasks.map(t=>'<div class="v191-line"><span>✓</span><div><strong>'+esc(t.title)+'</strong><small>'+esc(projectName(s,t.projectId))+'</small></div></div>').join(''):'<p class="v191-muted">Aucune tâche urgente.</p>')+
      '</section>';
  }

  function simpleRange(s){
    const cfg=ensure(s),anchor=new Date(cfg.anchorDate);
    if(cfg.simpleScale==='month')return {start:startMonth(anchor),end:endMonth(anchor),label:new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(anchor)};
    const start=startWeek(anchor);return {start,end:addDays(start,7),label:'Semaine du '+fmtDate(start)};
  }
  function renderSimplePlanning(s){
    const cfg=ensure(s),r=simpleRange(s),list=assignments(s).filter(a=>new Date(a.end)>=r.start&&new Date(a.start)<r.end);
    const byDay=new Map();
    for(const a of list){const key=startDay(a.start).toISOString();if(!byDay.has(key))byDay.set(key,[]);byDay.get(key).push(a);}
    return '<section class="v191-section-head"><div><span class="eyebrow">Planning simple</span><h2>'+esc(r.label)+'</h2><p>Une lecture simple de l’Agenda Chantier.</p></div>'+(isManager(active(s))?'<button class="secondary" data-v191-action="advanced-gantt">Vue avancée → Gantt</button>':'')+'</section>'+
      '<div class="v191-plan-toolbar"><div class="v191-toggle"><button class="'+(cfg.simpleScale==='week'?'active':'')+'" data-v191-action="simple-scale" data-scale="week">Semaine</button><button class="'+(cfg.simpleScale==='month'?'active':'')+'" data-v191-action="simple-scale" data-scale="month">Mois</button></div><div><button class="ghost" data-v191-action="simple-move" data-direction="prev">‹</button><button class="secondary" data-v191-action="simple-today">Aujourd’hui</button><button class="ghost" data-v191-action="simple-move" data-direction="next">›</button></div></div>'+
      '<section class="v191-calendar-list">'+(byDay.size?[...byDay.entries()].map(([day,items])=>'<div class="v191-day"><div class="v191-day-label"><strong>'+fmtDate(day)+'</strong><span>'+items.length+' intervention'+(items.length>1?'s':'')+'</span></div><div class="v191-day-items">'+items.map(a=>{const team=resolveMembers(s,a).map(id=>name(s,id));return '<button class="v191-plan-item" data-v191-action="open-assignment" data-id="'+esc(a.id)+'"><span class="v191-time">'+fmtTime(a.start)+'</span><span><strong>'+esc(projectName(s,a.projectId))+'</strong><small>'+esc(a.title)+' · '+esc(team.join(' + ')||'Équipe à affecter')+'</small></span></button>';}).join('')+'</div></div>').join(''):'<div class="v191-empty">Aucune intervention sur cette période.</div>')+'</section>';
  }
  function renderAdvancedPlanning(s){
    return '<div class="v191-advanced-head"><button class="secondary" data-v191-action="simple-planning">← Planning simple</button><div><strong>Gantt avancé</strong><small>Semaine · Mois · Année · N+3</small></div></div><div class="v191-advanced-planning">'+legacyPlanning(s)+'</div>';
  }

  function renderProjects(s){
    const list=projects(s).filter(p=>!['archived'].includes(p.status));
    if(ui.v191ProjectId&&list.some(p=>p.id===ui.v191ProjectId))return renderProjectDetail(s,list.find(p=>p.id===ui.v191ProjectId));
    return '<section class="v191-section-head"><div><span class="eyebrow">Chantiers</span><h2>Mes chantiers</h2><p>Ouvrez un chantier pour voir uniquement l’essentiel.</p></div></section><div class="v191-project-list">'+
      (list.length?list.map(p=>{const prog=progressFor(s,p.id),pts=openPoints(s,p.id).length,vals=pendingValidations(s,p.id).length;return '<button class="v191-project-card" data-v191-action="open-project" data-id="'+esc(p.id)+'"><div><strong>'+esc(p.name)+'</strong><span>'+esc(p.client||p.address||'')+'</span></div><div class="v191-project-status"><b>'+(prog==null?'—':prog+' %')+'</b><small>'+esc(p.status||'')+'</small></div><div class="v191-project-alerts">'+(pts?'<span>'+pts+' point'+(pts>1?'s':'')+' à traiter</span>':'')+(vals?'<span>'+vals+' validation'+(vals>1?'s':'')+'</span>':'')+(!pts&&!vals?'<span class="ok">Rien d’urgent</span>':'')+'</div><i>›</i></button>';}).join(''):'<div class="v191-empty">Aucun chantier accessible.</div>')+
      '</div>';
  }

  function renderProjectDetail(s,p){
    const tabs=[['summary','Résumé'],['terrain','Terrain'],['planning','Planning'],['documents','Documents']];
    let body='';
    const c=ext(s),pts=c.points.filter(x=>x.projectId===p.id),plans=c.plans.filter(x=>x.projectId===p.id),as=assignments(s).filter(x=>x.projectId===p.id);
    if(ui.v191ProjectTab==='terrain'){
      body='<div class="v191-title"><div><h3>Terrain</h3><p>Points et problèmes du chantier.</p></div><button class="primary" data-v191-action="signal" data-project-id="'+esc(p.id)+'">+ Signaler quelque chose</button></div><div class="v191-compact-list">'+(pts.length?pts.slice(0,12).map(x=>'<div class="v191-line"><span>•</span><div><strong>'+esc((conductor()?.POINT_TYPES?.[x.type]||x.type))+'</strong><small>'+esc(x.description||'')+' · '+esc(x.status)+'</small></div></div>').join(''):'<p class="v191-muted">Aucun point chantier.</p>')+'</div>';
    }else if(ui.v191ProjectTab==='planning'){
      body='<div class="v191-title"><div><h3>Planning du chantier</h3><p>Dates issues de l’Agenda Chantier.</p></div><button class="secondary" data-v191-nav="planning">Voir tout le planning</button></div><div class="v191-compact-list">'+(as.length?as.slice(0,12).map(a=>'<button class="v191-line v191-click" data-v191-action="open-assignment" data-id="'+esc(a.id)+'"><span>'+fmtDate(a.start)+'</span><div><strong>'+esc(a.title)+'</strong><small>'+fmtTime(a.start)+' → '+fmtTime(a.end)+' · '+esc(resolveMembers(s,a).map(id=>name(s,id)).join(' · ')||'Sans équipe')+'</small></div></button>').join(''):'<p class="v191-muted">Aucune intervention.</p>')+'</div>';
    }else if(ui.v191ProjectTab==='documents'){
      body='<div class="v191-title"><div><h3>Documents & plans</h3><p>La version active reste clairement identifiée.</p></div></div><div class="v191-compact-list">'+(plans.length?plans.map(x=>'<div class="v191-line"><span>📄</span><div><strong>'+esc(x.name)+' — Rév. '+esc(x.revisionLabel)+'</strong><small>'+(x.active?'VERSION ACTIVE':esc(x.status))+'</small></div></div>').join(''):'<p class="v191-muted">Aucun plan rattaché.</p>')+'</div>';
    }else if(ui.v191ProjectTab==='more'){
      const reserves=pts.filter(x=>['reservation','opr'].includes(x.type)).length,nc=pts.filter(x=>x.type==='non_conformity').length,quality=pts.filter(x=>x.type==='quality').length,safety=pts.filter(x=>x.type==='safety').length;
      const meetings=c.meetings.filter(x=>x.projectId===p.id).length,journals=c.journals.filter(x=>x.projectId===p.id).length,tx=c.clientTransmissions.filter(x=>x.projectId===p.id).length;
      body='<div class="v191-more-grid"><button data-v191-action="legacy-dashboard"><strong>Réserves / OPR</strong><span>'+reserves+'</span></button><button data-v191-action="legacy-dashboard"><strong>Non-conformités</strong><span>'+nc+'</span></button><button data-v191-action="legacy-dashboard"><strong>Qualité</strong><span>'+quality+'</span></button><button data-v191-action="legacy-dashboard"><strong>Sécurité</strong><span>'+safety+'</span></button><button data-v191-action="legacy-dashboard"><strong>Réunions</strong><span>'+meetings+'</span></button><button data-v191-action="legacy-dashboard"><strong>Journal chantier</strong><span>'+journals+'</span></button><button data-v191-action="legacy-dashboard"><strong>Suivi client</strong><span>'+tx+'</span></button><button data-v191-action="legacy-dashboard"><strong>Outils conducteur avancés</strong><span>›</span></button></div>';
    }else{
      const prog=progressFor(s,p.id),open=pts.filter(x=>!['resolved','validated'].includes(x.status)),next=as.find(a=>new Date(a.end)>=new Date()),vals=pendingValidations(s,p.id);
      body='<div class="v191-summary-grid"><article><span>Avancement</span><strong>'+(prog==null?'—':prog+' %')+'</strong></article><article><span>Points ouverts</span><strong>'+open.length+'</strong></article><article><span>À valider</span><strong>'+vals.length+'</strong></article><article><span>Prochaine intervention</span><strong>'+(next?fmtDate(next.start):'—')+'</strong></article></div><div class="v191-simple-block"><h3>Prochaine étape</h3>'+(next?'<p><strong>'+esc(next.title)+'</strong><br>'+fmtDate(next.start)+' · '+fmtTime(next.start)+' → '+fmtTime(next.end)+'</p>':'<p class="v191-muted">Aucune intervention future.</p>')+'</div>';
    }
    return '<section class="v191-project-head"><button class="ghost" data-v191-action="back-projects">← Chantiers</button><div><span class="eyebrow">Chantier</span><h2>'+esc(p.name)+'</h2><p>'+esc(p.client||'')+' · '+esc(p.address||'')+'</p></div></section>'+
      '<nav class="v191-project-tabs">'+tabs.map(x=>'<button class="'+(ui.v191ProjectTab===x[0]?'active':'')+'" data-v191-action="project-tab" data-tab="'+x[0]+'">'+x[1]+'</button>').join('')+(isManager(active(s))?'<button class="'+(ui.v191ProjectTab==='more'?'active':'')+'" data-v191-action="project-tab" data-tab="more">Plus</button>':'')+'</nav>'+
      '<section class="v191-project-body">'+body+'</section>';
  }

  function attentionItems(s){
    const c=ext(s),ids=visibleProjectIds(s),out=[];
    for(const v of c.validations.filter(x=>x.status==='pending'&&(!x.projectId||ids.has(x.projectId))))out.push({tone:'blue',title:v.title||'Validation à faire',projectId:v.projectId,detail:v.description||'Décision nécessaire',kind:'validation'});
    for(const r of (s.requests||[]).filter(x=>ids.has(x.projectId)&&x.status!=='resolved'&&['high','urgent'].includes(x.priority)))out.push({tone:'red',title:r.title||'Demande urgente',projectId:r.projectId,detail:r.description||'',kind:'request'});
    for(const n of c.scheduleNotices.filter(x=>x.status==='unread'&&x.memberId===s.session.activeMemberId))out.push({tone:'orange',title:n.title||'Planning modifié',projectId:n.projectId,detail:n.body||'',kind:'notice'});
    for(const p of c.points.filter(x=>ids.has(x.projectId)&&!['resolved','validated'].includes(x.status)&&['urgent','high'].includes(x.priority)))out.push({tone:'red',title:(conductor()?.POINT_TYPES?.[p.type]||'Point chantier'),projectId:p.projectId,detail:p.description||'',kind:'point'});
    for(const a of assignments(s).filter(x=>new Date(x.end)>=new Date()&&resolveMembers(s,x).length===0))out.push({tone:'orange',title:'Équipe à affecter',projectId:a.projectId,detail:a.title,kind:'planning'});
    for(const t of c.clientTransmissions.filter(x=>ids.has(x.projectId)&&['failed','ready_for_client_interface'].includes(x.status)))out.push({tone:t.status==='failed'?'red':'blue',title:t.status==='failed'?'Transmission client en échec':'Transmission client préparée',projectId:t.projectId,detail:t.publicationTitle,kind:'client'});
    return out.slice(0,30);
  }
  function renderAttention(s){
    const items=attentionItems(s);
    return '<section class="v191-section-head"><div><span class="eyebrow">À traiter</span><h2>'+(items.length?items.length+' chose'+(items.length>1?'s':'')+' à regarder':'Rien d’urgent')+'</h2><p>Une seule boîte pour tout ce qui demande une action.</p></div></section><div class="v191-attention-list">'+
      (items.length?items.map(x=>'<button class="v191-attention v191-'+x.tone+'" data-v191-action="attention-open" data-project-id="'+esc(x.projectId||'')+'" data-kind="'+esc(x.kind)+'"><span class="v191-dot"></span><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.projectId?projectName(s,x.projectId):'Équipe & Planning')+' · '+esc(x.detail)+'</small></div><b>Voir ›</b></button>').join(''):'<div class="v191-empty"><strong>Tout est à jour.</strong><span>Aucune action importante en attente.</span></div>')+
      '</div>';
  }

  function renderAdvancedSection(s,key){
    const list=projects(s),p=(ui.v191ProjectId&&list.find(x=>x.id===ui.v191ProjectId))||list[0];
    if(!p)return '<div class="v191-empty">Aucun chantier accessible.</div>';
    ui.v191ProjectId=p.id;
    const c=ext(s);
    const chooser='<label class="v191-project-select">Chantier<select data-v191-control="side-project">'+list.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===p.id?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label>';
    let title='',body='';
    if(key==='reservations'){
      title='Réserves / OPR';
      const rows=c.points.filter(x=>x.projectId===p.id&&['reservation','opr'].includes(x.type));
      body=rows.length?rows.map(x=>'<div class="v191-line"><span>📌</span><div><strong>'+esc(conductor()?.POINT_TYPES?.[x.type]||x.type)+'</strong><small>'+esc(x.description||'')+' · '+esc(x.status)+'</small></div></div>').join(''):'<p class="v191-muted">Aucune réserve ou OPR.</p>';
    }else if(key==='nonconformities'){
      title='Non-conformités';
      const rows=c.points.filter(x=>x.projectId===p.id&&x.type==='non_conformity');
      body=rows.length?rows.map(x=>'<div class="v191-line"><span>⚠️</span><div><strong>'+esc(x.description||'Non-conformité')+'</strong><small>'+esc(x.status)+(x.correctiveAction?' · '+esc(x.correctiveAction):'')+'</small></div></div>').join(''):'<p class="v191-muted">Aucune non-conformité.</p>';
    }else if(key==='quality'){
      title='Qualité';
      const rows=c.points.filter(x=>x.projectId===p.id&&x.type==='quality');
      const runs=(s.conductorV18?.checklistRuns||[]).filter(x=>x.projectId===p.id);
      body=(rows.length?rows.map(x=>'<div class="v191-line"><span>✅</span><div><strong>'+esc(x.description||'Contrôle qualité')+'</strong><small>'+esc(x.status)+'</small></div></div>').join(''):'')+(runs.length?runs.map(x=>'<div class="v191-line"><span>☑</span><div><strong>'+esc(x.templateName||'Check-list')+'</strong><small>'+esc(x.status)+'</small></div></div>').join(''):'')+(!rows.length&&!runs.length?'<p class="v191-muted">Aucun contrôle qualité.</p>':'');
    }else if(key==='safety'){
      title='Sécurité';
      const rows=c.points.filter(x=>x.projectId===p.id&&x.type==='safety');
      body=rows.length?rows.map(x=>'<div class="v191-line"><span>🦺</span><div><strong>'+esc(x.description||'Observation sécurité')+'</strong><small>'+esc(x.status)+' · '+esc(x.priority||'normal')+'</small></div></div>').join(''):'<p class="v191-muted">Aucune observation sécurité.</p>';
    }else if(key==='meetings'){
      title='Réunions';
      const rows=c.meetings.filter(x=>x.projectId===p.id);
      body=rows.length?rows.map(x=>'<div class="v191-line"><span>👥</span><div><strong>'+esc(x.title||'Réunion de chantier')+'</strong><small>'+fmtDate(x.startedAt)+' · '+esc(x.status)+(x.minutesStatus?' · CR '+esc(x.minutesStatus):'')+'</small></div></div>').join(''):'<p class="v191-muted">Aucune réunion.</p>';
    }else if(key==='journal'){
      title='Journal chantier';
      const rows=c.journals.filter(x=>x.projectId===p.id);
      body=rows.length?rows.map(x=>'<div class="v191-line"><span>📖</span><div><strong>Journal du '+esc(x.date)+'</strong><small>'+esc(x.status)+'</small></div></div>').join(''):'<p class="v191-muted">Aucun journal chantier.</p>';
    }else if(key==='client'){
      title='Suivi client';
      const rows=c.clientTransmissions.filter(x=>x.projectId===p.id);
      body=rows.length?rows.map(x=>'<div class="v191-line"><span>📨</span><div><strong>'+esc(x.publicationTitle||'Transmission client')+'</strong><small>'+esc(x.status)+(x.consultedAt?' · consulté '+fmtDate(x.consultedAt):'')+'</small></div></div>').join(''):'<p class="v191-muted">Aucune transmission client.</p>';
    }
    return '<section class="v191-section-head"><div><span class="eyebrow">Suivi chantier</span><h2>'+esc(title)+'</h2><p>'+esc(p.name)+'</p></div>'+chooser+'</section><section class="v191-project-body"><div class="v191-title"><div><h3>'+esc(title)+'</h3><p>Informations du chantier sélectionné.</p></div><button class="primary" data-v191-action="signal" data-project-id="'+esc(p.id)+'">+ Signaler quelque chose</button></div><div class="v191-compact-list">'+body+'</div></section>';
  }

  function customDashboard(s){
    if(ui.v191LegacyDashboard)return '<div class="v191-legacy-head"><button class="secondary" data-v191-action="exit-legacy">← Revenir à la vue simple</button><strong>Vue complète</strong></div><div class="v191-legacy-dashboard">'+legacyDashboard(s)+'</div>';
    if(ui.v191Section==='planning')return ui.v191PlanningAdvanced?renderAdvancedPlanning(s):renderSimplePlanning(s);
    if(ui.v191Section==='projects')return renderProjects(s);
    if(ui.v191Section==='attention')return renderAttention(s);
    if(ui.v191Section==='gantt')return renderAdvancedPlanning(s);
    if(['reservations','nonconformities','quality','safety','meetings','journal','client'].includes(ui.v191Section))return renderAdvancedSection(s,ui.v191Section);
    return renderToday(s);
  }
  ui.renderDashboard=function(s){return customDashboard(s);};

  function patchChrome(){
    const shell=ui.root?.querySelector?.('.app-shell');if(!shell)return;
    shell.classList.add('v191-simple-shell','v191-full-sidebar');
    const s=store.getState(),m=active(s);
    const current=ui.view==='dashboard'&&!ui.v191LegacyDashboard?ui.v191Section:ui.view;
    const primary=[
      {id:'today',icon:'⌂',label:"Aujourd’hui",kind:'section'},
      {id:'planning',icon:'▦',label:'Planning',kind:'section'},
      {id:'projects',icon:'🏗',label:'Chantiers',kind:'section'},
      {id:'attention',icon:'✓',label:'À traiter',kind:'section'}
    ];
    const work=[];
    if(isManager(m))work.push({id:'team',icon:'👷',label:'Équipe',kind:'legacy'});
    work.push({id:'terrain',icon:'≣',label:'Terrain',kind:'legacy'});
    if(isManager(m))work.push({id:'gantt',icon:'▥',label:'Gantt avancé',kind:'section'});
    if(isManager(m))work.push({id:'pilotage',icon:'◎',label:'Pilotage',kind:'legacy'});
    const site=[];
    if(isManager(m)){
      site.push(
        {id:'reservations',icon:'📌',label:'Réserves / OPR',kind:'section'},
        {id:'nonconformities',icon:'⚠',label:'Non-conformités',kind:'section'},
        {id:'quality',icon:'✓',label:'Qualité',kind:'section'},
        {id:'safety',icon:'🦺',label:'Sécurité',kind:'section'},
        {id:'meetings',icon:'👥',label:'Réunions',kind:'section'},
        {id:'journal',icon:'📖',label:'Journal chantier',kind:'section'},
        {id:'client',icon:'📨',label:'Suivi client',kind:'section'}
      );
    }
    const admin=[];
    if(['owner','associate'].includes(m?.role)){
      admin.push({id:'history',icon:'↺',label:'Historique',kind:'legacy'},{id:'settings',icon:'⚙',label:'Configuration',kind:'legacy'});
    }
    const cfg=ensure(s);
    const itemMarkup=(items)=>items.map(x=>'<button class="nav-item '+(current===x.id?'active':'')+'" '+(x.kind==='legacy'?'data-v191-legacy-view="'+x.id+'"':'data-v191-nav="'+x.id+'"')+'><span class="nav-icon">'+x.icon+'</span><span>'+x.label+'</span></button>').join('');
    const fixedBlock=(title,items)=>items.length?'<div class="v191-nav-section v191-nav-section-fixed"><div class="v191-nav-group v191-nav-group-fixed"><span>'+title+'</span></div><div class="v191-nav-items">'+itemMarkup(items)+'</div></div>':'';
    const collapsibleBlock=(key,title,items)=>{
      if(!items.length)return '';
      const open=cfg.navGroups?.[key]===true;
      return '<div class="v191-nav-section '+(open?'open':'collapsed')+'"><button class="v191-nav-group v191-nav-toggle" data-v191-action="toggle-nav-group" data-group="'+key+'" aria-expanded="'+(open?'true':'false')+'"><span>'+title+'</span><b>'+(open?'⌄':'›')+'</b></button><div class="v191-nav-items" '+(open?'':'hidden')+'>'+itemMarkup(items)+'</div></div>';
    };
    const nav=ui.root.querySelector('.sidebar nav');
    if(nav)nav.innerHTML=fixedBlock('Principal',primary)+collapsibleBlock('organisation','Organisation',work)+collapsibleBlock('site','Suivi chantier',site)+collapsibleBlock('admin','Administration',admin);
    const oldBottom=ui.root.querySelector('.v191-bottom-nav');if(oldBottom)oldBottom.remove();
  }
  ui.render=function(){originalRender();patchChrome();};

  function openSignalChooser(projectId=''){
    ui.modal='<div><h2>Signaler quelque chose</h2><p>Choisissez simplement ce qui se rapproche le plus de votre besoin.</p><div class="v191-signal-grid">'+
      [['problem','⚠️','Problème'],['reservation','📌','Réserve'],['quality','✅','Qualité'],['safety','🦺','Sécurité'],['request','➕','Autre']].map(x=>'<button data-v191-action="signal-type" data-type="'+x[0]+'" data-project-id="'+esc(projectId)+'"><span>'+x[1]+'</span><strong>'+x[2]+'</strong></button>').join('')+
      '</div></div>';ui.render();
  }
  function openSignalForm(s,type,projectId=''){
    const list=projects(s),selected=projectId||list[0]?.id||'';
    const labels={problem:'Problème',reservation:'Réserve',quality:'Qualité',safety:'Sécurité',request:'Autre'};
    ui.modal='<form data-v191-form="point"><input type="hidden" name="type" value="'+esc(type)+'"><h2>'+esc(labels[type]||'Signalement')+'</h2><p>Décrivez simplement. Les détails sont facultatifs.</p><label>Chantier<select name="projectId" required>'+list.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===selected?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label><label>Description<textarea name="description" required placeholder="Que se passe-t-il ?"></textarea></label><label>Photo / document<input type="file" name="file" accept="image/*,.pdf"></label><details class="v191-details"><summary>Plus de détails</summary><div class="v191-form-grid"><label>Zone<input name="zone" placeholder="Ex. toiture nord"></label><label>Lot / métier<input name="trade" placeholder="Ex. couverture"></label><label>Priorité<select name="priority"><option value="normal">Normale</option><option value="high">Importante</option><option value="urgent">Urgente</option><option value="low">Basse</option></select></label></div></details><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button class="primary">Enregistrer</button></div></form>';ui.render();
  }

  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-v191-nav]');
    if(nav){ui.v191Section=nav.dataset.v191Nav;ui.v191LegacyDashboard=false;ui.v191PlanningAdvanced=false;ui.view='dashboard';ui.render();return;}
    const legacy=e.target.closest('[data-v191-legacy-view]');
    if(legacy){ui.v191LegacyDashboard=false;ui.view=legacy.dataset.v191LegacyView;ui.render();return;}
    const t=e.target.closest('[data-v191-action]');if(!t)return;
    const s=store.getState(),action=t.dataset.v191Action,cfg=ensure(s);
    if(action==='toggle-nav-group'){
      const key=t.dataset.group;
      if(!['organisation','site','admin'].includes(key))return;
      store.update(st=>{const x=ensure(st);x.navGroups[key]=!x.navGroups[key];},{action:'ux192.nav.toggle',entityType:'navigation',entityId:key,details:String(!cfg.navGroups[key])});
      ui.render();return;
    }
    if(action==='advanced-gantt'){ui.v191Section='planning';ui.v191PlanningAdvanced=true;ui.view='dashboard';ui.render();return;}
    if(action==='simple-planning'){ui.v191PlanningAdvanced=false;ui.render();return;}
    if(action==='simple-scale'){store.update(st=>{ensure(st).simpleScale=t.dataset.scale;},{action:'ux191.planning.scale',entityType:'planning',entityId:'simple',details:t.dataset.scale});ui.render();return;}
    if(action==='simple-today'){store.update(st=>{ensure(st).anchorDate=nowIso();},{action:'ux191.planning.today',entityType:'planning',entityId:'simple'});ui.render();return;}
    if(action==='simple-move'){const n=cfg.simpleScale==='month'?1:7,anchor=new Date(cfg.anchorDate),next=t.dataset.direction==='prev'?(cfg.simpleScale==='month'?addMonths(anchor,-1):addDays(anchor,-n)):(cfg.simpleScale==='month'?addMonths(anchor,1):addDays(anchor,n));store.update(st=>{ensure(st).anchorDate=next.toISOString();},{action:'ux191.planning.navigate',entityType:'planning',entityId:'simple',details:t.dataset.direction});ui.render();return;}
    if(action==='open-assignment'){if(typeof ui.openAssignmentForm==='function'){ui.openAssignmentForm(s,t.dataset.id);ui.render();}return;}
    if(action==='open-project'){ui.v191ProjectId=t.dataset.id;ui.v191ProjectTab='summary';ui.render();return;}
    if(action==='back-projects'){ui.v191ProjectId=null;ui.v191ProjectTab='summary';ui.render();return;}
    if(action==='project-tab'){ui.v191ProjectTab=t.dataset.tab;ui.render();return;}
    if(action==='signal'){openSignalChooser(t.dataset.projectId||ui.v191ProjectId||'');return;}
    if(action==='signal-type'){openSignalForm(s,t.dataset.type,t.dataset.projectId||'');return;}
    if(action==='attention-open'){if(t.dataset.projectId){ui.v191Section='projects';ui.v191ProjectId=t.dataset.projectId;ui.v191ProjectTab=t.dataset.kind==='planning'?'planning':'summary';ui.view='dashboard';ui.render();}else{ui.v191LegacyDashboard=true;ui.view='dashboard';ui.render();}return;}
    if(action==='legacy-dashboard'){ui.v191LegacyDashboard=true;ui.view='dashboard';ui.render();return;}
    if(action==='exit-legacy'){ui.v191LegacyDashboard=false;ui.v191Section='today';ui.view='dashboard';ui.render();return;}
  });
  document.addEventListener('change',e=>{
    const t=e.target.closest('[data-v191-control="side-project"]');if(!t)return;
    ui.v191ProjectId=t.value;ui.render();
  });

  document.addEventListener('submit',async e=>{
    const form=e.target.closest('form[data-v191-form="point"]');if(!form)return;
    e.preventDefault();const fd=new FormData(form),api=conductor();
    if(!api)return ui.notify('Moteur Point chantier indisponible.','error');
    try{
      let point=api.createPoint({projectId:String(fd.get('projectId')),type:String(fd.get('type')),description:String(fd.get('description')||''),zone:String(fd.get('zone')||''),trade:String(fd.get('trade')||''),priority:String(fd.get('priority')||'normal')});
      const file=fd.get('file');
      if(file instanceof File&&file.size&&window.SpeedArtiConductorFiles?.putBlob){
        const id='pointfile_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
        await window.SpeedArtiConductorFiles.putBlob(id,file);
        point=api.updatePoint(point.id,{attachmentIds:[...(point.attachmentIds||[]),id]});
      }
      ui.modal=null;ui.notify('Signalement enregistré.');ui.v191Section='projects';ui.v191ProjectId=point.projectId;ui.v191ProjectTab='terrain';ui.view='dashboard';ui.render();
    }catch(err){ui.notify(err.message||'Enregistrement impossible.','error');}
  });

  const style=document.createElement('style');
  style.textContent=`
    .v191-simple-shell .scope-note{display:none}.v191-simple-shell .demo-plan-bar{display:none}.v191-simple-shell .content{padding-bottom:24px}.v191-full-sidebar .sidebar{overflow-y:auto}.v191-nav-section{display:block}.v191-nav-group{width:100%;display:flex;align-items:center;justify-content:space-between;padding:.75rem .8rem .3rem;font-size:.58rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border:0;background:transparent;text-align:left}.v191-nav-group-fixed{cursor:default}.v191-nav-toggle{cursor:pointer;border-radius:8px;padding-bottom:.55rem}.v191-nav-toggle:hover{background:#f5f8fc}.v191-nav-toggle b{font-size:.9rem;line-height:1;color:var(--muted)}.v191-nav-items[hidden]{display:none!important}.v191-nav-section.collapsed{border-bottom:1px solid #eef1f5}.v191-project-select{display:grid;gap:.2rem;font-size:.7rem;font-weight:800;min-width:190px}
    .v191-bottom-nav{display:none}.v191-hero,.v191-section-head,.v191-project-head{display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-bottom:1rem}.v191-hero h2,.v191-section-head h2,.v191-project-head h2{margin:.15rem 0}.v191-hero>strong{font-size:.8rem;color:var(--muted)}
    .v191-today-card{display:grid;grid-template-columns:100px 1fr;gap:1rem;padding:1rem;border:1px solid var(--border);border-radius:16px;background:#fff;margin-bottom:1rem}.v191-today-time{display:flex;flex-direction:column;align-items:center;justify-content:center;background:#eef5ff;border-radius:12px}.v191-today-time strong{font-size:1.3rem}.v191-today-time span{font-size:.75rem;color:var(--muted)}.v191-today-main h3{margin:0 0 .6rem}.v191-info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem}.v191-info-grid>div{padding:.55rem;border-radius:10px;background:#f7f9fc}.v191-info-grid span,.v191-info-grid strong{display:block}.v191-info-grid span{font-size:.65rem;color:var(--muted);text-transform:uppercase;font-weight:800}.v191-info-grid strong{font-size:.8rem;margin-top:.15rem}
    .v191-notice{display:flex;justify-content:space-between;align-items:center;gap:.7rem;padding:.8rem;border-radius:12px;background:#fff8e5;border:1px solid #f0d78c;margin-bottom:1rem}.v191-notice p{margin:.2rem 0 0}.v191-big-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:1rem 0}.v191-big-actions button{display:grid;place-items:center;text-align:center;min-height:120px;border:1px solid var(--border);border-radius:16px;background:#fff;padding:.8rem}.v191-big-actions span{font-size:1.6rem}.v191-big-actions strong{font-size:1rem}.v191-big-actions small{color:var(--muted)}
    .v191-simple-block,.v191-project-body{border:1px solid var(--border);border-radius:16px;background:#fff;padding:1rem}.v191-title{display:flex;justify-content:space-between;align-items:center;gap:.6rem;margin-bottom:.7rem}.v191-title h3{margin:0}.v191-title p{margin:.15rem 0 0;color:var(--muted);font-size:.75rem}.v191-line{display:flex;gap:.6rem;align-items:center;padding:.65rem 0;border-bottom:1px solid #edf0f4}.v191-line:last-child{border-bottom:0}.v191-line strong,.v191-line small{display:block}.v191-line small{color:var(--muted)}.v191-click{width:100%;border:0;background:transparent;text-align:left}
    .v191-plan-toolbar{display:flex;justify-content:space-between;gap:.7rem;align-items:center;margin-bottom:.8rem}.v191-toggle{display:flex;border:1px solid var(--border);border-radius:10px;overflow:hidden}.v191-toggle button{border:0;background:#fff;padding:.55rem .8rem;font-weight:800}.v191-toggle button.active{background:#eaf2ff;color:var(--blue)}.v191-calendar-list{display:grid;gap:.8rem}.v191-day{display:grid;grid-template-columns:150px 1fr;border:1px solid var(--border);border-radius:14px;background:#fff;overflow:hidden}.v191-day-label{padding:.8rem;background:#f6f8fb}.v191-day-label strong,.v191-day-label span{display:block}.v191-day-label span{font-size:.7rem;color:var(--muted)}.v191-day-items{display:grid}.v191-plan-item{display:grid;grid-template-columns:70px 1fr;gap:.6rem;text-align:left;border:0;border-bottom:1px solid #eef1f5;background:#fff;padding:.75rem}.v191-plan-item:last-child{border-bottom:0}.v191-plan-item strong,.v191-plan-item small{display:block}.v191-plan-item small{color:var(--muted)}.v191-time{font-weight:900;color:var(--blue)}
    .v191-advanced-head,.v191-legacy-head{display:flex;align-items:center;gap:.8rem;margin-bottom:.8rem}.v191-advanced-head div{display:grid}.v191-advanced-planning>*:not(.v19-panel){display:none!important}
    .v191-project-list{display:grid;gap:.65rem}.v191-project-card{display:grid;grid-template-columns:minmax(180px,1fr) 90px minmax(120px,auto) 20px;align-items:center;gap:.8rem;text-align:left;border:1px solid var(--border);border-radius:14px;background:#fff;padding:.85rem}.v191-project-card strong,.v191-project-card span,.v191-project-card small{display:block}.v191-project-card span,.v191-project-card small{color:var(--muted)}.v191-project-status{text-align:center}.v191-project-status b{font-size:1.1rem}.v191-project-alerts{display:flex;gap:.3rem;flex-wrap:wrap}.v191-project-alerts span{font-size:.67rem;background:#fff2dc;color:#7b5200;padding:.25rem .4rem;border-radius:999px}.v191-project-alerts .ok{background:#eaf7ef;color:#087342}.v191-project-tabs{display:flex;gap:.3rem;overflow:auto;margin-bottom:.7rem}.v191-project-tabs button{white-space:nowrap;border:0;background:#f2f5f8;padding:.55rem .7rem;border-radius:9px;font-weight:800}.v191-project-tabs button.active{background:#eaf2ff;color:var(--blue)}.v191-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.55rem;margin-bottom:.8rem}.v191-summary-grid article{border:1px solid var(--border);border-radius:12px;padding:.7rem}.v191-summary-grid span,.v191-summary-grid strong{display:block}.v191-summary-grid span{font-size:.7rem;color:var(--muted)}.v191-summary-grid strong{font-size:1.2rem}
    .v191-attention-list{display:grid;gap:.55rem}.v191-attention{display:grid;grid-template-columns:12px 1fr auto;gap:.7rem;align-items:center;text-align:left;border:1px solid var(--border);border-radius:13px;background:#fff;padding:.8rem}.v191-attention strong,.v191-attention small{display:block}.v191-attention small{color:var(--muted)}.v191-dot{width:9px;height:9px;border-radius:50%}.v191-red .v191-dot{background:#e53935}.v191-orange .v191-dot{background:#f59e0b}.v191-blue .v191-dot{background:#1677ff}
    .v191-more-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.65rem}.v191-more-grid button{display:flex;justify-content:space-between;gap:.7rem;align-items:center;text-align:left;border:1px solid var(--border);border-radius:14px;background:#fff;padding:1rem;min-height:84px}.v191-more-grid strong,.v191-more-grid span{display:block}.v191-more-grid span{color:var(--muted);font-size:.75rem}.v191-empty{display:grid;place-items:center;gap:.25rem;min-height:160px;color:var(--muted);text-align:center}.v191-muted{color:var(--muted)}
    .v191-signal-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.55rem}.v191-signal-grid button{display:grid;place-items:center;min-height:95px;border:1px solid var(--border);border-radius:13px;background:#fff}.v191-signal-grid span{font-size:1.5rem}.v191-details{margin-top:.7rem}.v191-details summary{font-weight:800;cursor:pointer}.v191-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin-top:.6rem}
    @media(max-width:1024px){.v191-info-grid{grid-template-columns:1fr}.v191-summary-grid{grid-template-columns:1fr 1fr}.v191-project-card{grid-template-columns:1fr auto}.v191-project-alerts{grid-column:1/-1}.v191-project-card>i{display:none}}
    @media(min-width:701px) and (max-width:1024px){
      .v191-full-sidebar.app-shell{display:grid!important;grid-template-columns:200px minmax(0,1fr)!important;min-height:100vh}
      .v191-full-sidebar .sidebar{display:flex!important;position:sticky!important;inset:auto!important;top:0!important;left:auto!important;right:auto!important;bottom:auto!important;width:200px!important;min-width:200px!important;height:100vh!important;padding:.85rem .55rem!important;border-top:0!important;border-right:1px solid rgba(255,255,255,.1);box-shadow:none!important;overflow-y:auto!important}
      .v191-full-sidebar .sidebar .brand{display:flex!important;padding:.2rem .35rem .8rem!important}
      .v191-full-sidebar .sidebar .brand div{display:block!important}
      .v191-full-sidebar .sidebar nav{display:block!important;overflow:visible!important;padding:0!important}
      .v191-full-sidebar .sidebar .nav-item{width:100%;min-width:0!important;display:grid!important;grid-template-columns:22px minmax(0,1fr) auto!important;align-items:center!important;text-align:left!important;gap:.5rem!important;padding:.62rem .55rem!important;font-size:.74rem!important}
      .v191-full-sidebar .sidebar .nav-item .nav-icon{font-size:.9rem}
      .v191-full-sidebar .sidebar .nav-item span:last-child{white-space:normal;line-height:1.15}
      .v191-full-sidebar .sidebar .v191-nav-group{display:flex!important;padding:.65rem .45rem .35rem!important}
      .v191-full-sidebar .sidebar .v191-nav-group span{display:block!important}
      .v191-full-sidebar .sidebar .v191-nav-group-fixed{display:flex!important}
      .v191-simple-shell .workspace{margin-left:0!important;padding-bottom:0!important;min-width:0}
      .v191-simple-shell .topbar{position:sticky!important;top:0!important;padding:.75rem 1rem!important;flex-direction:row!important;align-items:center!important}
      .v191-simple-shell .topbar-actions{width:auto!important;display:flex!important;align-items:center!important}
      .v191-simple-shell .global-search{display:none!important}
      .v191-simple-shell .content{padding:1rem!important}
      .v191-day{grid-template-columns:110px 1fr}
    }
    @media(max-width:700px){
      .v191-full-sidebar.app-shell{display:grid!important;grid-template-columns:82px minmax(0,1fr)!important;min-height:100vh}
      .v191-full-sidebar .sidebar{display:flex!important;position:fixed!important;inset:0 auto 0 0!important;top:0!important;left:0!important;right:auto!important;bottom:0!important;width:82px!important;min-width:82px!important;height:100dvh!important;padding:.45rem .25rem!important;border-top:0!important;border-right:1px solid rgba(255,255,255,.12)!important;box-shadow:8px 0 24px rgba(8,20,38,.14)!important;overflow-y:auto!important}
      .v191-full-sidebar .sidebar .brand{display:flex!important;justify-content:center;padding:.45rem .1rem .65rem!important}
      .v191-full-sidebar .sidebar .brand div,.v191-full-sidebar .sidebar .v191-nav-group span{display:none!important}
      .v191-full-sidebar .sidebar .v191-nav-group{display:flex!important;justify-content:center!important;padding:.35rem .1rem!important}
      .v191-full-sidebar .sidebar .v191-nav-group-fixed{display:none!important}
      .v191-full-sidebar .sidebar .v191-nav-toggle b{font-size:.9rem}
      .v191-full-sidebar .sidebar nav{display:block!important;overflow:visible!important;padding:.1rem!important}
      .v191-full-sidebar .sidebar .nav-item{width:100%;min-width:0!important;display:grid!important;grid-template-columns:1fr!important;place-items:center!important;text-align:center!important;padding:.45rem .1rem!important;gap:.08rem!important;min-height:54px}
      .v191-full-sidebar .sidebar .nav-item .nav-icon{font-size:1rem}
      .v191-full-sidebar .sidebar .nav-item span:last-child{font-size:.53rem;line-height:1.05;white-space:normal}
      .v191-simple-shell .workspace{margin-left:82px!important;padding-bottom:0!important;min-width:0}
      .v191-simple-shell .topbar{position:sticky!important;top:0!important;padding:.7rem!important}
      .v191-simple-shell .global-search{display:none!important}
      .v191-hero,.v191-section-head,.v191-project-head{align-items:flex-start}
      .v191-big-actions{gap:.45rem}.v191-big-actions button{min-height:105px}
      .v191-day{grid-template-columns:1fr}.v191-day-label{padding:.55rem}.v191-more-grid{grid-template-columns:1fr}
    }
    @media(max-width:480px){.v191-today-card{grid-template-columns:1fr}.v191-today-time{padding:.55rem;flex-direction:row;gap:.3rem}.v191-big-actions small{font-size:.65rem}.v191-big-actions strong{font-size:.85rem}.v191-summary-grid{grid-template-columns:1fr 1fr}.v191-form-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  window.SpeedArtiUX191={
    version:'1.9.4',
    principles:['5-second-understanding','simple-first','advanced-on-demand','no-feature-removal'],
    sections:['today','planning','projects','attention','gantt','reservations','nonconformities','quality','safety','meetings','journal','client'],
    attentionItems:()=>structuredClone(attentionItems(store.getState())),
    setSection:section=>{if(['today','planning','projects','attention','more'].includes(section)){ui.v191Section=section;ui.v191LegacyDashboard=false;ui.view='dashboard';ui.render();}}
  };
  ui.view='dashboard';
  ui.v191Section='today';
  ui.render();
})();