// Exhaustive simulation of every recognized milestone and metadata event.
// Uses actual manifest injection and the actual PiP, with synthetic HTTP data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {MILESTONES}=require('../src/order');
const catalog=require('../_locales/pt_BR/messages.json');
const id='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const results=path.resolve('test-results/events');
const escape=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function scenario(value,index) {
  const now=Date.now()-1000, rank=MILESTONES[value]?.rank ?? 9;
  const event=(name,time,metadata={})=>({orderId:id,value:name,timestamp:new Date(time).toISOString(),metadata});
  const events=[];
  if(rank>4.5) events.push(event('ASSIGN_DRIVER',now-5*60000,{driverName:'Ana Souza',modal:'MOTORCYCLE',routeDistanceMeters:2200}));
  if(rank>=6) events.push(event('ARRIVED_AT_ORIGIN',now-4*60000));
  if(rank>=7) events.push(event('COLLECTED',now-3*60000));
  if(rank>=8) events.push(event('DISPATCHED',now-2*60000));
  if(!MILESTONES[value]) events.push(event('ARRIVED_AT_DESTINATION',now-1000));
  const metadata={newEta:new Date(now+30*60000).toISOString(),routeDistanceMeters:2200};
  if(['ASSIGN_DRIVER','DELIVERY_ACCEPTED'].includes(value))Object.assign(metadata,{driverName:'Ana Souza',modal:'MOTORCYCLE'});
  if(value.startsWith('DELIVERY_DROP_CODE_'))Object.assign(metadata,{HANDSHAKE_TYPE:'DELIVERY',HANDSHAKE_CODE:'1234'});
  events.push(event(value,now,metadata));
  return {value,index,events,stage:MILESTONES[value]?.stage || 'arriving',label:catalog[MILESTONES[value]?.label || 'ui_courier_arrived_at_your_address'].message};
}

(async()=>{
  fs.mkdirSync(results,{recursive:true});
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ifood-events-test-'));
  const context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:false,viewport:null,args:['--disable-extensions-except='+process.cwd(),'--load-extension='+process.cwd()]});
  context.setDefaultTimeout(10000);
  const page=await context.newPage(), errors=[], report=[];
  page.on('pageerror',error=>errors.push(error.message));
  let payload=[];
  await page.route('https://www.ifood.com.br/**',route=>{
    if(route.request().url().includes('/site-api/'))return route.fulfill({json:payload});
    return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><title>Event simulation</title><h2 data-testid="merchant-name">Cozinha da Praça</h2><p>Pedido #4421</p><p>Previsão de entrega Hoje, 13:30 – 14:00</p><p>Código de entrega 1234</p>'});
  });
  try {
    await page.goto('https://www.ifood.com.br/');
    await page.evaluate(id=>history.pushState({},'',`/pedido/${id}/acompanhar`),id);
    await page.locator('#ifood-pip-companion-root button').waitFor();
    const popup=context.waitForEvent('page');await page.locator('#ifood-pip-companion-root button').click();
    const pip=await popup;pip.on('pageerror',error=>errors.push(error.message));
    await pip.locator('#status').waitFor();
    const values=[...Object.keys(MILESTONES),'DELIVERY_DROP_CODE_REQUESTED','DELIVERY_DROP_CODE_VALIDATION_SUCCESS','ETA_UPDATED'];
    for(const [index,value] of values.entries()) {
      const data=scenario(value,index);payload=data.events;
      await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(res=>res.json()),id);
      await pip.waitForFunction(({stage,label})=>document.body.dataset.stage===stage && document.getElementById('status').textContent===label,data);
      const item={event:value,stage:data.stage,modes:{}};
      for(const mode of ['full','compact']) {
        if(await pip.locator('body').getAttribute('data-mode')!==mode)await pip.locator('#toggle-mode').click();
        await pip.waitForFunction(mode=>mode==='compact'?Math.abs(innerHeight-164)<=3:innerHeight>210,mode);
        const state=await pip.evaluate(()=>{
          const rect=selector=>{const element=document.querySelector(selector);const box=element.getBoundingClientRect();return {x:box.x,y:box.y,right:box.right,bottom:box.bottom,width:box.width,height:box.height,visible:!!(box.width&&box.height)}};
          return {eta:document.getElementById('eta').textContent,status:document.getElementById('status').textContent,viewport:{width:innerWidth,height:innerHeight},scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},footer:rect('.footer'),etaBox:rect('.hero'),statusBox:rect('.status-head'),driverBox:rect('.driver'),storeSvg:!!document.querySelector('#store-avatar svg'),driverSvg:!!document.querySelector('#driver-avatar svg'),driver:document.getElementById('driver-name').textContent,codeVisible:rect('.code').visible,text:document.body.innerText};
        });
        assert.ok(state.scroll.width<=state.viewport.width,value+' '+mode+' horizontal scroll');
        assert.ok(state.scroll.height<=state.viewport.height,value+' '+mode+' vertical scroll');
        assert.ok(state.footer.bottom<=state.viewport.height,value+' '+mode+' footer clipped');
        assert.equal(state.storeSvg,true,value+' '+mode+' missing store SVG');
        if(state.driver) {
          assert.equal(state.driverSvg,true,value+' '+mode+' missing courier SVG');
          assert.equal(state.driverBox.visible,true,value+' '+mode+' missing courier');
          if(mode==='compact') assert.ok(state.statusBox.bottom<=state.driverBox.y+1,value+' overlapping courier/status');
        }
        if(['received','preparing','driver','atStore'].includes(data.stage)) {
          assert.equal(state.eta,'13:30 – 14:00',value+' '+mode+' merchant window was not preserved');
          assert.doesNotMatch(state.eta,/~|\bmin\b/);
        } else if(data.stage==='shipping') assert.match(state.eta,/~\d+ min/,value+' '+mode+' missing dispatch countdown');
        if(value==='COLLECTED'||value==='DELIVERY_COLLECTED')assert.equal(state.eta,'13:30 – 14:00');
        if(value==='DELIVERY_DROP_CODE_VALIDATION_SUCCESS'||['delivered','cancelled'].includes(data.stage))assert.equal(state.codeVisible,false);
        if(['shipping','arriving'].includes(data.stage)&&value!=='DELIVERY_DROP_CODE_VALIDATION_SUCCESS')assert.equal(state.codeVisible,true,value+' '+mode+' missing delivery code');
        if(['received','preparing','driver','atStore'].includes(data.stage))assert.equal(state.codeVisible,false,value+' early delivery code');
        assert.doesNotMatch(state.text,/\b(?:ui_|pip_|order_)[a-z_]+/);
        const file=`${String(index+1).padStart(2,'0')}-${value.toLowerCase()}-${mode}.png`;
        await pip.screenshot({path:path.join(results,file)});
        item.modes[mode]={file,eta:state.eta,driverSvg:state.driverSvg,storeSvg:state.storeSvg};
      }
      report.push(item);
      if((index+1)%8===0)console.log(`Simulated ${index+1}/${values.length} events in both modes`);
    }
    // Keep the initial short full window open while all new information
    // arrives. No synthetic click/activation may resize it for these updates.
    payload=scenario('CREATED',0).events;
    await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(res=>res.json()),id);
    await pip.waitForFunction(()=>document.body.dataset.stage==='received');
    if(await pip.locator('body').getAttribute('data-mode')!=='full')await pip.locator('#toggle-mode').click();
    await pip.waitForFunction(()=>innerHeight>210);
    for(const value of ['CONFIRMED','PREPARATION_STARTED','ASSIGN_DRIVER','COLLECTED','DISPATCHED','ARRIVED_AT_DESTINATION','DELIVERY_DROP_CODE_VALIDATION_SUCCESS','DELIVERED']) {
      const data=scenario(value,0);payload=data.events;
      await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(res=>res.json()),id);
      await pip.waitForFunction(({stage,label})=>document.body.dataset.stage===stage&&document.getElementById('status').textContent===label,data);
      const fit=await pip.evaluate(()=>({height:innerHeight,footer:document.querySelector('.footer').getBoundingClientRect().bottom,driver:document.querySelector('.driver').getBoundingClientRect().bottom,code:document.querySelector('.code').getBoundingClientRect().bottom}));
      assert.ok(fit.footer<=fit.height,value+' short-window footer clipped: '+JSON.stringify(fit));
      assert.ok(fit.driver<=fit.height,value+' short-window courier clipped');
      assert.ok(fit.code<=fit.height,value+' short-window code clipped');
    }
    await pip.screenshot({path:path.join(results,'progressive-short-window.png')});
    assert.deepEqual(errors,[]);
    const summary={result:'PASS',events:report.length,renderedStates:report.length*2,progressiveShortWindow:true,errors,scenarios:report};
    fs.writeFileSync(path.join(results,'report.json'),JSON.stringify(summary,null,2));
    fs.writeFileSync(path.join(results,'index.html'),`<!doctype html><meta charset="utf-8"><title>iFood PiP — Simulação de eventos</title><style>body{font:14px Arial;margin:28px;background:#f5f5f5;color:#333}table{border-collapse:collapse}th,td{padding:12px;border:1px solid #ddd;vertical-align:top}img{display:block;width:350px}h1{font-size:23px}small{display:block;margin-top:8px;color:#666}</style><h1>iFood PiP — ${report.length} eventos · ${report.length*2} estados</h1><p>Capturas da PiP real no Edge. Dados sintéticos. Todos os cenários passaram pelas verificações de horários, layout e SVGs.</p><table><tr><th>Evento</th><th>Completo</th><th>Compacto</th></tr>${report.map(item=>`<tr><td>${escape(item.event)}<small>${escape(item.stage)}</small></td>${['full','compact'].map(mode=>`<td><img src="${item.modes[mode].file}" alt="${escape(item.event)} ${mode}"><small>${escape(item.modes[mode].eta)}</small></td>`).join('')}</tr>`).join('')}</table>`);
    await pip.close();
    console.log(JSON.stringify({result:'PASS',events:report.length,renderedStates:report.length*2,errors,gallery:path.join(results,'index.html')},null,2));
  } finally {await context.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
})().catch(error=>{console.error(error);process.exitCode=1});
