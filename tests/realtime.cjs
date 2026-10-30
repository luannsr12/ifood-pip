// Interactive real-time fixture. No real iFood requests, account or purchase.
const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const {createScenario}=require('./simulation/scenario.cjs');
const catalog=require('../_locales/pt_BR/messages.json');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'test-results/realtime');fs.mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const session=path.join(out,stamp);fs.mkdirSync(session);
let mainPage,context,closing=false,fixtureReady=false,pipRequests=0;
const scenario=createScenario({onEvent:state=>{
  fs.writeFileSync(path.join(session,'state.json'),JSON.stringify(state,null,2));
  console.log(new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'}),state.events.at(-1).value);
}});
const html=fs.readFileSync(path.join(__dirname,'simulation/page.html'),'utf8').replace('__LABELS__',JSON.stringify(catalog).replace(/</g,'\\u003c'));

async function response(url,method='GET') {
  const pathname=new URL(url,'https://www.ifood.com.br').pathname;
  if(pathname==='/__simulation/start' && method==='POST')return {status:200,body:scenario.start()};
  if(pathname==='/__simulation/stop' && method==='POST'){scenario.stop();return {status:200,body:scenario.state()}}
  if(pathname==='/__simulation/state')return {status:200,body:scenario.state()};
  const match=pathname.match(/^\/site-api\/v1\/customers\/me\/orders\/([^/]+)(\/events)?$/);
  if(match){if(match[1]!==scenario.state().orderId)return {status:404,body:{error:'Unknown test order'}};return {status:200,body:match[2]?scenario.events():scenario.details()}}
  return null;
}

(async()=>{
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ifood-realtime-'));
  context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:false,viewport:null,timezoneId:'America/Sao_Paulo',serviceWorkers:'block',args:['--disable-extensions-except='+root,'--load-extension='+root]});
  context.setDefaultTimeout(15000);
  await context.exposeBinding('__ifoodSimulationRequest',async(source,request)=>{
    if(source.page!==mainPage)pipRequests++;
    const result=await response(request.url,request.method);
    return result || {status:404,body:{error:'Not a simulated endpoint'}};
  });
  // This Edge auxiliary target is not reliably intercepted by Playwright's
  // HTTP router. Only its transport is adapted; extension/timers/DOM are real.
  context.on('page',page=>{
    page.on('pageerror',error=>console.error('Browser:',error.message));
    if(!fixtureReady || page===mainPage)return;
    page.evaluate(()=>{
      if(!window.opener)return;
      const nativeFetch=window.fetch;
      window.fetch=async(input,init)=>{
        const request=new Request(input,init);
        const url=new URL(request.url);
        if(url.origin==='https://www.ifood.com.br' && url.pathname.startsWith('/site-api/')) {
          const result=await window.__ifoodSimulationRequest({url:request.url,method:request.method});
          return new Response(JSON.stringify(result.body),{status:result.status,headers:{'Content-Type':'application/json'}});
        }
        return Reflect.apply(nativeFetch,window,[input,init]);
      };
    }).catch(error=>console.error('PiP fixture:',error.message));
  });
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!=='https://www.ifood.com.br')return route.abort('blockedbyclient');
    const result=await response(url.href,request.method());
    if(result)return route.fulfill({status:result.status,json:result.body});
    if(url.pathname==='/' || /^\/pedido\/[^/]+\/acompanhar\/?$/.test(url.pathname))return route.fulfill({contentType:'text/html; charset=utf-8',body:html});
    return route.fulfill({status:404,body:'Local simulation only'});
  });
  mainPage=await context.newPage();
  fixtureReady=true;
  await mainPage.goto('https://www.ifood.com.br/');
  await mainPage.locator('#start').click();
  await mainPage.locator('#ifood-pip-companion-root button').waitFor();
  const popup=context.waitForEvent('page');
  await mainPage.locator('#ifood-pip-companion-root button').click();
  const pip=await popup;
  await pip.locator('#status').waitFor();
  const state=scenario.state();
  await pip.waitForFunction(()=>document.getElementById('eta').textContent.includes('–'));
  await mainPage.screenshot({path:path.join(session,'browser-start.png')});
  await pip.screenshot({path:path.join(session,'pip-start.png')});
  fs.writeFileSync(path.join(out,'latest.json'),JSON.stringify({pid:process.pid,session,orderId:state.orderId,startedAt:state.startedAt,windowStart:state.windowStart,windowEnd:state.windowEnd,expectedCompletion:state.expectedCompletion},null,2));
  // Leave one visible tab and its PiP for the user to operate.
  for(const page of context.pages())if(page!==mainPage && page!==pip)await page.close();
  await mainPage.bringToFront();
  console.log(JSON.stringify({status:'RUNNING',pid:process.pid,startedAt:new Date(state.startedAt).toISOString(),windowStart:new Date(state.windowStart).toISOString(),windowEnd:new Date(state.windowEnd).toISOString(),completion:new Date(state.expectedCompletion).toISOString(),orderId:state.orderId,session},null,2));
  const smokeTimer=setTimeout(async()=>{
    try {
      const probe={event:scenario.state().currentEvent,pipRequests,status:await pip.locator('#status').textContent(),eta:await pip.locator('#eta').textContent(),codeVisible:await pip.locator('#code-card').isVisible(),driverVisible:await pip.locator('#driver-card').isVisible(),height:await pip.evaluate(()=>innerHeight)};
      await pip.screenshot({path:path.join(session,'pip-live.png')});
      await mainPage.screenshot({path:path.join(session,'browser-live.png')});
      fs.writeFileSync(path.join(session,'live-check.json'),JSON.stringify(probe,null,2));
      console.log('LIVE CHECK',JSON.stringify(probe));
    }catch(error){console.error('Live check:',error.message)}
  },35000);
  const close=async()=>{
    if(closing)return;closing=true;clearTimeout(smokeTimer);scenario.stop();
    await context.close().catch(()=>{});
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});
  };
  process.once('SIGINT',close);process.once('SIGTERM',close);
  await new Promise(resolve=>mainPage.once('close',resolve));
  await close();
})().catch(async error=>{console.error(error);scenario.stop();if(context)await context.close().catch(()=>{});process.exitCode=1});
