(function(){
  if(document.getElementById("filterDrawer"))return;

  const screen=document.getElementById("s-loads");
  const gunChips=document.getElementById("gunChips");
  const powderChips=document.getElementById("powderChips");
  const tierChips=document.getElementById("tierChips");
  const statusChips=document.getElementById("statusChips");
  if(!screen||!gunChips||!powderChips||!tierChips||!statusChips)return;

  const style=document.createElement("style");
  style.textContent=`
    .filter-controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:2px 0 0}
    .filter-toggle{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:7px;padding:9px 10px;border:1px solid var(--line);border-radius:11px;background:var(--bg2);color:var(--ink);cursor:pointer;text-align:left;transition:border-color .16s,background .16s,transform .16s}
    .filter-toggle:active{transform:scale(.98)}
    .filter-toggle.open{border-color:var(--brass);background:var(--bg3)}
    .filter-toggle.has-filter .filter-toggle-value{color:var(--brass)}
    .filter-toggle:disabled{opacity:.38;cursor:default}
    .filter-toggle-copy{min-width:0;display:block}
    .filter-toggle-label{display:block;font:600 13px Bitter,serif;line-height:1.1}
    .filter-toggle-value{display:block;margin-top:3px;color:var(--ink-faint);font-size:9.5px;font-weight:600;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .filter-toggle svg{flex:none;color:var(--ink-faint);transition:transform .22s}
    .filter-toggle.open svg{transform:rotate(180deg);color:var(--brass)}
    .filter-drawer{display:grid;grid-template-rows:0fr;transition:grid-template-rows .24s cubic-bezier(.32,.72,0,1)}
    .filter-drawer.open{grid-template-rows:1fr}
    .filter-drawer-inner{min-height:0;overflow:hidden}
    .filter-panel{display:none;padding:7px 0 2px}
    .filter-panel.active{display:block}
    .filter-panel.active .chips{animation:filterSlide .24s cubic-bezier(.32,.72,0,1)}
    @keyframes filterSlide{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
    .gun-tier-access{grid-column:1/-1;margin-top:3px;padding-top:14px;border-top:1px solid var(--line)}
    .gun-tier-access-title{font:700 14px Bitter,serif;color:var(--ink);margin-bottom:3px}
    .gun-tier-access-copy{font-size:11px;line-height:1.4;color:var(--ink-faint);margin-bottom:10px}
    .gun-tier-access-list{display:flex;flex-direction:column;gap:7px}
    .gun-tier-toggle{display:flex;align-items:center;gap:10px;padding:10px 11px;border:1px solid var(--line);border-radius:10px;background:var(--bg);cursor:pointer}
    .gun-tier-toggle input{width:18px;height:18px;accent-color:var(--brass);flex:none}
    .gun-tier-dot{width:10px;height:10px;border-radius:50%;flex:none}
    .gun-tier-toggle span:last-child{min-width:0;font-size:13px;font-weight:600;color:var(--ink)}
    @media(max-width:620px){.filter-controls{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  const controls=document.createElement("div");
  controls.className="filter-controls";
  controls.setAttribute("aria-label","Load filters");
  controls.innerHTML=[["gun","Guns"],["powder","Powders"],["tier","Tiers"],["status","Status"]].map(([key,label])=>
    `<button class="filter-toggle" id="${key}FilterBtn" type="button" aria-controls="${key}FilterPanel" aria-expanded="false"><span class="filter-toggle-copy"><span class="filter-toggle-label" id="${key}FilterLabel">${label}</span><span class="filter-toggle-value" id="${key}FilterValue">All</span></span><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>`
  ).join("");

  const drawer=document.createElement("div");
  drawer.className="filter-drawer";
  drawer.id="filterDrawer";
  drawer.innerHTML=`<div class="filter-drawer-inner"><div class="filter-panel" id="gunFilterPanel"></div><div class="filter-panel" id="powderFilterPanel"></div><div class="filter-panel" id="tierFilterPanel"></div><div class="filter-panel" id="statusFilterPanel"></div></div>`;
  screen.insertBefore(controls,gunChips);
  screen.insertBefore(drawer,gunChips);
  document.getElementById("gunFilterPanel").appendChild(gunChips);
  document.getElementById("powderFilterPanel").appendChild(powderChips);
  document.getElementById("tierFilterPanel").appendChild(tierChips);
  document.getElementById("statusFilterPanel").appendChild(statusChips);

  let openPanel=null;
  const rows={gun:gunChips,powder:powderChips,tier:tierChips,status:statusChips};
  const dataKeys={gun:"g",powder:"p",tier:"t",status:"s"};
  function summary(key){
    const selected=rows[key].querySelector(".chip.on");
    if(key==="tier"&&rows[key].dataset.enabled==="false"&&(!selected||selected.dataset.t==="all"))return"Off";
    if(!selected)return"All";
    const text=selected.textContent.trim();
    return text.startsWith("All ")?"All":text;
  }
  function refresh(){
    if(openPanel==="powder"&&!powderChips.children.length)openPanel=null;
    drawer.classList.toggle("open",!!openPanel);
    Object.entries(rows).forEach(([key,row])=>{
      const button=document.getElementById(`${key}FilterBtn`);
      const panel=document.getElementById(`${key}FilterPanel`);
      const selected=row.querySelector(".chip.on");
      const isOpen=openPanel===key;
      document.getElementById(`${key}FilterValue`).textContent=summary(key);
      button.disabled=key==="powder"&&!row.children.length;
      button.classList.toggle("open",isOpen);
      button.classList.toggle("has-filter",!!selected&&selected.dataset[dataKeys[key]]!=="all");
      button.setAttribute("aria-expanded",String(isOpen));
      panel.classList.toggle("active",isOpen);
    });
  }
  Object.keys(rows).forEach(key=>{
    document.getElementById(`${key}FilterBtn`).addEventListener("click",()=>{openPanel=openPanel===key?null:key;refresh();});
    rows[key].addEventListener("click",event=>{if(event.target.closest(".chip:not(.disabled)"))setTimeout(()=>{openPanel=null;refresh();},0);});
    new MutationObserver(refresh).observe(rows[key],{childList:true,subtree:true,attributes:true,attributeFilter:["class","data-enabled"]});
  });
  refresh();

  /* Per-firearm tier availability. Tier IDs come from the caliber's live user-created tier list. */
  function cartForGun(g){
    const caliber=String(g?.caliber||DB.activeCartridge||"").trim();
    return DB.cartridges?.[caliber]||DB.cartridges?.[DB.activeCartridge]||null;
  }
  function matchingCartridgeGun(g,c){
    if(!g||!c)return null;
    return (c.guns||[]).find(x=>x._legacyKey&&x._legacyKey===g._legacyKey)||(c.guns||[]).find(x=>norm(x.name)===norm(gunDisplay(g)))||null;
  }
  function migrateGunTierAccess(g){
    const c=cartForGun(g);if(!g||!c)return;
    ensureTierSettings(c);
    const all=tierKeys(c,true).map(String);
    if(!Array.isArray(g.enabledTierIds)){
      const legacy=matchingCartridgeGun(g,c);
      const cap=g.maxTier!=null?Number(g.maxTier):legacy?.maxTier!=null?Number(legacy.maxTier):null;
      g.enabledTierIds=cap==null?all.slice():all.filter((id,index)=>{const n=Number(id);return Number.isFinite(n)?n<=cap:index<cap;});
    }
    g.enabledTierIds=g.enabledTierIds.map(String).filter(id=>all.includes(id));
    g.maxTier=null;
    const cg=matchingCartridgeGun(g,c);if(cg){cg.enabledTierIds=g.enabledTierIds.slice();cg.maxTier=null;}
  }
  function migrateAllGunTierAccess(){
    ensureCatalog();(DB.catalog?.guns||[]).forEach(migrateGunTierAccess);
  }
  migrateAllGunTierAccess();

  function tierAccessHtml(g){
    const c=cartForGun(g);if(!c)return"";
    migrateGunTierAccess(g);ensureTierSettings(c);
    const keys=tierKeys(c,true),enabled=new Set((g.enabledTierIds||[]).map(String));
    if(!keys.length)return"";
    return `<div class="gun-tier-access"><div class="gun-tier-access-title">Available Load Tiers</div><div class="gun-tier-access-copy">Choose which of this caliber's tiers are available for this firearm. Disabled tiers stay visible but are greyed out on the Loads screen.</div><div class="gun-tier-access-list">${keys.map(k=>`<label class="gun-tier-toggle"><input type="checkbox" name="enabledTierIds" value="${esc(k)}" ${enabled.has(String(k))?"checked":""}><span class="gun-tier-dot" style="background:${esc(tierColor(k,c))}"></span><span>${esc(tierLabel(k,c))}</span></label>`).join("")}</div></div>`;
  }

  const baseGunFormHtml=gunFormHtml;
  gunFormHtml=function(g={}){return baseGunFormHtml(g)+tierAccessHtml(g);};

  openGunEdit=function(key){
    ensureCatalog();const g=DB.catalog.guns.find(x=>x._legacyKey===key);if(!g)return;migrateGunTierAccess(g);
    editorOpen("Edit Gun",gunFormHtml(g)+`<div class="editor-actions"><button type="button" onclick="editorClose()">Cancel</button><button class="primary">Save Changes</button></div>`,async(fd)=>{
      const v=Object.fromEntries(fd),oldName=gunDisplay(g),selected=fd.getAll("enabledTierIds").map(String);
      Object.assign(g,{make:v.make.trim(),model:v.model.trim(),caliber:v.caliber.trim(),serial:v.serial.trim(),purchase_date:v.purchase_date||null,source:v.source,price:v.price===""?null:Number(v.price),rotation_status:v.rotation_status,rotation_note:v.rotation_note.trim(),barrel_length:v.barrel_length.trim(),finish:v.finish.trim(),sight_height_in:v.sight_height_in===""?null:Number(v.sight_height_in),enabledTierIds:selected,maxTier:null});
      g.name=gunDisplay(g);
      for(const cx of Object.values(DB.cartridges||{})){
        for(const cg of cx.guns||[])if(cg._legacyKey===key||norm(cg.name)===norm(oldName))Object.assign(cg,clone(g),{enabledTierIds:selected.slice(),maxTier:null});
        for(const l of cx.loads||[])if(l.gunCatalogKey===key||norm(l.gun)===norm(oldName)){l.gun=g.name;l.gunCatalogKey=key;}
        for(const j of cx.journal||[])if(j.gunCatalogKey===key||norm(j.gun)===norm(oldName)){j.gun=g.name;j.gunCatalogKey=key;}
      }
      await save();editorClose();renderAll();if(typeof activeBiographyKey!=="undefined"&&activeBiographyKey===key)renderBiography();toast("Gun updated");
    });
  };

  const baseRenderChips=renderChips;
  renderChips=function(){
    const g=currentGun?.();
    if(g){
      const catalogGun=DB.catalog?.guns?.find(x=>x._legacyKey&&x._legacyKey===g._legacyKey)||DB.catalog?.guns?.find(x=>norm(gunDisplay(x))===norm(g.name));
      if(catalogGun)migrateGunTierAccess(catalogGun);
      g.maxTier=null;
    }
    baseRenderChips();
    if(!g)return;
    const catalogGun=DB.catalog?.guns?.find(x=>x._legacyKey&&x._legacyKey===g._legacyKey)||DB.catalog?.guns?.find(x=>norm(gunDisplay(x))===norm(g.name));
    const allowed=new Set((catalogGun?.enabledTierIds||g.enabledTierIds||[]).map(String));
    document.querySelectorAll("#tierChips .chip[data-t]").forEach(chip=>{
      if(chip.dataset.t==="all")return;
      const disabled=!allowed.has(String(chip.dataset.t));
      chip.classList.toggle("disabled",disabled);
      chip.setAttribute("aria-disabled",String(disabled));
    });
  };
  renderChips();
})();
