// Optional headed Edge integration test. Uses synthetic data and a temporary profile.
// NODE_PATH may point to an existing Playwright installation; no runtime dependency.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const id='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
(async()=>{
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ifood-pip-test-'));
  const context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:false,viewport:null,args:['--disable-extensions-except='+process.cwd(),'--load-extension='+process.cwd()]});
  context.setDefaultTimeout(10000);
  const page=await context.newPage(); let events=[{orderId:id,value:'PREPARATION_STARTED',metadata:{newEta:new Date(Date.now()+30*60000).toISOString()},timestamp:new Date().toISOString()}];
  let requests=0;
  await page.route('https://www.ifood.com.br/**',route=>{
    if (route.request().url().includes('/site-api/')) {requests++;return route.fulfill({json:events})}
    if(route.request().url().endsWith('/logo.svg'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="8" fill="#a63a20"/><path d="M10 24h20M12 20a8 8 0 0 1 16 0M20 9v3" stroke="white" stroke-width="2" fill="none"/></svg>'});
    return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html><meta charset="utf-8"><body><h2 data-testid="merchant-name">Cozinha da Praça — Restaurante Artesanal</h2><img data-testid="merchant-logo" src="/logo.svg"><p>Pedido #4421</p><p>Código de entrega 1234</p><p>Previsão de entrega Hoje, 13:30 – 14:00</p></body></html>'});
  });
  const errors=[]; context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(`https://www.ifood.com.br/pedido/${id}/acompanhar`);
    await page.locator('#ifood-pip-companion-root button').waitFor({timeout:1500});
    await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`,{headers:{'x-test-session':'synthetic'}}),id);
    await page.evaluate(()=>window.__testRequests=[]);
    const popup=context.waitForEvent('page');
    await page.locator('#ifood-pip-companion-root button').click();
    const pip=await popup;await pip.locator('#status').waitFor();
    async function assertLayout(target) {
      const bounds=await target.evaluate(()=>{
        const footer=document.querySelector('.footer').getBoundingClientRect();
        const shell=document.querySelector('.shell');
        return {height:innerHeight,width:innerWidth,scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,footerBottom:footer.bottom,border:getComputedStyle(shell).borderWidth,margin:getComputedStyle(shell).margin};
      });
      assert.ok(bounds.scrollHeight<=bounds.height,JSON.stringify(bounds));
      assert.ok(bounds.scrollWidth<=bounds.width,JSON.stringify(bounds));
      assert.ok(bounds.footerBottom<=bounds.height,JSON.stringify(bounds));
      assert.equal(bounds.border,'0px');assert.equal(bounds.margin,'0px');
    }
    // Mock only PiP's transport. Real extension callbacks, Request copies,
    // timers and lifecycle still execute in their actual browser contexts.
    // Playwright routing cannot reliably fulfill this auxiliary target.
    await pip.evaluate(events=>{
      window.__events=events;
      window.fetch=async(input,init)=>{
        const request=new Request(input,init);
        window.opener.__testRequests.push({url:request.url,session:request.headers.get('x-test-session')});
        return new Response(JSON.stringify(window.__events),{status:window.__testStatus || 200,headers:{'Content-Type':'application/json'}});
      };
    },events);
    await pip.locator('#status').filter({hasText:'preparando'}).waitFor();
    fs.mkdirSync('test-results',{recursive:true});
    await pip.screenshot({path:'test-results/full.png'});
    await assertLayout(pip);
    const position = () => pip.evaluate(()=>({x:screenX,y:screenY,right:screenX+outerWidth,bottom:screenY+outerHeight,width:innerWidth,height:innerHeight}));
    const initialPosition=await position();
    await pip.locator('#toggle-mode').click();
    await pip.waitForFunction(()=>Math.abs(innerHeight-164)<=3);
    assert.equal(await pip.locator('body').getAttribute('data-mode'),'compact');
    await pip.screenshot({path:'test-results/compact.png'});
    assert.equal(await pip.locator('.ifood-mark').isVisible(),true);
    assert.equal(await pip.locator('#store-avatar').isVisible(),true);
    assert.equal(await pip.locator('#progress').isVisible(),true);
    assert.equal(await pip.locator('.steps').isVisible(),true);
    const compactPosition=await position();
    await assertLayout(pip);
    const compactSize=await pip.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth}));
    assert.ok(compactSize.scroll<=compactSize.width);
    const initialRequests=requests;
    const positions=[initialPosition,compactPosition];
    for(let n=0;n<8;n++) {await pip.locator('#toggle-mode').click();await pip.waitForTimeout(100);positions.push(await position())}
    assert.equal(requests,initialRequests);
    assert.ok(positions.every(p=>Math.abs(p.x-initialPosition.x)<=2 && Math.abs(p.y-initialPosition.y)<=2),'The PiP changed screen position: '+JSON.stringify(positions));
    assert.ok(Math.max(...positions.map(p=>p.width))-Math.min(...positions.map(p=>p.width))<=3,'Width accumulated rounding drift: '+JSON.stringify(positions));
    await pip.locator('#language').selectOption('en');
    assert.match(await pip.locator('#status').innerText(),/preparing/);
    await pip.locator('#language').selectOption('es');
    assert.match(await pip.locator('#status').innerText(),/preparando/);
    assert.equal(await page.evaluate(()=>localStorage.getItem('ifood-pip-language')),'es');
    events=[{orderId:id,value:'ASSIGN_DRIVER',metadata:{driverName:'Ana',modal:'MOTORCYCLE'},timestamp:new Date().toISOString()},
      {orderId:id,value:'DISPATCHED',metadata:{routeDistanceMeters:2200},timestamp:new Date().toISOString()}];
    await pip.evaluate(events=>window.__events=events,events);
    await pip.locator('#refresh').click();
    await pip.locator('#eta').filter({hasText:'~8 min'}).waitFor();
    await page.evaluate(()=>document.querySelector('h2').textContent='Cozinha da Praça — Restaurante Artesanal');
    await pip.screenshot({path:'test-results/compact-shipping-es.png'});
    await assertLayout(pip);
    // Keep the opener in the background for an entire polling interval.
    await pip.bringToFront();const before=await page.evaluate(()=>window.__testRequests.length);
    await page.waitForTimeout(22000);assert.ok(await page.evaluate(()=>window.__testRequests.length)>before);
    assert.ok(await page.evaluate(()=>window.__testRequests.every(r=>r.session==='synthetic')));
    // Missing data, terminal orders, long names and HTTP failure in compact mode.
    await pip.evaluate(()=>{window.__events=[];window.__testStatus=429});
    await pip.locator('#refresh').click();
    await pip.locator('#updated[title*="429"]').waitFor();
    await assertLayout(pip);
    await pip.screenshot({path:'test-results/compact-error-es.png'});
    await pip.evaluate(id=>{window.__testStatus=200;window.__events=[{orderId:id,value:'DELIVERED'}]},id);
    await pip.locator('#refresh').click();
    await pip.locator('#status').filter({hasText:'entregado'}).waitFor();
    await pip.screenshot({path:'test-results/compact-delivered-es.png'});
    await assertLayout(pip);
    await pip.evaluate(id=>window.__events=[{orderId:id,value:'DISPATCHED',timestamp:new Date(Date.now()-3600000).toISOString(),metadata:{routeDistanceMeters:2200}},{orderId:id,value:'ASSIGN_DRIVER',metadata:{driverName:'Ana',modal:'MOTORCYCLE'}}],id);
    await pip.locator('#refresh').click();
    await pip.locator('#eta').filter({hasText:'Retrasado'}).waitFor();
    await assertLayout(pip);
    await pip.screenshot({path:'test-results/compact-late-es.png'});
    await pip.evaluate(id=>window.__events=[{orderId:id,value:'DISPATCHED'}],id);
    await pip.locator('#refresh').click();
    await pip.waitForFunction(()=>!document.body.classList.contains('compact-has-eta'));
    await assertLayout(pip);
    await page.evaluate(()=>document.querySelector('h2').textContent='Restaurante Artesanal da Praça com um nome muito longo para testar a janela compacta');
    await pip.evaluate(()=>window.__events=[]);
    await pip.locator('#refresh').click();
    await pip.locator('#status').filter({hasText:'Esperando'}).waitFor();
    assert.equal(await pip.locator('#code-card').isVisible(),false);
    assert.ok(await pip.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await pip.screenshot({path:'test-results/compact-long-name-es.png'});
    await assertLayout(pip);
    await pip.evaluate(id=>window.__events=[{orderId:id,value:'ARRIVED_AT_DESTINATION'}],id);
    await pip.locator('#refresh').click();
    await pip.locator('#code-card').waitFor();
    assert.equal(await pip.locator('#code').innerText(),'1\n2\n3\n4');
    await assertLayout(pip);
    await pip.screenshot({path:'test-results/compact-arriving-es.png'});
    await pip.evaluate(events=>window.__events=events,events);
    await pip.locator('#refresh').click();
    await pip.locator('#eta').filter({hasText:'~8 min'}).waitFor();
    await pip.close();const stopped=await page.evaluate(()=>window.__testRequests.length);
    const popup2=context.waitForEvent('page');await page.locator('#ifood-pip-companion-root button').click();
    const reopened=await popup2;await reopened.locator('#toggle-mode').waitFor();
    assert.equal(await reopened.locator('body').getAttribute('data-mode'),'compact');
    await reopened.waitForFunction(()=>document.getElementById('language')?.value==='es');
    await reopened.locator('#toggle-mode').click();
    await reopened.screenshot({path:'test-results/full-shipping-es.png'});
    await assertLayout(reopened);
    const fullSize=await reopened.evaluate(()=>({width:innerWidth,height:innerHeight}));
    assert.ok(Math.abs(fullSize.width-compactSize.width)<5);
    assert.ok(fullSize.height>compactSize.height);
    await reopened.locator('#language').selectOption('pt');
    await page.evaluate(()=>document.querySelector('h2').textContent='Cozinha da Praça');
    await reopened.locator('#restaurant').filter({hasText:'Cozinha da Praça'}).waitFor();
    await reopened.locator('#status').filter({hasText:'saiu para entrega'}).waitFor();
    await reopened.screenshot({path:'test-results/product-complete.png'});
    await reopened.locator('#toggle-mode').click();
    await reopened.waitForFunction(()=>Math.abs(innerHeight-164)<=3);
    await assertLayout(reopened);
    await reopened.screenshot({path:'test-results/product-compact.png'});
    await reopened.locator('#toggle-mode').click();
    // A refused resize must still switch layout and preserve readable content.
    await reopened.evaluate(()=>window.resizeTo=()=>{throw new Error('Resize denied by test')});
    await reopened.locator('#toggle-mode').click();
    assert.equal(await reopened.locator('body').getAttribute('data-mode'),'compact');
    assert.ok(await reopened.locator('#status').isVisible());
    await reopened.close();await page.waitForTimeout(22000);assert.equal(await page.evaluate(()=>window.__testRequests.length),stopped);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',manifestInjection:true,compactSize,fullSize,positions,pageRequests:requests,pipTransportRequests:stopped,errors},null,2));
  } finally {
    await context.close();
    // Only the profile created by this run is removed.
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});
  }
})().catch(error=>{console.error(error);process.exitCode=1});
