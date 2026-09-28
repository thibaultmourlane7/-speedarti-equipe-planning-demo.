/* SpeedArti Équipe & Planning — Gantt V1.9
   Vue uniquement : Agenda Chantier reste la source de vérité des dates. */
(()=>{
  const demo=window.__SpeedArtiDemo;
  if(!demo?.ui||!demo?.store||window.__SpeedArtiGanttV19) return;
  window.__SpeedArtiGanttV19=true;
  const ui=demo.ui,store=demo.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DAY=86400000;
  const fmtDay=v=>new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short'}).format(new Date(v));
  const fmtMonth=v=>new Intl.DateTimeFormat('fr-FR',{month:'short',year:'2-digit'}).format(new Date(v));
  const fmtYear=v=>new Intl.DateTimeFormat('fr-FR',{year:'numeric'}).format(new Date(v));
  const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
  const addMonths=(d,n)=>{const x=new Date(d);x.setMonth(x.getMonth()+n);return x;};
  const addYears=(d,n)=>{const x=new Date(d);x.setFullYear(x.getFullYear()+n);return x;};
  const startOfWeek=d=>{const x=startOfDay(d),day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x;};
  const startOfMonth=d=>{const x=startOfDay(d);x.setDate(1);return x;};
  const startOfYear=d=>{const x=startOfDay(d);x.setMonth(0,1);return x;};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  function ensure(state){
    state.planningV19??={};
    const x=state.planningV19;
    x.scale??='week';
    x.anchorDate??=new Date().toISOString();
    x.groupBy??='chantier';
    x.sortBy??='start';
    x.showMilestones??=true;
    x.showDependencies??=true;
    x.showToday??=true;
    return x;
  }
  function activeMember(state){return state.members?.find(m=>m.id===state.session?.activeMemberId)||null;}
  function resolveMembers(state,a){
    const ids=new Set(a.memberIds||[]);
    for(const cid of a.crewIds||[]){const c=state.crews?.find(x=>x.id===cid);for(const id of c?.memberIds||[])ids.add(id);}
    return [...ids];
  }
  function visibleProjectIds(state){
    if(window.SpeedArtiConductor?.visibleProjectIds){
      try{return new Set(window.SpeedArtiConductor.visibleProjectIds());}catch{}
    }
    const m=activeMember(state);if(!m)return new Set();
    if(m.projectAccessMode==='all'||['owner','associate','site_manager'].includes(m.role))return new Set((state.projects||[]).map(p=>p.id));
    if(m.projectAccessMode==='selected')return new Set(m.projectAccessIds||[]);
    const ids=new Set();
    for(const a of state.assignments||[])if(resolveMembers(state,a).includes(m.id))ids.add(a.projectId);
    if(m.role==='team_lead'){
      const ownCrewMembers=new Set([m.id]);
      for(const c of state.crews||[])if((c.memberIds||[]).includes(m.id))for(const id of c.memberIds||[])ownCrewMembers.add(id);
      for(const a of state.assignments||[])if(resolveMembers(state,a).some(id=>ownCrewMembers.has(id)))ids.add(a.projectId);
    }
    return ids;
  }
  function visibleAssignments(state){
    const ids=visibleProjectIds(state);
    return (state.assignments||[]).filter(a=>ids.has(a.projectId)&&Number.isFinite(+new Date(a.start))&&Number.isFinite(+new Date(a.end)));
  }
  function project(state,id){return state.projects?.find(p=>p.id===id)||null;}
  function projectName(state,id){return project(state,id)?.name||'Chantier';}
  function memberName(state,id){return state.members?.find(m=>m.id===id)?.name||'Collaborateur';}
  function crewNames(state,a){return (a.crewIds||[]).map(id=>state.crews?.find(c=>c.id===id)?.name).filter(Boolean);}
  function tradeNames(state,a){return project(state,a.projectId)?.requiredSkills||[];}

  function rangeFor(scale,anchor){
    let start,end,step,label,nav;
    if(scale==='week'){
      start=startOfWeek(anchor);start=addDays(start,-7);
      end=addDays(start,42);step=DAY;label='Semaine';nav={prev:-7,next:7,unit:'days'};
    }else if(scale==='month'){
      start=startOfMonth(anchor);start=addMonths(start,-1);
      end=addMonths(start,6);step=7*DAY;label='Mois';nav={prev:-1,next:1,unit:'months'};
    }else if(scale==='year'){
      start=startOfYear(anchor);
      end=addYears(start,1);step=null;label='Année';nav={prev:-1,next:1,unit:'years'};
    }else{
      start=startOfYear(anchor);
      end=addYears(start,3);step=null;label='N+3';nav={prev:-3,next:3,unit:'years'};
    }
    return {start,end,label,nav,span:+end-+start};
  }
  function moveAnchor(anchor,nav,direction){
    const n=direction==='prev'?nav.prev:nav.next;
    if(nav.unit==='days')return addDays(anchor,n);
    if(nav.unit==='months')return addMonths(anchor,n);
    return addYears(anchor,n);
  }
  function ticks(scale,range){
    const out=[];
    if(scale==='week'){
      for(let d=new Date(range.start);d<range.end;d=addDays(d,1))out.push({at:new Date(d),label:new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'2-digit'}).format(d),major:d.getDay()===1});
    }else if(scale==='month'){
      for(let d=startOfWeek(range.start);d<range.end;d=addDays(d,7))out.push({at:new Date(d),label:'S'+String(weekNumber(d)),major:d.getDate()<=7});
    }else if(scale==='year'){
      for(let d=new Date(range.start);d<range.end;d=addMonths(d,1))out.push({at:new Date(d),label:new Intl.DateTimeFormat('fr-FR',{month:'short'}).format(d),major:true});
    }else{
      for(let d=new Date(range.start);d<range.end;d=addMonths(d,3))out.push({at:new Date(d),label:'T'+(Math.floor(d.getMonth()/3)+1)+' '+d.getFullYear(),major:true});
    }
    return out;
  }
  function weekNumber(d){
    const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);
    const y=new Date(Date.UTC(x.getUTCFullYear(),0,1));
    return Math.ceil((((x-y)/DAY)+1)/7);
  }
  function timelineWidth(scale){return scale==='week'?1680:scale==='month'?1800:scale==='year'?1680:2160;}
  function pct(date,range){return ((+new Date(date)-+range.start)/range.span)*100;}
  function px(date,range,width){return clamp(((+new Date(date)-+range.start)/range.span)*width,0,width);}

  function groupsFor(state,assignments,mode){
    const groups=new Map();
    const add=(key,label,a)=>{
      if(!groups.has(key))groups.set(key,{key,label,items:[]});
      groups.get(key).items.push(a);
    };
    for(const a of assignments){
      if(mode==='collaborateur'){
        const ids=resolveMembers(state,a);(ids.length?ids:['none']).forEach(id=>add('m:'+id,id==='none'?'Sans collaborateur':memberName(state,id),a));
      }else if(mode==='equipe'){
        const names=crewNames(state,a);(names.length?names:['Sans équipe']).forEach(name=>add('c:'+name,name,a));
      }else if(mode==='metier'){
        const names=tradeNames(state,a);(names.length?names:['Métier non précisé']).forEach(name=>add('t:'+name,name,a));
      }else add('p:'+a.projectId,projectName(state,a.projectId),a);
    }
    return [...groups.values()];
  }
  function sortItems(state,items,sortBy){
    const list=[...items];
    if(sortBy==='end')list.sort((a,b)=>new Date(a.end)-new Date(b.end));
    else if(sortBy==='name')list.sort((a,b)=>String(a.title).localeCompare(String(b.title),'fr'));
    else if(sortBy==='team')list.sort((a,b)=>crewNames(state,a).join(',').localeCompare(crewNames(state,b).join(','),'fr'));
    else list.sort((a,b)=>new Date(a.start)-new Date(b.start));
    return list;
  }

  function renderHeader(scale,range,width){
    const ts=ticks(scale,range);
    return '<div class="v19-time-header" style="width:'+width+'px">'+ts.map((t,i)=>{
      const left=px(t.at,range,width);
      const next=i+1<ts.length?px(ts[i+1].at,range,width):width;
      return '<div class="v19-tick '+(t.major?'major':'')+'" style="left:'+left+'px;width:'+Math.max(28,next-left)+'px"><span>'+esc(t.label)+'</span></div>';
    }).join('')+'</div>';
  }

  function renderDependencySvg(state,rows,range,width,rowHeight){
    const ext=state.planningV17||{},deps=ext.dependencies||[];
    if(!deps.length)return '';
    const paths=[];
    for(const d of deps){
      const predIndex=rows.findIndex(r=>r.a.projectId===d.projectId&&String(r.a.title).toLocaleLowerCase('fr-FR').includes(String(d.predecessorLabel||'').toLocaleLowerCase('fr-FR')));
      const succIndex=rows.findIndex(r=>r.a.projectId===d.projectId&&String(r.a.title).toLocaleLowerCase('fr-FR').includes(String(d.successorLabel||'').toLocaleLowerCase('fr-FR')));
      if(predIndex<0||succIndex<0)continue;
      const pred=rows[predIndex].a,succ=rows[succIndex].a;
      const x1=px(pred.end,range,width),x2=px(succ.start,range,width);
      const y1=predIndex*rowHeight+rowHeight/2,y2=succIndex*rowHeight+rowHeight/2;
      const mid=x1+Math.max(12,(x2-x1)/2);
      paths.push('<path d="M '+x1+' '+y1+' H '+mid+' V '+y2+' H '+x2+'" />');
      paths.push('<circle cx="'+x2+'" cy="'+y2+'" r="3" />');
    }
    return paths.length?'<svg class="v19-deps" width="'+width+'" height="'+(rows.length*rowHeight)+'" viewBox="0 0 '+width+' '+(rows.length*rowHeight)+'" preserveAspectRatio="none">'+paths.join('')+'</svg>':'';
  }

  function renderGantt(state){
    const cfg=ensure(state),range=rangeFor(cfg.scale,new Date(cfg.anchorDate)),width=timelineWidth(cfg.scale),rowHeight=54;
    const all=visibleAssignments(state);
    const groups=groupsFor(state,all,cfg.groupBy);
    const rows=[];
    for(const g of groups){
      const items=sortItems(state,g.items,cfg.sortBy);
      for(const a of items)rows.push({group:g.label,a});
    }
    const visibleRows=rows.filter(r=>new Date(r.a.end)>=range.start&&new Date(r.a.start)<=range.end);
    const milestones=(state.planningV17?.milestones||[]).filter(m=>visibleProjectIds(state).has(m.projectId)&&new Date(m.date)>=range.start&&new Date(m.date)<=range.end);
    const today=new Date(),todayVisible=today>=range.start&&today<=range.end;
    const title=cfg.scale==='n3'?'N+3 (3 ans)':range.label;
    const empty=!visibleRows.length;
    return '<section class="panel v19-panel" data-v19-gantt>'+
      '<div class="panel-header"><div><span class="eyebrow">Standard · Gantt chantier</span><h2>Planning Gantt</h2><p>Vue de l’Agenda Chantier : aucune date n’est stockée ailleurs.</p></div><span class="badge badge-info">V1.9</span></div>'+
      '<div class="v19-toolbar">'+
        '<div class="v19-scale" role="group" aria-label="Échelle Gantt">'+
          [['week','Semaine'],['month','Mois'],['year','Année'],['n3','N+3']].map(x=>'<button class="'+(cfg.scale===x[0]?'active':'')+'" data-v19-action="scale" data-scale="'+x[0]+'">'+x[1]+'</button>').join('')+
        '</div>'+
        '<div class="v19-nav"><button class="ghost" data-v19-action="move" data-direction="prev">‹</button><button class="secondary" data-v19-action="today">Aujourd’hui</button><button class="ghost" data-v19-action="move" data-direction="next">›</button></div>'+
        '<label>Regrouper<select data-v19-control="group"><option value="chantier" '+(cfg.groupBy==='chantier'?'selected':'')+'>Chantier</option><option value="collaborateur" '+(cfg.groupBy==='collaborateur'?'selected':'')+'>Collaborateur</option><option value="equipe" '+(cfg.groupBy==='equipe'?'selected':'')+'>Équipe</option><option value="metier" '+(cfg.groupBy==='metier'?'selected':'')+'>Métier</option></select></label>'+
        '<label>Trier<select data-v19-control="sort"><option value="start" '+(cfg.sortBy==='start'?'selected':'')+'>Début</option><option value="end" '+(cfg.sortBy==='end'?'selected':'')+'>Fin</option><option value="name" '+(cfg.sortBy==='name'?'selected':'')+'>Nom</option><option value="team" '+(cfg.sortBy==='team'?'selected':'')+'>Équipe</option></select></label>'+
        '<details class="v19-options"><summary>Affichage</summary><label><input type="checkbox" data-v19-control="milestones" '+(cfg.showMilestones?'checked':'')+'> Jalons</label><label><input type="checkbox" data-v19-control="dependencies" '+(cfg.showDependencies?'checked':'')+'> Dépendances</label><label><input type="checkbox" data-v19-control="today" '+(cfg.showToday?'checked':'')+'> Aujourd’hui</label></details>'+
      '</div>'+
      '<div class="v19-period"><strong>'+esc(title)+'</strong><span>'+fmtDay(range.start)+' → '+fmtDay(range.end)+'</span><small>'+visibleRows.length+' intervention(s) visible(s)</small></div>'+
      (empty?'<div class="v19-empty">Aucune intervention Agenda dans cette période. Utilisez les flèches ou changez d’échelle.</div>':
      '<div class="v19-shell">'+
        '<div class="v19-labels"><div class="v19-label-head">Interventions</div>'+visibleRows.map((r,i)=>{
          const first=i===0||visibleRows[i-1].group!==r.group;
          const members=resolveMembers(state,r.a).map(id=>memberName(state,id));
          return '<div class="v19-label-row">'+(first?'<span class="v19-group-title">'+esc(r.group)+'</span>':'<span class="v19-group-spacer"></span>')+'<button data-v19-assignment="'+esc(r.a.id)+'"><strong>'+esc(r.a.title)+'</strong><small>'+esc(members.join(' · ')||crewNames(state,r.a).join(' · ')||'Non affecté')+'</small></button></div>';
        }).join('')+'</div>'+
        '<div class="v19-scroll" data-v19-scroll><div class="v19-timeline" style="width:'+width+'px">'+renderHeader(cfg.scale,range,width)+
          '<div class="v19-body" style="height:'+(visibleRows.length*rowHeight)+'px">'+
            visibleRows.map((r,i)=>{
              const a=r.a,left=clamp(px(a.start,range,width),0,width),right=clamp(px(a.end,range,width),0,width),barLeft=Math.min(left,right),barWidth=Math.max(8,Math.abs(right-left));
              const clippedStart=new Date(a.start)<range.start,clippedEnd=new Date(a.end)>range.end;
              return '<div class="v19-row-line" style="top:'+(i*rowHeight)+'px;height:'+rowHeight+'px"></div>'+
                '<button class="v19-bar '+(a.status==='completed'?'done':'')+'" data-v19-assignment="'+esc(a.id)+'" style="left:'+barLeft+'px;width:'+barWidth+'px;top:'+(i*rowHeight+12)+'px" title="'+esc(a.title)+' · '+fmtDay(a.start)+' → '+fmtDay(a.end)+'">'+
                (clippedStart?'‹ ':'')+esc(a.title)+(clippedEnd?' ›':'')+'</button>';
            }).join('')+
            (cfg.showMilestones?milestones.map(m=>'<button class="v19-milestone" style="left:'+px(m.date,range,width)+'px" title="'+esc(m.label)+' · '+fmtDay(m.date)+'"><span>◆</span><small>'+esc(m.label)+'</small></button>').join(''):'')+
            (cfg.showToday&&todayVisible?'<div class="v19-today" style="left:'+px(today,range,width)+'px"><span>Aujourd’hui</span></div>':'')+
            (cfg.showDependencies?renderDependencySvg(state,visibleRows,range,width,rowHeight):'')+
          '</div></div></div>'+
      '</div>')+
      '<div class="v19-legend"><span><i class="bar"></i> Intervention Agenda</span><span><i class="diamond">◆</i> Jalon</span><span><i class="line"></i> Dépendance</span><small>Cliquer une barre ouvre l’intervention existante. Les dates restent gérées dans Agenda Chantier.</small></div>'+
    '</section>';
  }

  const style=document.createElement('style');
  style.textContent=`
  .v17-details[data-v17-lite-gantt]{display:none!important}
  .v19-panel{margin-top:1rem}.v19-toolbar{display:flex;align-items:end;gap:.55rem;flex-wrap:wrap;margin:.8rem 0}.v19-toolbar label{display:grid;gap:.2rem;font-size:.72rem;font-weight:800}.v19-toolbar select{min-width:135px}.v19-scale{display:flex;border:1px solid var(--border);border-radius:10px;overflow:hidden}.v19-scale button{border:0;border-right:1px solid var(--border);background:#fff;padding:.52rem .7rem;font-weight:800}.v19-scale button:last-child{border-right:0}.v19-scale button.active{background:#eaf2ff;color:var(--blue)}.v19-nav{display:flex;gap:.25rem}.v19-period{display:flex;gap:.7rem;align-items:baseline;flex-wrap:wrap;margin:.4rem 0 .7rem}.v19-period span,.v19-period small{color:var(--muted)}.v19-shell{display:grid;grid-template-columns:260px minmax(0,1fr);border:1px solid var(--border);border-radius:14px;overflow:hidden;background:#fff}.v19-labels{position:relative;z-index:5;border-right:1px solid var(--border);background:#fff}.v19-label-head{height:46px;display:flex;align-items:center;padding:0 .7rem;font-size:.74rem;font-weight:900;background:#f6f8fb;border-bottom:1px solid var(--border)}.v19-label-row{height:54px;border-bottom:1px solid #eef1f5;padding:.25rem .45rem;overflow:hidden}.v19-label-row button{width:100%;border:0;background:transparent;text-align:left;padding:0}.v19-label-row strong,.v19-label-row small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v19-label-row strong{font-size:.77rem}.v19-label-row small{font-size:.66rem;color:var(--muted)}.v19-group-title{display:block;font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:var(--blue);line-height:12px}.v19-group-spacer{display:block;height:12px}.v19-scroll{overflow:auto;position:relative}.v19-timeline{position:relative;min-width:100%}.v19-time-header{height:46px;position:relative;background:#f6f8fb;border-bottom:1px solid var(--border);overflow:hidden}.v19-tick{position:absolute;top:0;bottom:0;border-right:1px solid #e7ebf0;padding:.3rem .25rem}.v19-tick.major{background:#f1f5fa}.v19-tick span{font-size:.63rem;font-weight:800;white-space:nowrap}.v19-body{position:relative;background-image:linear-gradient(to right,#f0f2f5 1px,transparent 1px);background-size:56px 100%}.v19-row-line{position:absolute;left:0;right:0;border-bottom:1px solid #eef1f5}.v19-bar{position:absolute;height:30px;min-height:30px;border:0;border-radius:8px;background:var(--blue);color:#fff;font-size:.69rem;font-weight:850;text-align:left;padding:0 .55rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;z-index:3;box-shadow:0 2px 5px #0002}.v19-bar.done{opacity:.55}.v19-milestone{position:absolute;top:0;bottom:0;width:2px;border:0;background:transparent;border-left:1px dashed #9b7b00;z-index:4;padding:0}.v19-milestone span{position:absolute;top:2px;left:-7px;font-size:14px}.v19-milestone small{position:absolute;top:18px;left:4px;font-size:.58rem;font-weight:800;white-space:nowrap;background:#fff8;padding:1px 3px}.v19-today{position:absolute;top:0;bottom:0;width:2px;background:#e53935;z-index:5}.v19-today span{position:absolute;top:2px;left:4px;background:#fff;color:#b91c1c;font-size:.58rem;font-weight:900;padding:2px 4px;border-radius:5px;white-space:nowrap}.v19-deps{position:absolute;left:0;top:0;pointer-events:none;z-index:2}.v19-deps path{fill:none;stroke:#68778a;stroke-width:1.5;stroke-dasharray:4 3}.v19-deps circle{fill:#68778a}.v19-options{font-size:.72rem}.v19-options summary{font-weight:800;cursor:pointer}.v19-options label{display:block;margin:.25rem 0;font-weight:600}.v19-legend{display:flex;gap:.8rem;flex-wrap:wrap;align-items:center;margin-top:.65rem;font-size:.68rem;color:var(--muted)}.v19-legend i{display:inline-block;margin-right:.25rem}.v19-legend .bar{width:20px;height:7px;border-radius:5px;background:var(--blue)}.v19-legend .line{width:20px;border-top:1px dashed #68778a}.v19-legend .diamond{font-style:normal}.v19-empty{padding:1.2rem;border:1px dashed var(--border);border-radius:12px;text-align:center;color:var(--muted)}
  @media(max-width:800px){.v19-shell{grid-template-columns:190px minmax(0,1fr)}.v19-toolbar>*{flex:1 1 auto}.v19-scale{width:100%}.v19-scale button{flex:1}.v19-label-row strong{font-size:.72rem}.v19-label-row small{font-size:.62rem}}
  @media(max-width:540px){.v19-shell{grid-template-columns:145px minmax(0,1fr)}.v19-label-head{padding:0 .4rem}.v19-label-row{padding:.25rem}.v19-toolbar label{width:100%}.v19-toolbar select{width:100%}}
  `;
  document.head.appendChild(style);

  const original=ui.renderPlanning.bind(ui);
  ui.renderPlanning=function(state){return renderGantt(state)+original(state);};

  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-v19-action],[data-v19-assignment]');if(!t)return;
    const state=store.getState(),cfg=ensure(state);
    if(t.dataset.v19Assignment){
      if(typeof ui.openAssignmentForm==='function'){ui.openAssignmentForm(state,t.dataset.v19Assignment);ui.render();}
      return;
    }
    const action=t.dataset.v19Action;
    if(action==='scale'){store.update(s=>{ensure(s).scale=t.dataset.scale;},{action:'planning.gantt.scale',entityType:'planning',entityId:'gantt',details:t.dataset.scale});ui.render();return;}
    if(action==='today'){store.update(s=>{ensure(s).anchorDate=new Date().toISOString();},{action:'planning.gantt.today',entityType:'planning',entityId:'gantt'});ui.render();return;}
    if(action==='move'){
      const r=rangeFor(cfg.scale,new Date(cfg.anchorDate)),next=moveAnchor(new Date(cfg.anchorDate),r.nav,t.dataset.direction);
      store.update(s=>{ensure(s).anchorDate=next.toISOString();},{action:'planning.gantt.navigate',entityType:'planning',entityId:'gantt',details:t.dataset.direction});ui.render();return;
    }
  });
  document.addEventListener('change',e=>{
    const t=e.target.closest('[data-v19-control]');if(!t)return;
    const c=t.dataset.v19Control;
    store.update(s=>{const x=ensure(s);if(c==='group')x.groupBy=t.value;if(c==='sort')x.sortBy=t.value;if(c==='milestones')x.showMilestones=t.checked;if(c==='dependencies')x.showDependencies=t.checked;if(c==='today')x.showToday=t.checked;},{action:'planning.gantt.option',entityType:'planning',entityId:'gantt',details:c});
    ui.render();
  });

  window.SpeedArtiGanttV19={
    version:'1.9.0',
    sourceOfTruth:'Agenda Chantier',
    scales:['week','month','year','n3'],
    getConfig:()=>structuredClone(ensure(store.getState()))
  };
  ui.render();
})();