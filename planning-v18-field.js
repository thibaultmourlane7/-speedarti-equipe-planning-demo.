/* SpeedArti — Terrain / qualifications / remplacements v1.8 */
(()=>{
  const demo=window.__SpeedArtiDemo,core=window.SpeedArtiConductor;
  if(!demo?.ui||!demo?.store||!core||window.__SpeedArtiField18) return;
  window.__SpeedArtiField18=true;
  const ui=demo.ui,store=demo.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short'}).format(new Date(v));}catch{return '—';}};
  const fmtTime=v=>{try{return new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch{return '—';}};
  const nowIso=()=>new Date().toISOString();
  const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
  const ext=s=>{s.conductorV18??={};s.conductorV18.memberQualifications??={};s.conductorV18.scheduleNotices??=[];s.conductorV18.offlineQueue??=[];s.conductorV18.projectConstraints??={};s.conductorV18.presenceActuals??=[];return s.conductorV18;};
  const active=s=>s.members?.find(m=>m.id===s.session?.activeMemberId);
  const mname=(s,id)=>s.members?.find(m=>m.id===id)?.name||'Collaborateur';
  const pname=(s,id)=>s.projects?.find(p=>p.id===id)?.name||'Chantier';
  const resolve=(s,a)=>{const ids=new Set(a.memberIds||[]);for(const cid of a.crewIds||[]){const c=s.crews?.find(x=>x.id===cid);for(const id of c?.memberIds||[])ids.add(id);}return [...ids];};
  const sameDay=(a,b)=>{const x=new Date(a),y=new Date(b);return x.getFullYear()===y.getFullYear()&&x.getMonth()===y.getMonth()&&x.getDate()===y.getDate();};
  const editionExpert=s=>['expert','ultra'].includes(s.settings?.edition);
  const editionUltra=s=>s.settings?.edition==='ultra';

  function brief(s,member){
    const today=(s.assignments||[]).filter(a=>resolve(s,a).includes(member.id)&&sameDay(a.start,new Date())).sort((a,b)=>new Date(a.start)-new Date(b.start));
    const next=today[0]||(s.assignments||[]).filter(a=>resolve(s,a).includes(member.id)&&new Date(a.end)>=new Date()).sort((a,b)=>new Date(a.start)-new Date(b.start))[0];
    if(!next) return '<article class="panel v18-brief"><div><span class="eyebrow">Brief chantier</span><h2>Aucune intervention prévue</h2><p>Votre planning ne contient pas d’intervention future affectée.</p></div></article>';
    const project=s.projects.find(p=>p.id===next.projectId);
    const team=resolve(s,next).map(id=>mname(s,id));
    const weather=(s.planningV17?.weather||[]).find(w=>w.projectId===next.projectId);
    const reservations=(s.planningV17?.resourceReservations||[]).filter(r=>r.assignmentId===next.id);
    const resources=(s.planningV17?.resources||[]).filter(r=>reservations.some(x=>x.resourceId===r.id));
    const requests=(s.requests||[]).filter(r=>r.projectId===next.projectId&&r.status!=='resolved'&&r.type==='material');
    const tasks=(s.tasks||[]).filter(t=>t.projectId===next.projectId&&t.status!=='completed'&&(t.assigneeId===member.id||!t.assigneeId));
    return '<article class="panel v18-brief"><div class="v18-brief-head"><div><span class="eyebrow">Mon brief chantier</span><h2>'+esc(project?.name||next.title)+'</h2><p>'+esc(project?.address||'Adresse non renseignée')+'</p></div><strong>'+fmtTime(next.start)+' → '+fmtTime(next.end)+'</strong></div>'+
      '<div class="v18-brief-grid"><div><span>À faire</span><strong>'+esc(next.title)+'</strong><small>'+esc(next.notes||'Aucune consigne particulière')+'</small></div><div><span>Avec</span><strong>'+esc(team.join(' · ')||'Équipe non affectée')+'</strong></div><div><span>Matériel important</span><strong>'+esc(requests.map(r=>r.title||r.description).join(' · ')||'Aucune demande ouverte')+'</strong></div><div><span>Véhicule / engin</span><strong>'+esc(resources.map(r=>r.label).join(' · ')||'Aucune ressource réservée')+'</strong></div><div><span>Météo</span><strong>'+esc(weather?.summary||'Aucune donnée météo')+'</strong></div><div><span>Tâches</span><strong>'+esc(tasks.map(t=>t.title).join(' · ')||'Aucune tâche spécifique')+'</strong></div></div>'+
      '<small class="v18-source-note">Planning : Agenda Chantier · équipe : Équipe & Planning · météo/matériel uniquement si les données existent.</small></article>';
  }

  function notices(s,member){
    const list=ext(s).scheduleNotices.filter(n=>n.memberId===member.id&&n.status==='unread');
    if(!list.length) return '';
    return '<article class="panel v18-notices"><div class="panel-header"><div><h2>Changement important</h2><p>Confirmez uniquement les modifications qui vous concernent réellement.</p></div></div><div class="v18-notice-list">'+list.map(n=>'<div><div><strong>'+esc(n.title)+'</strong><p>'+esc(n.body)+'</p></div><div><button class="primary" data-v18-field-action="ack-notice" data-id="'+esc(n.id)+'">Vu</button> <button class="secondary" data-v18-field-action="problem-notice" data-id="'+esc(n.id)+'">J’ai un problème</button></div></div>').join('')+'</div></article>';
  }

  function offlinePanel(s){
    const q=ext(s).offlineQueue.filter(x=>x.status!=='synced');
    return '<article class="v18-offline-panel"><span class="v18-online-dot '+(navigator.onLine?'online':'offline')+'"></span><div><strong>'+(navigator.onLine?'Connecté':'Hors connexion')+'</strong><small>'+(navigator.onLine?(q.length?q.length+' action(s) locale(s) prêtes à synchroniser':'Données locales à jour'):'Les rapports, demandes et photos restent enregistrés sur ce téléphone.')+'</small></div></article>';
  }

  const originalField=ui.renderFieldDashboard.bind(ui);
  ui.renderFieldDashboard=function(s,m){return brief(s,m)+notices(s,m)+offlinePanel(s)+originalField(s,m);};

  function qualificationPanel(s){
    const m=active(s);
    if(!['owner','associate','site_manager'].includes(m?.role)) return '';
    const quals=ext(s).memberQualifications;
    return '<article class="panel v18-qual-panel"><div class="panel-header"><div><h2>Compétences & habilitations</h2><p>Informations rares, utilisées seulement lorsqu’une affectation les exige.</p></div></div><div class="v18-qual-list">'+(s.members||[]).filter(x=>x.status==='active').map(x=>{const q=quals[x.id]||{};return '<article><div><strong>'+esc(x.name)+'</strong><small>'+esc([...(q.permits||[]),...(q.certifications||[]),...(q.equipmentAuthorizations||[])].join(' · ')||'Aucune habilitation spécifique')+'</small></div><button class="ghost" data-v18-field-action="edit-qualification" data-id="'+esc(x.id)+'">Modifier</button></article>';}).join('')+'</div></article>';
  }
  const originalTeam=ui.renderTeam.bind(ui);
  ui.renderTeam=function(s){return originalTeam(s)+qualificationPanel(s);};

  function isAvailable(s,m,a){
    if(m.status!=='active') return false;
    const periods=m.availability?.unavailablePeriods||[];
    if(periods.some(p=>new Date(p.start)<new Date(a.end)&&new Date(p.end)>new Date(a.start))) return false;
    const conflict=(s.assignments||[]).some(x=>x.id!==a.id&&resolve(s,x).includes(m.id)&&new Date(x.start)<new Date(a.end)&&new Date(x.end)>new Date(a.start));
    return !conflict;
  }
  function matchesConstraints(s,m,project){
    const c=ext(s).projectConstraints[project.id]||{};
    const q=ext(s).memberQualifications[m.id]||{};
    const skills=project.requiredSkills||[];
    if(skills.some(skill=>!(m.skills||[]).some(x=>x.toLowerCase()===skill.toLowerCase()))) return false;
    if((c.requiredPermits||[]).some(x=>!(q.permits||[]).includes(x))) return false;
    if((c.requiredCertifications||[]).some(x=>!(q.certifications||[]).includes(x))) return false;
    if((c.requiredEquipmentAuthorizations||[]).some(x=>!(q.equipmentAuthorizations||[]).includes(x))) return false;
    return true;
  }
  function replacementPanel(s){
    const m=active(s);if(!['owner','associate','site_manager'].includes(m?.role)||!editionExpert(s)) return '';
    const now=new Date(),risks=[];
    for(const a of (s.assignments||[]).filter(x=>new Date(x.end)>=now)){
      const project=s.projects.find(p=>p.id===a.projectId);if(!project)continue;
      for(const id of resolve(s,a)){
        const assigned=s.members.find(x=>x.id===id);
        if(assigned&&!isAvailable({...s,assignments:(s.assignments||[]).filter(x=>x.id!==a.id)},assigned,a)){
          const candidates=(s.members||[]).filter(x=>x.id!==id&&isAvailable(s,x,a)&&matchesConstraints(s,x,project)).slice(0,3);
          risks.push({a,project,id,candidates});
        }
      }
    }
    if(!risks.length) return '';
    return '<article class="panel v18-replacements"><div class="panel-header"><div><h2>Remplacements à étudier</h2><p>Expert propose des profils compatibles. Ultra peut ensuite optimiser l’ensemble du planning.</p></div></div><div class="v18-list">'+risks.map(r=>'<article class="v18-replace"><div><strong>'+esc(mname(s,r.id))+' indisponible · '+esc(r.a.title)+'</strong><span>'+esc(r.project.name)+'</span><small>Profils compatibles : '+esc(r.candidates.map(x=>x.name).join(', ')||'aucun profil interne identifié')+'</small></div>'+(editionUltra(s)?'<button class="secondary" data-view="pilotage">Optimiser en Ultra</button>':'')+'</article>').join('')+'</div></article>';
  }
  const originalManager=ui.renderSiteManagerDashboard.bind(ui);
  ui.renderSiteManagerDashboard=function(s,m){return originalManager(s,m)+replacementPanel(s);};

  function qualificationForm(s,id){
    const m=s.members.find(x=>x.id===id),q=ext(s).memberQualifications[id]||{};
    const join=x=>(x||[]).join(', ');
    return '<form data-v18-field-form="qualification"><input type="hidden" name="memberId" value="'+esc(id)+'"><h2>Compétences & habilitations — '+esc(m?.name||'')+'</h2><div class="v18-field-form"><label>Permis<input name="permits" value="'+esc(join(q.permits))+'" placeholder="B, BE…"></label><label>Certifications<input name="certifications" value="'+esc(join(q.certifications))+'"></label><label>Véhicules / engins autorisés<input name="equipment" value="'+esc(join(q.equipmentAuthorizations))+'"></label><label>Restrictions<input name="restrictions" value="'+esc(join(q.restrictions))+'"></label></div><div class="modal-actions"><button class="primary">Enregistrer</button></div></form>';
  }

  const style=document.createElement('style');
  style.textContent='.v18-brief{margin-bottom:1rem}.v18-brief-head{display:flex;justify-content:space-between;gap:.8rem;align-items:center}.v18-brief-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.55rem;margin-top:.8rem}.v18-brief-grid>div{border:1px solid var(--border);border-radius:12px;padding:.65rem}.v18-brief-grid span,.v18-brief-grid strong,.v18-brief-grid small{display:block}.v18-brief-grid span,.v18-source-note{font-size:.7rem;color:var(--muted)}.v18-notice-list{display:grid;gap:.5rem}.v18-notice-list>div,.v18-qual-list article,.v18-replace{display:flex;justify-content:space-between;align-items:center;gap:.7rem;border:1px solid var(--border);border-radius:12px;padding:.7rem}.v18-offline-panel{display:flex;gap:.6rem;align-items:center;padding:.7rem;border:1px solid var(--border);border-radius:12px;margin-bottom:1rem}.v18-online-dot{width:10px;height:10px;border-radius:50%;background:#999}.v18-online-dot.online{background:#16a36a}.v18-online-dot.offline{background:#f59e0b}.v18-offline-panel strong,.v18-offline-panel small,.v18-qual-list strong,.v18-qual-list small,.v18-replace strong,.v18-replace span,.v18-replace small{display:block}.v18-field-form{display:grid;gap:.65rem}.v18-field-form label{display:grid;gap:.25rem}@media(max-width:800px){.v18-brief-grid{grid-template-columns:1fr 1fr}}@media(max-width:520px){.v18-brief-head,.v18-notice-list>div,.v18-qual-list article,.v18-replace{align-items:flex-start;flex-direction:column}.v18-brief-grid{grid-template-columns:1fr}}';
  document.head.appendChild(style);

  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-v18-field-action]');if(!t)return;
    const s=store.getState(),action=t.dataset.v18FieldAction;
    if(action==='ack-notice'||action==='problem-notice'){
      store.update(st=>{const n=ext(st).scheduleNotices.find(x=>x.id===t.dataset.id);if(n){n.status=action==='ack-notice'?'seen':'problem';n.respondedAt=nowIso();if(action==='problem-notice')n.problemReason=prompt('Quel est le problème ?')||'';}},{action:'planning.notice.responded',entityType:'schedule_notice',entityId:t.dataset.id,details:action});
      ui.notify(action==='ack-notice'?'Planning consulté.':'Problème signalé.');ui.render();return;
    }
    if(action==='edit-qualification'){ui.modal=qualificationForm(s,t.dataset.id);ui.render();return;}
  });
  document.addEventListener('submit',e=>{
    const form=e.target.closest('form[data-v18-field-form]');if(!form)return;e.preventDefault();const fd=new FormData(form);
    if(form.dataset.v18FieldForm==='qualification'){
      const split=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean),id=String(fd.get('memberId'));
      store.update(s=>{ext(s).memberQualifications[id]={permits:split(fd.get('permits')),certifications:split(fd.get('certifications')),equipmentAuthorizations:split(fd.get('equipment')),restrictions:split(fd.get('restrictions')),updatedAt:nowIso()};},{action:'member.qualifications.updated',entityType:'member',entityId:id});
      ui.modal=null;ui.notify('Habilitations enregistrées.');ui.render();
    }
  });

  /* Détection locale des changements significatifs d'affectation/dates. */
  let previous=new Map((store.getState().assignments||[]).map(a=>[a.id,{start:a.start,end:a.end,memberIds:resolve(store.getState(),a)}]));
  let noticeGuard=false;
  store.addEventListener('change',()=>{
    if(noticeGuard)return;
    const s=store.getState(),changes=[];
    for(const a of s.assignments||[]){
      const old=previous.get(a.id),ids=resolve(s,a);
      if(!old){for(const id of ids)changes.push({a,memberId:id,title:'Nouvelle affectation',body:a.title+' · '+pname(s,a.projectId)});}
      else{
        const dateChanged=old.start!==a.start||old.end!==a.end;
        const oldSet=new Set(old.memberIds),newSet=new Set(ids);
        for(const id of ids)if(dateChanged||!oldSet.has(id))changes.push({a,memberId:id,title:dateChanged?'Horaire / jour modifié':'Affectation modifiée',body:a.title+' · '+pname(s,a.projectId)});
        for(const id of old.memberIds)if(!newSet.has(id))changes.push({a,memberId:id,title:'Affectation retirée',body:a.title+' · '+pname(s,a.projectId)});
      }
    }
    previous=new Map((s.assignments||[]).map(a=>[a.id,{start:a.start,end:a.end,memberIds:resolve(s,a)}]));
    if(changes.length){noticeGuard=true;store.update(st=>{const c=ext(st);for(const ch of changes){if(!c.scheduleNotices.some(n=>n.assignmentId===ch.a.id&&n.memberId===ch.memberId&&n.title===ch.title&&n.status==='unread'))c.scheduleNotices.unshift({id:uid('notice'),assignmentId:ch.a.id,projectId:ch.a.projectId,memberId:ch.memberId,title:ch.title,body:ch.body,status:'unread',createdAt:nowIso()});}},{action:'planning.important_change.detected',entityType:'schedule_notice',entityId:'batch',details:String(changes.length)});noticeGuard=false;}
  });

  /* Suivi local-first : les nouvelles actions terrain restent en attente de connecteur si hors ligne. */
  let counts={reports:(store.getState().reports||[]).length,requests:(store.getState().requests||[]).length,messages:(store.getState().messages||[]).length};
  let offlineGuard=false;
  store.addEventListener('change',()=>{
    if(offlineGuard)return;
    const s=store.getState(),next={reports:(s.reports||[]).length,requests:(s.requests||[]).length,messages:(s.messages||[]).length};
    if(!navigator.onLine){
      const additions=[];
      if(next.reports>counts.reports)additions.push(...(s.reports||[]).slice(0,next.reports-counts.reports).map(x=>({entityType:'report',entityId:x.id})));
      if(next.requests>counts.requests)additions.push(...(s.requests||[]).slice(0,next.requests-counts.requests).map(x=>({entityType:'request',entityId:x.id})));
      if(next.messages>counts.messages)additions.push(...(s.messages||[]).slice(0,next.messages-counts.messages).map(x=>({entityType:'message',entityId:x.id})));
      if(additions.length){offlineGuard=true;store.update(st=>{for(const a of additions)ext(st).offlineQueue.unshift({id:uid('offline'),...a,status:'local_pending',createdAt:nowIso()});},{action:'offline.action.queued',entityType:'offline_queue',entityId:'batch'});offlineGuard=false;}
    }
    counts=next;
  });
  window.addEventListener('online',()=>{store.update(s=>{for(const q of ext(s).offlineQueue.filter(x=>x.status==='local_pending'))q.status='ready_for_sync';},{action:'offline.queue.ready',entityType:'offline_queue',entityId:'batch'});window.dispatchEvent(new CustomEvent('speedarti:conductor:offline-sync-ready',{detail:ext(store.getState()).offlineQueue.filter(x=>x.status==='ready_for_sync')}));ui.render();});
  window.addEventListener('offline',()=>ui.render());

  ui.render();
})();