(function(){
  'use strict';

  const isTestRoute=location.pathname.replace(/\/$/,'')==='/loads-test'||new URLSearchParams(location.search).has('loads-test');
  if(!isTestRoute)return;

  const collapsed=new Set();

  function statusFor(load){
    const raw=String(load.keep||'pending').toLowerCase();
    if(raw==='yes')return['yes','Keeper'];
    if(raw==='work'||raw==='reshoot')return['work','Watch'];
    if(raw==='loaded'||raw==='pending')return['loaded','Loaded'];
    return['',''];
  }

  function metric(value,label,kind=''){
    const empty=value==null||value==='';
    return `<span class="gl-metric"><b class="${empty?'dim':kind}">${empty?'—':value}</b><small>${label}</small></span>`;
  }

  function filteredLoads(){
    let list=C().loads.slice();
    if(activeGun&&activeGun!=='all')list=list.filter(load=>load.gun===activeGun);
    if(tierFilter!=='all')list=list.filter(load=>String(load.tier)===String(tierFilter));
    if(statusFilter!=='all')list=list.filter(load=>String(load.keep||'pending')===statusFilter);
    if(powderFilter!=='all')list=list.filter(load=>load.powder===powderFilter);
    return list;
  }

  function groupKey(load){
    const bullet=load.bulletCatalogKey||String(load.bullet||'').toLowerCase().replace(/\s+/g,' ').trim();
    return `${String(load.powder||'').toLowerCase()}::${bullet}`;
  }

  function grouped(list){
    const map=new Map();
    list.forEach(load=>{
      const key=groupKey(load);
      if(!map.has(key))map.set(key,{key,powder:load.powder,bullet:String(load.bullet||'').replace(' (PC)',''),loads:[]});
      map.get(key).loads.push(load);
    });
    return [...map.values()].map(group=>{
      group.loads.sort((a,b)=>Number(a.charge)-Number(b.charge)||String(a.gun).localeCompare(String(b.gun)));
      return group;
    }).sort((a,b)=>String(a.powder).localeCompare(String(b.powder))||String(a.bullet).localeCompare(String(b.bullet)));
  }

  function rowMarkup(load){
    const [statusClass,statusLabel]=statusFor(load);
    const tiersOn=ensureTierSettings().enabled!==false;
    const tier=tiersOn&&load.tier!=null?tierLabel(load.tier):'';
    const targets=(load.targets||[]).length;
    const sessions=(load.sessions||[]).filter(session=>session.avg!=null).length;
    const open=expandedLoad===load.id;
    const sdClass=load.sd==null?'dim':load.sd<20?'good':load.sd>50?'bad':'';
    const esClass=load.es==null?'dim':load.es<80?'good':load.es>200?'bad':'';
    const moaClass=load.moa==null?'dim':load.moa<2?'good':load.moa>4?'bad':'';
    const meta=[load.gun,tier,load.oal?`${load.oal} OAL`:null].filter(Boolean).map(esc).join(' · ');
    return `<article class="gl-load-row card ${open?'open':''}" data-load="${esc(load.id)}">
      <button class="gl-load-open" type="button" data-group-load="${esc(load.id)}" aria-expanded="${open}">
        <span class="gl-row-head">
          <span class="gl-charge">${Number(load.charge).toFixed(1)} <small>gr</small></span>
          <span class="gl-row-tags">${statusLabel?`<span class="keeper ${statusClass}">${statusLabel}</span>`:''}<span class="gl-chevron ${open?'up':''}">⌄</span></span>
        </span>
        <span class="gl-row-meta">${meta}</span>
        <span class="gl-metrics">
          ${metric(load.avg,'Avg fps')}
          ${metric(load.sd,'SD',sdClass)}
          ${metric(load.es,'ES',esClass)}
          ${metric(load.moa,'Group MOA',moaClass)}
        </span>
      </button>
      <div class="gl-quickline">
        <span>${sessions?`${sessions} session${sessions===1?'':'s'}`:'Not fired'}${targets?` · ${targets} target${targets===1?'':'s'}`:''}</span>
        <button class="gl-target" type="button" data-group-target="${esc(load.id)}">＋ Target</button>
      </div>
      ${load.note?`<div class="gl-note">${esc(load.note)}</div>`:''}
      ${open?loadDetail(load):''}
    </article>`;
  }

  function groupMarkup(group){
    const guns=[...new Set(group.loads.map(load=>load.gun))];
    const targetCount=group.loads.reduce((sum,load)=>sum+(load.targets||[]).length,0);
    const isCollapsed=collapsed.has(group.key);
    return `<section class="gl-group ${isCollapsed?'collapsed':''}" data-group-key="${esc(group.key)}">
      <button class="gl-group-head" type="button" data-group-toggle="${esc(group.key)}" aria-expanded="${!isCollapsed}">
        <span class="gl-group-copy"><span class="gl-powder">${esc(group.powder)}</span><strong>${esc(group.bullet)}</strong><small>${guns.length===1?esc(guns[0]):`${guns.length} firearms`} · ${group.loads.length} charge${group.loads.length===1?'':'s'}${targetCount?` · ${targetCount} target${targetCount===1?'':'s'}`:''}</small></span>
        <span class="gl-group-chevron">⌃</span>
      </button>
      <div class="gl-children">${isCollapsed?'':group.loads.map(rowMarkup).join('')}</div>
    </section>`;
  }

  function installPreviewLabel(){
    const screen=document.getElementById('s-loads');
    if(!screen||document.getElementById('groupedPreviewBar'))return;
    const bar=document.createElement('div');
    bar.id='groupedPreviewBar';
    bar.className='gl-preview-bar';
    bar.innerHTML='<span><b>Grouped loads test</b><small>Your current Loads screen is unchanged</small></span><a href="/">Current view</a>';
    screen.insertBefore(bar,screen.firstChild);
  }

  function renderGroupedLoads(){
    const el=document.getElementById('loadList');
    const list=filteredLoads();
    if(!list.length){
      const hasAny=activeGun&&activeGun!=='all'&&C().loads.some(load=>load.gun===activeGun);
      el.innerHTML=`<div class="empty"><div class="big">${hasAny?'No loads match':`No loads worked up for the ${esc(activeGun||'selected gun')} yet`}</div><div>${hasAny?'Try a different filter.':'Log your first string from the Add tab and it lands here.'}</div></div>`;
      return;
    }
    el.innerHTML=grouped(list).map(groupMarkup).join('');
    el.querySelectorAll('[data-group-toggle]').forEach(button=>button.onclick=()=>{
      const key=button.dataset.groupToggle;
      collapsed.has(key)?collapsed.delete(key):collapsed.add(key);
      renderLoads();
    });
    el.querySelectorAll('[data-group-load]').forEach(button=>button.onclick=()=>{
      const id=button.dataset.groupLoad;
      expandedLoad=expandedLoad===id?null:id;
      renderLoads();
      if(expandedLoad===id)setTimeout(()=>document.querySelector(`[data-load="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'}),40);
    });
    el.querySelectorAll('[data-group-target]').forEach(button=>button.onclick=event=>{
      event.preventDefault();event.stopPropagation();taOpen(button.dataset.groupTarget);
    });
  }

  function styles(){
    if(document.getElementById('groupedLoadsTestStyles'))return;
    const style=document.createElement('style');
    style.id='groupedLoadsTestStyles';
    style.textContent=`
      .gl-preview-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 9px;padding:9px 10px;border:1px dashed var(--brass-dim);border-radius:10px;background:rgba(199,154,75,.055)}
      .gl-preview-bar b,.gl-preview-bar small{display:block}.gl-preview-bar b{font:700 12px Bitter,serif;color:var(--brass)}.gl-preview-bar small{margin-top:2px;color:var(--ink-faint);font-size:9px}.gl-preview-bar a{flex:none;padding:7px 9px;border:1px solid var(--line);border-radius:8px;color:var(--ink-dim);font-size:10px;font-weight:700;text-decoration:none}
      .gl-group{position:relative;margin:0 0 12px;border:1px solid var(--line);border-radius:15px;background:var(--bg2);overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.12)}
      .gl-group:before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:linear-gradient(var(--brass),var(--copper))}
      .gl-group-head{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 14px 13px 17px;border:0;border-bottom:1px solid var(--line);background:linear-gradient(145deg,var(--bg3),var(--bg2));color:var(--ink);text-align:left;cursor:pointer}
      .gl-group.collapsed .gl-group-head{border-bottom:0}.gl-group-copy{min-width:0}.gl-powder{display:block;margin-bottom:3px;color:var(--brass);font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.gl-group-copy strong{display:block;font:700 17px/1.2 Bitter,serif}.gl-group-copy small{display:block;margin-top:5px;color:var(--ink-faint);font-size:10px;font-weight:600}.gl-group-chevron{flex:none;color:var(--brass);font-size:20px;transition:transform .2s}.gl-group.collapsed .gl-group-chevron{transform:rotate(180deg)}
      .gl-children{padding:7px 8px 8px 11px}.gl-load-row.card{margin:0;padding:0;border:0;border-bottom:1px solid var(--line);border-radius:0;background:transparent;overflow:visible}.gl-load-row.card:last-child{border-bottom:0}.gl-load-row.card.open{border-color:var(--brass-dim)}
      .gl-load-open{width:100%;display:block;padding:13px 44px 8px 8px;border:0;background:transparent;color:var(--ink);text-align:left;cursor:pointer}.gl-row-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.gl-charge{font:700 20px/1 Bitter,serif}.gl-charge small{font:700 11px Inter,sans-serif;color:var(--ink-faint);text-transform:uppercase}.gl-row-tags{display:flex;align-items:center;gap:7px}.gl-chevron{color:var(--ink-faint);font-size:17px;transition:transform .18s}.gl-chevron.up{transform:rotate(180deg)}.gl-row-meta{display:block;margin-top:5px;color:var(--ink-faint);font-size:10.5px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .gl-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;margin-top:10px;padding-top:9px;border-top:1px solid var(--line)}.gl-metric{text-align:center}.gl-metric b{display:block;font:700 14px 'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}.gl-metric b.good{color:var(--green)}.gl-metric b.bad{color:var(--red)}.gl-metric b.dim{color:var(--ink-faint)}.gl-metric small{display:block;margin-top:3px;color:var(--ink-faint);font-size:7.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}
      .gl-quickline{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:0 8px 10px;color:var(--ink-faint);font-size:9.5px}.gl-target{flex:none;padding:6px 9px;border:1px solid var(--brass-dim);border-radius:8px;background:rgba(199,154,75,.08);color:var(--brass);font-size:10px;font-weight:800;cursor:pointer}.gl-note{margin:0 8px 11px;padding:8px 9px;border-left:2px solid var(--line);color:var(--ink-dim);font-size:10.5px;line-height:1.35}.gl-load-row>.detail{margin:0 8px 13px;padding-top:13px}.gl-load-row>.sr-pick{top:12px;right:8px;width:30px;height:30px}
      @media(min-width:760px){.gl-children{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}.gl-load-row.card:nth-last-child(2):nth-child(odd){border-bottom:0}}
    `;
    document.head.appendChild(style);
  }

  function init(){
    if(typeof renderLoads!=='function')return;
    styles();installPreviewLabel();
    const base=renderLoads;
    renderLoads=function(){base.apply(this,arguments);renderGroupedLoads();};
    renderLoads.__groupedTest=true;
    renderLoads();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,20));
  else setTimeout(init,20);
})();
