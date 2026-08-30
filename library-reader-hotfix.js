/* Sixgun Retriever 2.10.9 — text-only Library reader + full reference tables */
(function(){
  'use strict';
  const VERSION='2.10.9';

  function addStyles(){
    if(document.getElementById('srLibraryReaderHotfixStyles')) return;
    const style=document.createElement('style');
    style.id='srLibraryReaderHotfixStyles';
    style.textContent=`
      .article-reader-modes{display:none!important}
      .article-reader-bar{justify-content:flex-start!important}
      .article-page-label,.article-note{display:none!important}
      .article-page{margin-top:0!important}
      .article-card{grid-template-columns:1fr!important}
      .article-card-cover{display:none!important}
      #libraryResults>.fragment-table{display:none!important}
      .sr-reference-tables{margin-top:14px}
      .sr-reference-table{background:linear-gradient(158deg,var(--bg2),var(--bg3));border:1px solid var(--line);border-radius:14px;margin-bottom:14px;overflow:hidden;position:relative}
      .sr-reference-table:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--brass)}
      .sr-reference-head{padding:16px 16px 12px}
      .sr-reference-kicker{font:700 9px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--brass)}
      .sr-reference-title{font:700 20px/1.2 Bitter,serif;margin-top:6px;color:var(--ink)}
      .sr-reference-src{font:italic 12px/1.4 Bitter,serif;color:var(--ink-faint);margin-top:6px}
      .sr-reference-conditions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
      .sr-reference-cond{font-size:10px;font-weight:600;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:4px 8px}
      .sr-reference-cond b{color:var(--ink-faint);font-size:8px;letter-spacing:.06em;text-transform:uppercase;margin-right:4px}
      .sr-reference-table .ltable-body{padding:4px 16px 14px;overflow-x:auto;-webkit-overflow-scrolling:touch}
      .sr-reference-table .ltable-note{padding:12px 16px;border-top:1px dashed var(--line);color:var(--ink-faint);font-size:11px;line-height:1.45}
      .sr-reference-tags{display:flex;gap:5px;flex-wrap:wrap;padding:12px 16px;border-top:1px dashed var(--line)}
      .sr-reference-tags span{border:1px solid var(--line);border-radius:999px;background:var(--bg);padding:3px 7px;color:var(--ink-faint);font-size:9px}
    `;
    document.head.appendChild(style);
  }

  function patchTagline(){
    const tagline=document.querySelector('.lib-tagline');
    if(tagline) tagline.textContent='A working archive of sixgun knowledge.';
  }

  function escText(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function tableMarkup(item){
    const t=item.data||item;
    const tags=item.tags||[];
    const ch=Math.max(0,(t.head||[]).indexOf('Charge'));
    const cond=[];
    if(t.powders&&t.powders.length) cond.push(`<span class="sr-reference-cond"><b>Powder</b>${escText(t.powders.join(', '))}</span>`);
    (t.conditions||[]).forEach(pair=>{if(Array.isArray(pair))cond.push(`<span class="sr-reference-cond"><b>${escText(pair[0])}</b>${escText(pair[1])}</span>`);});
    if(t.cartridge) cond.push(`<span class="sr-reference-cond"><b>Cartridge</b>${escText(t.cartridge)}</span>`);
    return `<section class="sr-reference-table">
      <div class="sr-reference-head">
        <div class="sr-reference-kicker">Reference table</div>
        <div class="sr-reference-title">${escText(t.title)}</div>
        <div class="sr-reference-src">${escText(t.who)} · ${escText(t.source)}</div>
        ${cond.length?`<div class="sr-reference-conditions">${cond.join('')}</div>`:''}
      </div>
      <div class="ltable-body"><table class="ldata"><thead><tr>${(t.head||[]).map(h=>`<th>${escText(h)}</th>`).join('')}</tr></thead><tbody>${(t.rows||[]).map((r,i)=>`<tr>${r.map((c,ci)=>`<td class="${i===t.maxRow&&ci===ch?'max':''}">${escText(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${t.note?`<div class="ltable-note">${escText(t.note)}</div>`:''}
      ${tags.length?`<div class="sr-reference-tags">${tags.map(x=>`<span>${escText(x)}</span>`).join('')}</div>`:''}
    </section>`;
  }

  function renderReferenceTables(){
    const results=document.getElementById('libraryResults');
    if(!results) return;
    let host=document.getElementById('srReferenceTables');
    if(!host){
      host=document.createElement('div');
      host.id='srReferenceTables';
      host.className='sr-reference-tables';
      results.parentNode.insertBefore(host,results);
    }
    try{
      const items=(typeof libraryFilteredItems==='function'?libraryFilteredItems():[]).filter(x=>x.subtype==='table');
      host.style.display=(typeof libraryView!=='undefined'&&libraryView==='articles')?'none':'';
      host.innerHTML=host.style.display==='none'?'':items.map(tableMarkup).join('');
    }catch(e){
      console.warn('Reference table render',e);
      host.innerHTML='';
    }
  }

  function watchLibrary(){
    const results=document.getElementById('libraryResults');
    if(!results||results.__srTableWatch)return;
    results.__srTableWatch=true;
    let queued=false;
    const refresh=()=>{queued=false;renderReferenceTables();};
    new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(refresh);}}).observe(results,{childList:true});
    document.addEventListener('click',e=>{if(e.target.closest('[data-library-view],[data-library-tag]'))setTimeout(renderReferenceTables,0);});
    const search=document.getElementById('librarySearch');
    if(search)search.addEventListener('input',()=>setTimeout(renderReferenceTables,0));
    renderReferenceTables();
  }

  function patchReader(){
    try{
      if(typeof renderArticleReader==='function' && !renderArticleReader.__srTextOnly){
        const baseRender=renderArticleReader;
        const patchedRender=function(){articleMode='text';return baseRender.apply(this,arguments);};
        patchedRender.__srTextOnly=true;
        renderArticleReader=patchedRender;
      }
      if(typeof openArticle==='function' && !openArticle.__srTextOnly){
        const patchedOpen=function(id){
          openArticleId=id;articleMode='text';
          const reader=document.getElementById('articleReader');if(!reader)return;
          reader.hidden=false;document.body.style.overflow='hidden';renderArticleReader();
          const close=document.getElementById('articleReaderClose');if(close)close.focus();
        };
        patchedOpen.__srTextOnly=true;openArticle=patchedOpen;
      }
    }catch(e){console.warn('Library text-only patch',e);}
    document.querySelectorAll('.article-reader-modes').forEach(el=>el.remove());
  }

  function stampVersion(){
    document.querySelectorAll('.landing-version').forEach(el=>{if(/v?\d+\.\d+\.\d+/i.test(el.textContent))el.textContent=el.textContent.replace(/v?\d+\.\d+\.\d+/i,'Version '+VERSION);});
  }

  function init(){addStyles();patchTagline();patchReader();watchLibrary();stampVersion();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
