/* SpeedArti — contexte Ángel / recherche chantier v1.8 */
(()=>{
  const demo=window.__SpeedArtiDemo,core=window.SpeedArtiConductor;
  if(!demo?.ui||!demo?.store||!core||window.__SpeedArtiAI18) return;
  window.__SpeedArtiAI18=true;
  const ui=demo.ui,store=demo.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stateExt=s=>s.conductorV18||{};
  const allowedProjects=s=>new Set(core.visibleProjectIds());
  const projectName=(s,id)=>s.projects?.find(p=>p.id===id)?.name||'Chantier';
  const isExpert=s=>['expert','ultra'].includes(s.settings?.edition);
  const text=v=>String(v??'').toLocaleLowerCase('fr-FR');

  function searchProject(question,projectId=null){
    const s=store.getState(),allowed=allowedProjects(s),q=text(question).trim();
    if(q.length<2) return [];
    const out=[];
    const add=(kind,id,pid,title,detail,at=null)=>{
      if(pid&&!allowed.has(pid))return;
      if(projectId&&pid!==projectId)return;
      const hay=text([title,detail].join(' '));
      const tokens=q.split(/\s+/).filter(Boolean);
      const score=tokens.reduce((n,t)=>n+(hay.includes(t)?1:0),0);
      if(score)out.push({kind,id,projectId:pid,title,detail,at,score});
    };
    const c=stateExt(s);
    for(const p of c.points||[])add('point',p.id,p.projectId,(core.POINT_TYPES[p.type]||p.type)+' · '+(p.zone||p.trade||''),p.description+' '+p.status,p.updatedAt);
    for(const p of c.plans||[])add('plan',p.id,p.projectId,p.name+' Rév. '+p.revisionLabel,p.status+(p.active?' version active':''),p.createdAt);
    for(const r of s.reports||[])add('report',r.id,r.projectId,'Rapport terrain',r.summary+' '+(r.problems||'')+' '+(r.materials||''),r.date);
    for(const m of s.messages||[])add('message',m.id,m.projectId,'Message chantier',m.body,m.createdAt);
    for(const r of s.requests||[])add('request',r.id,r.projectId,r.title||'Demande',r.description||'',r.createdAt);
    for(const m of c.meetings||[])add('meeting',m.id,m.projectId,m.title,(m.notes||'')+' '+(m.dictation||'')+' '+(m.decisions||[]).map(x=>x.text).join(' '),m.startedAt);
    for(const j of c.journals||[])add('journal',j.id,j.projectId,'Journal '+j.date,JSON.stringify(j.summary||{}),j.generatedAt);
    return out.sort((a,b)=>b.score-a.score||new Date(b.at||0)-new Date(a.at||0)).slice(0,20);
  }

  function dailySummary(projectId=null){
    const s=store.getState(),allowed=allowedProjects(s),ids=projectId?[projectId]:[...allowed],c=stateExt(s),now=new Date();
    const projectSet=new Set(ids);
    const points=(c.points||[]).filter(p=>projectSet.has(p.projectId)&&!['resolved','validated'].includes(p.status));
    const urgent=points.filter(p=>['urgent','high'].includes(p.priority));
    const reserves=points.filter(p=>['reservation','opr'].includes(p.type));
    const nonconformities=points.filter(p=>p.type==='non_conformity');
    const validations=(c.validations||[]).filter(v=>(!v.projectId||projectSet.has(v.projectId))&&v.status==='pending');
    const requests=(s.requests||[]).filter(r=>projectSet.has(r.projectId)&&r.status!=='resolved');
    const material=requests.filter(r=>r.type==='material');
    const todayAssignments=(s.assignments||[]).filter(a=>projectSet.has(a.projectId)&&new Date(a.start).toDateString()===now.toDateString());
    const weather=(s.planningV17?.weather||[]).filter(w=>projectSet.has(w.projectId)&&(w.planningRisk===true||['high','critical'].includes(w.riskLevel)));
    return {
      generatedAt:new Date().toISOString(),
      projects:ids.map(id=>({id,name:projectName(s,id)})),
      urgentPoints:urgent.map(p=>({projectId:p.projectId,type:p.type,description:p.description,priority:p.priority})),
      openReserves:reserves.length,
      openNonConformities:nonconformities.length,
      missingMaterial:material.map(r=>({projectId:r.projectId,title:r.title,description:r.description})),
      pendingValidations:validations.length,
      todayPlanning:todayAssignments.map(a=>({projectId:a.projectId,title:a.title,start:a.start,end:a.end})),
      weatherRisks:weather.map(w=>({projectId:w.projectId,summary:w.summary,riskLevel:w.riskLevel})),
      attentionCount:urgent.length+nonconformities.length+material.length+validations.length+weather.length
    };
  }

  function angelContext(question=''){
    const s=store.getState();
    const summary=dailySummary();
    return {
      module:'suivi_chantier_conducteur',
      version:'1.8.0',
      query:String(question||'').trim(),
      search:question?searchProject(question):[],
      summary,
      projects:[...allowedProjects(s)].map(id=>({id,name:projectName(s,id)})),
      clientTransmission:clientTransmissionContext(),
      knowledgePacks:['client_transmission@'+CLIENT_TRANSMISSION_KNOWLEDGE.version],
      policy:{
        entryPointOwnedBy:'speedarti_global_angel',
        localAngelButton:false,
        humanValidationRequired:true,
        authorizedProjectsOnly:true,
        noAutomaticPlanningChange:true,
        noAutomaticDocumentPublication:true
      }
    };
  }

  function suggestPhotoClassification(input){
    const s=store.getState(),c=stateExt(s),projectId=input.projectId||null;
    if(projectId&&!allowedProjects(s).has(projectId)) throw new Error('Chantier non autorisé.');
    const point=input.pointId?(c.points||[]).find(p=>p.id===input.pointId):null;
    const name=text(input.fileName);
    let lot=point?.trade||'',zone=point?.zone||'',type=point?.type||'photo',confidence=point?0.92:0.45;
    if(!lot){
      const skills=['couverture','charpente','zinguerie','isolation','maçonnerie','menuiserie'];
      lot=skills.find(x=>name.includes(x))||'';
      if(lot)confidence=Math.max(confidence,0.72);
    }
    const suggestion={projectId,lot,zone,type,date:new Date().toISOString().slice(0,10),confidence,requiresHumanValidation:confidence<0.85};
    return suggestion;
  }

  function proposePhotoClassification(input){
    const suggestion=suggestPhotoClassification(input);
    let record;
    demo.store.update(s=>{
      s.conductorV18??={};s.conductorV18.photoClassifications??=[];
      record={id:'photo_class_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),fileId:input.fileId||null,fileName:String(input.fileName||''),pointId:input.pointId||null,...suggestion,status:suggestion.requiresHumanValidation?'pending_validation':'accepted',createdAt:new Date().toISOString()};
      s.conductorV18.photoClassifications.unshift(record);
    },{action:'conductor.photo.classification.proposed',entityType:'photo_classification',entityId:input.fileId||'new'});
    if(record.requiresHumanValidation){
      core.createValidation({projectId:record.projectId,type:'photo_classification',title:'Classement photo à confirmer',description:[record.lot,record.zone,record.type].filter(Boolean).join(' · ')||record.fileName,entityType:'photo_classification',entityId:record.id});
    }
    return structuredClone(record);
  }

  const CLIENT_TRANSMISSION_KNOWLEDGE=Object.freeze({
    module:'client_transmission',
    version:'1.0.0',
    appliesFrom:'1.8.1',
    terms:[
      'transmettre au client','partager au client','envoyer les photos au client','publier l’avancement',
      'bordereau de transmission','document transmis','document consulté','privé','interne',
      'élément partageable','version transmise','transmission groupée','suivi client'
    ],
    synonyms:{
      transmit:['envoyer','partager','publier','mettre sur le portail client','faire suivre au client'],
      photos:['photos chantier','photos avancement','images chantier','preuves photo'],
      consulted:['vu par le client','consulté','ouvert par le client','lu côté portail']
    },
    intents:[
      {id:'prepare_client_transmission',examples:['Envoie ces trois photos au client Dupont','Prépare l’avancement de cette semaine pour le client','Partage ces photos avec le client']},
      {id:'check_client_transmission_status',examples:['Est-ce que le client a vu les photos ?','Le client a-t-il consulté mon envoi ?']},
      {id:'list_client_transmissions',examples:['Montre-moi ce que j’ai déjà envoyé au client','Quels documents ont été transmis ?']},
      {id:'prepare_validated_reserves_share',examples:['Prépare les réserves validées pour le maître d’œuvre','Partage les OPR validées']}
    ],
    workflows:{
      prepare:['identifier le chantier','vérifier le droit share_with_client','sélectionner uniquement des éléments partageables','préparer un brouillon','demander validation humaine'],
      send:['validation humaine explicite obligatoire','produire un bordereau','émettre vers Interface client et Notifications','attendre accusé réel'],
      receipt:['sent = accusé d’envoi reçu','consulted = accusé de consultation reçu','failed = échec fourni par le connecteur']
    },
    sourceOfTruth:{
      clientAndPortal:'Interface client SpeedArti',
      points:'Suivi chantier / Point chantier',
      photosAndDocuments:'Documents SpeedArti et références de fichiers existantes',
      deliveryStatus:'Interface client / Notifications SpeedArti',
      permissions:'moteur de droits SpeedArti',
      audit:'Historique / Audit SpeedArti'
    },
    restrictions:[
      'Tout élément est privé par défaut.',
      'Ángel peut préparer une transmission mais ne doit jamais confirmer lui-même l’envoi au client.',
      'Une validation humaine explicite est obligatoire avant l’envoi.',
      'Ne jamais inventer un accusé envoyé ou consulté.',
      'Une réserve, OPR, non-conformité, contrôle qualité ou décision sensible doit être validé avant partage.',
      'Une nouvelle révision documentaire nécessite une nouvelle transmission ; ne jamais remplacer silencieusement la version déjà transmise.',
      'Ne jamais dupliquer physiquement un fichier si une référence Documents suffit.',
      'Respecter strictement le périmètre chantier et les permissions.'
    ],
    tests:[
      {utterance:'Envoie ces trois photos au client Dupont',expectedIntent:'prepare_client_transmission',requiresHumanValidation:true},
      {utterance:'Est-ce que le client a vu les photos ?',expectedIntent:'check_client_transmission_status',mustUseConnectorReceipt:true},
      {utterance:'Montre-moi ce que j’ai déjà envoyé au client',expectedIntent:'list_client_transmissions',mustRespectProjectRights:true},
      {utterance:'Prépare les réserves validées pour le maître d’œuvre',expectedIntent:'prepare_validated_reserves_share',validatedOnly:true}
    ]
  });

  function clientTransmissionContext(){
    const api=window.SpeedArtiClientTransmissionCore;
    if(!api)return {available:false,knowledgeVersion:CLIENT_TRANSMISSION_KNOWLEDGE.version,items:[]};
    const permission=api.hasPermission();
    return {
      available:true,
      knowledgeVersion:CLIENT_TRANSMISSION_KNOWLEDGE.version,
      permission,
      items:permission?api.list().map(t=>({
        id:t.id,projectId:t.projectId,client:t.client?.displayName||'',
        title:t.publicationTitle,status:t.status,createdAt:t.createdAt,sentAt:t.sentAt,
        consultedAt:t.consultedAt,itemCount:t.items?.length||0
      })):[],
      restrictedReason:permission?null:'Permission share_with_client requise'
    };
  }

  const api={version:'1.8.1',searchProject,dailySummary,angelContext,suggestPhotoClassification,proposePhotoClassification,clientTransmissionContext,knowledgePacks:{clientTransmission:CLIENT_TRANSMISSION_KNOWLEDGE}};
  window.SpeedArtiConductorAI=api;
  window.dispatchEvent(new CustomEvent('speedarti:angel:knowledge-pack-ready',{detail:CLIENT_TRANSMISSION_KNOWLEDGE}));

  /* Enrichit le contexte du bouton Ángel global, sans créer d'interface Ángel locale. */
  const bridge=window.SpeedArtiTeamPlanning;
  if(bridge?.integrations?.getAngelContext){
    const original=bridge.integrations.getAngelContext.bind(bridge.integrations);
    bridge.integrations.getAngelContext=(question='')=>{
      const base=original(question);
      return {...base,conductor:angelContext(question)};
    };
  }

  const originalManager=ui.renderSiteManagerDashboard.bind(ui);
  ui.renderSiteManagerDashboard=function(s,m){
    const base=originalManager(s,m);
    if(!isExpert(s)) return base;
    const summary=dailySummary(ui.v18ProjectId||null);
    const lines=[];
    if(summary.urgentPoints.length)lines.push(summary.urgentPoints.length+' urgence(s)');
    if(summary.openReserves)lines.push(summary.openReserves+' réserve(s)/OPR');
    if(summary.openNonConformities)lines.push(summary.openNonConformities+' non-conformité(s)');
    if(summary.missingMaterial.length)lines.push(summary.missingMaterial.length+' besoin(s) matériel');
    if(summary.pendingValidations)lines.push(summary.pendingValidations+' validation(s)');
    if(summary.weatherRisks.length)lines.push(summary.weatherRisks.length+' risque(s) météo');
    const html='<article class="panel v18-daily-summary"><div class="panel-header"><div><span class="eyebrow">Expert · résumé conducteur</span><h2>Ce qui demande votre attention</h2><p>Contexte local prêt pour Ángel global.</p></div><span class="badge badge-info">'+summary.attentionCount+'</span></div><p>'+(lines.length?esc(lines.join(' · ')):'Aucun signal prioritaire détecté avec les données disponibles.')+'</p><small>Aucune décision n’est appliquée depuis ce résumé.</small></article>';
    return base+html;
  };

  const style=document.createElement('style');
  style.textContent='.v18-daily-summary{margin-top:1rem}.v18-daily-summary p{margin:.35rem 0}.v18-daily-summary small{color:var(--muted)}';
  document.head.appendChild(style);
  ui.render();
})();