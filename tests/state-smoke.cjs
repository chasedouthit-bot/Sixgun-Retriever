const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const { webcrypto } = require("crypto");

const html = fs.readFileSync("index.html", "utf8");
const landingVersion = html.match(/<div class="landing-version">Version ([^<]+)<\/div>/)?.[1];
const cacheVersion = html.match(/const CACHE_VERSION="sixgun-retriever-v([^";]+)"/)?.[1];
assert(landingVersion && landingVersion === cacheVersion, "landing and cache versions must be present and match");
assert(html.includes("body>header{"), "top-bar styles must be scoped away from page-level header elements");
assert(!html.includes("\nheader{\n"), "page-level headers must not inherit the sticky top-bar layout");
assert(html.includes(".field{display:flex;min-width:0"), "editor fields must be allowed to shrink within their grid column");
assert(html.includes(".editor-card .form-grid{grid-template-columns:minmax(0,1fr)}"), "editor forms must stack on narrow mobile screens");
assert(html.includes("assets/photographic-record-masthead.webp"), "photographic record must use the archival engraving masthead");
assert(html.includes("aspect-ratio:3/2;height:auto!important"), "photographic masthead must preserve the engraving ratio responsively");
assert(html.includes("applyPhotoCoverMasthead(book,g)"), "PDF export must apply the photographic masthead to its cover");
assert(html.includes("scroll-snap-type:x mandatory"), "photographic Moments must use deliberate snap pagination");
assert(html.includes("class=\"pr-postcard\""), "photographs must render as archival postcard cards");
assert(html.includes("function wireAlbumNavigation"), "album pages must expose arrow and page-indicator navigation");
assert(html.includes("pdf-postcard-grid"), "PDF photo pages must preserve the postcard album treatment");
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
  "globalThis.__test={ensureCatalog,addGunRecord,addPowderRecord,catalogUsage,removeCatalogEntry,cloudSafeState,biographyStats,loadPerformanceScore,letterData,letterPrompts,ensureLetterSettings,gunLetter,photoRecord,gunMoments,momentPhotos,normalizePhotoOrder,albumPageSize,renderPhotoMoment,pdfMomentPages,getDB:()=>DB,getLibTables:()=>LIB_TABLES};"
);
vm.runInContext(instrumented, context);

const api = context.__test;
const db = api.getDB();
const catalog = api.ensureCatalog();
assert.equal(typeof elements.get("doorBench").onclick, "function", "Reloading Bench must be interactive before cloud hydration");
context.window.SixgunCloud = null;
elements.get("doorBench").onclick();
assert(elements.get("landing").classList.contains("hidden"), "Reloading Bench should dismiss the landing page");
assert(catalog.guns.length > 0, "seed guns should migrate into Catalog");
assert(catalog.powders.length > 0, "seed/load powders should migrate into Catalog");
for (const cartridge of Object.values(db.cartridges)) {
  for (const load of cartridge.loads) {
    assert(load.gunCatalogKey, `load ${load.id} is missing gunCatalogKey`);
    assert(load.powderCatalogKey, `load ${load.id} is missing powderCatalogKey`);
  }
}

const gunCount = catalog.guns.length;
const powderCount = catalog.powders.length;
const gun = api.addGunRecord({ make: "Test", model: "Smoke", caliber: db.activeCartridge });
const powder = api.addPowderRecord({ name: "Smoke Powder", notes: "test only" });
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
const pdfMarkup = api.pdfMomentPages(catalog.photo_moments.at(-1), api.momentPhotos("photo-moment::smoke"), 3);
assert.equal((pdfMarkup.match(/pdf-album-sheet/g) || []).length, 2, "five postcards should span two PDF album sheets");
const photoSafe = api.cloudSafeState(db).catalog.moment_photos.at(-1);
assert(!("display_data" in photoSafe), "display image data must not enter app_state");
assert(!("print_data" in photoSafe), "print image data must not enter app_state");

console.log(JSON.stringify({ guns: gunCount, powders: powderCount, loads: Object.values(db.cartridges).reduce((n, c) => n + c.loads.length, 0), result: "ok" }));

