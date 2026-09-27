/* SpeedArti — Transmission Suivi chantier -> Interface client v1.8.1
   Moteur métier uniquement. Les fichiers restent référencés, jamais dupliqués. */
(()=>{
  const demo=window.__SpeedArtiDemo, conductor=window.SpeedArtiConductor;
  if(!demo?.store||!conductor||window.SpeedArtiClientTransmissionCore) return;
  const store=demo.store;
  const SHARE_PERMISSION='share_with_client';
  const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
  const now=()=>new Date().toISOString();
  const clone=v=>structuredClone(v);
  const clean=(v,max=4000)=>String(v??'').trim().slice(0,max);

  function ensure(state){
    state.conductorV18??={};
    const c=state.conductorV18;
    c.clientTransmissions??=[];
    c.clientContexts??={};
    c.clientTransmissionReceipts??=[];
    c.sharePermissionInitialized??=false;
    state.settings??={};
    state.settings.rolePermissions??={};
    if(!c.sharePermissionInitialized){
      for(const role of ['owner','site_manager']){
        state.settings.rolePermissions[role]??=[];
        if(!state.settings.rolePermissions[role].includes(SHARE_PERMISSION)) state.settings.rolePermissions[role].push(SHARE_PERMISSION);
      }
      c.sharePermissionInitialized=true;
    }
    return c;
  }

  function activeMember(state){return state.members?.find(m=>m.id===state.session?.activeMemberId)||null;}
  function hasPermission(state,memberId=state.session?.activeMemberId){
    const member=state.members?.find(m=>m.id===memberId);
    if(!member) return false;
    let allowed=(state.settings?.rolePermissions?.[member.role]||[]).includes(SHARE_PERMISSION);
    if(member.permissionOverrides?.[SHARE_PERMISSION]===true) allowed=true;
    if(member.permissionOverrides?.[SHARE_PERMISSION]===false) allowed=false;
    return allowed;
  }
  function assertPermission(state){
    if(!hasPermission(state)) throw new Error('Transmission client non autorisée pour ce profil.');
  }
  function assertProject(state,projectId){
    const allowed=new Set(conductor.visibleProjectIds());
    if(!state.projects?.some(p=>p.id===projectId)) throw new Error('Chantier introuvable.');
    if(!allowed.has(projectId)) throw new Error('Chantier non autorisé.');
  }
  function clientContext(state,projectId){
    const c=ensure(state),project=state.projects.find(p=>p.id===projectId);
    const mapped=c.clientContexts[projectId]||{};
    return {
      clientId:mapped.clientId||null,
      displayName:clean(mapped.displayName||project?.client||'Client non identifié',220),
      portalProjectId:mapped.portalProjectId||null,
      source:mapped.source||'project_fallback'
    };
  }
  function pointShareable(point){
    if(!point) return false;
    if(['problem','safety','request','task'].includes(point.type)) return false;
    if(['reservation','opr','non_conformity','quality','decision'].includes(point.type)) return point.status==='validated';
    if(point.type==='photo') return true;
    return point.status==='validated';
  }
  function resolveItem(state,projectId,input){
    const c=ensure(state),type=clean(input.entityType,80),id=clean(input.entityId,180);
    if(type==='site_point'){
      const p=c.points?.find(x=>x.id===id&&x.projectId===projectId);
      if(!p) throw new Error('Point chantier introuvable.');
      if(!pointShareable(p)) throw new Error('Ce Point chantier reste privé ou doit être validé avant transmission.');
      const fileIds=[...(p.attachmentIds||[]),...(p.beforeAttachmentIds||[]),...(p.afterAttachmentIds||[])];
      return {entityType:type,entityId:id,title:clean(p.description||'Point chantier',300),kind:p.type,statusAtSend:p.status,versionRef:p.updatedAt||p.createdAt,fileIds:[...new Set(fileIds)],sourceSnapshot:{trade:p.trade||'',zone:p.zone||'',priority:p.priority||'normal'}};
    }
    if(type==='plan'){
      const p=c.plans?.find(x=>x.id===id&&x.projectId===projectId);
      if(!p) throw new Error('Plan introuvable.');
      if(!['validated','active'].includes(p.status)) throw new Error('Le plan doit être validé ou actif avant transmission.');
      return {entityType:type,entityId:id,title:clean(p.name+' — Révision '+p.revisionLabel,300),kind:'document',statusAtSend:p.status,versionRef:p.revisionLabel,fileIds:p.documentId?[p.documentId]:[],sourceSnapshot:{revisionLabel:p.revisionLabel,active:p.active===true,replacesPlanId:p.replacesPlanId||null}};
    }
    if(type==='meeting_minutes'){
      const m=c.meetings?.find(x=>x.id===id&&x.projectId===projectId);
      if(!m||m.minutesStatus!=='approved') throw new Error('Le compte rendu doit être validé avant transmission.');
      return {entityType:type,entityId:id,title:clean(m.title,300),kind:'document',statusAtSend:'approved',versionRef:m.minutesReviewedAt||m.updatedAt,fileIds:[...(m.attachmentIds||[])],sourceSnapshot:{minutesDraft:clone(m.minutesDraft)}};
    }
    if(type==='site_journal'){
      const j=c.journals?.find(x=>x.id===id&&x.projectId===projectId);
      if(!j||j.status!=='approved') throw new Error('Le journal doit être validé avant transmission.');
      return {entityType:type,entityId:id,title:'Journal chantier — '+j.date,kind:'document',statusAtSend:'approved',versionRef:j.reviewedAt||j.generatedAt,fileIds:[],sourceSnapshot:{date:j.date,summary:clone(j.summary)}};
    }
    if(type==='progress_update'){
      const r=(state.reports||[]).filter(x=>x.projectId===projectId).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      if(!r) throw new Error('Aucun avancement terrain disponible.');
      return {entityType:type,entityId:r.id,title:'Avancement chantier — '+String(r.progress??'—')+' %',kind:'progress',statusAtSend:'snapshot',versionRef:r.date,fileIds:[...(r.attachments||[])].map(x=>x.fileId||x.id).filter(Boolean),sourceSnapshot:{progress:r.progress,summary:r.summary||''}};
    }
    if(type==='photo_group'){
      const fileIds=Array.isArray(input.fileIds)?input.fileIds.map(String).filter(Boolean):[];
      if(!fileIds.length) throw new Error('Aucune photo sélectionnée.');
      return {entityType:type,entityId:id||uid('photo_group'),title:clean(input.title||('Photos chantier — '+fileIds.length),300),kind:'photos',statusAtSend:'selected',versionRef:now(),fileIds:[...new Set(fileIds)],sourceSnapshot:{count:fileIds.length,sourceEntityIds:Array.isArray(input.sourceEntityIds)?input.sourceEntityIds.map(String):[]}};
    }
    throw new Error('Type de contenu non transmissible.');
  }

  function buildBordereau(state,transmission){
    const project=state.projects.find(p=>p.id===transmission.projectId);
    return {
      documentType:'client_transmission',
      schemaVersion:'1.0',
      transmissionId:transmission.id,
      projectId:transmission.projectId,
      projectName:project?.name||'',
      client:clone(transmission.client),
      authorId:transmission.authorId,
      generatedAt:transmission.createdAt,
      publicationTitle:transmission.publicationTitle,
      comment:transmission.comment,
      items:transmission.items.map(item=>({
        entityType:item.entityType,entityId:item.entityId,title:item.title,kind:item.kind,
        statusAtSend:item.statusAtSend,versionRef:item.versionRef,fileIds:[...item.fileIds]
      }))
    };
  }

  function createDraft(input){
    let result;
    store.update(state=>{
      assertPermission(state);
      const projectId=clean(input.projectId,180);
      assertProject(state,projectId);
      const rawItems=Array.isArray(input.items)?input.items:[];
      if(!rawItems.length) throw new Error('Sélectionnez au moins un élément.');
      const items=rawItems.map(item=>resolveItem(state,projectId,item));
      const c=ensure(state);
      result={
        id:uid('transmission'),projectId,client:clientContext(state,projectId),
        authorId:state.session.activeMemberId,publicationTitle:clean(input.publicationTitle||'Actualité chantier',240),
        comment:clean(input.comment,3000),items,status:'prepared',createdAt:now(),updatedAt:now(),
        sentAt:null,consultedAt:null,failedAt:null,failureReason:'',connectorMessageId:null,
        bordereau:null
      };
      result.bordereau=buildBordereau(state,result);
      c.clientTransmissions.unshift(result);
    },{action:'client_transmission.draft.created',entityType:'client_transmission',entityId:'new'});
    return clone(result);
  }

  function updateDraft(id,patch){
    let result;
    store.update(state=>{
      assertPermission(state);
      const c=ensure(state),t=c.clientTransmissions.find(x=>x.id===id);
      if(!t) throw new Error('Transmission introuvable.');
      assertProject(state,t.projectId);
      if(t.status!=='prepared') throw new Error('Une transmission déjà envoyée ne peut plus être modifiée.');
      if(patch.publicationTitle!==undefined)t.publicationTitle=clean(patch.publicationTitle,240);
      if(patch.comment!==undefined)t.comment=clean(patch.comment,3000);
      if(patch.items!==undefined){if(!Array.isArray(patch.items)||!patch.items.length)throw new Error('Sélectionnez au moins un élément.');t.items=patch.items.map(item=>resolveItem(state,t.projectId,item));}
      t.updatedAt=now();t.bordereau=buildBordereau(state,t);result=clone(t);
    },{action:'client_transmission.draft.updated',entityType:'client_transmission',entityId:id});
    return result;
  }

  function prepareSend(id,confirmed=false){
    let outbound;
    store.update(state=>{
      assertPermission(state);
      if(confirmed!==true) throw new Error('Validation humaine explicite requise avant transmission.');
      const c=ensure(state),t=c.clientTransmissions.find(x=>x.id===id);
      if(!t) throw new Error('Transmission introuvable.');
      assertProject(state,t.projectId);
      if(t.status!=='prepared') throw new Error('Cette transmission n’est plus à l’état préparé.');
      if(!t.client.clientId){
        t.status='ready_for_client_interface';
      }else{
        t.status='ready_for_client_interface';
      }
      t.updatedAt=now();
      t.bordereau=buildBordereau(state,t);
      outbound={schemaVersion:'1.0',type:'client_transmission',transmissionId:t.id,projectId:t.projectId,portalProjectId:t.client.portalProjectId,clientId:t.client.clientId,publicationTitle:t.publicationTitle,comment:t.comment,items:clone(t.items),bordereau:clone(t.bordereau)};
    },{action:'client_transmission.ready',entityType:'client_transmission',entityId:id});
    window.dispatchEvent(new CustomEvent('speedarti:client-transmission:outbound-ready',{detail:outbound}));
    return clone(outbound);
  }

  function applyReceipt(receipt){
    let result;
    store.update(state=>{
      const c=ensure(state),t=c.clientTransmissions.find(x=>x.id===clean(receipt.transmissionId,180));
      if(!t) throw new Error('Transmission introuvable pour cet accusé.');
      const status=clean(receipt.status,40);
      if(!['sent','consulted','failed'].includes(status)) throw new Error('Statut d’accusé client invalide.');
      t.status=status;t.updatedAt=now();
      if(receipt.connectorMessageId)t.connectorMessageId=clean(receipt.connectorMessageId,240);
      if(status==='sent')t.sentAt=clean(receipt.at)||now();
      if(status==='consulted'){t.sentAt=t.sentAt||clean(receipt.sentAt)||now();t.consultedAt=clean(receipt.at)||now();}
      if(status==='failed'){t.failedAt=clean(receipt.at)||now();t.failureReason=clean(receipt.reason,1000);}
      c.clientTransmissionReceipts.unshift({id:uid('receipt'),transmissionId:t.id,status,at:clean(receipt.at)||now(),source:clean(receipt.source||'client_interface',100)});
      result=clone(t);
    },{action:'client_transmission.receipt',entityType:'client_transmission',entityId:receipt.transmissionId,details:receipt.status});
    return result;
  }

  function setClientContext(input){
    store.update(state=>{
      assertProject(state,input.projectId);
      const c=ensure(state);
      c.clientContexts[input.projectId]={clientId:input.clientId?clean(input.clientId,180):null,displayName:clean(input.displayName,220),portalProjectId:input.portalProjectId?clean(input.portalProjectId,180):null,source:'client_interface',updatedAt:now()};
    },{action:'client_interface.context.received',entityType:'integration',entityId:input.projectId});
  }

  function list(projectId=null){
    const state=store.getState(),allowed=new Set(conductor.visibleProjectIds());
    return clone(ensure(state).clientTransmissions.filter(t=>allowed.has(t.projectId)&&(!projectId||t.projectId===projectId)));
  }

  store.update(state=>{ensure(state);},{action:'client_transmission.schema.ready',entityType:'client_transmission',entityId:'v181'});

  window.SpeedArtiClientTransmissionCore={
    version:'1.8.1',SHARE_PERMISSION,
    hasPermission:()=>hasPermission(store.getState()),
    hasPermissionFor:memberId=>hasPermission(store.getState(),memberId),
    createDraft,updateDraft,prepareSend,applyReceipt,setClientContext,list,
    getShareablePoint:pointShareable
  };
})();