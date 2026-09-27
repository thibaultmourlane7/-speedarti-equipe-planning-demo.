/* SpeedArti — contrats Suivi chantier / Conducteur v1.8
   Contrats de préparation uniquement : aucun appel réseau. */
(()=>{
  const demo=window.__SpeedArtiDemo,core=window.SpeedArtiConductor;
  if(!demo?.store||!core||window.__SpeedArtiContracts18) return;
  window.__SpeedArtiContracts18=true;
  const store=demo.store;
  const now=()=>new Date().toISOString();
  const clean=v=>String(v??'').trim();
  const ext=s=>{s.conductorV18??={};s.conductorV18.connectorStatus??={};s.conductorV18.presenceActuals??=[];s.conductorV18.memberQualifications??={};s.conductorV18.plans??=[];return s.conductorV18;};
  const allowed=s=>new Set(core.visibleProjectIds());

  const CONTRACTS=Object.freeze({
    documents_plans:{direction:'bidirectionnel',sourceOfTruth:'Documents SpeedArti',purpose:'Plans, PDF, révisions et documents rattachés aux Points chantier.'},
    points_team_planning:{direction:'bidirectionnel',sourceOfTruth:'Suivi chantier pour le point, Équipe & Planning pour les affectations',purpose:'Actions et responsables sans recréer le planning.'},
    points_angel:{direction:'bidirectionnel',sourceOfTruth:'Point chantier',purpose:'Donner à Ángel global le contexte autorisé et recevoir des propositions à valider.'},
    points_notifications:{direction:'sortant',sourceOfTruth:'Notifications SpeedArti',purpose:'Alertes sur échéances, changements et nouvelles révisions.'},
    points_client_prescripteur:{direction:'sortant',sourceOfTruth:'Droits de partage SpeedArti',purpose:'Partager uniquement les Points autorisés au client ou prescripteur.'},
    reserves_documents:{direction:'sortant',sourceOfTruth:'Point chantier + Documents',purpose:'Exports et comptes rendus de réserves/OPR.'},
    quality_documents:{direction:'sortant',sourceOfTruth:'Point chantier + Documents',purpose:'Archiver contrôles, preuves et validations.'},
    meetings_documents:{direction:'sortant',sourceOfTruth:'Réunion chantier',purpose:'Archiver le compte rendu uniquement après validation humaine.'},
    journal_documents:{direction:'sortant',sourceOfTruth:'Journal chantier',purpose:'Archiver/diffuser uniquement le journal validé.'},
    document_versioning_notifications:{direction:'sortant',sourceOfTruth:'Documents SpeedArti',purpose:'Notifier qu’une nouvelle révision remplace une ancienne version.'},
    stock_orders_points:{direction:'bidirectionnel',sourceOfTruth:'Stock / Commandes SpeedArti',purpose:'Relier un Point matériel à la disponibilité et au brouillon de commande.'},
    subcontracting_points:{direction:'bidirectionnel',sourceOfTruth:'Sous-traitance SpeedArti',purpose:'Attribuer des actions autorisées à un sous-traitant sans créer un second réseau.'},
    temps_presence:{direction:'entrant',sourceOfTruth:'Temps & Présence',purpose:'Recevoir les heures réellement réalisées pour comparaison avec le prévisionnel.'},
    rh_qualifications:{direction:'entrant',sourceOfTruth:'RH SpeedArti',purpose:'Recevoir habilitations, permis, certifications et restrictions validées.'},
    external_calendar:{direction:'sortant',sourceOfTruth:'Agenda Chantier SpeedArti',purpose:'Publier facultativement les affectations personnelles vers Google/Outlook sans permettre à ces calendriers de devenir la source.'}
  });

  function validateProject(s,id){
    if(!id||!s.projects?.some(p=>p.id===id))throw new Error('Chantier inconnu.');
    if(!allowed(s).has(id))throw new Error('Chantier non autorisé.');
  }

  function applyPresence(payload){
    if(payload?.schemaVersion!=='1.0'||!Array.isArray(payload.items))throw new Error('Snapshot Temps & Présence incompatible.');
    const s=store.getState();
    const items=payload.items.map(x=>{
      validateProject(s,x.projectId);
      const hours=Number(x.hours);
      if(!Number.isFinite(hours)||hours<0||hours>24)throw new Error('Nombre d’heures réel invalide.');
      return {id:clean(x.id)||clean(x.projectId)+':'+clean(x.memberId)+':'+clean(x.date),projectId:clean(x.projectId),memberId:clean(x.memberId),date:clean(x.date),hours,phaseId:x.phaseId?clean(x.phaseId):null,source:'temps_presence',receivedAt:now()};
    });
    store.update(st=>{const c=ext(st);c.presenceActuals=items;c.connectorStatus.temps_presence={receivedAt:now(),count:items.length};},{action:'conductor.connector.presence.received',entityType:'integration',entityId:'temps_presence',details:String(items.length)});
    return items.length;
  }

  function applyQualifications(payload){
    if(payload?.schemaVersion!=='1.0'||!Array.isArray(payload.members))throw new Error('Snapshot RH qualifications incompatible.');
    const s=store.getState();
    const members=payload.members.map(x=>{
      if(!s.members?.some(m=>m.id===x.memberId))throw new Error('Collaborateur RH inconnu.');
      return {memberId:clean(x.memberId),permits:Array.isArray(x.permits)?x.permits.map(clean).filter(Boolean):[],certifications:Array.isArray(x.certifications)?x.certifications.map(clean).filter(Boolean):[],equipmentAuthorizations:Array.isArray(x.equipmentAuthorizations)?x.equipmentAuthorizations.map(clean).filter(Boolean):[],restrictions:Array.isArray(x.restrictions)?x.restrictions.map(clean).filter(Boolean):[],source:'rh',validatedAt:clean(x.validatedAt)||null};
    });
    store.update(st=>{const c=ext(st);for(const m of members)c.memberQualifications[m.memberId]=m;c.connectorStatus.rh_qualifications={receivedAt:now(),count:members.length};},{action:'conductor.connector.qualifications.received',entityType:'integration',entityId:'rh_qualifications',details:String(members.length)});
    return members.length;
  }

  function applyDocuments(payload){
    if(payload?.schemaVersion!=='1.0'||!Array.isArray(payload.plans))throw new Error('Snapshot Documents/Plans incompatible.');
    const s=store.getState();
    const plans=payload.plans.map(x=>{
      validateProject(s,x.projectId);
      if(!x.id||!x.name||!x.revisionLabel)throw new Error('Plan documentaire incomplet.');
      return {id:clean(x.id),projectId:clean(x.projectId),name:clean(x.name),fileName:clean(x.fileName),mimeType:clean(x.mimeType),revisionLabel:clean(x.revisionLabel),status:clean(x.status||'validated'),active:x.active===true,replacesPlanId:x.replacesPlanId?clean(x.replacesPlanId):null,documentId:clean(x.documentId||x.id),remoteUrl:x.remoteUrl?clean(x.remoteUrl):null,createdAt:clean(x.createdAt)||now(),createdBy:clean(x.createdBy),validatedAt:clean(x.validatedAt)||null,validatedBy:clean(x.validatedBy)||null,history:[]};
    });
    store.update(st=>{
      const c=ext(st);
      const local=(c.plans||[]).filter(p=>p.source!=='documents');
      c.plans=[...local,...plans.map(p=>({...p,source:'documents'}))];
      c.connectorStatus.documents_plans={receivedAt:now(),count:plans.length};
    },{action:'conductor.connector.documents.received',entityType:'integration',entityId:'documents_plans',details:String(plans.length)});
    return plans.length;
  }

  function applySnapshot(name,payload){
    if(name==='temps_presence')return applyPresence(payload);
    if(name==='rh_qualifications')return applyQualifications(payload);
    if(name==='documents_plans')return applyDocuments(payload);
    throw new Error('Ce connecteur est préparé mais n’accepte pas de snapshot entrant dans la démo.');
  }

  function exportPoint(pointId,target){
    const s=store.getState(),p=ext(s).points?.find(x=>x.id===pointId);
    if(!p)throw new Error('Point chantier introuvable.');
    validateProject(s,p.projectId);
    return {schemaVersion:'1.0',source:'suivi_chantier',target,generatedAt:now(),payload:{...structuredClone(p),history:undefined}};
  }

  function exportValidatedDocument(entityType,entityId){
    const s=store.getState(),c=ext(s);
    if(entityType==='meeting_minutes'){
      const m=c.meetings?.find(x=>x.id===entityId);
      if(!m||m.minutesStatus!=='approved')throw new Error('Compte rendu non validé.');
      return {schemaVersion:'1.0',documentType:'meeting_minutes',projectId:m.projectId,title:m.title,content:structuredClone(m.minutesDraft),validatedAt:m.minutesReviewedAt};
    }
    if(entityType==='site_journal'){
      const j=c.journals?.find(x=>x.id===entityId);
      if(!j||j.status!=='approved')throw new Error('Journal non validé.');
      return {schemaVersion:'1.0',documentType:'site_journal',projectId:j.projectId,title:'Journal '+j.date,content:structuredClone(j.summary),validatedAt:j.reviewedAt};
    }
    throw new Error('Type documentaire non exportable.');
  }

  function calendarPayload(memberId){
    const s=store.getState();
    const list=(s.assignments||[]).filter(a=>{
      const ids=new Set(a.memberIds||[]);
      for(const cid of a.crewIds||[]){const crew=s.crews?.find(c=>c.id===cid);for(const id of crew?.memberIds||[])ids.add(id);}
      return ids.has(memberId);
    });
    return {schemaVersion:'1.0',sourceOfTruth:'agenda_chantier',memberId,readOnly:true,events:list.map(a=>({id:a.calendarEventId||a.id,title:a.title,projectId:a.projectId,start:a.start,end:a.end,notes:a.notes||''}))};
  }

  const api={
    version:'1.8.0',
    mode:'contracts_only_no_live_connection',
    contracts:CONTRACTS,
    applySnapshot,
    exportPoint,
    exportValidatedDocument,
    calendarPayload,
    exportPreparationBundle:()=>({
      version:'1.8.0',mode:'contracts_only_no_live_connection',contracts:CONTRACTS,
      sourceOfTruth:{
        datesAndInterventions:'Agenda Chantier',teams:'Équipe & Planning',actualHours:'Temps & Présence',
        employees:'RH',consumables:'Stock',vehiclesEquipment:'Parc matériel',orders:'Commandes',
        plansDocuments:'Documents',estimatedHoursPhases:'Chiffrage',ai:'Ángel global'
      },
      safeguards:{noSecondAgenda:true,noSecondStock:true,noSecondHR:true,noSecondTimeclock:true,noSecondMessaging:true,humanValidation:true,noInventedCriticalData:true}
    })
  };
  window.SpeedArtiConductorContracts=api;

  window.addEventListener('speedarti:conductor:point-created',event=>{
    window.dispatchEvent(new CustomEvent('speedarti:conductor:outbound-ready',{detail:{type:'point.created',payload:event.detail}}));
  });
  window.addEventListener('speedarti:conductor:offline-sync-ready',event=>{
    window.dispatchEvent(new CustomEvent('speedarti:conductor:outbound-ready',{detail:{type:'offline.queue.ready',payload:event.detail}}));
  });

  window.dispatchEvent(new CustomEvent('speedarti:conductor:contracts-ready',{detail:api.exportPreparationBundle()}));
})();