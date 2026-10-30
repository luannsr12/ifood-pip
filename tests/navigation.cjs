// Real manifest injection in Edge; no account or production order is used.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const id='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const order=`/pedido/${id}/acompanhar`;
const host='#ifood-pip-companion-root';
(async()=>{
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ifood-navigation-test-'));
  const context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:false,viewport:null,args:['--disable-extensions-except='+process.cwd(),'--load-extension='+process.cwd()]});
  const errors=[];context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  const fixture=route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><title>Navigation regression</title><body><h1>iFood SPA fixture</h1></body>'});
  try {
    const page=await context.newPage();await page.route('https://www.ifood.com.br/**',fixture);
    await page.goto('https://www.ifood.com.br/');
    await page.evaluate(()=>{window.__token={};window.__fetchAtStart=window.fetch});
    assert.equal(await page.locator(host).count(),0);
    // No DOM mutation: a URL-only router update must reveal the button.
    await page.evaluate(order=>history.pushState({},'',order),order);
    await page.locator(host+' button').waitFor({timeout:1500});
    assert.equal(await page.evaluate(()=>!!window.__token),true);
    await page.evaluate(()=>history.pushState({},'','/restaurantes'));
    await page.locator(host).waitFor({state:'hidden',timeout:1500});
    await page.goBack();await page.locator(host+' button').waitFor({timeout:1500});
    await page.goForward();await page.locator(host).waitFor({state:'hidden',timeout:1500});
    await page.evaluate(order=>history.replaceState({},'',order),order);
    await page.locator(host+' button').waitFor({timeout:1500});
    // Hydration can replace body content, including the extension host.
    await page.evaluate(()=>document.body.replaceChildren(document.createElement('main')));
    await page.locator(host+' button').waitFor({timeout:1500});
    for(let n=0;n<5;n++) {
      await page.evaluate(()=>history.pushState({},'','/restaurantes'));
      await page.evaluate(order=>history.pushState({},'',order),order);
    }
    assert.equal(await page.locator(host).count(),1);
    assert.equal(await page.evaluate(()=>window.__fetchAtStart===window.fetch),true);
    // Exercise the persisted lifecycle explicitly: routed fixtures/debugger
    // do not guarantee that the browser will choose to use its BFCache.
    for(let n=0;n<2;n++) {
      await page.evaluate(()=>{
        window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
        history.replaceState({},'','/restaurantes');
        window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
      });
      await page.locator(host).waitFor({state:'hidden',timeout:1500});
      await page.evaluate(order=>history.pushState({},'',order),order);
      await page.locator(host+' button').waitFor({timeout:1500});
    }
    assert.equal(await page.locator(host).count(),1);
    assert.equal(await page.evaluate(()=>window.__fetchAtStart===window.fetch),true);
    await page.reload();await page.locator(host+' button').waitFor({timeout:1500});
    const direct=await context.newPage();await direct.route('https://www.ifood.com.br/**',fixture);
    await direct.goto('https://www.ifood.com.br'+order);
    await direct.locator(host+' button').waitFor({timeout:1500});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',homeToOrderWithoutReload:true,urlOnlyNavigation:true,backForward:true,replaceState:true,bodyReplacement:true,singleHost:true,fetchNotReinstalled:true,persistedLifecycleSimulation:true,reload:true,directNavigation:true,errors},null,2));
  } finally {
    await context.close();
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});
  }
})().catch(error=>{console.error(error);process.exitCode=1});
