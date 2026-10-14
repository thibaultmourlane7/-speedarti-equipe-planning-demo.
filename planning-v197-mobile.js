/* SpeedArti — Mobile responsive V1.9.8. Presentation only.
   Agenda Chantier is source of truth; pointage belongs to Temps & Presence. */
(()=>{
  'use strict';
  const demo=window.__SpeedArtiDemo;
  if(!demo?.ui||!demo?.store||window.__SpeedArtiMobileV197)return;
  const ui=demo.ui;
  let drawerOpen=false;
  const isPhone=()=>window.matchMedia('(max-width: 700px)').matches;
  const sections=[['today','⌂',"Aujourd'hui"],['planning','▦','Planning'],['projects','🏗','Chantiers'],['attention','✓','À traiter']];

  const link=document.createElement('link');
  link.rel='stylesheet';link.href='./planning-v197-mobile.css?v=1.9.8';
  document.head.appendChild(link);

  function patchMobile(){
    const shell=ui.root.querySelector('.app-shell');if(!shell)return;
    shell.classList.add('v197-responsive-shell');
    const mobile=isPhone();
    if(!mobile)drawerOpen=false;
    shell.classList.toggle('v197-drawer-open',mobile&&drawerOpen);
    const sidebar=shell.querySelector('.sidebar');
    if(sidebar){
      sidebar.setAttribute('aria-label','Menu complet SpeedArti');
      sidebar.setAttribute('aria-hidden',mobile&&!drawerOpen?'true':'false');
      if(mobile&&!drawerOpen)sidebar.setAttribute('inert','');
      else sidebar.removeAttribute('inert');
      if(!sidebar.querySelector('.v197-drawer-close')){
        const close=document.createElement('button');
        close.type='button';close.className='v197-drawer-close';
        close.dataset.v197Action='close';close.textContent='✕ Fermer';
        close.setAttribute('aria-label','Fermer le menu');
        sidebar.insertBefore(close,sidebar.querySelector('nav'));
      }
    }
    let overlay=shell.querySelector('.v197-drawer-backdrop');
    if(!overlay){
      overlay=document.createElement('button');
      overlay.type='button';overlay.className='v197-drawer-backdrop';
      overlay.dataset.v197Action='close';
      overlay.setAttribute('aria-label','Fermer le menu');
      shell.insertBefore(overlay,shell.querySelector('.workspace'));
    }
    overlay.hidden=!mobile||!drawerOpen;
    const master=shell.querySelector('.v191-sidebar-master-toggle');
    if(master&&mobile){
      master.removeAttribute('data-v191-action');
      master.dataset.v197Action='toggle';
      master.textContent=drawerOpen?'✕':'☰';
      master.setAttribute('aria-label',drawerOpen?'Fermer le menu':'Afficher toutes les fonctionnalités');
      master.setAttribute('aria-expanded',drawerOpen?'true':'false');
      master.title=drawerOpen?'Fermer le menu':'Menu complet';
    }
    let bottom=shell.querySelector('.v197-bottom-nav');
    if(!bottom){
      bottom=document.createElement('nav');bottom.className='v197-bottom-nav';
      bottom.setAttribute('aria-label','Navigation principale sur téléphone');
      shell.appendChild(bottom);
    }
    const current=ui.view==='dashboard'&&!ui.v191LegacyDashboard?ui.v191Section:'';
    bottom.innerHTML=sections.map(([id,icon,label])=>'<button type="button" data-v197-nav="'+id+'" '+(current===id?'class="active" aria-current="page"':'')+' aria-label="'+label+'"><span class="v197-nav-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></button>').join('');
  }
  const originalRender=ui.render.bind(ui);
  ui.render=function(){originalRender();patchMobile();};
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-v197-action]');
    if(button&&isPhone()){
      event.preventDefault();
      const action=button.dataset.v197Action;
      if(action==='toggle')drawerOpen=!drawerOpen;
      if(action==='close')drawerOpen=false;
      ui.render();return;
    }
    const nav=event.target.closest('[data-v197-nav]');
    if(nav&&isPhone()){
      event.preventDefault();drawerOpen=false;
      ui.v191Section=nav.dataset.v197Nav;
      ui.v191LegacyDashboard=false;ui.v191PlanningAdvanced=false;
      ui.view='dashboard';ui.render();return;
    }
  });
  document.addEventListener('click',event=>{
    if(isPhone()&&event.target.closest('.sidebar [data-v191-nav], .sidebar [data-v191-legacy-view]'))drawerOpen=false;
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&drawerOpen){drawerOpen=false;ui.render();}
  });
  window.addEventListener('resize',()=>{
    if(!isPhone()&&drawerOpen){drawerOpen=false;ui.render();}
  });
  window.__SpeedArtiMobileV197={version:'1.9.8',viewportThreshold:700,features:['full-width-phone','bottom-navigation','drawer-menu','responsive-cards','responsive-forms']};
  ui.render();
})();