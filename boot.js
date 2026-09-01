(async()=>{
  try {
    const b64=(window.__SPEEDARTI_EQUIPE_PAYLOAD||[]).join('');
    if(!b64) throw new Error('Données de démonstration absentes.');
    const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    if(!('DecompressionStream' in window)) throw new Error('Ce navigateur est trop ancien pour ouvrir la démonstration.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const html=await new Response(stream).text();
    document.open();document.write(html);document.close();
  } catch(error) {
    console.error(error);
    document.body.innerHTML='<main class="error"><h1>Chargement impossible</h1><p>'+String(error.message||error)+'</p><p>Actualisez la page ou ouvrez-la avec Safari, Chrome ou Edge à jour.</p></main>';
  }
})();
