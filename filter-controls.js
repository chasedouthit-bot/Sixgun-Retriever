(function(){
  const version=document.querySelector(".landing-version");
  if(version)version.textContent="Version 2.10.0";
  if(document.getElementById("filterDrawer"))return;

  const screen=document.getElementById("s-loads");
  const gunChips=document.getElementById("gunChips");
  const powderChips=document.getElementById("powderChips");
  const tierChips=document.getElementById("tierChips");
  if(!screen||!gunChips||!powderChips||!tierChips)return;

  const style=document.createElement("style");
  style.textContent=`
    .filter-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:2px 0 0}
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
  `;
  document.head.appendChild(style);

  const controls=document.createElement("div");
  controls.className="filter-controls";
  controls.setAttribute("aria-label","Load filters");
  controls.innerHTML=[["gun","Guns"],["powder","Powders"],["tier","Tiers"]].map(([key,label])=>
    `<button class="filter-toggle" id="${key}FilterBtn" type="button" aria-controls="${key}FilterPanel" aria-expanded="false"><span class="filter-toggle-copy"><span class="filter-toggle-label">${label}</span><span class="filter-toggle-value" id="${key}FilterValue">All</span></span><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>`
  ).join("");

  const drawer=document.createElement("div");
  drawer.className="filter-drawer";
  drawer.id="filterDrawer";
  drawer.innerHTML=`<div class="filter-drawer-inner"><div class="filter-panel" id="gunFilterPanel"></div><div class="filter-panel" id="powderFilterPanel"></div><div class="filter-panel" id="tierFilterPanel"></div></div>`;
  screen.insertBefore(controls,gunChips);
  screen.insertBefore(drawer,gunChips);
  document.getElementById("gunFilterPanel").appendChild(gunChips);
  document.getElementById("powderFilterPanel").appendChild(powderChips);
  document.getElementById("tierFilterPanel").appendChild(tierChips);

  let openPanel=null;
  const rows={gun:gunChips,powder:powderChips,tier:tierChips};
  function summary(key){
    const selected=rows[key].querySelector(".chip.on");
    if(!selected)return"All";
    const text=selected.textContent.trim();
    return text==="All guns"||text==="All powders"?"All":text;
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
      button.classList.toggle("has-filter",!!selected&&selected.dataset.g!=="all"&&selected.dataset.p!=="all"&&selected.dataset.t!=="all");
      button.setAttribute("aria-expanded",String(isOpen));
      panel.classList.toggle("active",isOpen);
    });
  }
  Object.keys(rows).forEach(key=>{
    document.getElementById(`${key}FilterBtn`).addEventListener("click",()=>{openPanel=openPanel===key?null:key;refresh();});
    rows[key].addEventListener("click",event=>{if(event.target.closest(".chip:not(.disabled)"))setTimeout(()=>{openPanel=null;refresh();},0);});
    new MutationObserver(refresh).observe(rows[key],{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  });
  refresh();
})();
