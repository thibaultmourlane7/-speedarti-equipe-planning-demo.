/* SpeedArti Équipe & Planning — Standard v1.7
   Extension additive : ne crée jamais un second agenda. */
(()=>{
  const ns=window.__SpeedArtiPlanningV17=window.__SpeedArtiPlanningV17||{};
  const demo=window.__SpeedArtiDemo;
  if(!demo?.ui||!demo?.store||ns.standardInstalled) return;
  ns.standardInstalled=true;

  const ui=demo.ui, store=demo.store;
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid17=(p)=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  const can17=(perm)=>{
    try{return typeof can==='function'&&typeof PERMISSIONS==='object'?can(store.getState(),PERMISSIONS[perm]):true;}catch{return true;}
  };
  const ensure=(state)=>{
    state.planningV17??={};
    state.planningV17.milestones??=[];
    state.planningV17.dependencies??=[];
    state.planningV17.needs??=[];
    state.planningV17.templates??=[];
    state.planningV17.changeNotices??=[];
    state.planningV17.viewMode??='chantier';
    return state.planningV17;
  };
  const visibleProjects17=(state)=>{
    try{return typeof visibleProjects==='function'?visibleProjects(state):state.projects||[];}catch{return state.projects||[];}
  };
  const visibleAssignments17=(state)=>{
    const ids=new Set(visibleProjects17(state).map(p=>p.id));
    return (state.assignments||[]).filter(a=>ids.has(a.projectId)).sort((a,b)=>new Date(a.start)-new Date(b.start));
  };
  const memberLabel=(state,id)=>state.members?.find(m=>m.id===id)?.name||'Collaborateur';
  const projectLabel=(state,id)=>state.projects?.find(p=>p.id===id)?.name||'Chantier';
  const fmt=(iso)=>{try{return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short'}).format(new Date(iso));}catch{return '—';}};
  const renderGroupSummary=(state,assignments,mode)=>{
    const groups=new Map();
    const push=(key,label,a)=>{
      if(!groups.has(key)) groups.set(key,{label,items:[]});
      groups.get(key).items.push(a);
    };
    for(const a of assignments){
      const ids=typeof resolveAssignmentMembers==='function'?resolveAssignmentMembers(state,a):(a.memberIds||[]);
      if(mode==='collaborateur'){
        if(ids.length) ids.forEach(id=>push('m:'+id,memberLabel(state,id),a)); else push('none','Sans collaborateur',a);
      }else if(mode==='equipe'){
        const crews=(a.crewIds||[]);
        if(crews.length) crews.forEach(id=>push('c:'+id,state.crews?.find(c=>c.id===id)?.name||'Équipe',a)); else push('none','Sans équipe',a);
      }else if(mode==='metier'){
        const skills=state.projects?.find(p=>p.id===a.projectId)?.requiredSkills||[];
        (skills.length?skills:['Métier non précisé']).forEach(s=>push('s:'+s,s,a));
      }else push('p:'+a.projectId,projectLabel(state,a.projectId),a);
    }
    return [...groups.values()].map(g=>`<div class="v17-group"><strong>${esc(g.label)}</strong><span>${g.items.length} intervention(s)</span></div>`).join('')||'<p class="v17-muted">Aucune intervention.</p>';
  };
  const renderGantt=(state,assignments)=>{
    if(!assignments.length) return '<p class="v17-muted">Aucune intervention à afficher.</p>';
    const starts=assignments.map(a=>+new Date(a.start)).filter(Number.isFinite);
    const ends=assignments.map(a=>+new Date(a.end)).filter(Number.isFinite);
    if(!starts.length||!ends.length) return '<p class="v17-muted">Dates Agenda insuffisantes.</p>';
    const min=Math.min(...starts),max=Math.max(...ends),span=Math.max(86400000,max-min);
    return `<div class="v17-gantt">${assignments.map(a=>{
      const left=Math.max(0,((+new Date(a.start)-min)/span)*100);
      const width=Math.max(4,((+new Date(a.end)-+new Date(a.start))/span)*100);
      return `<div class="v17-gantt-row"><div><strong>${esc(a.title)}</strong><small>${esc(projectLabel(state,a.projectId))}</small></div><div class="v17-gantt-track"><span style="left:${left}%;width:${Math.min(100-left,width)}%"></span></div><small>${fmt(a.start)} → ${fmt(a.end)}</small></div>`;
    }).join('')}</div>`;
  };
  const renderStandardPanel=(state)=>{
    const ext=ensure(state);
    const projects=visibleProjects17(state);
    const assignments=visibleAssignments17(state);
    const manage=can17('MANAGE_PLANNING');
    const unread=(ext.changeNotices||[]).filter(n=>!(n.readBy||[]).includes(state.session.activeMemberId));
    return `
      <section class="panel v17-panel" data-v17-standard>
        <div class="panel-header"><div><span class="eyebrow">Standard · organisation simple</span><h2>Outils planning & organisation</h2><p>Une seule source : l’Agenda Chantier. Besoins, jalons, dépendances et modèles complètent le Gantt V1.9 sans créer un second calendrier.</p></div><span class="badge badge-info">Standard</span></div>
        <div class="v17-toolbar">
          <label>Voir par
            <select data-v17-control="view-mode">
              <option value="chantier" ${ext.viewMode==='chantier'?'selected':''}>Chantier</option>
              <option value="collaborateur" ${ext.viewMode==='collaborateur'?'selected':''}>Collaborateur</option>
              <option value="equipe" ${ext.viewMode==='equipe'?'selected':''}>Équipe</option>
              <option value="metier" ${ext.viewMode==='metier'?'selected':''}>Métier</option>
            </select>
          </label>
          ${manage?'<button class="secondary" data-v17-action="open-need">+ Besoin à pourvoir</button><button class="secondary" data-v17-action="open-milestone">+ Jalon</button><button class="secondary" data-v17-action="open-dependency">+ Dépendance</button>':''}
        </div>
        <div class="v17-groups">${renderGroupSummary(state,assignments,ext.viewMode)}</div>

        <details class="v17-details" data-v17-lite-gantt><summary>Gantt chantier léger</summary>${renderGantt(state,assignments)}</details>

        <details class="v17-details"><summary>Besoins à pourvoir <span>${ext.needs.length}</span></summary>
          <div class="v17-list">${ext.needs.length?ext.needs.map(n=>`<article><div><strong>${esc(projectLabel(state,n.projectId))}</strong><p>${esc(n.headcount)} personne(s) · ${esc((n.requiredSkills||[]).join(', ')||'compétence non précisée')} · ${fmt(n.neededAt)}</p></div>${manage?`<button class="ghost" data-v17-action="remove-need" data-id="${esc(n.id)}">Supprimer</button>`:''}</article>`).join(''):'<p class="v17-muted">Aucun besoin non pourvu déclaré.</p>'}</div>
        </details>

        <details class="v17-details"><summary>Jalons chantier <span>${ext.milestones.length}</span></summary>
          <div class="v17-list">${ext.milestones.length?ext.milestones.map(m=>`<article><div><strong>${esc(m.label)}</strong><p>${esc(projectLabel(state,m.projectId))} · ${fmt(m.date)}</p></div>${manage?`<button class="ghost" data-v17-action="remove-milestone" data-id="${esc(m.id)}">Supprimer</button>`:''}</article>`).join(''):'<p class="v17-muted">Aucun jalon ajouté.</p>'}</div>
        </details>

        <details class="v17-details"><summary>Dépendances entre tâches <span>${ext.dependencies.length}</span></summary>
          <div class="v17-list">${ext.dependencies.length?ext.dependencies.map(d=>`<article><div><strong>${esc(d.predecessorLabel)} → ${esc(d.successorLabel)}</strong><p>${esc(projectLabel(state,d.projectId))} · impact analysé, jamais déplacé automatiquement dans l’Agenda.</p></div>${manage?`<button class="ghost" data-v17-action="remove-dependency" data-id="${esc(d.id)}">Supprimer</button>`:''}</article>`).join(''):'<p class="v17-muted">Aucune dépendance définie.</p>'}</div>
        </details>

        <details class="v17-details"><summary>Modèles et duplication</summary>
          <div class="v17-actions">
            ${manage?'<button class="secondary" data-v17-action="save-template">Enregistrer l’organisation actuelle comme modèle</button><button class="secondary" data-v17-action="copy-organisation">Copier une organisation d’équipe</button>':''}
          </div>
          <div class="v17-list">${ext.templates.length?ext.templates.map(t=>`<article><div><strong>${esc(t.name)}</strong><p>${esc(t.phases.length)} phase(s) · modèle d’organisation, sans dates Agenda imposées.</p></div></article>`).join(''):'<p class="v17-muted">Aucun modèle enregistré.</p>'}</div>
        </details>

        <details class="v17-details" ${unread.length?'open':''}><summary>Modifications importantes à consulter <span>${unread.length}</span></summary>
          <div class="v17-list">${unread.length?unread.map(n=>`<article><div><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p></div><button class="primary" data-v17-action="ack-change" data-id="${esc(n.id)}">J’ai vu</button></article>`).join(''):'<p class="v17-muted">Aucune modification importante non lue.</p>'}</div>
        </details>

        <div class="v17-offline"><strong>Mode hors connexion minimal</strong><span id="v17-offline-state">Préparation du cache local…</span></div>
      </section>`;
  };

  const style=document.createElement('style');
  style.textContent=`
    .v17-panel{margin-top:1rem}.v17-toolbar{display:flex;gap:.6rem;flex-wrap:wrap;align-items:end;margin:.8rem 0}.v17-toolbar label{display:grid;gap:.25rem;font-size:.75rem;font-weight:700}.v17-toolbar select{min-width:160px}.v17-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.5rem;margin:.7rem 0}.v17-group{border:1px solid var(--border);border-radius:12px;padding:.7rem;background:#fff}.v17-group strong,.v17-group span{display:block}.v17-group span,.v17-muted{color:var(--muted);font-size:.76rem}.v17-details{border-top:1px solid var(--border);padding:.75rem 0}.v17-details summary{cursor:pointer;font-weight:800}.v17-details summary span{float:right}.v17-list{display:grid;gap:.5rem;margin-top:.7rem}.v17-list article{display:flex;justify-content:space-between;gap:.7rem;align-items:center;border:1px solid var(--border);border-radius:12px;padding:.7rem;background:#fff}.v17-list p{margin:.2rem 0 0;color:var(--muted);font-size:.76rem}.v17-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.7rem 0}.v17-gantt{display:grid;gap:.45rem;margin-top:.75rem}.v17-gantt-row{display:grid;grid-template-columns:minmax(130px,1fr) minmax(180px,2fr) auto;gap:.65rem;align-items:center}.v17-gantt-row strong,.v17-gantt-row small{display:block}.v17-gantt-track{height:14px;border-radius:999px;background:#edf2f8;position:relative;overflow:hidden}.v17-gantt-track span{position:absolute;top:0;bottom:0;background:var(--blue);border-radius:999px}.v17-offline{display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap;margin-top:.7rem;padding:.65rem;border-radius:10px;background:#f6f8fb;font-size:.75rem}.v17-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.v17-modal-grid .full{grid-column:1/-1}@media(max-width:700px){.v17-gantt-row{grid-template-columns:1fr}.v17-modal-grid{grid-template-columns:1fr}.v17-modal-grid .full{grid-column:auto}.v17-list article{align-items:flex-start;flex-direction:column}.v17-toolbar>*{width:100%}.v17-toolbar select{width:100%}}
  `;
  document.head.appendChild(style);

  const originalRenderPlanning=ui.renderPlanning.bind(ui);
  ui.renderPlanning=function(state){return originalRenderPlanning(state)+renderStandardPanel(state);};

  const openModal=(html)=>{ui.modal=html;ui.render();};
  const projectsOptions=(state)=>visibleProjects17(state).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  const assignmentsOptions=(state)=>visibleAssignments17(state).map(a=>`<option value="${esc(a.id)}">${esc(a.title)} — ${esc(projectLabel(state,a.projectId))}</option>`).join('');

  document.addEventListener('click',(event)=>{
    const t=event.target.closest('[data-v17-action]'); if(!t) return;
    const action=t.dataset.v17Action, state=store.getState(), ext=ensure(state);
    if(action==='open-need') openModal(`<form data-v17-form="need"><h2>Besoin à pourvoir</h2><div class="v17-modal-grid"><label>Chantier<select name="projectId" required>${projectsOptions(state)}</select></label><label>Date du besoin<input type="date" name="neededAt" required></label><label>Nombre de personnes<input type="number" name="headcount" min="1" max="20" value="1" required></label><label>Compétences<input name="skills" placeholder="Couverture, zinguerie…"></label><label class="full">Note<input name="note" placeholder="Ex. équipe nécessaire pour phase couverture"></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button class="primary">Enregistrer</button></div></form>`);
    if(action==='open-milestone') openModal(`<form data-v17-form="milestone"><h2>Ajouter un jalon</h2><div class="v17-modal-grid"><label>Chantier<select name="projectId" required>${projectsOptions(state)}</select></label><label>Date<input type="date" name="date" required></label><label class="full">Jalon<input name="label" required placeholder="Démarrage, hors d’eau, réception…"></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button class="primary">Enregistrer</button></div></form>`);
    if(action==='open-dependency') openModal(`<form data-v17-form="dependency"><h2>Dépendance entre tâches</h2><div class="v17-modal-grid"><label class="full">Chantier<select name="projectId" required>${projectsOptions(state)}</select></label><label>Tâche précédente<input name="predecessorLabel" required placeholder="Charpente"></label><label>Tâche suivante<input name="successorLabel" required placeholder="Couverture"></label></div><p class="form-hint">La dépendance sert à analyser les impacts. Les dates de l’Agenda ne sont jamais déplacées automatiquement.</p><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button class="primary">Enregistrer</button></div></form>`);
    if(action==='copy-organisation') openModal(`<form data-v17-form="copy"><h2>Copier une organisation d’équipe</h2><div class="v17-modal-grid"><label>Depuis<select name="sourceId" required>${assignmentsOptions(state)}</select></label><label>Vers<select name="targetId" required>${assignmentsOptions(state)}</select></label></div><p class="form-hint">Seules les affectations sont copiées. Les dates restent celles de l’Agenda Chantier.</p><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button class="primary">Copier</button></div></form>`);
    if(action==='remove-need'||action==='remove-milestone'||action==='remove-dependency'){
      const key=action.replace('remove-','')+(action.endsWith('y')?'ies':'s');
      const map={needs:'needs',milestones:'milestones',dependencies:'dependencies'};
      const actual=map[key]||({ 'remove-need':'needs','remove-milestone':'milestones','remove-dependency':'dependencies'}[action]);
      store.update(s=>{ensure(s)[actual]=ensure(s)[actual].filter(x=>x.id!==t.dataset.id);},{action:'planning.v17.removed',entityType:'planning',entityId:t.dataset.id});
    }
    if(action==='save-template'){
      const assignments=visibleAssignments17(state);
      const phases=assignments.map(a=>({title:a.title,projectId:a.projectId,durationHours:Math.max(0,(new Date(a.end)-new Date(a.start))/3600000),requiredSkills:state.projects?.find(p=>p.id===a.projectId)?.requiredSkills||[]}));
      store.update(s=>ensure(s).templates.unshift({id:uid17('tpl'),name:'Modèle '+new Date().toLocaleDateString('fr-FR'),phases,createdAt:new Date().toISOString()}),{action:'planning.template.created',entityType:'planning_template',entityId:'new'});
      ui.notify('Modèle d’organisation enregistré.');
    }
    if(action==='ack-change'){
      store.update(s=>{const n=ensure(s).changeNotices.find(x=>x.id===t.dataset.id);if(n&&!n.readBy.includes(s.session.activeMemberId))n.readBy.push(s.session.activeMemberId);},{action:'planning.change.acknowledged',entityType:'planning_notice',entityId:t.dataset.id});
    }
  });

  document.addEventListener('change',(event)=>{
    const t=event.target.closest('[data-v17-control="view-mode"]'); if(!t) return;
    store.update(s=>{ensure(s).viewMode=t.value;},{action:'planning.view.changed',entityType:'planning',entityId:'view',details:t.value});
  });

  document.addEventListener('submit',(event)=>{
    const form=event.target.closest('form[data-v17-form]'); if(!form) return;
    event.preventDefault();
    const fd=new FormData(form), kind=form.dataset.v17Form;
    if(kind==='need'){
      store.update(s=>{const x=ensure(s);x.needs.unshift({id:uid17('need'),projectId:String(fd.get('projectId')),neededAt:String(fd.get('neededAt')),headcount:Number(fd.get('headcount'))||1,requiredSkills:String(fd.get('skills')||'').split(',').map(v=>v.trim()).filter(Boolean),note:String(fd.get('note')||''),status:'open',createdAt:new Date().toISOString()});x.changeNotices.unshift({id:uid17('notice'),title:'Nouveau besoin à pourvoir',body:'Un besoin d’équipe a été ajouté au planning.',readBy:[s.session.activeMemberId],createdAt:new Date().toISOString()});},{action:'planning.need.created',entityType:'planning_need',entityId:'new'});
    }
    if(kind==='milestone') store.update(s=>ensure(s).milestones.unshift({id:uid17('milestone'),projectId:String(fd.get('projectId')),date:String(fd.get('date')),label:String(fd.get('label')).trim()}),{action:'planning.milestone.created',entityType:'planning_milestone',entityId:'new'});
    if(kind==='dependency') store.update(s=>ensure(s).dependencies.unshift({id:uid17('dep'),projectId:String(fd.get('projectId')),predecessorLabel:String(fd.get('predecessorLabel')).trim(),successorLabel:String(fd.get('successorLabel')).trim()}),{action:'planning.dependency.created',entityType:'planning_dependency',entityId:'new'});
    if(kind==='copy'){
      const sourceId=String(fd.get('sourceId')),targetId=String(fd.get('targetId'));
      if(sourceId===targetId){ui.notify('Choisissez deux interventions différentes.','error');return;}
      store.update(s=>{
        const source=s.assignments.find(a=>a.id===sourceId),target=s.assignments.find(a=>a.id===targetId);
        if(!source||!target) return;
        target.memberIds=[...(source.memberIds||[])];target.crewIds=[...(source.crewIds||[])];
        ensure(s).changeNotices.unshift({id:uid17('notice'),title:'Organisation modifiée',body:`L’équipe de « ${source.title} » a été copiée sur « ${target.title} ». Les dates Agenda n’ont pas changé.`,readBy:[s.session.activeMemberId],createdAt:new Date().toISOString()});
      },{action:'planning.organisation.copied',entityType:'assignment',entityId:targetId,details:'Affectations uniquement'});
    }
    ui.modal=null;ui.notify('Enregistré.');ui.render();
  });

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw-planning-v17.js').then(()=>{const el=document.querySelector('#v17-offline-state');if(el)el.textContent='Planning consultable après une première ouverture en ligne.';}).catch(()=>{const el=document.querySelector('#v17-offline-state');if(el)el.textContent='Cache hors connexion indisponible sur ce navigateur.';});
  }
  ns.standardLoaded=true;
  ui.render();
})();

/* Chargeur SpeedArti Suivi chantier / Conducteur v1.8 */
(()=>{
  if(window.__SpeedArtiConductorV18Loader) return;
  window.__SpeedArtiConductorV18Loader=true;
  const files=['planning-v18-core.js','planning-v19-gantt.js','planning-v18-conductor.js','planning-v18-field.js','planning-v18-client-transmission-core.js','planning-v18-client-transmission-ui.js','planning-v18-ai.js','planning-v18-contracts.js','planning-v19-ux-simple.js'];
  const load=(index)=>{
    if(index>=files.length) return;
    const script=document.createElement('script');
    script.src='./'+files[index]+'?v=1.9.4';
    script.async=false;
    script.onload=()=>load(index+1);
    script.onerror=()=>console.error('SpeedArti v1.9 : chargement impossible',files[index]);
    document.body.appendChild(script);
  };
  load(0);
})();
