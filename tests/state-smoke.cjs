const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const { webcrypto } = require("crypto");

const html = fs.readFileSync("index.html", "utf8");
const performanceIntelligence = fs.readFileSync("performance-intelligence.js", "utf8");
const filterControls = fs.readFileSync("filter-controls.js", "utf8");
const worker = fs.readFileSync("worker.js", "utf8");
const serviceMigration = fs.readFileSync("supabase/migrations/20260826_parts_maintenance.sql", "utf8");
const garminMigration = fs.readFileSync("supabase/migrations/20260827_garmin_chronograph_import.sql", "utf8");
const landingVersion = html.match(/<div class="landing-version">Version ([^<]+)<\/div>/)?.[1];
const cacheVersion = html.match(/const CACHE_VERSION="sixgun-retriever-v([^";]+)"/)?.[1];
const releaseVersion = html.match(/const RELEASE_VERSION="([^";]+)"/)?.[1];
assert(landingVersion && landingVersion === cacheVersion, "landing and cache versions must be present and match");
assert.equal(releaseVersion, landingVersion, "release, landing, and cache versions must match");
assert(html.includes('id="createNavBtn"'), "bottom navigation must expose the centered add control");
assert(html.includes('id="createLoadAction"'), "the add menu must preserve New Load access");
assert(html.includes('id="createImportAction"'), "the add menu must preserve Garmin import access");
assert(!html.includes('id="importLoadBtn"'), "Loads must not retain the redundant top import action");
assert(!html.includes('id="newLoadBtn"'), "Loads must not retain the redundant top new-load action");
assert(html.includes('nav button[data-s]'), "tab navigation must exclude the centered add control");
assert(filterControls.includes('["gun","Guns"]'), "Loads must expose a compact Guns filter control");
assert(filterControls.includes('["powder","Powders"]'), "Loads must expose a compact Powders filter control");
assert(filterControls.includes('["tier","Tiers"]'), "Loads must expose a compact Tiers filter control");
assert(filterControls.includes('drawer.classList.toggle("open",!!openPanel)'), "load filter chips must open through the shared sliding drawer");
assert(filterControls.includes('openPanel=null;refresh()'), "choosing a load filter must collapse the chip drawer");
assert(html.includes('class="session-pager"'), "load detail must expose a swipeable session pager");
assert(html.includes('function loadSessionPages(sessions,targets)'), "session history must group chronograph strings and targets together");
assert(html.includes('sb.from("target_analyses").select("legacy_key,photo_path")'), "cloud hydration must recover permanent target photo paths");
assert(html.includes('if(local?.value)DB=local.value;await signTargetPhotos();renderAll()'), "pending sync hydration must refresh target photo URLs before rendering");
assert(html.includes('if(local){DB=local;await signTargetPhotos();renderAll();}'), "completed sync must refresh target photo URLs before rendering");
assert(html.includes('photoPath:existingTarget?.photoPath||null'), "recalibrating a target must retain its permanent photo path");
assert(html.includes('function taReattachTargetPhoto(loadId,targetIndex)'), "targets with legacy missing photos must offer recovery");
assert(html.includes('>Reattach Photo</button>'), "a missing target photo must expose the recovery action in session history");
const perfContext={window:{},document:{readyState:"loading",addEventListener(){}},console,tgSettingsFor(){return{velocity:900,bc:.18,sightHeight:.9};},tgTrajectoryFor(settings){return{settings,rows:settings.distances.map(distance=>({distance,offsetIn:distance===settings.zeroYd?0:-distance/10,velocity:settings.velocity-distance}))};}};
perfContext.globalThis=perfContext;
vm.createContext(perfContext);
vm.runInContext(performanceIntelligence.replace(/\}\)\(\);\s*$/,"globalThis.__perfTest={compareDistances,comparisonTrajectories};})();"),perfContext);
assert.deepEqual(JSON.parse(JSON.stringify(perfContext.__perfTest.compareDistances("100, 25, 50, 25"))),[25,50,100],"comparison distances must be unique and ordered");
const compared=perfContext.__perfTest.comparisonTrajectories([{l:{id:"a"},p:{avg:800}},{l:{id:"b"},p:{avg:1000}}],25,[25,100]);
assert(compared.every(x=>x.result.settings.zeroYd===25),"compared trajectories must share one zero distance");
assert.deepEqual(compared.map(x=>x.result.settings.velocity),[800,1000],"trajectory comparison must use each load's recorded velocity");
assert(html.includes("body>header{"), "top-bar styles must be scoped away from page-level header elements");
assert(!html.includes("\nheader{\n"), "page-level headers must not inherit the sticky top-bar layout");
assert(html.includes(".field{display:flex;min-width:0"), "editor fields must be allowed to shrink within their grid column");
assert(html.includes(".editor-card .form-grid{grid-template-columns:minmax(0,1fr)}"), "editor forms must stack on narrow mobile screens");
assert(html.includes("assets/photographic-record-masthead.webp"), "photographic record must use the archival engraving masthead");
assert(html.includes("aspect-ratio:3/2;height:auto!important"), "photographic masthead must preserve the engraving ratio responsively");
assert(html.includes("applyPhotoCoverMasthead(book,g)"), "PDF export must apply the photographic masthead to its cover");
assert(html.includes("scroll-snap-type:x mandatory"), "photographic Moments must use deliberate snap pagination");
assert(html.includes("<figure class=\"pr-postcard"), "photographs must render as archival postcard cards");
assert(html.includes("function wireAlbumNavigation"), "album pages must expose arrow and page-indicator navigation");
assert(html.includes("pdf-postcard-grid"), "PDF photo pages must preserve the postcard album treatment");
assert(html.includes('family=Caveat'), "postcard captions must load the pencil-handwriting face");
assert(html.includes('id="s-parts-maintenance"'), "binder must expose a Parts & Maintenance screen");
assert(html.includes('value="__new__">＋ New Powder'), "import must allow creating a Catalog powder");
assert(html.includes('value="__new__">＋ New Bullet'), "import must allow creating a Catalog bullet");
assert(html.includes('＋ New Firearm'), "import must allow creating a Catalog firearm");
assert(html.includes('onclick="taAutoSetup()"'), "target analyzer must expose one-touch auto setup");
assert(html.includes('autoTargetKind=detection.kind'), "auto setup must preserve the detected target family for hit filtering");
assert(html.includes('targetResult[key]??session?.[key]'), "the load editor must prefer the newest analyzed target measurements");
assert(html.includes('load.group=g.groupIn!=null'), "saving a target must mirror group inches onto its load");
assert(html.includes('load.moa=g.moa!=null'), "saving a target must refresh MOA instead of retaining a stale value");
assert(html.includes('id="tgOverlay"'), "loads must expose the Zero & Holds trajectory record");
assert(html.includes('function tgTrajectoryFor'), "trajectory calculations must be deterministic and local");
assert(html.includes('type="button" class="tg-save"'), "trajectory save must be an explicit non-submit control");
assert(html.includes('button.textContent="Saving…"'), "trajectory save must show immediate progress feedback");
assert(html.includes('function tgResetSaveButton()'), "trajectory save state must be reset between guide openings");
assert(html.includes('tgResetSaveButton();TG.loadId=loadId'), "opening a trajectory guide must restore its save button");
assert(html.includes('renderAll();tgClose();toast("Zero & Holds settings saved")'), "a saved trajectory must close the guide and confirm completion");
assert(html.includes('font-size:14px;z-index:900'), "save feedback must appear above full-screen tools");
assert(!html.includes('class="tg-entry-title">${s.zeroYd}-yard default zero'), "the trajectory entry must not advertise a default zero");
assert(html.includes('function tgRequestAimPoint'), "measured impact must route older targets through point-of-aim setup");
assert(html.includes('onclick="tgSetMode(\'measured\')">Measured impact'), "measured impact must remain tappable without an existing aim point");
assert(html.includes('mode:"measured",targetIndex'), "saving an aim point must return directly to measured impact");
assert(html.includes('Every square = 1 inch'), "trajectory targets must label their physical grid scale");
assert(html.includes('tg-board tg-grid-board'), "trajectory targets must render as one-inch grid boards");
assert(html.includes('onclick="taMode(\'aim\')"'), "target analysis must allow marking the exact point of aim");
assert(html.includes('poiYIn:g.poiYIn'), "saved targets must preserve measured vertical point of impact");
assert(html.includes('button.type="submit"'), "editor primary actions must explicitly submit their form");
assert(performanceIntelligence.includes("typeof taAutoSetup==='function'"), "legacy target assist must yield to the native auto setup control");
assert(performanceIntelligence.includes('Trajectory Comparison'), "load comparison must include bullet-drop comparison");
assert(performanceIntelligence.includes("all loads use a ${zeroYd}-yard zero"), "trajectory comparison must normalize loads to one shared zero");
assert(performanceIntelligence.includes('Every square = 1 inch'), "trajectory comparison must retain the physical one-inch grid");
assert(performanceIntelligence.includes("Difference</th>"), "trajectory comparison must report the impact difference between loads");
assert(worker.includes(`/performance-intelligence.js?v=${releaseVersion}`), "worker must load the current target-assist cache version");
assert(html.includes("assets/parts-maintenance-masthead-v2.jpg"), "service page and PDF must use the cabin workbench masthead");
assert(html.includes("Selected service records for this sixgun"), "service page must use the archival subtitle convention");
assert(html.includes('name="include_maintenance"'), "PDF export must expose the Parts & Maintenance toggle");
assert(html.includes("function pdfPartsMaintenancePages"), "PDF export must render parts and maintenance pages");
assert(serviceMigration.includes("create table if not exists public.parts_modifications"), "parts migration must create the parts table");
assert(serviceMigration.includes("create table if not exists public.maintenance_entries"), "parts migration must create the maintenance table");
assert.equal((serviceMigration.match(/enable row level security/g) || []).length, 2, "both service tables must enable RLS");
assert(garminMigration.includes("create table if not exists public.chronograph_shots"), "Garmin migration must create per-shot storage");
assert(garminMigration.includes("session_datetime timestamptz"), "Garmin migration must preserve session date and time");
assert(garminMigration.includes("firearm_id bigint references public.guns"), "imported sessions must store the assigned firearm ID");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(script => script.includes("const SEED"));
assert.equal(scripts.length, 1, "expected the main inline application script");

function elementStub() {
  const classes = new Set();
  return {
    style: {},
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, force) { if (force === undefined ? !classes.has(name) : force) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    addEventListener() {},
    appendChild() {},
    querySelectorAll() { return []; },
    querySelector() { return elementStub(); },
    setAttribute() {},
    getAttribute() { return null; },
    innerHTML: "",
    textContent: "",
    value: "",
    dataset: {},
  };
}

const elements = new Map();
const document = {
  body: elementStub(),
  getElementById(id) { if (!elements.has(id)) elements.set(id, elementStub()); return elements.get(id); },
  querySelectorAll() { return []; },
  createElement() { return elementStub(); },
  addEventListener() {},
};
const context = {
  console,
  document,
  navigator: { onLine: true },
  location: { origin: "https://example.test" },
  crypto: webcrypto,
  structuredClone,
  Blob,
  FormData,
  FileReader: function FileReader() {},
  Image: function Image() {},
  URL,
  setTimeout() { return 0; },
  clearTimeout() {},
  requestAnimationFrame(fn) { return fn(); },
  cancelAnimationFrame() {},
  matchMedia(query) { return { matches: query.includes("max-width:650px") }; },
  localStorage: { getItem() { return null; }, removeItem() {} },
};
context.window = { addEventListener() {}, scrollTo() {}, supabase: null };
context.globalThis = context;
vm.createContext(context);

const instrumented = scripts[0].replace(
  /cloudBoot\(\);\s*$/,
  "globalThis.__test={ensureCatalog,addGunRecord,addPowderRecord,addBulletRecord,exactBullet,bulletNorm,mergeBullets,reconcileDuplicateLoads,catalogUsage,removeCatalogEntry,cloudSafeState,biographyStats,loadPerformanceScore,letterData,letterPrompts,ensureLetterSettings,gunLetter,archiveLetterMarkup,gunRangeEvents,gunLifeRecord,photoRecord,gunMoments,momentPhotos,normalizePhotoOrder,albumPageSize,photoRatio,albumPageGroups,albumLayoutClass,renderPhotoMoment,renderRecordAlbum,pdfMomentPages,pdfRecordAlbumPages,gunParts,gunMaintenance,maintenanceSummary,pdfPartsMaintenancePages,parseShotViewCSV,loadSessionPages,tgTrajectoryFor,tgSuggestedBC,tgSettingsFor,tgTargetOffset,tgGridLayout,tgPaperMarkup,taFitLine,taProjectionPeriod,taProjectionPhase,taNeutralDamageCandidates,getDB:()=>DB,getLibTables:()=>LIB_TABLES};"
);
vm.runInContext(instrumented, context);

const api = context.__test;
const groupedSessions=api.loadSessionPages(
  [{date:"2026-08-26",avg:1068.4},{date:"2026-08-10",avg:1020}],
  [{date:"2026-08-27",moa:5.95},{date:"2026-08-10",moa:7.2}]
);
assert.equal(groupedSessions.length,2,"session pager must create one page per range date");
assert.equal(groupedSessions[0].date,"2026-08-26","session pager must put the newest range session first");
assert.equal(groupedSessions[0].targets.length,1,"a target analyzed the next day must stay with its closest range session");
assert.equal(groupedSessions[1].targets.length,1,"an exactly dated target must stay with that session");
const selectedTrajectory = api.tgTrajectoryFor({ mode: "selected", zeroYd: 25, distances: [10, 25, 50, 100], velocity: 1068.4, bc: 0.18, sightHeight: 0.9 });
assert(Math.abs(selectedTrajectory.rows.find(r => r.distance === 25).offsetIn) < 0.02, "selected zero must cross the sight line at exactly 25 yards");
assert(selectedTrajectory.rows.find(r => r.distance === 100).offsetIn < 0, "a revolver trajectory must show drop beyond its far zero");
assert(selectedTrajectory.zeros.some(z => Math.abs(z - 25) < 0.2), "zero-crossing report must include the selected 25-yard zero");
const tenInchGrid = api.tgGridLayout([{offsetIn:0},{offsetIn:-10}]);
assert.equal(tenInchGrid.impactY(-10)-tenInchGrid.aimY, 100, "a ten-inch drop must span ten one-inch grid squares");
const gridMarkup = api.tgPaperMarkup({ gun: "Ruger Blackhawk", charge: 10, powder: "Unique" }, { zeroYd: 25, velocity: 1068.4, bc: 0.18, sightHeight: 0.9 }, selectedTrajectory);
assert(gridMarkup.includes("tg-board tg-grid-board")&&gridMarkup.includes("Every square = 1 inch"), "the active trajectory renderer must use the physical grid layout");
const measuredTrajectory = api.tgTrajectoryFor({ mode: "measured", zeroYd: 25, distances: [10, 25, 50], velocity: 1068.4, bc: 0.18, sightHeight: 0.9 }, { distanceYd: 10, poiYIn: -0.5, poiXIn: 0.2 });
assert(Math.abs(measuredTrajectory.rows.find(r => r.distance === 10).offsetIn + 0.5) < 0.02, "measured mode must pass through the observed group-center offset");
assert.deepEqual(JSON.parse(JSON.stringify(api.tgTargetOffset({ aimPoint: { x: 100, y: 100 }, holes: [{ x: 100, y: 80 }, { x: 120, y: 100 }], scaleBox: { size: 20 }, refInches: 1, distanceYd: 10 }))), { xIn: 0.5, yIn: 0.5, distanceYd: 10 });
const periodicProjection = Array.from({ length: 360 }, (_, i) => i % 30 < 2 ? 100 : 0);
assert.equal(api.taProjectionPeriod(periodicProjection, 20, 70).period, 30, "grid calibration must recover a 30px repeating pitch");
assert([0, 1].includes(api.taProjectionPhase(periodicProjection, 30)), "grid calibration must recover the printed-line phase");
const fittedEdge = api.taFitLine([{x:0,y:10},{x:10,y:11},{x:20,y:12},{x:30,y:60},{x:40,y:14}]);
assert(Math.abs(fittedEdge.a - 0.1) < 0.03, "target-edge fitting must reject a large clip/outlier");
const targetW=240,targetH=360,targetPpi=20,targetPixels=new Uint8ClampedArray(targetW*targetH*4);
for(let i=0;i<targetW*targetH;i++){targetPixels[i*4]=48;targetPixels[i*4+1]=50;targetPixels[i*4+2]=49;targetPixels[i*4+3]=255;}
for(const [cx,cy] of [[76,128],[124,174],[167,229]])for(let y=cy-4;y<=cy+4;y++)for(let x=cx-4;x<=cx+4;x++)if((x-cx)**2+(y-cy)**2<=16){const i=(y*targetW+x)*4;targetPixels[i]=184;targetPixels[i+1]=181;targetPixels[i+2]=177;}
for(let x=0;x<targetW;x++){const i=(347*targetW+x)*4;targetPixels[i]=238;targetPixels[i+1]=237;targetPixels[i+2]=230;}
const neutralDamage=api.taNeutralDamageCandidates(targetPixels,targetW,targetH,targetPpi,58,24,48,332,14);
assert.equal(neutralDamage.length,3,"reactive target damage must produce one marker per compact neutral splatter patch");
const db = api.getDB();
const catalog = api.ensureCatalog();
const garminCsv = `"Pistol session started at 10:52"
#,SPEED (FPS),Δ AVG (FPS),KE (FT-LB),POWER FACTOR (KGR⋅FT/S),TIME,CLEAN BORE,COLD BORE,SHOT NOTES
1, 980.0, 0.0, , , 10:53:11 AM, yes, yes, First shot
2, 1000.0, 20.0, , , 10:54:11 AM, , ,
3, 1020.0, 40.0, , , 10:55:11 AM, , ,
-,,,,,,,,
AVERAGE SPEED,1000.0,,,,,,,
STD DEV,20.0,,,,,,,
SPREAD,40.0,,,,,,,
SESSION NOTE,"Test string",,,,,,,
-,,,,,,,,
DATE, "May 21, 2026 at 10:52 AM",,,,,,,`;
const garmin = api.parseShotViewCSV(garminCsv, "three-shot.csv");
assert.deepEqual(JSON.parse(JSON.stringify(garmin.computed)), { n: 3, avg: 1000, sd: 20, es: 40, populationSd: 16.3 });
assert.equal(garmin.shots[0].time, "10:53:11 AM");
assert.equal(garmin.shots[0].clean_bore, true);
assert.equal(garmin.sessionNote, "Test string");
assert(garmin.sessionDatetime, "Garmin DATE line should parse");
assert.equal(typeof elements.get("doorBench").onclick, "function", "Reloading Bench must be interactive before cloud hydration");
assert.equal(typeof elements.get("doorImport").onclick, "function", "Import Session must be interactive before cloud hydration");
context.window.SixgunCloud = null;
elements.get("doorBench").onclick();
assert(elements.get("landing").classList.contains("hidden"), "Reloading Bench should dismiss the landing page");
assert(catalog.guns.length > 0, "seed guns should migrate into Catalog");
assert(catalog.powders.length > 0, "seed/load powders should migrate into Catalog");
assert(catalog.bullets.length > 0, "load bullets should migrate into Catalog");
for (const cartridge of Object.values(db.cartridges)) {
  for (const load of cartridge.loads) {
    assert(load.gunCatalogKey, `load ${load.id} is missing gunCatalogKey`);
    assert(load.powderCatalogKey, `load ${load.id} is missing powderCatalogKey`);
    assert(load.bulletCatalogKey, `load ${load.id} is missing bulletCatalogKey`);
  }
}

const gunCount = catalog.guns.length;
const powderCount = catalog.powders.length;
const gun = api.addGunRecord({ make: "Test", model: "Smoke", caliber: db.activeCartridge });
const powder = api.addPowderRecord({ name: "Smoke Powder", notes: "test only" });
const bullet = api.addBulletRecord({ manufacturer: "Test", product: "200 Grain Semi-Wadcutter", weight_gr: 200, diameter: ".452" });
assert(bullet._legacyKey.startsWith("bullet::"));
assert.equal(api.bulletNorm("200 Grain Semi-Wadcutter (Powder Coated)"), api.bulletNorm("200gr SWC PC"));
assert.equal(api.exactBullet(bullet._legacyKey)._legacyKey, bullet._legacyKey);
assert.equal(catalog.guns.length, gunCount + 1);
assert.equal(catalog.powders.length, powderCount + 1);
assert(gun._legacyKey.startsWith("catalog::"));
assert(powder._legacyKey.startsWith("catalog::"));
const usedPowder = catalog.powders.find(p =>
  Object.values(db.cartridges).some(c => c.loads.some(l => l.powderCatalogKey === p._legacyKey))
);
assert(usedPowder, "expected a powder referenced by an existing load");
assert(api.catalogUsage("powder", usedPowder._legacyKey).loads > 0, "referenced powder should report load usage");
const libraryBefore = JSON.stringify(api.getLibTables());
api.removeCatalogEntry("powder", powder._legacyKey);
assert.equal(catalog.powders.some(p => p._legacyKey === powder._legacyKey), false, "unreferenced powder should be removable");
assert.equal(JSON.stringify(api.getLibTables()), libraryBefore, "Catalog removal must not modify Library tables");

const duplicate = api.addBulletRecord({ product: "Merge target 201gr WFN" });
const activeLoad = db.cartridges[db.activeCartridge].loads[0];
activeLoad.bulletCatalogKey = duplicate._legacyKey;
activeLoad.bullet = "Merge target 201gr WFN";
api.mergeBullets(bullet._legacyKey, duplicate._legacyKey);
assert.equal(activeLoad.bulletCatalogKey, bullet._legacyKey, "merge should reassign load references");
assert(api.catalogUsage("bullet", bullet._legacyKey).loads > 0, "bullet usage should include reassigned loads");

const duplicateLoads = { loads: [
  { id: "planned", gunCatalogKey: gun._legacyKey, powderCatalogKey: powder._legacyKey, bulletCatalogKey: bullet._legacyKey, gun: gun.name, powder: powder.name, bullet: bullet.product, charge: 8, tier: 3, oal: 1.594, note: "Planned", sessions: [], targets: [] },
  { id: "imported", gunCatalogKey: gun._legacyKey, powderCatalogKey: powder._legacyKey, bulletCatalogKey: bullet._legacyKey, gun: gun.name, powder: powder.name, bullet: bullet.product, charge: 8, tier: 3, avg: 896.7, sd: 18.6, es: 56.9, sessions: [{ _syncKey: "session::duplicate", avg: 896.7 }], targets: [] },
] };
assert.equal(api.reconcileDuplicateLoads(duplicateLoads), 1, "compatible planned/imported loads should merge");
assert.equal(duplicateLoads.loads.length, 1);
assert.equal(duplicateLoads.loads[0].oal, 1.594, "planned metadata should survive load merge");
assert.equal(duplicateLoads.loads[0].sessions.length, 1, "imported session should survive load merge");
const conflictingLoads = { loads: duplicateLoads.loads.concat({ ...duplicateLoads.loads[0], id: "different-oal", oal: 1.58 }) };
assert.equal(api.reconcileDuplicateLoads(conflictingLoads), 0, "conflicting OAL values must remain separate");

db.cartridges[db.activeCartridge].journal.push({
  _syncKey: "journal::smoke",
  date: "2026-08-25",
  type: "Bench",
  did: "Smoke",
  photos: ["data:image/jpeg;base64,AA=="],
  photoPaths: [],
});
const safe = api.cloudSafeState(db);
const journal = safe.cartridges[db.activeCartridge].journal.at(-1);
assert(!("photos" in journal), "base64 journal photos must not enter app_state");

catalog.gun_entries.push({
  _syncKey: "gun-entry::smoke",
  gun_key: gun._legacyKey,
  date: "2026-08-25",
  text: "First cylinder",
  photo: "data:image/jpeg;base64,AA==",
  photo_path: null,
});
const bioSafe = api.cloudSafeState(db).catalog.gun_entries.at(-1);
assert(!("photo" in bioSafe), "base64 biography photos must not enter app_state");
assert.equal(gun.rotation_status, "in rotation", "new guns should default to in rotation");
const bioStats = api.biographyStats(gun);
assert.equal(bioStats.first, null, "new gun should not have a first shot yet");

const settings = api.ensureLetterSettings();
assert.equal(settings.letterhead_name, "The Sixgun Retriever", "letterhead should have the archive default");
db.cartridges[db.activeCartridge].loads.push({
  id: "letter-smoke",
  gun: gun.name,
  gunCatalogKey: gun._legacyKey,
  bullet: "255gr Keith",
  powder: "Unique",
  charge: 8.5,
  signature_load: true,
  moa: 2.25,
  sd: 11,
  es: 32,
  sessions: [{ date: "2026-08-26", moa: 2.25, sd: 11, es: 32 }],
  targets: [],
});
const performance = api.loadPerformanceScore(db.cartridges[db.activeCartridge].loads.at(-1));
assert(performance && performance.score > 0, "blended performance score should compute from MOA, ES, and SD");
const letterData = api.letterData(gun);
assert.equal(letterData.signature.id, "letter-smoke", "flagged signature load should surface in the letter");
assert.equal(letterData.sessions, 1, "letter should count linked sessions live");
const letter = api.gunLetter(gun);
letter.prompt_answers.origin = "A test provenance paragraph.";
assert.equal(api.letterPrompts(gun, letterData).length, 4, "letter editor should expose guided prompts");
const archiveMarkup = api.archiveLetterMarkup(gun, { stageId: "smokeStage", pageId: "smokeLetter" });
assert(archiveMarkup.includes('id="smokeLetter"') && archiveMarkup.includes("A test provenance paragraph."), "the inline binder preview must render the complete live archive letter");
const rangeEvents = api.gunRangeEvents(gun);
assert.equal(rangeEvents.length, 1, "linked load sessions should automatically create one Life Record range day");
assert(rangeEvents[0].text.includes("1 chronograph string") && rangeEvents[0].text.includes("255gr Keith"), "automatic range notes should summarize strings and tested loads");
const lifeRecord = api.gunLifeRecord(gun);
assert(lifeRecord.some(item => item.kind === "range") && lifeRecord.some(item => item.kind === "manual"), "Life Record should merge automatic range days with personal notes");

catalog.parts_modifications.push({_syncKey:"parts-modification::smoke",gun_key:gun._legacyKey,title:"Sight swap",description:"Installed a taller front sight.",date:"2026-08-20",vendor:"Test Smith",cost:75});
catalog.maintenance_entries.push({_syncKey:"maintenance-entry::old",gun_key:gun._legacyKey,date:"2026-08-21",category:"Cleaning",notes:"Cleaned and lubricated.",round_count:150});
catalog.maintenance_entries.push({_syncKey:"maintenance-entry::new",gun_key:gun._legacyKey,date:"2026-08-26",category:"Function Check",notes:"Passed.",round_count:null});
assert.equal(api.gunParts(gun).length, 1, "parts records should belong to the firearm");
assert.equal(api.gunMaintenance(gun)[0]._syncKey, "maintenance-entry::new", "maintenance ledger should be reverse chronological");
assert.deepEqual(JSON.parse(JSON.stringify(api.maintenanceSummary(gun))), {count:2,last:"2026-08-26"}, "maintenance summary should expose last service and count");
assert.equal(api.letterData(gun).maintenance.length, 2, "letter data should pull live maintenance records");
const servicePdf = api.pdfPartsMaintenancePages(gun, 2);
assert(servicePdf.includes("Parts &amp; Modifications") && servicePdf.includes("Maintenance Log"), "PDF should preserve both service subsections");
const maintenanceSafe = api.cloudSafeState(db).catalog.maintenance_entries.at(-1);
assert.equal(maintenanceSafe.round_count, null, "maintenance records should persist through app_state snapshots");

const record = api.photoRecord(gun);
assert.equal(record.title, "Photographic Record");
catalog.photo_moments.push({
  _syncKey: "photo-moment::smoke",
  gun_key: gun._legacyKey,
  title: "Acquired",
  sort_position: 0,
});
catalog.moment_photos.push({
  _syncKey: "moment-photo::smoke",
  moment_key: "photo-moment::smoke",
  display_data: "data:image/jpeg;base64,AA==",
  print_data: "data:image/jpeg;base64,AA==",
  sort_position: 0,
  is_featured: true,
});
assert.equal(api.gunMoments(gun).length, 1, "photo Moments should belong to the firearm");
assert.equal(api.momentPhotos("photo-moment::smoke").length, 1, "photos should belong to a Moment");
for (let i = 1; i < 5; i++) catalog.moment_photos.push({
  _syncKey: `moment-photo::smoke-${i}`,
  moment_key: "photo-moment::smoke",
  display_data: "data:image/jpeg;base64,AA==",
  print_data: "data:image/jpeg;base64,AA==",
  sort_position: i,
  is_featured: false,
});
assert.equal(api.albumPageSize(), 2, "mobile portrait should group two postcards per album page");
const albumMarkup = api.renderPhotoMoment(catalog.photo_moments.at(-1), 0, 1);
assert(albumMarkup.includes('data-album-page="2"'), "five mobile postcards should span three album pages");
assert(albumMarkup.includes("Page 1 of 3"), "album markup should expose a ledger-style page count");
const recordAlbumMarkup = api.renderRecordAlbum(api.gunMoments(gun));
assert(recordAlbumMarkup.includes('class="pr-postcard-moment"'), "record-wide postcards must identify their Moment");
assert(recordAlbumMarkup.includes("Page 1 of 1"), "five postcards that fit together should share one album page");
const wideEntries = Array.from({ length: 10 }, (_, i) => ({ p: { pixel_width: 1600, pixel_height: 900 }, m: { title: `Wide ${i}` } }));
assert.deepEqual(Array.from(api.albumPageGroups(wideEntries), page => page.length), [5, 5], "landscape-heavy album pages should hold five postcards");
const portraitEntries = Array.from({ length: 8 }, (_, i) => ({ p: { pixel_width: 900, pixel_height: 1600 }, m: { title: `Portrait ${i}` } }));
assert.deepEqual(Array.from(api.albumPageGroups(portraitEntries), page => page.length), [4, 4], "portrait-heavy album pages should hold four postcards");
const pdfMarkup = api.pdfMomentPages(catalog.photo_moments.at(-1), api.momentPhotos("photo-moment::smoke"), 3);
assert.equal((pdfMarkup.match(/pdf-album-sheet/g) || []).length, 2, "five postcards should span two PDF album sheets");
const recordPdfMarkup = api.pdfRecordAlbumPages(api.gunMoments(gun), api.momentPhotos("photo-moment::smoke")[0], 3);
assert.equal((recordPdfMarkup.match(/pdf-album-sheet/g) || []).length, 1, "four non-cover postcards should share one PDF album sheet");
const photoSafe = api.cloudSafeState(db).catalog.moment_photos.at(-1);
assert(!("display_data" in photoSafe), "display image data must not enter app_state");
assert(!("print_data" in photoSafe), "print image data must not enter app_state");

console.log(JSON.stringify({ guns: gunCount, powders: powderCount, loads: Object.values(db.cartridges).reduce((n, c) => n + c.loads.length, 0), result: "ok" }));
