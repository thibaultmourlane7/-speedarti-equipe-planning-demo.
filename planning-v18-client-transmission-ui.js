/* SpeedArti — UI Transmission client v1.8.1 */
(()=>{
  const demo=window.__SpeedArtiDemo, tx=window.SpeedArtiClientTransmissionCore, conductor=window.SpeedArtiConductor;
  if(!demo?.ui||!demo?.store||!tx||!conductor||window.__SpeedArtiClientTransmissionUI) return;
  window.__SpeedArtiClientTransmissionUI=true;
  const ui=demo.ui,store=demo.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}catch{return '—';}};
  const ext=s=>s.conductorV18||{};
  const currentProject=s=>{
    const allowed=new Set(conductor.visibleProjectIds());
    const list=(s.projects||[]).filter(p=>allowed.has(p.id));
    if(!list.length)return null;
    const id=ui.v18ProjectId&&list.some(p=>p.id===ui.v18ProjectId)?ui.v18ProjectId:list[0].id;
    return list.find(p=>p.id===id)||list[0];
  };
  const memberHas=(state,member,permission)=>{
    if(!member)return false;
    let ok=(state.settings?.rolePermissions?.[member.role]||[]).includes(permission);
    if(member.permissionOverrides?.[permission]===true)ok=true;
    if(member.permissionOverrides?.[permission]===false)ok=false;
    return ok;
  };
  const active=s=>s.members?.find(m=>m.id===s.session?.activeMemberId)||null;
  const statusLabel=s=>({prepared:'Préparé',ready_for_client_interface:'Prêt pour Interface client',sent:'Envoyé',consulted:'Consulté',failed:'Échec'}[s]||s);
  const pointType=t=>conductor.POINT_TYPES[t]||t;

  function collectShareables(s,projectId){
    const c=ext(s),items=[],photos=[];
    for(const p of c.points||[]){
      if(p.projectId!==projectId||!tx.getShareablePoint(p))continue;
      items.push({entityType:'site_point',entityId:p.id,title:(pointType(p.type)+' — '+(p.description||'Point chantier')).slice(0,180),detail:(p.status||'')+(p.zone?' · '+p.zone:'')});
      for(const fileId of [...(p.attachmentIds||[]),...(p.beforeAttachmentIds||[]),...(p.afterAttachmentIds||[])])photos.push({fileId,sourceEntityId:p.id,label:(p.description||pointType(p.type)).slice(0,120)});
    }
    for(const p of c.plans||[]){
      if(p.projectId===projectId&&['validated','active'].includes(p.status))items.push({entityType:'plan',entityId:p.id,title:p.name+' — Révision '+p.revisionLabel,detail:p.active?'VERSION ACTIVE':p.status});
    }
    for(const m of c.meetings||[]){
      if(m.projectId===projectId&&m.minutesStatus==='approved'){
        items.push({entityType:'meeting_minutes',entityId:m.id,title:'Compte rendu — '+m.title,detail:'Validé'});
        for(const fileId of m.attachmentIds||[])photos.push({fileId,sourceEntityId:m.id,label:m.title});
      }
    }
    for(const j of c.journals||[])if(j.projectId===projectId&&j.status==='approved')items.push({entityType:'site_journal',entityId:j.id,title:'Journal chantier — '+j.date,detail:'Validé'});
    const reports=(s.reports||[]).filter(r=>r.projectId===projectId).sort((a,b)=>new Date(b.date)-new Date(a.date));
    if(reports.length){
      items.unshift({entityType:'progress_update',entityId:reports[0].id,title:'Avancement — '+String(reports[0].progress??'—')+' %',detail:(reports[0].summary||'').slice(0,150)});
      for(const a of reports[0].attachments||[]){const fileId=a.fileId||a.id;if(fileId)photos.push({fileId,sourceEntityId:reports[0].id,label:'Avancement chantier'});}
    }
    const seen=new Set();
    return {items,photos:photos.filter(p=>p.fileId&&!seen.has(p.fileId)&&seen.add(p.fileId))};
  }

  function transmissionPanel(s){
    const m=active(s),project=currentProject(s);
    if(!project||!memberHas(s,m,tx.SHARE_PERMISSION))return '';
    const list=tx.list(project.id);
    return '<article class="panel v181-client-panel"><div class="panel-header"><div><span class="eyebrow">Standard · Interface client</span><h2>Suivi client</h2><p>Tout reste privé tant que vous ne choisissez pas explicitement de transmettre.</p></div><button class="primary" data-v181-action="open-transmission">Transmettre au client</button></div>'+
      '<div class="v181-client-history">'+(list.length?list.slice(0,8).map(t=>'<article><div><strong>'+esc(t.publicationTitle)+'</strong><span>'+esc(t.client?.displayName||'Client')+' · '+fmt(t.createdAt)+'</span><small>'+t.items.length+' élément(s) · '+esc(statusLabel(t.status))+(t.consultedAt?' · consulté '+fmt(t.consultedAt):'')+'</small></div><button class="ghost" data-v181-action="view-slip" data-id="'+esc(t.id)+'">Bordereau</button></article>').join(''):'<p class="v181-muted">Aucune transmission client pour ce chantier.</p>')+'</div></article>';
  }

  const originalManager=ui.renderSiteManagerDashboard.bind(ui);
  ui.renderSiteManagerDashboard=function(s,m){return originalManager(s,m)+transmissionPanel(s);};
  const originalDashboard=ui.renderDashboard.bind(ui);
  ui.renderDashboard=function(s){
    const base=originalDashboard(s),m=active(s);
    if(m?.role==='site_manager')return base;
    return base+(memberHas(s,m,tx.SHARE_PERMISSION)?transmissionPanel(s):'');
  };

  function settingsPanel(s){
    const m=active(s);
    if(!memberHas(s,m,'manage_settings'))return '';
    const roles=['owner','associate','site_manager','team_lead','worker','sales','secretary','subcontractor'];
    const roleLabels={owner:'Dirigeant',associate:'Associé',site_manager:'Conducteur de travaux',team_lead:"Chef d'équipe",worker:'Ouvrier',sales:'Commercial',secretary:'Secrétaire',subcontractor:'Sous-traitant'};
    return '<article class="panel v181-permissions"><div class="panel-header"><div><h2>Transmission client</h2><p>Droit Standard explicite : dirigeant et conducteur activés par défaut. Les autres profils restent désactivés tant que vous ne les autorisez pas.</p></div></div><details><summary>Droits par rôle</summary><div class="v181-perm-grid">'+roles.map(role=>'<label><input type="checkbox" data-v181-control="role-share" data-role="'+role+'" '+((s.settings.rolePermissions?.[role]||[]).includes(tx.SHARE_PERMISSION)?'checked':'')+'> '+esc(roleLabels[role]||role)+'</label>').join('')+'</div></details><details><summary>Exceptions individuelles</summary><div class="v181-individuals">'+(s.members||[]).filter(x=>x.status==='active').map(x=>{const v=x.permissionOverrides?.[tx.SHARE_PERMISSION];return '<label><span>'+esc(x.name)+'</span><select data-v181-control="member-share" data-member-id="'+esc(x.id)+'"><option value="inherit" '+(v===undefined?'selected':'')+'>Selon le rôle</option><option value="allow" '+(v===true?'selected':'')+'>Autoriser</option><option value="deny" '+(v===false?'selected':'')+'>Interdire</option></select></label>';}).join('')+'</div></details></article>';
  }
  const originalSettings=ui.renderSettings.bind(ui);
  ui.renderSettings=function(s){return originalSettings(s)+settingsPanel(s);};

  function openTransmission(s,preselect=null){
    const project=currentProject(s);if(!project)return;
    const share=collectShareables(s,project.id),c=ext(s),context=c.clientContexts?.[project.id];
    const clientName=context?.displayName||project.client||'Client non identifié';
    const itemHtml=share.items.map((x,i)=>'<label class="v181-share-row"><input type="checkbox" name="shareItem" value="'+i+'" '+(preselect&&preselect.entityType===x.entityType&&preselect.entityId===x.entityId?'checked':'')+'><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.detail||'')+'</small></span></label>').join('');
    const photoHtml=share.photos.map((x,i)=>'<label class="v181-photo-choice"><input type="checkbox" name="sharePhoto" value="'+i+'"><span class="v181-thumb" data-v181-thumb="'+esc(x.fileId)+'">📷</span><small>'+esc(x.label||'Photo')+'</small></label>').join('');
    ui.modal='<form data-v181-form="transmission"><input type="hidden" name="projectId" value="'+esc(project.id)+'"><h2>Transmettre au client</h2><p><strong>Destinataire :</strong> '+esc(clientName)+'</p><p class="form-hint">Rien n’est envoyé tant que vous n’appuyez pas sur Envoyer.</p><div class="v181-form"><label>Titre de l’actualité<input name="publicationTitle" required value="Actualité chantier"></label><label class="full">Commentaire facultatif<textarea name="comment" placeholder="Ex. Charpente terminée, démarrage couverture lundi."></textarea></label></div><h3>Éléments</h3><div class="v181-share-list">'+(itemHtml||'<p class="v181-muted">Aucun élément validé disponible.</p>')+'</div><h3>Photos à regrouper</h3><div class="v181-photos">'+(photoHtml||'<p class="v181-muted">Aucune photo disponible dans les éléments partageables.</p>')+'</div><div id="v181-preview" class="v181-preview" hidden></div><div class="modal-actions"><button type="button" class="ghost" data-action="close-modal">Annuler</button><button type="button" class="secondary" data-v181-action="preview">Aperçu</button><button class="primary">Envoyer</button></div></form>';
    ui.render();
    hydrateThumbs();
  }

  async function hydrateThumbs(){
    if(!window.SpeedArtiConductorFiles?.getBlob)return;
    for(const el of document.querySelectorAll('[data-v181-thumb]')){
      try{
        const blob=await window.SpeedArtiConductorFiles.getBlob(el.dataset.v181Thumb);
        if(blob?.type?.startsWith('image/')){const url=URL.createObjectURL(blob);el.innerHTML='<img src="'+url+'" alt="Photo à transmettre">';}
      }catch{}
    }
  }

  function dataFromForm(form,s){
    const fd=new FormData(form),projectId=String(fd.get('projectId')),share=collectShareables(s,projectId),items=[];
    for(const raw of fd.getAll('shareItem')){const x=share.items[Number(raw)];if(x)items.push({entityType:x.entityType,entityId:x.entityId});}
    const selectedPhotos=fd.getAll('sharePhoto').map(x=>share.photos[Number(x)]).filter(Boolean);
    if(selectedPhotos.length)items.push({entityType:'photo_group',entityId:'photos_'+Date.now(),title:'Photos chantier — '+selectedPhotos.length,fileIds:selectedPhotos.map(x=>x.fileId),sourceEntityIds:selectedPhotos.map(x=>x.sourceEntityId)});
    return {projectId,publicationTitle:String(fd.get('publicationTitle')||'Actualité chantier'),comment:String(fd.get('comment')||''),items};
  }

  function preview(form){
    const s=store.getState(),payload=dataFromForm(form,s),project=s.projects.find(p=>p.id===payload.projectId),context=ext(s).clientContexts?.[payload.projectId];
    const box=form.querySelector('#v181-preview');if(!box)return;
    box.hidden=false;
    box.innerHTML='<strong>Aperçu client</strong><p>'+esc(payload.publicationTitle)+'</p><p>'+esc(payload.comment||'Sans commentaire')+'</p><small>'+payload.items.length+' groupe(s)/élément(s) · '+esc(context?.displayName||project?.client||'Client non identifié')+'</small>';
  }

  function viewSlip(s,id){
    const t=tx.list().find(x=>x.id===id);if(!t)return;
    const b=t.bordereau||{};
    ui.modal='<div><h2>Bordereau de transmission</h2><p><strong>'+esc(t.publicationTitle)+'</strong></p><dl class="detail-list"><div><dt>Transmission</dt><dd>'+esc(t.id)+'</dd></div><div><dt>Client</dt><dd>'+esc(t.client?.displayName||'—')+'</dd></div><div><dt>Créée</dt><dd>'+fmt(t.createdAt)+'</dd></div><div><dt>Statut</dt><dd>'+esc(statusLabel(t.status))+'</dd></div><div><dt>Consultation</dt><dd>'+(t.consultedAt?fmt(t.consultedAt):'Non confirmée')+'</dd></div></dl><h3>Éléments transmis</h3><div class="v181-slip-items">'+(b.items||[]).map(x=>'<div><strong>'+esc(x.title)+'</strong><small>'+esc(x.entityType)+' · version '+esc(x.versionRef||'—')+'</small></div>').join('')+'</div><p class="form-hint">Les références envoyées sont figées dans ce bordereau. Une nouvelle révision nécessite une nouvelle transmission.</p></div>';
    ui.render();
  }

  const style=document.createElement('style');
  style.textContent='.v181-client-panel{margin-top:1rem}.v181-client-history,.v181-share-list,.v181-slip-items{display:grid;gap:.5rem}.v181-client-history article,.v181-share-row,.v181-slip-items>div{display:flex;justify-content:space-between;align-items:center;gap:.7rem;padding:.65rem;border:1px solid var(--border);border-radius:12px;background:#fff}.v181-client-history strong,.v181-client-history span,.v181-client-history small,.v181-share-row strong,.v181-share-row small,.v181-slip-items strong,.v181-slip-items small{display:block}.v181-muted{color:var(--muted);font-size:.78rem}.v181-form{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}.v181-form .full{grid-column:1/-1}.v181-form label{display:grid;gap:.25rem}.v181-photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:.5rem}.v181-photo-choice{display:grid;gap:.35rem;border:1px solid var(--border);border-radius:12px;padding:.55rem}.v181-thumb{height:72px;display:grid;place-content:center;background:#f3f6fa;border-radius:8px;overflow:hidden;font-size:1.4rem}.v181-thumb img{width:100%;height:72px;object-fit:cover}.v181-preview{margin-top:.8rem;padding:.7rem;border-radius:12px;background:#f3f7ff;border:1px solid #cfe0ff}.v181-perm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.45rem;margin-top:.6rem}.v181-individuals{display:grid;gap:.45rem;margin-top:.6rem}.v181-individuals label{display:flex;justify-content:space-between;gap:.6rem;align-items:center}.v181-slip-items>div{align-items:flex-start;flex-direction:column}@media(max-width:600px){.v181-form{grid-template-columns:1fr}.v181-form .full{grid-column:auto}.v181-client-history article,.v181-share-row{align-items:flex-start}.v181-perm-grid{grid-template-columns:1fr}}';
  document.head.appendChild(style);

  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-v181-action]');if(!t)return;
    const s=store.getState(),action=t.dataset.v181Action;
    if(action==='open-transmission'){openTransmission(s);return;}
    if(action==='quick-share'){openTransmission(s,{entityType:t.dataset.entityType,entityId:t.dataset.entityId});return;}
    if(action==='preview'){const form=t.closest('form[data-v181-form="transmission"]');if(form)preview(form);return;}
    if(action==='view-slip'){viewSlip(s,t.dataset.id);return;}
  });

  document.addEventListener('change',e=>{
    const t=e.target.closest('[data-v181-control]');if(!t)return;
    const s=store.getState(),m=active(s);
    if(!memberHas(s,m,'manage_settings'))return ui.notify('Modification des droits non autorisée.','error');
    if(t.dataset.v181Control==='role-share'){
      store.update(st=>{st.settings.rolePermissions[t.dataset.role]??=[];const set=new Set(st.settings.rolePermissions[t.dataset.role]);if(t.checked)set.add(tx.SHARE_PERMISSION);else set.delete(tx.SHARE_PERMISSION);st.settings.rolePermissions[t.dataset.role]=[...set];},{action:'client_transmission.role_permission.updated',entityType:'role',entityId:t.dataset.role,details:tx.SHARE_PERMISSION});
      ui.render();return;
    }
    if(t.dataset.v181Control==='member-share'){
      store.update(st=>{const member=st.members.find(x=>x.id===t.dataset.memberId);if(!member)return;member.permissionOverrides??={};if(t.value==='inherit')delete member.permissionOverrides[tx.SHARE_PERMISSION];else member.permissionOverrides[tx.SHARE_PERMISSION]=t.value==='allow';},{action:'client_transmission.member_permission.updated',entityType:'member',entityId:t.dataset.memberId,details:t.value});
      ui.render();return;
    }
  });

  document.addEventListener('submit',e=>{
    const form=e.target.closest('form[data-v181-form="transmission"]');if(!form)return;
    e.preventDefault();
    try{
      const payload=dataFromForm(form,store.getState());
      const draft=tx.createDraft(payload);
      tx.prepareSend(draft.id,true);
      ui.modal=null;
      ui.notify(draft.client?.clientId?'Transmission préparée pour l’Interface client. Statut envoyé après accusé du connecteur.':'Transmission préparée. La liaison avec le client doit être fournie par l’Interface client avant confirmation d’envoi.','info');
      ui.render();
    }catch(err){ui.notify(err.message||'Transmission impossible.','error');}
  });

  ui.render();
})();