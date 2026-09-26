/* SpeedArti Équipe & Planning — contrats de raccordement v1.7
   Préparation uniquement : aucun appel réseau ni connexion réelle. */
(()=>{
  const ns=window.__SpeedArtiPlanningV17=window.__SpeedArtiPlanningV17||{};
  const demo=window.__SpeedArtiDemo;
  if(!demo?.ui||!demo?.store||ns.contractsInstalled) return;
  ns.contractsInstalled=true;
  const ui=demo.ui,store=demo.store;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid17=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  const ensure=state=>{
    state.planningV17??={};
    state.planningV17.needs??=[];
    state.planningV17.weather??=[];
    state.planningV17.routes??=[];
    state.planningV17.resources??=[];
    state.planningV17.connectorStatus??={};
    return state.planningV17;
  };
  const CONTRACTS=Object.freeze({
    chiffrage:{
      event:'speedarti:planning-v17:chiffrage',
      direction:'entrant',
      sourceOfTruth:'Chiffrage SpeedArti',
      purpose:'Recevoir heures prévues, phases, compétences, effectif et contraintes validées.',
      schema:{
        schemaVersion:'1.0',projectId:'string',sourceId:'string',
        phases:'Array<{phaseId:string,label:string,plannedHours:number,requiredSkills:string[],requiredHeadcount:number|null,earliestStart:string|null,latestEnd:string|null}>'
      }
    },
    meteo:{
      event:'speedarti:planning-v17:meteo',
      direction:'entrant',
      sourceOfTruth:'Connecteur météo SpeedArti',
      purpose:'Afficher une météo chantier horodatée et un éventuel risque planning fourni par la source.',
      schema:{schemaVersion:'1.0',items:'Array<{projectId,date,summary,planningRisk,riskLevel,precipitationRiskPct,windKmh,sourceTimestamp}>'}
    },
    cartographie:{
      event:'speedarti:planning-v17:cartographie',
      direction:'entrant',
      sourceOfTruth:'Connecteur cartographie SpeedArti',
      purpose:'Recevoir distances et durées de trajet déjà calculées ; aucune géolocalisation cachée.',
      schema:{schemaVersion:'1.0',routes:'Array<{memberId,projectId,travelMinutes,distanceKm,fromLabel,toLabel,sourceTimestamp}>'}
    },
    parc_materiel:{
      event:'speedarti:planning-v17:parc-materiel',
      direction:'entrant',
      sourceOfTruth:'Futur Parc matériel/véhicules SpeedArti',
      purpose:'Recevoir véhicules, engins et gros matériel planifiables distincts du stock consommable.',
      schema:{schemaVersion:'1.0',resources:'Array<{id,type,label,reference,status}>'}
    }
  });

  const assertProject=(state,id)=>{
    if(!id||!state.projects?.some(p=>p.id===id)) throw new Error('Chantier inconnu : '+String(id||'non fourni'));
  };
  const finiteOrNull=v=>v==null||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
  const applyChiffrage=payload=>{
    if(payload?.schemaVersion!=='1.0'||!Array.isArray(payload.phases)) throw new Error('Contrat Chiffrage incompatible.');
    const state=store.getState();assertProject(state,payload.projectId);
    const valid=payload.phases.map(p=>{
      const hours=finiteOrNull(p.plannedHours);
      if(!p.phaseId||!p.label||hours==null||hours<0) throw new Error('Phase Chiffrage invalide.');
      const headcount=p.requiredHeadcount==null?null:Number(p.requiredHeadcount);
      if(headcount!=null&&(!Number.isInteger(headcount)||headcount<1)) throw new Error('Effectif Chiffrage invalide.');
      if(p.requiredSkills!=null&&!Array.isArray(p.requiredSkills)) throw new Error('Compétences Chiffrage invalides.');
      return {...p,plannedHours:hours,requiredHeadcount:headcount,requiredSkills:(p.requiredSkills||[]).map(String)};
    });
    store.update(s=>{
      const ext=ensure(s);
      for(const p of valid){
        const id='chiffrage:'+String(payload.sourceId||payload.projectId)+':'+p.phaseId;
        const current=ext.needs.find(n=>n.id===id);
        const record={
          id,source:'chiffrage',sourceId:String(payload.sourceId||''),phaseId:String(p.phaseId),
          projectId:String(payload.projectId),phaseLabel:String(p.label),plannedHours:p.plannedHours,
          headcount:p.requiredHeadcount,requiredSkills:p.requiredSkills,
          neededAt:p.earliestStart?String(p.earliestStart).slice(0,10):null,
          latestEnd:p.latestEnd||null,status:'open',note:'Besoin reçu du Chiffrage SpeedArti'
        };
        if(current) Object.assign(current,record); else ext.needs.unshift(record);
      }
      ext.connectorStatus.chiffrage={receivedAt:new Date().toISOString(),sourceId:String(payload.sourceId||'')};
    },{action:'planning.connector.chiffrage.received',entityType:'integration',entityId:'chiffrage',details:`${valid.length} phase(s)`});
    return valid.length;
  };
  const applyWeather=payload=>{
    if(payload?.schemaVersion!=='1.0'||!Array.isArray(payload.items)) throw new Error('Contrat Météo incompatible.');
    const state=store.getState();
    const items=payload.items.map(x=>{
      assertProject(state,x.projectId);
      if(!x.sourceTimestamp) throw new Error('Horodatage météo obligatoire.');
      return {
        projectId:String(x.projectId),date:String(x.date||''),summary:String(x.summary||''),
        planningRisk:x.planningRisk===true,riskLevel:x.riskLevel?String(x.riskLevel):null,
        precipitationRiskPct:finiteOrNull(x.precipitationRiskPct),windKmh:finiteOrNull(x.windKmh),
        sourceTimestamp:String(x.sourceTimestamp)
      };
    });
    store.update(s=>{const ext=ensure(s);ext.weather=items;ext.connectorStatus.meteo={receivedAt:new Date().toISOString(),count:items.length};},{action:'planning.connector.weather.received',entityType:'integration',entityId:'meteo',details:`${items.length} élément(s)`});
    return items.length;
  };
  const applyRoutes=payload=>{
    if(payload?.schemaVersion!=='1.0'||!Array.isArray(payload.routes)) throw new Error('Contrat Cartographie incompatible.');
    const state=store.getState();
    const routes=payload.routes.map(x=>{
      assertProject(state,x.projectId);
      if(x.memberId&&!state.members?.some(m=>m.id===x.memberId)) throw new Error('Collaborateur cartographie inconnu.');
      const mins=finiteOrNull(x.travelMinutes),km=finiteOrNull(x.distanceKm);
      if(mins==null||mins<0) throw new Error('Temps de trajet invalide.');
      return {memberId:x.memberId?String(x.memberId):null,projectId:String(x.projectId),travelMinutes:mins,distanceKm:km,fromLabel:String(x.fromLabel||''),toLabel:String(x.toLabel||''),sourceTimestamp:String(x.sourceTimestamp||'')};
    });
    store.update(s=>{const ext=ensure(s);ext.routes=routes;ext.connectorStatus.cartographie={receivedAt:new Date().toISOString(),count:routes.length};},{action:'planning.connector.routes.received',entityType:'integration',entityId:'cartographie',details:`${routes.length} trajet(s)`});
    return routes.length;
  };
  const applyFleet=payload=>{
    if(payload?.schemaVersion!=='1.0'||!Array.isArray(payload.resources)) throw new Error('Contrat Parc matériel incompatible.');
    const resources=payload.resources.map(x=>{
      if(!x.id||!x.type||!x.label) throw new Error('Ressource Parc matériel invalide.');
      return {id:String(x.id),type:String(x.type),label:String(x.label),reference:String(x.reference||''),status:String(x.status||'active'),source:'parc_materiel'};
    });
    store.update(s=>{const ext=ensure(s);const manual=ext.resources.filter(r=>r.source!=='parc_materiel');ext.resources=[...manual,...resources];ext.connectorStatus.parc_materiel={receivedAt:new Date().toISOString(),count:resources.length};},{action:'planning.connector.fleet.received',entityType:'integration',entityId:'parc_materiel',details:`${resources.length} ressource(s)`});
    return resources.length;
  };
  const handlers={chiffrage:applyChiffrage,meteo:applyWeather,cartographie:applyRoutes,parc_materiel:applyFleet};
  const applySnapshot=(name,payload)=>{
    if(!handlers[name]) throw new Error('Connecteur v1.7 inconnu.');
    return handlers[name](payload);
  };
  for(const [name,contract] of Object.entries(CONTRACTS)){
    window.addEventListener(contract.event,event=>{
      try{const count=applySnapshot(name,event.detail||{});ui.notify(`${contract.sourceOfTruth} : ${count} donnée(s) reçue(s).`,'info');}
      catch(error){ui.notify(error instanceof Error?error.message:'Donnée connecteur invalide.','error');}
    });
  }

  const preparationBundle=()=>({
    version:'1.7.0',
    mode:'contracts_only_no_live_connection',
    contracts:CONTRACTS,
    sourceOfTruth:{
      dates:'Agenda Chantier SpeedArti',
      estimatedHoursAndPhases:'Chiffrage SpeedArti',
      employeesAndAbsences:'RH SpeedArti',
      consumables:'Stock/Catalogue SpeedArti',
      vehiclesAndEquipment:'Parc matériel/véhicules lorsqu’il existera',
      weather:'Connecteur météo',
      travel:'Connecteur cartographie'
    },
    safety:{
      humanValidationForPlanningChanges:true,
      noSecondCalendar:true,
      noInventedCriticalData:true,
      noAutomaticOrder:true,
      noLocalAngelButton:true
    }
  });
  window.SpeedArtiPlanningV17Contracts={version:'1.7.0',contracts:CONTRACTS,applySnapshot,exportPreparationBundle:preparationBundle};

  const renderContracts=state=>{
    const ext=ensure(state);
    return `<article class="panel v17-contract-panel"><div class="panel-header"><div><span class="eyebrow">Préparation intégration</span><h2>Connecteurs Équipe & Planning v1.7</h2><p>Contrats prêts uniquement. Aucune API réelle n’est appelée depuis cette démonstration.</p></div><span class="badge badge-neutral">Non connecté</span></div>
      <div class="v17-list">${Object.entries(CONTRACTS).map(([name,c])=>{const st=ext.connectorStatus[name];return `<article><div><strong>${esc(c.sourceOfTruth)}</strong><p>${esc(c.purpose)}</p><small>${esc(c.direction)} · ${st?.receivedAt?'Dernier test : '+esc(st.receivedAt):'Aucun snapshot reçu'}</small></div></article>`;}).join('')}</div>
      <div class="forecast-rule-note"><strong>Chiffrage → Planning :</strong> les heures, phases, compétences et effectifs restent des données de Chiffrage. Équipe & Planning les consomme sans les réinventer.</div>
    </article>`;
  };
  const originalSettings=ui.renderSettings.bind(ui);
  ui.renderSettings=function(state){return originalSettings(state)+renderContracts(state);};

  ns.contractsLoaded=true;
  window.dispatchEvent(new CustomEvent('speedarti:planning-v17:ready',{detail:preparationBundle()}));
  ui.render();
})();