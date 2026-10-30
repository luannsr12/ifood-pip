const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const order = require('../src/order');
const {createI18n,message} = require('../src/i18n');
const createFormat = require('../src/format');
const catalogs = Object.fromEntries(['pt','en','es'].map(lang=>[lang,require('../_locales/'+(lang==='pt'?'pt_BR':lang)+'/messages.json')]));

test('catalogs have identical keys and placeholder contracts; every source key exists',()=>{
  const keys = Object.keys(catalogs.pt).sort();
  for (const catalog of Object.values(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(),keys);
    for (const key of keys) {
      assert.ok(catalog[key].message);
      assert.deepEqual([...catalog[key].message.matchAll(/\$(\w+)\$/g)].map(m=>m[1]).sort(),[...catalogs.pt[key].message.matchAll(/\$(\w+)\$/g)].map(m=>m[1]).sort());
    }
  }
  for (const file of fs.readdirSync('src').filter(f=>f.endsWith('.js'))) {
    for (const match of fs.readFileSync(path.join('src',file),'utf8').matchAll(/['"]((?:ui_|order_|pip_|language_)[a-z_0-9]+)['"]/g)) assert.ok(catalogs.pt[match[1]],file+': '+match[1]);
  }
});
test('language changes, interpolation, fallback and invariant minute pluralization',()=>{
  let language='pt'; const {t}=createI18n(catalogs,()=>language);
  assert.equal(t(message('order_arrives',{count:1})),'Chega em ~1 min');
  language='en'; assert.equal(t(message('order_arrives',{count:2})),'Arrives in ~2 min');
  language='es'; assert.equal(t(message('order_arrives',{count:1})),'Llega en ~1 min');
  assert.equal(createI18n({pt:catalogs.pt,en:{}},()=> 'en').t('pip_expand'),'Expandir acompanhamento');
  language='pt';assert.equal(t(message('pip_eta_minutes',{count:10})),'~ 10 minutos');
  assert.equal(t(message('pip_eta_minutes',{count:1})),'~ 1 minuto');
});
test('browser fixtures promise delivery 20 to 30 minutes from test start, including midnight',()=>{
  const window=require('./delivery-window.cjs');
  assert.deepEqual(window(new Date(2026,9,30,15,56).getTime()),{range:'16:16 – 16:26',label:'Hoje, 16:16 – 16:26'});
  assert.deepEqual(window(new Date(2026,9,30,23,50).getTime()),{range:'00:10 – 00:20',label:'Amanhã, 00:10 – 00:20'});
});
test('short positive distances never round down to zero kilometers',()=>{
  const pt=createFormat(()=> 'pt-BR'),en=createFormat(()=> 'en-US');
  assert.equal(pt.kilometers(2300),'2,3km');
  assert.equal(pt.kilometers(12),'0,012km');
  assert.equal(pt.kilometers(.5),'<0,001km');
  assert.equal(en.kilometers(12),'0.012km');
  assert.equal(en.kilometers(199900),'199.9km');
});
test('every event has a compact label while full wording stays available',()=>{
  const compact=require('../src/compact-status');
  for(const event of Object.values(order.MILESTONES)) {
    assert.notEqual(compact(event.label),event.label);
    for(const catalog of Object.values(catalogs)) assert.ok(catalog[compact(event.label)]?.message);
  }
  assert.equal(catalogs.pt[compact('ui_courier_arrived_at_your_address')].message,'Chegou por aí');
  assert.equal(catalogs.pt[compact('ui_order_out_for_delivery')].message,'Saiu para entrega');
});
test('preferences preserve saved language; storage can be blocked',()=>{
  const map=new Map(); const preferences=require('../src/preferences')(()=>({getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)}));
  assert.equal(preferences.read('language'),'pt');
  preferences.write('language','en');
  assert.equal(preferences.read('language'),'en');
  assert.equal(preferences.write('language','invalid'),false);
  const blocked=require('../src/preferences')(()=>{throw Error('blocked')});
  assert.equal(blocked.read('language'),'pt'); assert.equal(blocked.write('language','pt'),true);
});
test('events never regress, filter order IDs, preserve route, driver and validated delivery code',()=>{
  const id='order'; const event=(value,time,metadata={})=>({orderId:id,value,timestamp:new Date(time).toISOString(),metadata});
  const summary=order.summarizeEvents([
    event('ASSIGN_DRIVER',1000,{driverName:'Ana',modal:'MOTORCYCLE'}),
    event('DISPATCHED',2000,{routeDistanceMeters:3000}),event('DELIVERED',3000),
    event('PREPARATION_STARTED',4000),event('DELIVERY_DROP_CODE_VALIDATION_SUCCESS',5000,{HANDSHAKE_TYPE:'DELIVERY',HANDSHAKE_CODE:'1234'}),
    {...event('CANCELLED',6000),orderId:'other'}
  ],id);
  assert.equal(summary.stage,'delivered'); assert.equal(summary.departedAt,2000); assert.equal(summary.driver,'Ana');
  assert.equal(summary.code,'1234'); assert.equal(summary.codeValidated,true); assert.equal(summary.routeDistanceMeters,3000);
  assert.equal(order.displaySnapshot(summary,{pageStatus:{stage:'preparing'}}).stage,'delivered');
  assert.equal(order.readPageStatus('O pedido está sendo preparado e logo sairá para entrega').stage,'preparing');
});
test('route estimates stay anchored to departure and format independently of language',()=>{
  let language='pt'; const {t,locale}=createI18n(catalogs,()=>language); const format=createFormat(locale);
  const estimate=require('../src/arrival')({orderDetails:{}},format,t);
  const data={stage:'shipping',routeDistanceMeters:2200,modal:order.normalizeModal('MOTORCYCLE'),departedAt:100000};
  const first=estimate(data,{},100000), later=estimate(data,{},160000);
  assert.equal(first.title.values.count,8); assert.equal(later.title.values.count,7);
  language='en'; assert.match(t(estimate(data,{},160000).detail),/2.2 km/);
  assert.equal(estimate({stage:'shipping'},{},160000).title,'ui_out_for_delivery');
  assert.equal(estimate({stage:'delivered'},{},160000).title,'ui_order_completed');
});
test('expanded history uses received events with timestamps, without inferring missing milestones',()=>{
  const event=(value,time,metadata={})=>({orderId:'order',value,timestamp:new Date(time).toISOString(),metadata});
  const summary=order.summarizeEvents([event('CREATED',1000),event('PLACED',2000),event('PREPARATION_STARTED',3000),event('ETA_UPDATED',4000,{confirmedAt:1500,dispatchedAt:5000})],'order');
  assert.deepEqual(summary.timeline,{created:1000,preparing:3000});
  assert.equal(summary.departedAt,0);
  assert.equal(order.readPageStatus('Pedido concluído').stage,'delivered');
  assert.equal(catalogs.pt.ui_the_restaurant_is_preparing_your_order.message,'Preparando o pedido');
  assert.equal(catalogs.pt.ui_order_completed.message,'Pedido concluído');
});
test('polling schedules only on PiP, deduplicates, backs off 429 and stops cleanly',async()=>{
  const timers=new Map(); let count=0, calls=0, resolve;
  const state={pip:{closed:false,setTimeout:(fn,delay)=>{timers.set(++count,{fn,delay});return count},clearTimeout:id=>timers.delete(id)},pollTimer:null,pollInFlight:false,lastPageUpdateAt:0,snapshot:{}};
  let refresh=()=>new Promise(r=>resolve=r);
  const polling=require('../src/polling')({state,getOrderId:()=> 'order',renderPip:()=>{},POLL_INTERVAL:60000,refreshCaptured:()=>{calls++;return refresh()}});
  polling.queueNextPoll();polling.queueNextPoll(); assert.equal(timers.size,1); assert.equal([...timers.values()][0].delay,60000);
  const pending=polling.pollEvents(true); await polling.pollEvents(true);assert.equal(calls,1);
  resolve({ok:false,reason:'HTTP 429'}); await pending;
  assert.equal([...timers.values()][0].delay,60000); assert.equal(state.pollInFlight,false);
  state.lastPageUpdateAt=Date.now(); await polling.pollEvents(); assert.equal(calls,1);
  polling.stopPolling();assert.equal(timers.size,0);
});
test('MV3 package stays permission-free, in MAIN at document_start, and bundle is current',()=>{
  const manifest=require('../manifest.json');assert.equal(manifest.manifest_version,3);assert.deepEqual(manifest.permissions,[]);
  assert.equal(manifest.content_scripts[0].world,'MAIN');assert.equal(manifest.content_scripts[0].run_at,'document_start');
  assert.deepEqual(manifest.content_scripts[0].matches,['https://www.ifood.com.br/*']);
  assert.equal(manifest.default_locale,'pt_BR');assert.equal(fs.readFileSync('content.js','utf8'),require('../scripts/build.cjs')());
});

test('fetch and XHR observation preserve captured headers and replay in the PiP context',async()=>{
  const previous={window:global.window,location:global.location,XMLHttpRequest:global.XMLHttpRequest};
  const id='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const url=`https://www.ifood.com.br/site-api/v1/customers/me/orders/${id}/events`;
  const body=[{orderId:id,value:'CONFIRMED'}];
  const calls=[];
  class XHR {
    open(){} setRequestHeader(){} send(){}
    addEventListener(_,fn){this.loaded=fn}
  }
  try {
    global.location={href:url,origin:'https://www.ifood.com.br'};
    global.XMLHttpRequest=XHR;
    global.window={fetch:async()=>new Response(JSON.stringify(body))};
    const state={orderDetails:{},pip:{fetch:async(input,init)=>{const request=new Request(input,init);calls.push(request);return new Response(JSON.stringify(body))}},activeOrderId:id};
    const refresh=require('../src/traffic')({state,getOrderId:()=>id,renderPip:()=>{},queueNextPoll:()=>{}});
    await window.fetch(url,{headers:{'x-session':'fetch-token'}});
    assert.equal((await refresh(id)).ok,true);
    assert.equal(calls[0].headers.get('x-session'),'fetch-token');
    assert.equal(calls[0].cache,'no-store');
    const xhr=new XHR();xhr.open('GET',url);xhr.setRequestHeader('x-session','xhr-token');xhr.withCredentials=true;xhr.send();
    await refresh(id);
    assert.equal(calls[1].headers.get('x-session'),'xhr-token');
    assert.equal(calls[1].credentials,'include');
    assert.equal((await refresh('different-order')).reason,'waiting');
  } finally {
    for(const [key,value] of Object.entries(previous)) if(value===undefined)delete global[key];else global[key]=value;
  }
});
