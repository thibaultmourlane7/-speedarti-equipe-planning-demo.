/* SpeedArti Équipe & Planning — Ultra v1.7 */
(()=>{
  const ns=window.__SpeedArtiPlanningV17=window.__SpeedArtiPlanningV17||{};
  const demo=window.__SpeedArtiDemo;
  if(!demo?.ui||!demo?.store||ns.ultraInstalled) return;
  ns.ultraInstalled=true;
  const ui=demo.ui,store=demo.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid17=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  const ultraOn=state=>{try{return typeof hasUltraAccess==='function'?hasUltraAccess(state):state.settings?.edition==='ultra';}catch{return false;}};
  const ensure=state=>{
    state.planningV17??={};
    state.planningV17.needs??=[];
    state.planningV17.weather??=[];
    state.planningV17.routes??=[];
    state.planningV17.resources??=[];
    state.planningV17.resourceReservations??=[];
    state.planningV17.expertProposals??=[];
    state.planningV17.ultraProposals??=[];
    return state.planningV17;
  };
  const pname=(state,id)=>state.projects?.find(p=>p.id===id)?.name||'Chantier';
  const mname=(state,id)=>state.members?.find(m=>m.id===id)?.name||'Collaborateur';
  const assignmentMembers=(state,a)=>{try{return resolveAssignmentMembers(state,a);}catch{return a.memberIds||[];}};
  const overlaps17=(a1,a2,b1,b2)=>new Date(a1)<new Date(b2)&&new Date(a2)>new Date(b1);
  const capacityMap=state=>{
    try{return new Map(buildCapacityOverview(state).map(x=>[x.memberId,x]));}
    catch{return new Map();}
  };
  const routeFor=(ext,memberId,projectId)=>ext.routes.find(r=>r.memberId===memberId&&r.projectId===projectId)||null;
  const weatherRisk=(ext,projectId)=>ext.weather.find(w=>w.projectId===projectId&&(w.planningRisk===true||w.riskLevel==='high'||w.riskLevel==='critical'))||null;
  const scoreCandidate=(state,ext,need,member,cap)=>{
    if(member.status!=='active') return null;
    const wanted=need.requiredSkills||[],skills=member.skills||[];
    const missing=wanted.filter(s=>!skills.some(x=>x.toLocaleLowerCase('fr-FR')===s.toLocaleLowerCase('fr-FR')));
    if(missing.length) return null;
    let score=50+wanted.length*10;
    const start=new Date(String(need.neededAt)+'T06:00:00'),end=new Date(String(need.neededAt)+'T20:00:00');
    const busy=(state.assignments||[]).some(a=>assignmentMembers(state,a).includes(member.id)&&overlaps17(a.start,a.end,start,end));
    if(busy) score-=70; else score+=20;
    const unavailable=(member.availability?.unavailablePeriods||[]).some(p=>overlaps17(p.start,p.end,start,end));
    if(unavailable) return null;
    const load=cap.get(member.id)?.loadPct;
    if(Number.isFinite(load)){if(load>110)score-=35;else if(load<70)score+=12;}
    const route=routeFor(ext,member.id,need.projectId);
    if(route&&Number.isFinite(Number(route.travelMinutes))){
      const minutes=Number(route.travelMinutes);
      score+=Math.max(-25,20-Math.round(minutes/5));
    }
    return {memberId:member.id,score,loadPct:load??null,route};
  };
  const resourceConflicts=state=>{
    const ext=ensure(state),out=[];
    for(const resource of ext.resources){
      const list=ext.resourceReservations.filter(r=>r.resourceId===resource.id);
      for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
        const a=state.assignments.find(x=>x.id===list[i].assignmentId),b=state.assignments.find(x=>x.id===list[j].assignmentId);
        if(a&&b&&overlaps17(a.start,a.end,b.start,b.end))out.push({resource,a,b});
      }
    }
    return out;
  };
  const buildProposals=state=>{
    const ext=ensure(state),cap=capacityMap(state),proposals=[];
    for(const need of ext.needs.filter(n=>n.status!=='resolved')){
      const candidates=(state.members||[]).map(m=>scoreCandidate(state,ext,need,m,cap)).filter(Boolean).sort((a,b)=>b.score-a.score);
      const selected=candidates.slice(0,Math.max(1,Number(need.headcount)||1));
      proposals.push({
        id:uid17('ultra'),type:'team_optimization',projectId:need.projectId,status:'pending_validation',
        title:`Équipe proposée — ${pname(state,need.projectId)}`,
        memberIds:selected.map(x=>x.memberId),
        reasons:[
          `Besoin déclaré : ${need.headcount||1} personne(s)`,
          `Compétences : ${(need.requiredSkills||[]).join(', ')||'non précisées'}`,
          selected.length?`Profils compatibles : ${selected.map(x=>mname(state,x.memberId)).join(', ')}`:'Aucun profil interne compatible et disponible',
          ...selected.filter(x=>x.route).map(x=>`${mname(state,x.memberId)} : ${x.route.travelMinutes} min de trajet reçu du connecteur`)
        ],
        createdAt:new Date().toISOString()
      });
    }
    for(const conflict of resourceConflicts(state)){
      const alternatives=ext.resources.filter(r=>r.id!==conflict.resource.id&&r.type===conflict.resource.type);
      proposals.push({
        id:uid17('ultra'),type:'resource_reorganization',projectId:conflict.a.projectId,status:'pending_validation',
        title:`Conflit de ressource — ${conflict.resource.label}`,
        reasons:[`${conflict.a.title} et ${conflict.b.title} se chevauchent`,alternatives.length?`Alternative(s) disponible(s) à étudier : ${alternatives.map(r=>r.label).join(', ')}`:'Aucune ressource alternative connue'],
        createdAt:new Date().toISOString()
      });
    }
    for(const w of ext.weather.filter(x=>x.planningRisk===true||x.riskLevel==='high'||x.riskLevel==='critical')){
      proposals.push({
        id:uid17('ultra'),type:'weather_review',projectId:w.projectId,status:'pending_validation',
        title:`Météo à prendre en compte — ${pname(state,w.projectId)}`,
        reasons:[w.summary||'Risque météo signalé par le connecteur',w.sourceTimestamp?`Donnée reçue : ${w.sourceTimestamp}`:'Horodatage non fourni'],
        createdAt:new Date().toISOString()
      });
    }
    for(const p of ext.expertProposals.filter(x=>x.status==='pending_validation')){
      proposals.push({
        id:uid17('ultra'),type:'dependency_reorganization',projectId:state.assignments.find(a=>a.id===p.assignmentId)?.projectId||null,status:'pending_validation',
        title:'Réorganisation suite à dépendance',
        reasons:p.reasons||['Décalage proposé par Expert'],sourceProposalId:p.id,createdAt:new Date().toISOString()
      });
    }
    return proposals;
  };
  const renderUltra=state=>{
    if(!ultraOn(state)) return '';
    const ext=ensure(state),pending=ext.ultraProposals.filter(p=>p.status==='pending_validation');
    return `<section class="panel v17-ultra-panel">
      <div class="panel-header"><div><span class="eyebrow">Ultra · optimiser et anticiper</span><h2>Optimisation globale du planning</h2><p>Compétences, disponibilité, charge, distances reçues, ressources et météo sont croisées sans inventer les données manquantes.</p></div><button class="secondary" data-v17-ultra-action="analyze">Analyser maintenant</button></div>
      <div class="forecast-rule-note"><strong>Règle :</strong> chaque résultat indique ses raisons. Une proposition validée reste préparée pour les modules sources ; aucune date Agenda n’est déplacée en silence.</div>
      <div class="v17-list">${pending.length?pending.map(p=>`<article><div><strong>${esc(p.title)}</strong><p>${(p.reasons||[]).map(esc).join(' · ')}</p>${p.memberIds?.length?`<small>Équipe proposée : ${p.memberIds.map(id=>esc(mname(state,id))).join(', ')}</small>`:''}</div><div class="v17-actions"><button class="primary" data-v17-ultra-action="approve" data-id="${esc(p.id)}">Valider la proposition</button><button class="ghost" data-v17-ultra-action="reject" data-id="${esc(p.id)}">Refuser</button></div></article>`).join(''):'<p class="v17-muted">Aucune proposition Ultra en attente. Lancez l’analyse lorsque le planning ou les contraintes changent.</p>'}</div>
    </section>`;
  };

  const originalPilotage=ui.renderPilotage.bind(ui);
  ui.renderPilotage=function(state){return originalPilotage(state)+renderUltra(state);};

  document.addEventListener('click',event=>{
    const t=event.target.closest('[data-v17-ultra-action]');if(!t) return;
    const state=store.getState();if(!ultraOn(state)){ui.notify('Fonction Ultra non active.','error');return;}
    const action=t.dataset.v17UltraAction;
    if(action==='analyze'){
      const proposals=buildProposals(state);
      store.update(s=>{const ext=ensure(s);ext.ultraProposals=[...proposals,...ext.ultraProposals.filter(p=>p.status!=='pending_validation')];},{action:'planning.ultra.analysis',entityType:'planning',entityId:'ultra',details:`${proposals.length} proposition(s)`});
      ui.notify(proposals.length?`${proposals.length} proposition(s) préparée(s).`:'Aucune réorganisation nécessaire avec les données disponibles.','info');
    }
    if(action==='approve'||action==='reject'){
      const status=action==='approve'?'approved':'rejected';
      store.update(s=>{
        const p=ensure(s).ultraProposals.find(x=>x.id===t.dataset.id);
        if(p){p.status=status;p.reviewedAt=new Date().toISOString();p.reviewedBy=s.session.activeMemberId;if(status==='approved')p.nextStep='prepared_for_speedarti_source_validation';}
      },{action:`planning.ultra.${status}`,entityType:'planning_proposal',entityId:t.dataset.id});
      ui.notify(status==='approved'?'Proposition validée et préparée pour le module source.':'Proposition refusée.');
    }
  });

  ns.ultraLoaded=true;
  ui.render();
})();