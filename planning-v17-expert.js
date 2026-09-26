/* SpeedArti Équipe & Planning — Expert v1.7 */
(()=>{
  const ns=window.__SpeedArtiPlanningV17=window.__SpeedArtiPlanningV17||{};
  const demo=window.__SpeedArtiDemo;
  if(!demo?.ui||!demo?.store||ns.expertInstalled) return;
  ns.expertInstalled=true;
  const ui=demo.ui,store=demo.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid17=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  const expertOn=state=>{try{return typeof hasExpertAccess==='function'?hasExpertAccess(state):['expert','ultra'].includes(state.settings?.edition);}catch{return false;}};
  const manage=()=>{try{return typeof can==='function'&&can(store.getState(),PERMISSIONS.MANAGE_PLANNING);}catch{return true;}};
  const ensure=state=>{
    state.planningV17??={};
    state.planningV17.needs??=[];
    state.planningV17.dependencies??=[];
    state.planningV17.resources??=[];
    state.planningV17.resourceReservations??=[];
    state.planningV17.weather??=[];
    state.planningV17.routes??=[];
    state.planningV17.expertProposals??=[];
    return state.planningV17;
  };
  const overlaps17=(a1,a2,b1,b2)=>new Date(a1)<new Date(b2)&&new Date(a2)>new Date(b1);
  const pname=(state,id)=>state.projects?.find(p=>p.id===id)?.name||'Chantier';
  const mname=(state,id)=>state.members?.find(m=>m.id===id)?.name||'Collaborateur';
  const fmt=iso=>{try{return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));}catch{return '—';}};
  const assignmentMembers=(state,a)=>{try{return resolveAssignmentMembers(state,a);}catch{return a.memberIds||[];}};

  const candidateScore=(state,need,member)=>{
    if(member.status!=='active') return null;
    const wanted=need.requiredSkills||[];
    const skills=member.skills||[];
    const missing=wanted.filter(s=>!skills.some(x=>x.toLocaleLowerCase('fr-FR')===s.toLocaleLowerCase('fr-FR')));
    let score=missing.length?-60:25+(wanted.length*12);
    const day=need.neededAt;
    const start=new Date(day+'T06:00:00'),end=new Date(day+'T20:00:00');
    const busy=(state.assignments||[]).some(a=>assignmentMembers(state,a).includes(member.id)&&overlaps17(a.start,a.end,start,end));
    if(busy) score-=80; else score+=20;
    let unavailable=false;
    for(const p of member.availability?.unavailablePeriods||[]) if(overlaps17(p.start,p.end,start,end)) unavailable=true;
    if(unavailable) score-=100;
    return {memberId:member.id,score,missing,busy,unavailable};
  };
  const suggestionsForNeed=(state,need)=>(state.members||[]).map(m=>candidateScore(state,need,m)).filter(x=>x&&x.score>-40).sort((a,b)=>b.score-a.score).slice(0,Math.max(need.headcount||1,3));

  const dependencyImpacts=state=>{
    const ext=ensure(state),out=[];
    for(const dep of ext.dependencies){
      const same=(state.assignments||[]).filter(a=>a.projectId===dep.projectId);
      const prev=same.find(a=>a.title.toLocaleLowerCase('fr-FR').includes(String(dep.predecessorLabel).toLocaleLowerCase('fr-FR')));
      const next=same.find(a=>a.title.toLocaleLowerCase('fr-FR').includes(String(dep.successorLabel).toLocaleLowerCase('fr-FR')));
      if(!prev||!next) continue;
      const delta=new Date(prev.end)-new Date(next.start);
      if(delta>0){
        const proposedStart=new Date(new Date(next.start).getTime()+delta);
        const proposedEnd=new Date(new Date(next.end).getTime()+delta);
        out.push({dep,prev,next,deltaHours:Math.ceil(delta/3600000),proposedStart:proposedStart.toISOString(),proposedEnd:proposedEnd.toISOString()});
      }
    }
    return out;
  };
  const resourceConflicts=state=>{
    const ext=ensure(state),out=[];
    for(const r of ext.resources){
      const res=ext.resourceReservations.filter(x=>x.resourceId===r.id);
      for(let i=0;i<res.length;i++) for(let j=i+1;j<res.length;j++){
        const a=state.assignments.find(x=>x.id===res[i].assignmentId),b=state.assignments.find(x=>x.id===res[j].assignmentId);
        if(a&&b&&overlaps17(a.start,a.end,b.start,b.end)) out.push({resource:r,a,b});
      }
    }
    return out;
  };
  const renderExpert=state=>{
    if(!expertOn(state)) return '';
    const ext=ensure(state), impacts=dependencyImpacts(state), conflicts=resourceConflicts(state);
    const openNeeds=ext.needs.filter(n=>n.status!=='resolved');
    const weather=ext.weather.filter(w=>state.projects?.some(p=>p.id===w.projectId));
    const routes=ext.routes;
    return `<section class="panel v17-expert-panel">
      <div class="panel-header"><div><span class="eyebrow">Expert · assistance automatique</span><h2>Analyse planning & ressources</h2><p>SpeedArti analyse les données disponibles et prépare des propositions compréhensibles. Aucune date Agenda n’est modifiée automatiquement.</p></div><span class="badge badge-info">Expert</span></div>

      <details class="v17-details" open><summary>Besoins à pourvoir : collaborateurs proposés <span>${openNeeds.length}</span></summary>
        <div class="v17-list">${openNeeds.length?openNeeds.map(n=>{
          const sug=suggestionsForNeed(state,n);
          return `<article><div><strong>${esc(pname(state,n.projectId))} · ${esc(n.headcount)} personne(s)</strong><p>${esc((n.requiredSkills||[]).join(', ')||'Compétence non précisée')} · ${esc(n.neededAt)}</p><small>${sug.length?'Propositions : '+sug.map(x=>mname(state,x.memberId)).join(', '):'Aucun profil interne compatible et disponible identifié.'}</small></div></article>`;
        }).join(''):'<p class="v17-muted">Aucun besoin déclaré.</p>'}</div>
      </details>

      <details class="v17-details"><summary>Propagation d’un retard <span>${impacts.length}</span></summary>
        <div class="v17-list">${impacts.length?impacts.map(x=>`<article><div><strong>${esc(x.dep.predecessorLabel)} → ${esc(x.dep.successorLabel)}</strong><p>Chevauchement détecté : ${x.deltaHours} h. Proposition Agenda : ${fmt(x.proposedStart)} → ${fmt(x.proposedEnd)}.</p><small>Proposition uniquement : validation humaine puis envoi futur à Agenda Chantier.</small></div>${manage()?`<button class="secondary" data-v17-expert-action="queue-delay" data-dep-id="${esc(x.dep.id)}">Préparer la proposition</button>`:''}</article>`).join(''):'<p class="v17-muted">Aucun impact de dépendance détecté avec les données actuelles.</p>'}</div>
      </details>

      <details class="v17-details"><summary>Véhicules, engins et gros matériel <span>${ext.resources.length}</span></summary>
        ${manage()?'<div class="v17-actions"><button class="secondary" data-v17-expert-action="add-resource">+ Ressource</button><button class="secondary" data-v17-expert-action="reserve-resource">Réserver sur une intervention</button></div>':''}
        <div class="v17-list">${ext.resources.length?ext.resources.map(r=>`<article><div><strong>${esc(r.label)}</strong><p>${esc(r.type)} · ${esc(r.reference||'sans référence')}</p></div></article>`).join(''):'<p class="v17-muted">Aucune ressource planifiable déclarée.</p>'}</div>
        ${conflicts.length?`<div class="callout danger-callout"><strong>${conflicts.length} conflit(s) de ressource</strong><p>${conflicts.map(c=>esc(c.resource.label)+' : '+esc(c.a.title)+' / '+esc(c.b.title)).join(' · ')}</p></div>`:''}
      </details>

      <details class="v17-details"><summary>Météo chantier</summary>
        ${weather.length?`<div class="v17-list">${weather.map(w=>`<article><div><strong>${esc(pname(state,w.projectId))}</strong><p>${esc(w.summary||'Météo reçue')} ${w.precipitationRiskPct!=null?'· pluie '+esc(w.precipitationRiskPct)+' %':''} ${w.windKmh!=null?'· vent '+esc(w.windKmh)+' km/h':''}</p><small>Donnée externe horodatée : ${esc(w.sourceTimestamp||'non précisée')}</small></div></article>`).join('')}</div>`:'<p class="v17-muted">Aucune donnée météo reçue. Le module n’invente aucune météo.</p>'}
      </details>

      <details class="v17-details"><summary>Carte & temps de déplacement</summary>
        ${routes.length?`<div class="v17-list">${routes.map(r=>`<article><div><strong>${esc(r.fromLabel)} → ${esc(r.toLabel)}</strong><p>${esc(r.travelMinutes)} min · ${r.distanceKm!=null?esc(r.distanceKm)+' km':'distance non fournie'}</p><small>Calcul issu du futur connecteur cartographie.</small></div></article>`).join('')}</div>`:'<p class="v17-muted">Aucun itinéraire calculé. La carte apparaîtra uniquement avec des coordonnées ou durées reçues du connecteur.</p>'}
      </details>
    </section>`;
  };

  const original=ui.renderPlanning.bind(ui);
  ui.renderPlanning=function(state){return original(state)+renderExpert(state);};

  const modal=html=>{ui.modal=html;ui.render();};
  const assignmentOptions=state=>(state.assignments||[]).map(a=>`<option value="${esc(a.id)}">${esc(a.title)} — ${esc(pname(state,a.projectId))}</option>`).join('');
  const resourceOptions=state=>ensure(state).resources.map(r=>`<option value="${esc(r.id)}">${esc(r.label)}</option>`).join('');

  document.addEventListener('click',event=>{
    const t=event.target.closest('[data-v17-expert-action]');if(!t) return;
    const state=store.getState(),ext=ensure(state),action=t.dataset.v17ExpertAction;
    if(!expertOn(state)){ui.notify('Fonction Expert non active.','error');return;}
    if(action==='add-resource') modal(`<form data-v17-expert-form="resource"><h2>Ajouter une ressource planifiable</h2><div class="v17-modal-grid"><label>Type<select name="type"><option>Véhicule</option><option>Engin</option><option>Gros matériel</option></select></label><label>Nom<input name="label" required placeholder="Camion benne 1"></label><label class="full">Référence<input name="reference" placeholder="Immatriculation ou référence interne"></label></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button class="primary">Ajouter</button></div></form>`);
    if(action==='reserve-resource'){
      if(!ext.resources.length){ui.notify('Ajoutez d’abord une ressource.','error');return;}
      modal(`<form data-v17-expert-form="reservation"><h2>Réserver une ressource</h2><div class="v17-modal-grid"><label>Ressource<select name="resourceId" required>${resourceOptions(state)}</select></label><label>Intervention<select name="assignmentId" required>${assignmentOptions(state)}</select></label></div><p class="form-hint">La réservation suit les dates de l’Agenda Chantier.</p><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button class="primary">Réserver</button></div></form>`);
    }
    if(action==='queue-delay'){
      const impact=dependencyImpacts(state).find(x=>x.dep.id===t.dataset.depId);
      if(!impact) return;
      store.update(s=>ensure(s).expertProposals.unshift({id:uid17('proposal'),type:'agenda_delay',status:'pending_validation',dependencyId:impact.dep.id,assignmentId:impact.next.id,proposedStart:impact.proposedStart,proposedEnd:impact.proposedEnd,reasons:[`Dépendance ${impact.dep.predecessorLabel} → ${impact.dep.successorLabel}`,`Chevauchement : ${impact.deltaHours} h`],createdAt:new Date().toISOString()}),{action:'planning.expert.delay_proposed',entityType:'planning_proposal',entityId:impact.dep.id});
      ui.notify('Proposition préparée pour validation. Aucune date Agenda n’a changé.');
    }
  });

  document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-v17-expert-form]');if(!form) return;
    event.preventDefault();const fd=new FormData(form),kind=form.dataset.v17ExpertForm;
    if(kind==='resource') store.update(s=>ensure(s).resources.push({id:uid17('resource'),type:String(fd.get('type')),label:String(fd.get('label')).trim(),reference:String(fd.get('reference')||'').trim(),status:'active'}),{action:'planning.resource.created',entityType:'planning_resource',entityId:'new'});
    if(kind==='reservation'){
      const rid=String(fd.get('resourceId')),aid=String(fd.get('assignmentId'));
      store.update(s=>{
        const ext=ensure(s);
        ext.resourceReservations=ext.resourceReservations.filter(x=>!(x.resourceId===rid&&x.assignmentId===aid));
        ext.resourceReservations.push({id:uid17('reservation'),resourceId:rid,assignmentId:aid,createdAt:new Date().toISOString()});
      },{action:'planning.resource.reserved',entityType:'assignment',entityId:aid});
    }
    ui.modal=null;ui.notify('Enregistré.');ui.render();
  });

  ns.expertLoaded=true;
  ui.render();
})();