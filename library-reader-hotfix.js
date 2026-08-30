/* Sixgun Retriever 2.11.0 — Library / Tables split */
(function(){
  'use strict';
  const VERSION='2.11.0';
  let srMode='library';
  let tableQuery='';
  let tablePowder='all';
  let tableCartridge='all';
  let tableWriter='all';
  let tableSort='title';

  function escText(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function plain(v){return String(v??'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}

  function addStyles(){
    if(document.getElementById('srLibraryReaderHotfixStyles'))return;
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

      .sr-library-mode-nav{display:flex;gap:4px;margin:18px 0 12px;padding:4px;border:1px solid var(--line);border-radius:13px;background:var(--bg2)}
      .sr-library-mode-btn{flex:1;border:0;border-radius:9px;background:none;color:var(--ink-faint);padding:11px 8px;font:700 14px Bitter,serif;cursor:pointer}
      .sr-library-mode-btn.on{background:var(--brass);color:#241d0e}

      .sr-tables-panel{display:none}
      .sr-tables-panel.on{display:block}
      .sr-table-search{display:grid;grid-template-columns:21px 1fr;align-items:center;gap:8px;margin:12px 0 10px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg2)}
      .sr-table-search svg{width:19px;height:19px;fill:none;stroke:var(--ink-faint);stroke-width:1.8;stroke-linecap:round}
      .sr-table-search input{width:100%;border:0;background:none;color:var(--ink);padding:13px 0;font:500 13px Inter,sans-serif;outline:0}
      .sr-table-search input::placeholder{color:var(--ink-faint)}
      .sr-table-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px}
      .sr-table-control{min-width:0}
      .sr-table-control label{display:block;margin:0 0 4px 3px;font:700 8px/1 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
      .sr-table-control select{width:100%;min-width:0;border:1px solid var(--line);border-radius:10px;background:var(--bg2);color:var(--ink);padding:10px 9px;font:600 11px Inter,sans-serif;outline:0}
      .sr-table-count{margin:12px 4px;color:var(--ink-faint);font-size:12px}.sr-table-count b{color:var(--brass)}
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
      .sr-reference-table .ldata{min-width:520px}
      .sr-reference-table .ltable-note{padding:12px 16px;border-top:1px dashed var(--line);color:var(--ink-faint);font-size:11px;line-height:1.45}
      .sr-reference-empty{text-align:center;padding:44px 18px;color:var(--ink-faint);font:italic 14px/1.5 Bitter,serif}
      @media(max-width:520px){.sr-table-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.sr-reference-title{font-size:18px}}
    `;
    document.head.appendChild(style);
  }

  function patchTagline(){const tagline=document.querySelector('.lib-tagline');if(tagline)tagline.textContent='A working archive of sixgun knowledge.';}

  function patchLibraryItems(){
    try{
      if(typeof libraryItems==='function'&&!libraryItems.__srNoTables){
        const patched=function(){
          const articles=LIB_ARTICLES.map(a=>({kind:'article',data:a,tags:libraryArticleTags(a),search:libraryPlainText([a.title,a.author,a.publication,a.date,a.department,a.summary,a.tags,a.cartridges,a.transcript?.map(s=>s.html)].flat().join(' ')).toLowerCase()}));
          const notes=LIB_ENTRIES.map((e,i)=>({kind:'fragment',subtype:'note',key:`note-${i}`,data:e,tags:libraryNoteTags(e),search:libraryPlainText([e.body,e.who,e.source,e.cartridge,e.tags].flat().join(' ')).toLowerCase()}));
          return [...articles,...notes];
        };
        patched.__srNoTables=true;
        libraryItems=patched;
        if(typeof renderLibraryShelf==='function')renderLibraryShelf();
      }
    }catch(e){console.warn('Library item split',e);}
  }

  function tableSearchText(t){return plain([t.title,t.who,t.writer,t.source,t.cartridge,t.powders?.join(' '),t.conditions?.flat().join(' '),t.head?.join(' '),t.rows?.flat().join(' '),t.note].join(' ')).toLowerCase();}
  function unique(values){return [...new Set(values.filter(Boolean).map(x=>String(x).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
  function tableWriterName(t){return t.writer||t.who||'';}

  function tableMarkup(t){
    const ch=Math.max(0,(t.head||[]).indexOf('Charge'));
    const cond=[];
    if(t.powders&&t.powders.length)cond.push(`<span class="sr-reference-cond"><b>Powder</b>${escText(t.powders.join(', '))}</span>`);
    (t.conditions||[]).forEach(pair=>{if(Array.isArray(pair))cond.push(`<span class="sr-reference-cond"><b>${escText(pair[0])}</b>${escText(pair[1])}</span>`);});
    if(t.cartridge)cond.push(`<span class="sr-reference-cond"><b>Cartridge</b>${escText(t.cartridge)}</span>`);
    return `<section class="sr-reference-table">
      <div class="sr-reference-head"><div class="sr-reference-kicker">Reference table</div><div class="sr-reference-title">${escText(t.title)}</div><div class="sr-reference-src">${escText(t.who)} · ${escText(t.source)}</div>${cond.length?`<div class="sr-reference-conditions">${cond.join('')}</div>`:''}</div>
      <div class="ltable-body"><table class="ldata"><thead><tr>${(t.head||[]).map(h=>`<th>${escText(h)}</th>`).join('')}</tr></thead><tbody>${(t.rows||[]).map((r,i)=>`<tr>${r.map((c,ci)=>`<td class="${i===t.maxRow&&ci===ch?'max':''}">${escText(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${t.note?`<div class="ltable-note">${escText(t.note)}</div>`:''}
    </section>`;
  }

  function buildTablesPanel(){
    if(document.getElementById('srTablesPanel'))return;
    const libNav=document.querySelector('.lib-nav');
    if(!libNav)return;
    const mode=document.createElement('div');mode.className='sr-library-mode-nav';mode.setAttribute('role','tablist');mode.setAttribute('aria-label','Library section');
    mode.innerHTML='<button type="button" class="sr-library-mode-btn on" data-sr-mode="library" role="tab" aria-selected="true">Library</button><button type="button" class="sr-library-mode-btn" data-sr-mode="tables" role="tab" aria-selected="false">Tables</button>';
    libNav.parentNode.insertBefore(mode,libNav);

    const panel=document.createElement('div');panel.id='srTablesPanel';panel.className='sr-tables-panel';
    panel.innerHTML=`<div class="sr-table-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m16 16 4 4"></path></svg><input id="srTableSearch" type="search" placeholder="Search load data, powders, authors…" aria-label="Search tables"></div>
      <div class="sr-table-controls">
        <div class="sr-table-control"><label for="srTablePowder">Powder</label><select id="srTablePowder"></select></div>
        <div class="sr-table-control"><label for="srTableCartridge">Cartridge</label><select id="srTableCartridge"></select></div>
        <div class="sr-table-control"><label for="srTableWriter">Author</label><select id="srTableWriter"></select></div>
        <div class="sr-table-control"><label for="srTableSort">Sort</label><select id="srTableSort"><option value="title">Title A–Z</option><option value="writer">Author A–Z</option><option value="cartridge">Cartridge A–Z</option><option value="powder">Powder A–Z</option></select></div>
      </div><div class="sr-table-count" id="srTableCount"></div><div id="srTableResults"></div>`;
    mode.parentNode.insertBefore(panel,libNav);

    const tables=Array.isArray(LIB_TABLES)?LIB_TABLES:[];
    const powder=unique(tables.flatMap(t=>t.powders||[]));
    const cartridges=unique(tables.map(t=>t.cartridge));
    const writers=unique(tables.map(tableWriterName));
    document.getElementById('srTablePowder').innerHTML='<option value="all">All powders</option>'+powder.map(x=>`<option value="${escText(x)}">${escText(x)}</option>`).join('');
    document.getElementById('srTableCartridge').innerHTML='<option value="all">All cartridges</option>'+cartridges.map(x=>`<option value="${escText(x)}">${escText(x)}</option>`).join('');
    document.getElementById('srTableWriter').innerHTML='<option value="all">All authors</option>'+writers.map(x=>`<option value="${escText(x)}">${escText(x)}</option>`).join('');

    mode.querySelectorAll('[data-sr-mode]').forEach(btn=>btn.onclick=()=>setMode(btn.dataset.srMode));
    document.getElementById('srTableSearch').addEventListener('input',e=>{tableQuery=e.target.value;renderTables();});
    document.getElementById('srTablePowder').onchange=e=>{tablePowder=e.target.value;renderTables();};
    document.getElementById('srTableCartridge').onchange=e=>{tableCartridge=e.target.value;renderTables();};
    document.getElementById('srTableWriter').onchange=e=>{tableWriter=e.target.value;renderTables();};
    document.getElementById('srTableSort').onchange=e=>{tableSort=e.target.value;renderTables();};
    renderTables();
  }

  function renderTables(){
    const out=document.getElementById('srTableResults');if(!out)return;
    let list=[...(Array.isArray(LIB_TABLES)?LIB_TABLES:[])];
    const q=tableQuery.trim().toLowerCase();
    if(q)list=list.filter(t=>tableSearchText(t).includes(q));
    if(tablePowder!=='all')list=list.filter(t=>(t.powders||[]).includes(tablePowder));
    if(tableCartridge!=='all')list=list.filter(t=>String(t.cartridge||'')===tableCartridge);
    if(tableWriter!=='all')list=list.filter(t=>tableWriterName(t)===tableWriter);
    const key=t=>tableSort==='writer'?tableWriterName(t):tableSort==='cartridge'?(t.cartridge||''):tableSort==='powder'?((t.powders||[])[0]||''):(t.title||'');
    list.sort((a,b)=>String(key(a)).localeCompare(String(key(b))));
    const total=Array.isArray(LIB_TABLES)?LIB_TABLES.length:0;
    document.getElementById('srTableCount').innerHTML=`Showing <b>${list.length}</b> of ${total} tables`;
    out.innerHTML=list.length?list.map(tableMarkup).join(''):'<div class="sr-reference-empty">No tables match those filters.</div>';
  }

  function setMode(mode){
    srMode=mode==='tables'?'tables':'library';
    document.querySelectorAll('[data-sr-mode]').forEach(b=>{const on=b.dataset.srMode===srMode;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));});
    const showLibrary=srMode==='library';
    const selectors=['.lib-nav','.library-search-wrap','#libraryTagFilter','#libraryShowing','#libraryResults'];
    selectors.forEach(sel=>{const el=document.querySelector(sel);if(el)el.style.display=showLibrary?'':'none';});
    const panel=document.getElementById('srTablesPanel');if(panel)panel.classList.toggle('on',!showLibrary);
    if(!showLibrary)renderTables();
  }

  function patchReader(){
    try{
      if(typeof renderArticleReader==='function'&&!renderArticleReader.__srTextOnly){const base=renderArticleReader;const patched=function(){articleMode='text';return base.apply(this,arguments);};patched.__srTextOnly=true;renderArticleReader=patched;}
      if(typeof openArticle==='function'&&!openArticle.__srTextOnly){const patched=function(id){openArticleId=id;articleMode='text';const reader=document.getElementById('articleReader');if(!reader)return;reader.hidden=false;document.body.style.overflow='hidden';renderArticleReader();const close=document.getElementById('articleReaderClose');if(close)close.focus();};patched.__srTextOnly=true;openArticle=patched;}
    }catch(e){console.warn('Library text-only patch',e);}
    document.querySelectorAll('.article-reader-modes').forEach(el=>el.remove());
  }

  function stampVersion(){document.querySelectorAll('.landing-version').forEach(el=>{if(/v?\d+\.\d+\.\d+/i.test(el.textContent))el.textContent=el.textContent.replace(/v?\d+\.\d+\.\d+/i,'Version '+VERSION);});}
  function init(){addStyles();patchTagline();patchLibraryItems();patchReader();buildTablesPanel();setMode('library');stampVersion();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
