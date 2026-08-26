const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const { webcrypto } = require("crypto");

const html = fs.readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(script => script.includes("const SEED"));
assert.equal(scripts.length, 1, "expected the main inline application script");

function elementStub() {
  return {
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
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

const document = {
  body: elementStub(),
  getElementById() { return elementStub(); },
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
  localStorage: { getItem() { return null; }, removeItem() {} },
};
context.window = { addEventListener() {}, scrollTo() {}, supabase: null };
context.globalThis = context;
vm.createContext(context);

const instrumented = scripts[0].replace(
  /cloudBoot\(\);\s*$/,
  "globalThis.__test={ensureCatalog,addGunRecord,addPowderRecord,catalogUsage,removeCatalogEntry,cloudSafeState,getDB:()=>DB,getLibTables:()=>LIB_TABLES};"
);
vm.runInContext(instrumented, context);

const api = context.__test;
const db = api.getDB();
const catalog = api.ensureCatalog();
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

console.log(JSON.stringify({ guns: gunCount, powders: powderCount, loads: Object.values(db.cartridges).reduce((n, c) => n + c.loads.length, 0), result: "ok" }));

