/* Sixgun Retriever 2.10.8 — text-only Library reader */
(function(){
  'use strict';
  const VERSION='2.10.8';

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
      .fragment-table-open{display:none!important}
      .fragment-table-summary{cursor:default!important}
      .fragment-table-content{display:block!important}
    `;
    document.head.appendChild(style);
  }

  function patchTagline(){
    const tagline=document.querySelector('.lib-tagline');
    if(tagline) tagline.textContent='A working archive of sixgun knowledge.';
  }

  function arrangeAndOpenTables(){
    const out=document.getElementById('libraryResults');
    if(!out) return;
    const tables=[...out.querySelectorAll(':scope > .fragment-table')];
    tables.forEach(table=>table.open=true);
    const articles=[...out.querySelectorAll(':scope > .article-card')];
    const notes=[...out.querySelectorAll(':scope > .fragment-card:not(.fragment-table)')];
    [...articles,...tables,...notes].forEach(el=>out.appendChild(el));
  }

  function keepTablesVisible(){
    const out=document.getElementById('libraryResults');
    if(!out || out.__srTablesVisible) return;
    out.__srTablesVisible=true;
    let arranging=false;
    const refresh=()=>{
      if(arranging) return;
      arranging=true;
      arrangeAndOpenTables();
      arranging=false;
    };
    new MutationObserver(()=>{
      if(!arranging) requestAnimationFrame(refresh);
    }).observe(out,{childList:true,subtree:false});
    refresh();
  }

  function patchReader(){
    try{
      if(typeof renderArticleReader==='function' && !renderArticleReader.__srTextOnly){
        const baseRender=renderArticleReader;
        const patchedRender=function(){
          articleMode='text';
          return baseRender.apply(this,arguments);
        };
        patchedRender.__srTextOnly=true;
        renderArticleReader=patchedRender;
      }

      if(typeof openArticle==='function' && !openArticle.__srTextOnly){
        const patchedOpen=function(id){
          openArticleId=id;
          articleMode='text';
          const reader=document.getElementById('articleReader');
          if(!reader) return;
          reader.hidden=false;
          document.body.style.overflow='hidden';
          renderArticleReader();
          const close=document.getElementById('articleReaderClose');
          if(close) close.focus();
        };
        patchedOpen.__srTextOnly=true;
        openArticle=patchedOpen;
      }
    }catch(e){
      console.warn('Library text-only patch',e);
    }

    document.querySelectorAll('.article-reader-modes').forEach(el=>el.remove());
  }

  function stampVersion(){
    document.querySelectorAll('.landing-version').forEach(el=>{
      if(/v?\d+\.\d+\.\d+/i.test(el.textContent)){
        el.textContent=el.textContent.replace(/v?\d+\.\d+\.\d+/i,'Version '+VERSION);
      }
    });
  }

  function init(){
    addStyles();
    patchTagline();
    patchReader();
    keepTablesVisible();
    stampVersion();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));
  else setTimeout(init,0);
})();
