const assert=require('assert/strict');
const {api,context,db}=require('./state-smoke.cjs');

async function main(){
  const cart=Object.keys(db.cartridges)[0],loads=db.cartridges[cart].loads;
  const a={id:'retry-a',avg:123,sd:4,es:12,sessions:[]},b={id:'retry-b',avg:456,sd:5,es:15,sessions:[]};loads.push(a,b);
  const row={loadKey:`${cart}::retry-a`,notes:'first attempt',session:{_syncKey:'stable-import',avg:1000,sd:20,es:40},parsed:{computed:{avg:1000,sd:20,es:40}}};
  api.attachImportSession(row,{cart,load:a});api.attachImportSession(row,{cart,load:a});
  assert.equal(a.sessions.length,1,'retry must not duplicate a session');
  // Hydration/reload breaks object identity; reassignment must use the stable key.
  a.sessions=JSON.parse(JSON.stringify(a.sessions));row.loadKey=`${cart}::retry-b`;row.notes='corrected assignment';
  api.attachImportSession(row,{cart,load:b});
  assert.equal(a.sessions.length,0);assert.equal(a.avg,123,'restore previous summary on original load');
  assert.equal(b.sessions.length,1);assert.equal(b.sessions[0].notes,'corrected assignment');
  row.loadKey=`${cart}::retry-a`;api.attachImportSession(row,{cart,load:a});
  assert.equal(b.avg,456);assert.equal(b.sessions.length,0);assert.equal(a.sessions.length,1);

  const powder=db.catalog.powders[0],old=powder.name;
  const linked={powder:old,powderCatalogKey:powder._legacyKey},legacy={powder:old};loads.push(linked,legacy);
  api.updatePowderRecord(powder._legacyKey,{name:'Renamed component',notes:'Updated note'});
  assert.equal(linked.powder,'Renamed component');assert.equal(legacy.powderCatalogKey,powder._legacyKey);
  assert.throws(()=>api.updatePowderRecord(powder._legacyKey,{name:db.catalog.powders[1].name}),/already/);
  assert.equal(powder.name,'Renamed component','duplicate validation must not mutate catalog');

  const draft={};api.captureImportDraft(draft,{querySelectorAll:()=>[{dataset:{newGun:'model'},value:'Unfinished model'},{dataset:{newLoad:'powder'},value:'powder-key'}]});
  assert.equal(draft.draft['gun:model'],'Unfinished model');assert.equal(draft.draft['load:powder'],'powder-key');
  assert.equal(api.navigationKey({screen:'catalog',biographyKey:null}),api.navigationKey({screen:'catalog',biographyKey:'gun'}),'catalog scroll must survive a biography visit');
  assert.notEqual(api.navigationKey({screen:'biography',biographyKey:'a'}),api.navigationKey({screen:'biography',biographyKey:'b'}));

  const order=[];let release;
  const first=api.serializeCloudWrite(async()=>{order.push(1);await new Promise(r=>release=r);order.push(2);});
  const second=api.serializeCloudWrite(async()=>order.push(3));
  await Promise.resolve();assert.deepEqual(order,[1]);release();await Promise.all([first,second]);assert.deepEqual(order,[1,2,3]);
  await assert.rejects(api.serializeCloudWrite(async()=>{throw Error('disk failure');}));
  await api.serializeCloudWrite(async()=>order.push(4));assert.equal(order.at(-1),4,'a failed write must not block later retries');

  let queued={id:'snapshot',revision:'old',state:{marker:'old'}};
  context.idbGet=async()=>queued;
  // Minimal IndexedDB transaction fixture, exercising the real conditional acknowledgement.
  context.idbOpen=async()=>({transaction:()=>{
    const tx={objectStore:()=>({get:()=>{const req={};queueMicrotask(()=>{req.result=queued;req.onsuccess();queueMicrotask(()=>tx.oncomplete());});return req;},delete:()=>{queued=null;}})};return tx;
  }});
  await api.acknowledgeCloudSnapshot({revision:'different'});assert(queued,'an older completion must not delete a newer snapshot');
  await api.acknowledgeCloudSnapshot({revision:'old'});assert.equal(queued,null);
  queued={id:'snapshot',revision:'old',state:{marker:'old'}};api.setCloudUser({id:'test-user'});
  context.syncNormalized=async state=>{assert.equal(state.marker,'old');queued={id:'snapshot',revision:'new',state:{marker:'new'}};db.uiTestMarker='newer edit';};
  await api.flushCloudQueue(true);assert.equal(queued.revision,'new');assert.equal(api.getDB().uiTestMarker,'newer edit');
  context.syncNormalized=async()=>{throw Error('connection interrupted');};
  const logged=[];context.console={...console,error:(...args)=>logged.push(args)};
  await assert.rejects(api.flushCloudQueue(true),/connection interrupted/);assert.equal(queued.revision,'new','failed sync must retain pending work');assert.equal(logged.length,1);

  const mediaLoad={id:'media-race',targets:[{_syncKey:'photo-race',photoPath:'existing/photo.jpg',note:'original'}]};db.cartridges[cart].loads.push(mediaLoad);
  const mediaState={cartridges:{[cart]:{loads:[{id:'media-race',targets:[{_syncKey:'photo-race'}]}],journal:[]}},catalog:{gun_entries:[],moment_photos:[]}};
  let local=JSON.parse(JSON.stringify(db)),reads=0;
  context.idbGet=async()=>{const value=JSON.parse(JSON.stringify(local));if(++reads===1){mediaLoad.targets[0].note='edited during sync';local=JSON.parse(JSON.stringify(db));}return{value};};
  context.idbPut=async(_store,record)=>{local=record.value;};
  await api.uploadPendingTargets(mediaState);
  assert.equal(mediaState.cartridges[cart].loads[0].targets[0].photoPath,'existing/photo.jpg','reuse uploaded media on a stale queued snapshot');
  assert.equal(local.cartridges[cart].loads.find(l=>l.id==='media-race').targets[0].note,'edited during sync','upload completion must preserve newer local edits');
  assert.equal(mediaLoad.targets[0].note,'edited during sync');
  console.log('UX regressions passed: retry/reassignment, catalog rename, row drafts, navigation, queued writes, sync acknowledgement and media races.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
