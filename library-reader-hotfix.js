/* Sixgun Retriever 2.10.4 — text-only Library reader */
(function(){
  'use strict';
  const VERSION='2.10.4';

  function addStyles(){
    if(document.getElementById('srLibraryReaderHotfixStyles')) return;
    const style=document.createElement('style');
    style.id='srLibraryReaderHotfixStyles';
    style.textContent=`
      .article-reader-modes{display:none!important}
      .article-reader-bar{justify-content:flex-start!important}
      .article-page-label,.article-note{display:none!important}
      .article-page{margin-top:0!important}
    `;
    document.head.appendChild(style);
  }

  function patchTagline(){
    const tagline=document.querySelector('.lib-tagline');
    if(tagline) tagline.textContent='A working archive of sixgun knowledge.';
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
    stampVersion();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));
  else setTimeout(init,0);
})();
