/* Sixgun Retriever 2.7.1 — load status + compare-card hotfix */
(function(){
'use strict';
const VERSION='2.7.1';

function allCurrentLoads(){try{return C().loads||[];}catch(e){return[];}}
function loadById(id){return allCurrentLoads().find(l=>String(l.id)===String(id));}

function normalizeStatusUI(){
  const list=document.getElementById('loadList');
  if(!list)return;
  list.querySelectorAll('.card[data-load]').forEach(card=>{
    const load=loadById(card.dataset.load);
    if(!load)return;
    const tags=card.querySelector('.card-tags');
    if(!tags)return;
    let badge=tags.querySelector('.keeper');
    const raw=String(load.keep||'').toLowerCase();
    const status=raw==='yes'?['yes','Keeper']:(raw==='work'||raw==='reshoot')?['work','Watch']:raw==='loaded'?['loaded','Loaded']:null;
    if(!status){if(badge)badge.remove();return;}
    if(!badge){badge=document.createElement('span');tags.insertBefore(badge,tags.firstChild);}
    badge.className=`keeper ${status[0]}`;
    badge.textContent=status[1];
  });
}

function patchRenderLoads(){
  if(typeof renderLoads!=='function'||renderLoads.__srStatusFix)return;
  const base=renderLoads;
  const patched=function(){const r=base.apply(this,arguments);requestAnimationFrame(normalizeStatusUI);return r;};
  patched.__srStatusFix=true;
  renderLoads=patched;
}

function patchLoadForm(){
  if(typeof openLoadForm!=='function'||openLoadForm.__srStatusFix)return;
  const base=openLoadForm;
  const patched=function(loadId=null){
    const load=loadId?loadById(loadId):null;
    const r=base.apply(this,arguments);
    const select=document.querySelector('#editorOverlay select[name="keep"], .editor-overlay select[name="keep"], select[name="keep"]');
    if(select){
      const raw=String(load?.keep||'').toLowerCase();
      const value=raw==='yes'?'yes':(raw==='work'||raw==='reshoot')?'work':raw==='loaded'?'loaded':'';
      select.innerHTML='<option value="">— None —</option><option value="yes">Keeper</option><option value="work">Watch</option><option value="loaded">Loaded</option>';
      select.value=value;
    }
    return r;
  };
  patched.__srStatusFix=true;
  openLoadForm=patched;
}

function addStyles(){
  if(document.getElementById('srStatusHotfixStyles'))return;
  const s=document.createElement('style');
  s.id='srStatusHotfixStyles';
  s.textContent=`
    .card[data-load]>.card-head{padding-right:58px}
    .card[data-load]>.sr-pick{top:18px;right:14px}
    .card[data-load] .card-tags{max-width:42%;justify-content:flex-end;flex-wrap:wrap;gap:5px}
    .keeper.loaded{color:var(--brass);border-color:var(--brass-dim)}
    @media(max-width:520px){
      .card[data-load]>.card-head{padding-right:54px}
      .card[data-load]>.sr-pick{top:16px;right:12px}
      .card[data-load] .card-tags{max-width:38%}
    }
  `;
  document.head.appendChild(s);
}

function stampVersion(){
  document.querySelectorAll('.landing-version').forEach(el=>{
    if(/v\d+\.\d+\.\d+/i.test(el.textContent))el.textContent=el.textContent.replace(/v\d+\.\d+\.\d+/i,'v'+VERSION);
  });
}

function init(){
  addStyles();
  patchLoadForm();
  patchRenderLoads();
  stampVersion();
  normalizeStatusUI();
  try{if(typeof renderLoads==='function')renderLoads();}catch(e){console.warn('status hotfix render',e);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
