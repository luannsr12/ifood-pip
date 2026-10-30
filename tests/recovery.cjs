const deliveryWindow=require('./delivery-window.cjs')();
// Real Edge/PiP, synthetic transport and a controlled clock for retry limits.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const id='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const results=path.resolve(process.env.IFOOD_RECOVERY_RESULTS || 'test-results');
(async()=>{
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ifood-recovery-'));
  const context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:false,viewport:null,args:['--disable-extensions-except='+process.cwd(),'--load-extension='+process.cwd()]});
  context.setDefaultTimeout(10000);
  const page=await context.newPage(),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  let payload=[{orderId:id,value:'PREPARATION_STARTED',timestamp:new Date().toISOString()}];
  let details={};
  await page.route('https://www.ifood.com.br/**',route=>route.request().url().includes('/site-api/')?route.fulfill({json:route.request().url().endsWith('/events')?payload:details}):route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><h2 data-testid="merchant-name">Cozinha da Praça</h2><p>Pedido #4421</p><p>Previsão de entrega ${deliveryWindow.label}</p><p>Código de entrega 1234</p>`}));
  try {
    await page.goto(`https://www.ifood.com.br/pedido/${id}/acompanhar`);
    await page.evaluate(()=>{localStorage.setItem('ifood-pip-mode','full');const now=Date.now;window.__clock=0;Date.now=()=>now()+window.__clock});
    const feed=()=>page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(r=>r.json()),id);
    await feed();
    const popup=context.waitForEvent('page');await page.locator('#ifood-pip-companion-root button').click();
    const pip=await popup;await pip.locator('#status').filter({hasText:'Preparando o pedido'}).waitFor();
    assert.equal(await pip.locator('body').getAttribute('data-mode'),'compact');
    // Details can arrive separately while the event history stays identical.
    payload=[{orderId:id,value:'ASSIGN_DRIVER',timestamp:new Date().toISOString()}];await feed();
    details={delivery:{driver:{name:'Mariana Aparecida',modal:'MOTORCYCLE'}}};
    const feedDetails=()=>page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}`).then(r=>r.json()),id);
    await feedDetails();await pip.locator('#driver-name').filter({hasText:'Mariana A.'}).waitFor();
    details={delivery:{driver:{name:'Matheus Almeida',modal:'BICYCLE'}}};
    await feedDetails();await pip.locator('#driver-name').filter({hasText:'Matheus A.'}).waitFor();
    assert.equal(await pip.locator('#vehicle').textContent(),'Bicicleta');
    const bounds=async()=>{
      const b=await pip.evaluate(()=>({height:innerHeight,scroll:document.documentElement.scrollHeight,footer:document.querySelector('.footer').getBoundingClientRect().bottom,note:document.querySelector('#note').getBoundingClientRect().bottom}));
      assert.ok(b.scroll<=b.height&&b.footer<=b.height&&b.note<=b.height,JSON.stringify(b));
    };
    await pip.evaluate(()=>{
      window.__calls=0;window.__timers=new Map();window.__result='http';
      const schedule=window.setTimeout.bind(window),cancel=window.clearTimeout.bind(window);
      window.setTimeout=(fn,delay)=>{const id=schedule(()=>{window.__timers.delete(id);fn()},delay);window.__timers.set(id,{fn,delay});return id};
      window.clearTimeout=id=>{window.__timers.delete(id);cancel(id)};
      window.__tick=()=>{const [id,timer]=[...window.__timers][0];window.clearTimeout(id);timer.fn()};
      window.fetch=async()=>{window.__calls++;if(window.__result==='network')throw Error('offline');return window.__result==='invalid'?new Response('{'):new Response('',{status:503})};
    });
    await pip.locator('#refresh').click();
    await pip.waitForFunction(()=>!document.querySelector('#refresh.refreshing'));
    await page.evaluate(()=>window.__clock+=120000);
    for(const result of ['network','invalid','http']) {
      assert.equal(await pip.evaluate(()=>[...window.__timers.values()][0].delay),60000);
      await pip.evaluate(result=>{window.__result=result;window.__tick()},result);
      await pip.waitForFunction(()=>!document.querySelector('#refresh.refreshing'));
    }
    await pip.locator('#note').filter({hasText:'Consultas pausadas'}).waitFor();
    assert.equal(await pip.evaluate(()=>window.__calls),4);
    assert.equal(await pip.evaluate(()=>window.__timers.size),0);
    assert.equal(await pip.locator('#refresh').isDisabled(),true);
    await pip.evaluate(()=>document.getElementById('refresh').click());
    assert.equal(await pip.evaluate(()=>window.__calls),4);
    await bounds();fs.mkdirSync(results,{recursive:true});
    await pip.screenshot({path:path.join(results,'recovery-compact-paused.png')});
    await pip.locator('#toggle-mode').click();await pip.waitForFunction(()=>innerHeight>210);
    await bounds();assert.equal(await pip.locator('#note').isVisible(),true);
    await pip.screenshot({path:path.join(results,'recovery-full-paused.png')});
    // Successful traffic from the site clears the budget and restarts one timer.
    await feed();await pip.waitForFunction(()=>!document.getElementById('refresh').disabled);
    assert.equal(await pip.evaluate(()=>window.__timers.size),1);
    payload=[{orderId:id,value:'ASSIGN_DRIVER',timestamp:new Date().toISOString(),metadata:{driverName:'Ana Souza',modal:'MOTORCYCLE'}},{orderId:id,value:'DISPATCHED',timestamp:new Date().toISOString(),metadata:{routeDistanceMeters:2200}}];
    await feed();await pip.locator('#toggle-mode').click();
    await pip.waitForFunction(()=>Math.abs(innerHeight-142)<=3);
    for(let n=0;n<4;n++) {await pip.locator('#refresh').click();await pip.waitForFunction(()=>!document.querySelector('#refresh.refreshing'))}
    await pip.locator('#note').filter({hasText:'Consultas pausadas'}).waitFor();
    assert.equal(await pip.locator('#code-card').isVisible(),true);
    assert.equal(await pip.locator('#driver-card').isVisible(),true);
    await bounds();await pip.screenshot({path:path.join(results,'recovery-compact-code-paused.png')});
    assert.equal(await pip.evaluate(()=>window.__timers.size),0);
    payload=[{orderId:id,value:'COMPLETED',timestamp:new Date().toISOString()}];await feed();
    await pip.locator('#toggle-mode').click();await pip.waitForFunction(()=>innerHeight>210);
    await pip.locator('#eta').filter({hasText:'Pedido concluído'}).waitFor();
    assert.equal(await pip.evaluate(()=>window.__timers.size),0);
    assert.equal(await pip.locator('#refresh').isDisabled(),true);
    await pip.evaluate(()=>document.getElementById('refresh').click());
    assert.equal(await pip.evaluate(()=>window.__calls),8);
    assert.equal(await pip.locator('#code-card').isVisible(),false);
    await bounds();await pip.screenshot({path:path.join(results,'recovery-completed.png')});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',consecutiveFailures:4,automaticCallbacks:3,pageRecovery:true,terminalStopped:true,compactDefault:true,errors}));
  } finally {await context.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
})().catch(e=>{console.error(e);process.exitCode=1});
