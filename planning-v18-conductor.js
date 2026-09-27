
/* SpeedArti — Interface Conducteur v1.8 */
(()=>{
  const demo=window.__SpeedArtiDemo, core=window.SpeedArtiConductor;
  if(!demo?.ui||!demo?.store||!core||window.__SpeedArtiConductorUI18) return;
  window.__SpeedArtiConductorUI18=true;
  const ui=demo.ui, store=demo.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short'}).format(new Date(v));}catch{return '—';}};
  const fmtDT=v=>{try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}catch{return '—';}};
  const stateExt=s=>s.conductorV18||{points:[],plans:[],validations:[],documentHistory:[],presenceActuals:[]};
  const member=s=>s.members?.find(m=>m.id===s.session?.activeMemberId);
  const pname=(s,id)=>s.projects?.find(p=>p.id===id)?.name||'Chantier';
  const mname=(s,id)=>s.members?.find(m=>m.id===id)?.name||'Non affecté';
  const membersFor=(s,a)=>{
    const ids=new Set(a?.memberIds||[]);
    for(const cid of a?.crewIds||[]){const c=s.crews?.find(x=>x.id===cid);for(const id of c?.memberIds||[])ids.add(id);}
    return [...ids];
  };
  const projects=s=>{
    const allowed=new Set(core.visibleProjectIds());
    return (s.projects||[]).filter(p=>allowed.has(p.id));
  };
  const current=s=>{
    const list=projects(s);
    if(!list.length) return null;
    if(!ui.v18ProjectId||!list.some(p=>p.id===ui.v18ProjectId)) ui.v18ProjectId=list.find(p=>!['completed','invoiced','archived'].includes(p.status))?.id||list[0].id;
    return list.find(p=>p.id===ui.v18ProjectId)||list[0];
  };
  ui.v18Tab=ui.v18Tab||'overview';
  ui.v18PlanId=ui.v18PlanId||null;
  ui.v18Placement=false;
  ui.v18PreviewUrl=null;

  const DB='speedarti-conductor-v18', STORE='plan_files';
  function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE,{keyPath:'id'});};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
  async function putBlob(id,file){const db=await openDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({id,blob:file});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
  async function getBlob(id){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const q=tx.objectStore(STORE).get(id);q.onsuccess=()=>resolve(q.result?.blob||null);q.onerror=()=>reject(q.error);});}finally{db.close();}}
  const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);

  const typeLabel=t=>core.POINT_TYPES[t]||t;
  const statusLabel=s=>({open:'Ouvert',in_progress:'En cours',resolved:'Résolu',validated:'Validé',corrective_action:'Action corrective',corrected:'Corrigée',controlled:'Contrôlée'}[s]||s);
  function badge(text,kind){return '<span class="v18-badge v18-'+(kind||'neutral')+'">'+esc(text)+'</span>';}
  function pointCard(s,p){
    return '<article class="v18-point-card"><div><div>'+badge(typeLabel(p.type),'info')+' '+badge(statusLabel(p.status),p.status==='validated'?'success':'neutral')+'</div><strong>'+esc(p.description||typeLabel(p.type))+'</strong><small>'+esc(p.trade||'Lot non précisé')+(p.zone?' · '+esc(p.zone):'')+(p.dueAt?' · '+fmt(p.dueAt):'')+'</small></div><button class="ghost" data-v18-action="open-point" data-id="'+esc(p.id)+'">Voir</button></article>';
  }
  function plannedHours(s,projectId){
    return Math.round((s.assignments||[]).filter(a=>a.projectId===projectId).reduce((sum,a)=>sum+Math.max(0,(new Date(a.end)-new Date(a.start))/3600000)*(membersFor(s,a).length||1),0)*10)/10;
  }
  function actualHours(s,projectId){
    return Math.round((stateExt(s).presenceActuals||[]).filter(x=>x.projectId===projectId).reduce((sum,x)=>sum+(Number(x.hours)||0),0)*10)/10;
  }
  function overview(s,p){
    const c=stateExt(s), pts=(c.points||[]).filter(x=>x.projectId===p.id), open=pts.filter(x=>!['resolved','validated'].includes(x.status));
    const reports=(s.reports||[]).filter(r=>r.projectId===p.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const progress=reports[0]?.progress, pending=(c.validations||[]).filter(v=>v.projectId===p.id&&v.status==='pending').length;
    const milestones=(s.planningV17?.milestones||[]).filter(m=>m.projectId===p.id&&new Date(m.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const weather=(s.planningV17?.weather||[]).find(w=>w.projectId===p.id);
    const upcoming=(s.assignments||[]).filter(a=>a.projectId===p.id&&new Date(a.end)>=new Date()).sort((a,b)=>new Date(a.start)-new Date(b.start))[0];
    const team=upcoming?membersFor(s,upcoming).map(id=>mname(s,id)):[];
    const ph=plannedHours(s,p.id), ah=actualHours(s,p.id);
    return '<div class="v18-kpis"><article><strong>'+(progress??'—')+(progress!=null?' %':'')+'</strong><span>Avancement</span></article><article><strong>'+open.length+'</strong><span>Points ouverts</span></article><article><strong>'+pending+'</strong><span>Validations</span></article><article><strong>'+(milestones[0]?fmt(milestones[0].date):'—')+'</strong><span>Prochain jalon</span></article></div>'+
      '<div class="v18-grid"><article><h4>Prévu / réalisé</h4><p><b>'+(ph||'—')+' h</b> prévues · <b>'+(ah||'—')+' h</b> réalisées</p><small>Le réel vient de Temps & Présence lorsqu’il est connecté.</small></article><article><h4>Équipe</h4><p>'+esc(team.join(' · ')||'Aucune équipe affectée')+'</p><small>'+(upcoming?esc(upcoming.title)+' · '+fmtDT(upcoming.start):'Aucune intervention future')+'</small></article><article><h4>Météo</h4><p>'+esc(weather?.summary||'Aucune donnée météo reçue')+'</p><small>Aucune météo inventée.</small></article><article><h4>Points chantier</h4><p>'+open.length+' ouvert(s)</p><small>Réserves, problèmes, qualité, sécurité…</small></article></div>'+
      '<div class="v18-title"><h4>À traiter</h4><button class="secondary" data-v18-action="new-point">+ Point chantier</button></div><div class="v18-list">'+(open.length?open.slice(0,8).map(x=>pointCard(s,x)).join(''):'<p class="v18-empty">Aucun point ouvert.</p>')+'</div>';
  }
  function planTab(s,p){
    const c=stateExt(s), plans=(c.plans||[]).filter(x=>x.projectId===p.id);
    if(!ui.v18PlanId||!plans.some(x=>x.id===ui.v18PlanId)) ui.v18PlanId=plans.find(x=>x.active)?.id||plans[0]?.id||null;
    const plan=plans.find(x=>x.id===ui.v18PlanId), pts=plan?(c.points||[]).filter(x=>x.planId===plan.id):[];
    let html='<div class="v18-title"><div><h4>Plan chantier</h4><small>Documents reste la source de vérité.</small></div><button class="secondary" data-v18-action="add-plan">+ Ajouter / réviser</button></div>';
    if(!plan) return html+'<div class="v18-empty-block"><strong>Aucun plan</strong><p>Ajoutez un PDF ou une image.</p></div>';
    html+='<div class="v18-plan-select">'+plans.map(x=>'<button class="'+(x.id===plan.id?'selected':'')+'" data-v18-action="select-plan" data-id="'+esc(x.id)+'"><strong>'+esc(x.name)+'</strong><small>Rév. '+esc(x.revisionLabel)+(x.active?' · ACTIVE':'')+'</small></button>').join('')+'</div>';
    html+='<div class="v18-title"><div><strong>'+esc(plan.name)+' — Rév. '+esc(plan.revisionLabel)+'</strong><small>'+(plan.active?'Version active':esc(plan.status))+'</small></div><div><button class="secondary" data-v18-action="preview-plan" data-id="'+esc(plan.id)+'">Afficher</button> <button class="'+(ui.v18Placement?'primary':'secondary')+'" data-v18-action="toggle-placement">'+(ui.v18Placement?'Annuler':'Placer un point')+'</button> '+(!plan.active?'<button class="secondary" data-v18-action="activate-plan" data-id="'+esc(plan.id)+'">Activer</button>':'')+'</div></div>';
    html+='<div class="v18-plan-stage '+(ui.v18Placement?'placing':'')+'" data-v18-plan-stage data-plan-id="'+esc(plan.id)+'">';
    if(ui.v18PreviewUrl){
      html+=plan.mimeType?.startsWith('image/')?'<img class="v18-plan-file" src="'+esc(ui.v18PreviewUrl)+'" alt="Plan">':'<iframe class="v18-plan-file" src="'+esc(ui.v18PreviewUrl)+'" title="Plan PDF"></iframe>';
    }else html+='<div class="v18-empty-block"><strong>Révision prête</strong><p>Cliquez sur Afficher pour charger le fichier.</p></div>';
    html+='<div class="v18-overlay">'+pts.filter(x=>x.planPosition).map((x,i)=>'<button class="v18-pin '+(['resolved','validated'].includes(x.status)?'closed':'')+'" style="left:'+x.planPosition.xPct+'%;top:'+x.planPosition.yPct+'%" data-v18-action="open-point" data-id="'+esc(x.id)+'">'+(i+1)+'</button>').join('')+'</div></div>';
    html+='<p class="v18-help">'+(ui.v18Placement?'Touchez la zone du plan où créer le point.':'Les points restent liés à leur révision de plan.')+'</p>';
    return html;
  }
  function terrainTab(s,p){
    const pts=(stateExt(s).points||[]).filter(x=>x.projectId===p.id).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
    return '<div class="v18-title"><h4>Suivi terrain</h4><button class="secondary" data-v18-action="new-point">+ Point chantier</button></div><div class="v18-list">'+(pts.length?pts.map(x=>pointCard(s,x)).join(''):'<p class="v18-empty">Aucun point chantier.</p>')+'</div>';
  }
  function planningTab(s,p){
    const list=(s.assignments||[]).filter(a=>a.projectId===p.id).sort((a,b)=>new Date(a.start)-new Date(b.start));
    return '<div class="v18-title"><div><h4>Planning</h4><small>Dates issues de l’Agenda Chantier.</small></div><button class="secondary" data-view="planning">Ouvrir le planning</button></div><div class="v18-list">'+(list.length?list.map(a=>'<article class="v18-row"><strong>'+esc(a.title)+'</strong><span>'+fmtDT(a.start)+' → '+fmtDT(a.end)+'</span><small>'+esc(membersFor(s,a).map(id=>mname(s,id)).join(' · ')||'Équipe non affectée')+'</small></article>').join(''):'<p class="v18-empty">Aucune intervention.</p>')+'</div>';
  }
  function docsTab(s,p){
    const c=stateExt(s), plans=(c.plans||[]).filter(x=>x.projectId===p.id);
    return '<div class="v18-title"><div><h4>Plans & documents</h4><small>Version active clairement identifiée.</small></div><button class="secondary" data-v18-action="add-plan">+ Révision</button></div><div class="v18-list">'+(plans.length?plans.map(x=>'<article class="v18-row"><strong>'+esc(x.name)+' — Rév. '+esc(x.revisionLabel)+'</strong><span>'+esc(x.fileName||'Document externe')+'</span><small>'+(x.active?'VERSION ACTIVE':esc(x.status))+'</small></article>').join(''):'<p class="v18-empty">Aucun plan.</p>')+'</div>';
  }
  function teamTab(s,p){
    const ids=[...new Set((s.assignments||[]).filter(a=>a.projectId===p.id).flatMap(a=>membersFor(s,a)))];
    return '<div class="v18-title"><div><h4>Équipe chantier</h4><small>Issue d’Équipe & Planning.</small></div><button class="secondary" data-view="team">Gérer</button></div><div class="v18-team">'+(ids.length?ids.map(id=>{const m=s.members.find(x=>x.id===id);return '<article><strong>'+esc(m?.name||id)+'</strong><span>'+esc((m?.skills||[]).join(' · ')||'Compétence non précisée')+'</span></article>';}).join(''):'<p class="v18-empty">Aucun collaborateur affecté.</p>')+'</div>';
  }
  function cockpit(s){
    if(member(s)?.role!=='site_manager') return '';
    const p=current(s); if(!p) return '';
    const tabs=[['overview','Vue générale'],['plan','Plan'],['terrain','Terrain'],['planning','Planning'],['documents','Documents'],['team','Équipe']];
    let body=overview(s,p);
    if(ui.v18Tab==='plan') body=planTab(s,p);
    if(ui.v18Tab==='terrain') body=terrainTab(s,p);
    if(ui.v18Tab==='planning') body=planningTab(s,p);
    if(ui.v18Tab==='documents') body=docsTab(s,p);
    if(ui.v18Tab==='team') body=teamTab(s,p);
    return '<section class="panel v18-cockpit"><div class="v18-head"><div><span class="eyebrow">Suivi chantier — Conducteur</span><h2>Cockpit chantier</h2><p>Une couche simple au-dessus des modules existants.</p></div><label>Chantier<select data-v18-control="project">'+projects(s).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===p.id?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label></div><nav class="v18-tabs">'+tabs.map(x=>'<button class="'+(ui.v18Tab===x[0]?'active':'')+'" data-v18-action="tab" data-tab="'+x[0]+'">'+x[1]+'</button>').join('')+'</nav><div>'+body+'</div></section>';
  }

  const style=document.createElement('style');
  style.textContent='.v18-cockpit{margin-top:1rem}.v18-head{display:flex;justify-content:space-between;gap:1rem;align-items:end}.v18-head label{display:grid;gap:.3rem;min-width:220px;font-size:.75rem;font-weight:800}.v18-tabs{display:flex;gap:.35rem;overflow:auto;margin:1rem 0;border-bottom:1px solid var(--border);padding-bottom:.45rem}.v18-tabs button{white-space:nowrap;border:0;background:transparent;padding:.55rem .7rem;border-radius:10px;font-weight:750}.v18-tabs button.active{background:#eaf2ff;color:var(--blue)}.v18-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem}.v18-kpis article,.v18-grid article{border:1px solid var(--border);border-radius:12px;padding:.7rem;background:#fff}.v18-kpis strong{display:block;font-size:1.3rem}.v18-kpis span,.v18-grid small{font-size:.72rem;color:var(--muted)}.v18-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:1rem 0}.v18-title{display:flex;justify-content:space-between;align-items:center;gap:.6rem;margin:1rem 0 .6rem}.v18-title h4{margin:0}.v18-title small{display:block;color:var(--muted)}.v18-list{display:grid;gap:.5rem}.v18-point-card,.v18-row{display:flex;justify-content:space-between;align-items:center;gap:.7rem;border:1px solid var(--border);border-radius:12px;padding:.7rem;background:#fff}.v18-point-card strong,.v18-point-card small,.v18-row strong,.v18-row span,.v18-row small{display:block}.v18-badge{font-size:.65rem;padding:.18rem .4rem;border-radius:999px;background:#edf1f6}.v18-info{background:#e8f2ff}.v18-success{background:#e8f8ef}.v18-plan-select{display:flex;gap:.4rem;overflow:auto}.v18-plan-select button{min-width:150px;text-align:left;border:1px solid var(--border);background:#fff;border-radius:10px;padding:.5rem}.v18-plan-select .selected{border-color:var(--blue);background:#eef5ff}.v18-plan-select strong,.v18-plan-select small{display:block}.v18-plan-stage{position:relative;min-height:440px;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#f4f7fb}.v18-plan-file{width:100%;height:580px;border:0;object-fit:contain;background:#fff}.v18-overlay{position:absolute;inset:0;pointer-events:none}.v18-plan-stage.placing .v18-overlay{pointer-events:auto;cursor:crosshair}.v18-pin{position:absolute;transform:translate(-50%,-50%);width:32px;height:32px;min-height:32px;border-radius:50%;background:#e53935;color:#fff;border:3px solid #fff;font-weight:900;pointer-events:auto}.v18-pin.closed{background:#16a36a}.v18-empty-block{min-height:260px;display:grid;place-content:center;text-align:center;color:var(--muted)}.v18-help,.v18-empty{font-size:.75rem;color:var(--muted)}.v18-team{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.5rem}.v18-team article{border:1px solid var(--border);border-radius:12px;padding:.7rem}.v18-team strong,.v18-team span{display:block}.v18-form{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}.v18-form .full{grid-column:1/-1}@media(max-width:800px){.v18-head{align-items:stretch;flex-direction:column}.v18-head label{min-width:0}.v18-kpis{grid-template-columns:1fr 1fr}.v18-grid{grid-template-columns:1fr}.v18-plan-stage{min-height:340px}.v18-plan-file{height:480px}}@media(max-width:520px){.v18-form{grid-template-columns:1fr}.v18-form .full{grid-column:auto}.v18-point-card,.v18-row{align-items:flex-start;flex-direction:column}}';
  document.head.appendChild(style);

  const original=ui.renderSiteManagerDashboard.bind(ui);
  ui.renderSiteManagerDashboard=function(s,m){return original(s,m)+cockpit(s);};

  function openModal(html){ui.modal=html;ui.render();}
  function pointForm(s,defaults){
    const p=current(s), d=defaults||{};
    return '<form data-v18-form="point"><h2>Nouveau Point chantier</h2><div class="v18-form"><input type="hidden" name="projectId" value="'+esc(d.projectId||p?.id||'')+'"><input type="hidden" name="planId" value="'+esc(d.planId||'')+'"><input type="hidden" name="xPct" value="'+esc(d.xPct??'')+'"><input type="hidden" name="yPct" value="'+esc(d.yPct??'')+'"><label>Type<select name="type">'+Object.entries(core.POINT_TYPES).map(x=>'<option value="'+x[0]+'">'+esc(x[1])+'</option>').join('')+'</select></label><label>Lot / métier<input name="trade"></label><label>Zone<input name="zone"></label><label>Responsable<select name="assigneeId"><option value="">Non affecté</option>'+(s.members||[]).filter(x=>x.status==='active').map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')+'</select></label><label>Échéance<input type="date" name="dueAt"></label><label>Priorité<select name="priority"><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option><option value="low">Basse</option></select></label><label class="full">Description<textarea name="description" required></textarea></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button class="primary">Créer</button></div></form>';
  }
  function pointDetail(s,p){
    const statuses=p.type==='non_conformity'?core.NC_STATUSES:core.DEFAULT_STATUSES;
    return '<div><h2>'+esc(typeLabel(p.type))+'</h2><p>'+esc(p.description||'')+'</p><p><small>'+esc(p.trade||'Lot non précisé')+' · '+esc(p.zone||'Zone non précisée')+' · '+esc(mname(s,p.assigneeId))+'</small></p><h3>Statut</h3><div>'+statuses.map(st=>'<button class="'+(st===p.status?'primary':'secondary')+'" data-v18-action="transition" data-id="'+esc(p.id)+'" data-status="'+st+'" '+(st===p.status?'disabled':'')+'>'+esc(statusLabel(st))+'</button> ').join('')+'</div></div>';
  }

  document.addEventListener('change',e=>{const t=e.target.closest('[data-v18-control="project"]');if(!t)return;ui.v18ProjectId=t.value;ui.v18PlanId=null;ui.v18PreviewUrl=null;ui.render();});
  document.addEventListener('click',async e=>{
    const t=e.target.closest('[data-v18-action]');if(!t)return;
    const s=store.getState(), action=t.dataset.v18Action;
    if(action==='tab'){ui.v18Tab=t.dataset.tab;ui.v18Placement=false;ui.render();return;}
    if(action==='new-point'){openModal(pointForm(s,{projectId:current(s)?.id}));return;}
    if(action==='open-point'){const p=stateExt(s).points.find(x=>x.id===t.dataset.id);if(p)openModal(pointDetail(s,p));return;}
    if(action==='select-plan'){ui.v18PlanId=t.dataset.id;ui.v18PreviewUrl=null;ui.v18Placement=false;ui.render();return;}
    if(action==='toggle-placement'){ui.v18Placement=!ui.v18Placement;ui.render();return;}
    if(action==='activate-plan'){core.setPlanStatus(t.dataset.id,'active');ui.notify('Version active mise à jour.');ui.render();return;}
    if(action==='preview-plan'){const p=stateExt(s).plans.find(x=>x.id===t.dataset.id);if(!p)return;const blob=p.documentId?await getBlob(p.documentId):null;if(blob){if(ui.v18PreviewUrl)URL.revokeObjectURL(ui.v18PreviewUrl);ui.v18PreviewUrl=URL.createObjectURL(blob);ui.render();}else ui.notify('Fichier local introuvable.','error');return;}
    if(action==='add-plan'){const p=current(s);openModal('<form data-v18-form="plan"><h2>Ajouter une révision</h2><div class="v18-form"><input type="hidden" name="projectId" value="'+esc(p.id)+'"><label>Nom du plan<input name="name" required placeholder="Plan toiture"></label><label>Révision<input name="revisionLabel" required value="A"></label><label>État<select name="status"><option value="draft">Brouillon</option><option value="to_validate">À valider</option><option value="validated">Validé</option><option value="active">Actif</option></select></label><label class="full">PDF ou image<input type="file" name="file" accept="application/pdf,image/*" required></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button class="primary">Enregistrer</button></div></form>');return;}
    if(action==='transition'){const p=stateExt(s).points.find(x=>x.id===t.dataset.id);if(!p)return;let note='';if(p.type==='non_conformity'&&t.dataset.status==='corrective_action'){note=prompt('Action corrective :')||'';if(!note)return;}try{core.transitionPoint(p.id,t.dataset.status,note);ui.modal=null;ui.notify('Statut mis à jour.');ui.render();}catch(err){ui.notify(err.message,'error');}return;}
  });
  document.addEventListener('click',e=>{const stage=e.target.closest('[data-v18-plan-stage]');if(!stage||!ui.v18Placement||e.target.closest('[data-v18-action]'))return;const r=stage.getBoundingClientRect();const x=((e.clientX-r.left)/r.width)*100,y=((e.clientY-r.top)/r.height)*100;openModal(pointForm(store.getState(),{projectId:current(store.getState())?.id,planId:stage.dataset.planId,xPct:x,yPct:y}));});
  document.addEventListener('submit',async e=>{
    const form=e.target.closest('form[data-v18-form]');if(!form)return;e.preventDefault();const fd=new FormData(form);
    try{
      if(form.dataset.v18Form==='point'){const x=fd.get('xPct'),y=fd.get('yPct');core.createPoint({projectId:String(fd.get('projectId')),type:String(fd.get('type')),trade:String(fd.get('trade')||''),zone:String(fd.get('zone')||''),assigneeId:String(fd.get('assigneeId')||'')||null,dueAt:String(fd.get('dueAt')||'')||null,priority:String(fd.get('priority')||'normal'),description:String(fd.get('description')||''),planId:String(fd.get('planId')||'')||null,planPosition:x!==''&&y!==''?{xPct:Number(x),yPct:Number(y),page:1}:null});ui.v18Placement=false;ui.modal=null;ui.notify('Point chantier créé.');ui.render();}
      if(form.dataset.v18Form==='plan'){const file=fd.get('file');if(!(file instanceof File)||!file.size)throw new Error('Sélectionnez un fichier.');const id=uid('planfile');await putBlob(id,file);const rec=core.registerPlan({projectId:String(fd.get('projectId')),name:String(fd.get('name')),revisionLabel:String(fd.get('revisionLabel')),status:String(fd.get('status')),fileName:file.name,mimeType:file.type,documentId:id});ui.v18PlanId=rec.id;ui.modal=null;ui.notify('Révision enregistrée.');ui.render();}
    }catch(err){ui.notify(err.message||'Enregistrement impossible.','error');}
  });
  window.SpeedArtiConductorFiles={putBlob,getBlob};
  ui.render();
})();