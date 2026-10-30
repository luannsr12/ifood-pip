const deliveryWindow=require('./delivery-window.cjs')();
// Exhaustive simulation of every recognized milestone and metadata event.
// Uses actual manifest injection and the actual PiP, with synthetic HTTP data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {MILESTONES}=require('../src/order');
const compactStatus=require('../src/compact-status');
const catalog=require('../_locales/pt_BR/messages.json');
const id='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const results=path.resolve(process.env.IFOOD_EVENT_RESULTS || 'test-results/events');
const escape=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
async function assertGrid(pip,label) {
  const cells=await pip.evaluate(()=>{
    const box=selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();return {selector,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,scroll:el.scrollWidth,client:el.clientWidth}};
    return ['.status-head','.hero','.merchant','.driver','.vehicle','.compact-distance','.code','.segments','.steps','.footer'].map(box).filter(r=>r.width&&r.height);
  });
  for(const cell of cells) {
    assert.ok(cell.scroll<=cell.client+1,label+' cell overflow '+JSON.stringify(cell));
    for(const other of cells) if(cell!==other) assert.ok(Math.min(cell.right,other.right)-Math.max(cell.x,other.x)<=1 || Math.min(cell.bottom,other.bottom)-Math.max(cell.y,other.y)<=1,label+' overlapping '+cell.selector+' / '+other.selector);
  }
  const texts=await pip.evaluate(()=>['#status','#eta','#restaurant','#driver-name','#updated'].map(selector=>{const e=document.querySelector(selector);return {selector,client:e.clientWidth,scroll:e.scrollWidth}}));
  for(const t of texts) if(t.client)assert.ok(t.scroll<=t.client+1,label+' text overflow '+JSON.stringify(t));
  const layout=await pip.evaluate(()=>{
    const box=el=>el.getBoundingClientRect(),name=box(document.getElementById('restaurant')),number=box(document.getElementById('order-number'));
    const middle=[document.querySelector('.vehicle'),document.getElementById('compact-distance')].map(el=>{const cell=box(el),icon=box(el.querySelector('svg')),text=box(el.querySelector('span'));return {visible:!!cell.width,offset:Math.abs((icon.left+text.right-cell.left-cell.right)/2),line:Math.abs((icon.top+icon.bottom-text.top-text.bottom)/2)}});
    return {row:document.body.classList.contains('compact-has-driver'),columns:getComputedStyle(document.querySelector('.shell')).gridTemplateColumns.split(' ').map(parseFloat),numberWidth:number.width,line:Math.abs((name.top+name.bottom-number.top-number.bottom)/2),middle};
  });
  assert.ok(Math.abs(layout.numberWidth-92)<=1&&layout.line<=1,label+' merchant/order alignment '+JSON.stringify(layout));
  if(layout.row)assert.ok(Math.abs(layout.columns[0]-layout.columns[1])<1&&Math.abs(layout.columns[1]-layout.columns[2])<1&&layout.columns[3]===74,label+' variable vehicle/code cells '+JSON.stringify(layout));
  assert.ok(layout.middle.every(c=>!c.visible || (c.offset<=1 && c.line<=1)),label+' middle cells are not centered inline '+JSON.stringify(layout));
  const alignment=await pip.evaluate(()=>{
    const store=document.getElementById('restaurant').getBoundingClientRect(),driver=document.getElementById('driver-name').getBoundingClientRect(),card=document.getElementById('driver-card').getBoundingClientRect(),code=document.getElementById('code-card').getBoundingClientRect();
    const digits=document.getElementById('code').getBoundingClientRect();
    const name=document.getElementById('driver-name');
    const shown=name.textContent;
    let fullyUsed=true;
    if(driver.width && shown.endsWith('...')) {
      const prefix=shown.slice(0,-3),chars=Array.from(name.dataset.displayName || name.title);
      let count=Array.from(prefix).length+1,candidate=chars.slice(0,count).join('').trimEnd();
      while(candidate===prefix&&count<chars.length)candidate=chars.slice(0,++count).join('').trimEnd();
      name.textContent=candidate+'...';fullyUsed=name.scrollWidth>name.clientWidth;name.textContent=shown;
    }
    return {driverVisible:!!driver.width,baseline:Math.abs(card.left-document.getElementById('store-avatar').getBoundingClientRect().left),gap:code.width&&card.width?code.left-card.right:null,codeExcess:code.width?code.width-digits.width:0,name:shown,first:name.title.split(/\s+/)[0],fullyUsed};
  });
  if(alignment.driverVisible)assert.ok(alignment.baseline<=1,label+' name alignment '+JSON.stringify(alignment));
  if(alignment.gap!==null)assert.ok(alignment.gap>=200 && alignment.gap<=210,label+' courier/code gap '+JSON.stringify(alignment));
  assert.ok(Math.abs(alignment.codeExcess)<=1,label+' code is wider than its digits '+JSON.stringify(alignment));
  if(alignment.driverVisible)assert.ok(alignment.name.startsWith(alignment.first),label+' truncated first name '+JSON.stringify(alignment));
  assert.ok(alignment.fullyUsed,label+' unused courier text space '+JSON.stringify(alignment));
}

function scenario(value,index) {
  const now=Date.now()-1000, rank=MILESTONES[value]?.rank ?? 9;
  const event=(name,time,metadata={})=>({orderId:id,value:name,timestamp:new Date(time).toISOString(),metadata});
  const events=[];
  if(rank>4.5) events.push(event('ASSIGN_DRIVER',now-5*60000,{driverName:'Ana Souza',modal:'MOTORCYCLE',routeDistanceMeters:2200}));
  if(rank>=6) events.push(event('ARRIVED_AT_ORIGIN',now-4*60000));
  if(rank>=7) events.push(event('COLLECTED',now-3*60000));
  if(rank>=8) events.push(event('DISPATCHED',now-2*60000));
  if(!MILESTONES[value]) events.push(event('ARRIVED_AT_DESTINATION',now-1000));
  const metadata={newEta:new Date(now+30*60000).toISOString(),routeDistanceMeters:value==='DISPATCHED'?2933:2200};
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
    return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><title>Event simulation</title><h2 data-testid="merchant-name">Cozinha da Praça</h2><p>Pedido #4421</p><p>Previsão de entrega ${deliveryWindow.label}</p><p>Código de entrega 1234</p>`});
  });
  try {
    await page.goto('https://www.ifood.com.br/');
    await page.evaluate(id=>history.pushState({},'',`/pedido/${id}/acompanhar`),id);
    await page.locator('#ifood-pip-companion-root button').waitFor();
    const popup=context.waitForEvent('page');await page.locator('#ifood-pip-companion-root button').click();
    let pip=await popup;pip.on('pageerror',error=>errors.push(error.message));
    await pip.locator('#status').waitFor();
    const values=[...Object.keys(MILESTONES),'DELIVERY_DROP_CODE_REQUESTED','DELIVERY_DROP_CODE_VALIDATION_SUCCESS','ETA_UPDATED'];
    for(const [index,value] of values.entries()) {
      const data=scenario(value,index);payload=data.events;
      await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(res=>res.json()),id);
      await pip.waitForFunction(({stage,label,compactLabel})=>document.body.dataset.stage===stage && document.getElementById('status').textContent===(document.body.dataset.mode==='compact'?(stage==='shipping'?document.getElementById('status').textContent:compactLabel):label),{...data,compactLabel:catalog[compactStatus(MILESTONES[value]?.label || 'ui_courier_arrived_at_your_address')].message});
      const item={event:value,stage:data.stage,modes:{}};
      for(const mode of ['full','compact']) {
        if(await pip.locator('body').getAttribute('data-mode')!==mode)await pip.locator('#toggle-mode').click();
        await pip.waitForFunction(mode=>mode==='compact'?Math.abs(innerHeight-142)<=3:innerHeight>210,mode);
        if(mode==='full')await pip.waitForFunction(()=>!document.body.classList.contains('constrained'));
        await pip.waitForFunction(mode=>Math.abs(innerWidth-(mode==='compact'?390:350))<=4,mode);
        const state=await pip.evaluate(()=>{
          const rect=selector=>{const element=document.querySelector(selector);const box=element.getBoundingClientRect();return {x:box.x,y:box.y,right:box.right,bottom:box.bottom,width:box.width,height:box.height,visible:!!(box.width&&box.height)}};
          return {eta:document.getElementById('eta').textContent,status:document.getElementById('status').textContent,viewport:{width:innerWidth,height:innerHeight},scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},footer:rect('.footer'),etaBox:rect('.hero'),statusBox:rect('.status-head'),driverBox:rect('.driver'),storeSvg:!!document.querySelector('#store-avatar svg'),driverSvg:!!document.querySelector('#driver-avatar svg'),driver:document.getElementById('driver-name').textContent,codeVisible:rect('.code').visible,text:document.body.innerText};
        });
        assert.ok(state.scroll.width<=state.viewport.width,value+' '+mode+' horizontal scroll');
        assert.ok(state.scroll.height<=state.viewport.height,value+' '+mode+' vertical scroll');
        assert.ok(state.footer.bottom<=state.viewport.height,value+' '+mode+' footer clipped');
        for(const language of ['en','es','pt']) {
          await pip.locator('#language').selectOption(language);
          const steps=await pip.locator('.step').evaluateAll(items=>items.map(el=>{const icon=el.querySelector('svg').getBoundingClientRect(),text=el.lastElementChild.getBoundingClientRect(),box=el.getBoundingClientRect();return {font:parseFloat(getComputedStyle(el).fontSize),icon:icon.width,right:text.right,cell:box.right,textVisible:!!text.height,accessibleName:el.getAttribute('aria-label')}}));
          assert.ok(steps.every(s=>s.font>=12&&s.icon>=(mode==='full'?16:0)&&s.right<=s.cell+1),value+' '+mode+' unreadable progress '+JSON.stringify(steps));
          assert.ok(steps.every(s=>s.textVisible===(mode==='full') && s.accessibleName && s.icon===(mode==='full'?16:0)),value+' '+mode+' incorrect step presentation '+JSON.stringify(steps));
          if(mode==='full') {
            const geometry=await pip.evaluate(()=>{
              const steps=[...document.querySelectorAll('.step')],bars=[...document.querySelectorAll('.segment')];
              return {height:innerHeight,width:innerWidth,scroll:document.documentElement.scrollWidth,footer:document.querySelector('.footer').getBoundingClientRect().bottom,cells:steps.map((step,n)=>{const text=step.lastElementChild.getBoundingClientRect(),bar=bars[n].getBoundingClientRect(),cell=step.getBoundingClientRect();return {width:cell.width,height:cell.height,offset:Math.abs((text.left+text.right-bar.left-bar.right)/2),textWidth:text.width}})};
            });
            assert.ok(geometry.footer<=geometry.height && geometry.scroll<=geometry.width,value+' '+language+' expanded overflow '+JSON.stringify(geometry));
            assert.ok(geometry.cells.every(c=>c.offset<=1 && c.textWidth<=c.width && c.height===38),value+' '+language+' step alignment '+JSON.stringify(geometry));
            if(language==='en') item.stepDimensions=geometry.cells.map(c=>({width:c.width,height:c.height}));
            else assert.deepEqual(geometry.cells.map(c=>({width:c.width,height:c.height})),item.stepDimensions,value+' language changed step dimensions');
            if(['PREPARATION_STARTED','DISPATCHED'].includes(value)) await pip.screenshot({path:path.join(results,`${value.toLowerCase()}-full-${language}.png`)});
          }
        }
        if(mode==='full') {
          const sizes=await pip.evaluate(()=>['.micro','.eta-detail','.eta-source','#status','.driver strong','.code-label','.code small','.order-details dt','.order-details dd','.updated','.action'].flatMap(selector=>[...document.querySelectorAll(selector)].filter(el=>el.getBoundingClientRect().height).map(el=>({selector,size:parseFloat(getComputedStyle(el).fontSize)}))));
          assert.ok(sizes.every(s=>s.size>=11),value+' tiny expanded text '+JSON.stringify(sizes));
        }
        if(mode==='compact') {
          if(data.stage==='shipping')assert.match(state.status,/^Chega em ~ \d{1,2} minutos?$/);else assert.equal(state.status,catalog[compactStatus(MILESTONES[value]?.label || 'ui_courier_arrived_at_your_address')].message,value+' wrong compact status');
          for(const language of ['en','es','pt']) {
            await pip.locator('#language').selectOption(language);
            await assertGrid(pip,value+' '+language);
            const headline=await pip.locator('#status').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,height:el.getBoundingClientRect().height,size:parseFloat(getComputedStyle(el).fontSize)}));
            assert.ok(headline.size===20 && headline.height===26 && headline.scroll<=headline.width,value+' '+language+' compact headline does not fit: '+JSON.stringify(headline));
          }
          const headline=await pip.locator('#status').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,height:el.getBoundingClientRect().height,size:parseFloat(getComputedStyle(el).fontSize)}));
          assert.ok(headline.size===20 && headline.height===26 && headline.scroll<=headline.width,value+' compact headline does not fit: '+JSON.stringify(headline));
        }
        assert.equal(state.storeSvg,true,value+' '+mode+' missing store SVG');
        if(state.driver) {
          assert.equal(state.driverSvg,true,value+' '+mode+' missing courier SVG');
          assert.equal(state.driverBox.visible,true,value+' '+mode+' missing courier');
          if(mode==='compact') assert.ok(state.statusBox.bottom<=state.driverBox.y+1,value+' overlapping courier/status');
        }
        if(['received','preparing','driver','atStore'].includes(data.stage)) {
          assert.equal(await pip.locator('body').evaluate(el=>el.classList.contains('late')),false,value+' unexpected late fixture');
          assert.equal(state.eta,deliveryWindow.range,value+' '+mode+' merchant window was not preserved');
          assert.doesNotMatch(state.eta,/~|\bmin\b/);
        } else if(data.stage==='shipping') assert.match(state.eta,mode==='compact'?/~ \d+ minutos/:/~\d+ min/,value+' '+mode+' missing dispatch countdown');
        if(value==='COLLECTED'||value==='DELIVERY_COLLECTED')assert.equal(state.eta,deliveryWindow.range);
        if(value==='DELIVERY_DROP_CODE_VALIDATION_SUCCESS'||['delivered','cancelled'].includes(data.stage))assert.equal(state.codeVisible,false);
        if(['shipping','arriving'].includes(data.stage)&&value!=='DELIVERY_DROP_CODE_VALIDATION_SUCCESS')assert.equal(state.codeVisible,true,value+' '+mode+' missing delivery code');
        if(state.codeVisible) assert.equal(await pip.locator('.code-label svg').isVisible(),mode==='full',value+' '+mode+' delivery icon visibility');
        if(['received','preparing','driver','atStore'].includes(data.stage))assert.equal(state.codeVisible,false,value+' early delivery code');
        assert.doesNotMatch(state.text,/\b(?:ui_|pip_|order_)[a-z_]+/);
        const file=`${String(index+1).padStart(2,'0')}-${value.toLowerCase()}-${mode}.png`;
        await pip.screenshot({path:path.join(results,file)});
        item.modes[mode]={file,eta:state.eta,driverSvg:state.driverSvg,storeSvg:state.storeSvg,emptyBelow:state.viewport.height-state.footer.bottom};
        if(mode==='compact') {
          const longStore='Casa da feijoada da Zena com receitas tradicionais e produtos especiais';
          const longDriver='Ana Carolina de Souza Albuquerque dos Santos Oliveira';
          const original=payload;
          payload=JSON.parse(JSON.stringify(original));
          for(const e of payload)if(e.metadata?.driverName)e.metadata.driverName=longDriver;
          await page.evaluate(name=>document.querySelector('h2').textContent=name,longStore);
          await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(r=>r.json()),id);
          await pip.waitForFunction(()=>document.getElementById('restaurant').title.startsWith('Casa da feijoada'));
          await assertGrid(pip,value+' long names');
          assert.match(await pip.locator('#restaurant').textContent(),/\.\.\.$/);
          if(state.driver)assert.equal(await pip.locator('#driver-name').textContent(),'Ana C.');
          const longFile=file.replace('.png','-long.png');await pip.screenshot({path:path.join(results,longFile)});
          item.modes[mode].longFile=longFile;
          payload=original;
          await page.evaluate(()=>document.querySelector('h2').textContent='Cozinha da Praça');
          await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(r=>r.json()),id);
        }
      }
      report.push(item);
      if((index+1)%8===0)console.log(`Simulated ${index+1}/${values.length} events in both modes`);
    }
    // Boundary estimates and six-digit codes must fit without shrinking headlines.
    const boundaries=[];
    for(const count of [1,9,10,99,100,120]) {
      const now=Date.now(),departure=now-(count===1?120000:0)-1000;
      const meters=(count===1?1:count-2)*22000/60;
      payload=[{orderId:id,value:'ASSIGN_DRIVER',timestamp:new Date(departure-1000).toISOString(),metadata:{driverName:'Alexandria Carolina de Souza Albuquerque dos Santos',modal:'MOTORCYCLE'}},{orderId:id,value:'DISPATCHED',timestamp:new Date(departure).toISOString(),metadata:{routeDistanceMeters:meters}},{orderId:id,value:'DELIVERY_DROP_CODE_REQUESTED',metadata:{HANDSHAKE_TYPE:'DELIVERY',HANDSHAKE_CODE:'123456'}}];
      await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(r=>r.json()),id);
      const expected=count<=99?`~ ${count} ${count===1?'minuto':'minutos'}`:deliveryWindow.range;
      await pip.locator('#eta').filter({hasText:expected}).waitFor({state:'attached'});
      assert.equal(await pip.locator('#eta').textContent(),expected);
      await assertGrid(pip,'minutes '+count);
      const file=`boundary-${count}-minutes.png`;
      await pip.screenshot({path:path.join(results,file)});boundaries.push({count,file,expected});
    }
    const fieldCases=[];
    await page.evaluate(()=>{const node=[...document.querySelectorAll('p')].find(p=>p.textContent.includes('Código de entrega'));window.__codeNode=node;window.__codeText=node.textContent;node.textContent=''});
    let fixedWidths;
    for(const config of [
      {name:'Pedro Henrique da Silva',code:true},
      {name:'Matheus Almeida',code:true},
      {name:'Mariana Aparecida dos Santos',code:true},
      {name:'Alexandria Carolina de Souza',code:true},
      {name:'Mariana Aparecida dos Santos',code:true,distance:2300},
      {name:'Matheus Almeida',code:true,distance:12},
      {name:'Mariana Aparecida dos Santos',code:true,distance:null},
      {name:'Mariana Aparecida dos Santos',code:true,distance:199900},
      {name:'Mariana Aparecida dos Santos',code:true,modal:'BICYCLE'},
      {name:'Pedro Henrique da Silva',code:true,modal:'CAR'},
      {name:'Mariana Aparecida dos Santos',code:false},
      {name:'',code:true},
      {name:'',code:false}
    ]) {
      const time=new Date().toISOString();payload=[{orderId:id,value:config.code?'DISPATCHED':'PREPARATION_STARTED',timestamp:time,metadata:{routeDistanceMeters:config.distance===null?null:config.distance || 2200}}];
      if(config.name)payload.unshift({orderId:id,value:'ASSIGN_DRIVER',timestamp:time,metadata:{driverName:config.name,modal:config.modal || 'MOTORCYCLE'}});
      if(config.code)payload.push({orderId:id,value:'DELIVERY_DROP_CODE_REQUESTED',metadata:{HANDSHAKE_TYPE:'DELIVERY',HANDSHAKE_CODE:'1234'}});
      await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(r=>r.json()),id);
      await pip.waitForFunction(config=>document.getElementById('driver-name').title===config.name && document.getElementById('code-card').hidden===!(config.code&&config.name),config);
      for(const language of ['en','es','pt']) {
        await pip.locator('#language').selectOption(language);
        await assertGrid(pip,JSON.stringify(config)+' '+language);
        if(config.name==='Matheus Almeida')assert.equal(await pip.locator('#driver-name').textContent(),'Matheus A.');
      }
      assert.equal(await pip.locator('#compact-distance').isVisible(),Boolean(config.name && config.distance!==null));
      if(config.distance===null) assert.equal(await pip.locator('#compact-distance-value').textContent(),'');
      const widths=await pip.evaluate(()=>Object.fromEntries(['merchant','driver','code'].map(c=>[c,document.querySelector('.'+c).getBoundingClientRect().width])));
      if(config.name&&config.code) {
        assert.ok(widths.driver>=93&&widths.driver<=98&&Math.abs(widths.code-74)<=1&&widths.merchant>330,JSON.stringify(widths));
        if(fixedWidths)for(const key of Object.keys(widths))assert.ok(Math.abs(widths[key]-fixedWidths[key])<=1,'name-dependent width '+key);
        fixedWidths=widths;
      } else if(config.name)assert.ok(Math.abs(widths.driver-fixedWidths.driver)<=1&&Math.abs(widths.merchant-fixedWidths.merchant)<=1,'code space not reclaimed');
      else if(config.code)assert.ok(Math.abs(widths.merchant-fixedWidths.merchant)<=1&&widths.driver===0&&widths.code===0,'courier space not reclaimed');
      const file=`fields-${fieldCases.length+1}.png`;await pip.screenshot({path:path.join(results,file)});fieldCases.push({...config,file,widths});
    }
    await page.evaluate(()=>window.__codeNode.textContent=window.__codeText);
    // Real compact lifecycle without a user gesture to resize the PiP.
    payload=scenario('PREPARATION_STARTED',0).events;
    await page.evaluate(id=>fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(r=>r.json()),id);
    await pip.waitForFunction(()=>Math.abs(innerHeight-142)<=3);
    await assertGrid(pip,'compact before assignment');
    const beforeAssignment=await pip.evaluate(()=>({x:screenX,y:screenY}));
    payload=scenario('ASSIGN_DRIVER',0).events;
    await page.evaluate(id=>setTimeout(()=>{
      window.__automaticFetchHadActivation=navigator.userActivation.isActive;
      fetch(`/site-api/v1/customers/me/orders/${id}/events`).then(r=>r.json());
    },6000),id);
    await pip.waitForFunction(()=>document.body.classList.contains('compact-has-driver'));
    assert.equal(await page.evaluate(()=>window.__automaticFetchHadActivation),false,'assignment was not independent of user activation');
    // The chosen policy keeps the native frame fixed. Incoming events only
    // reorganize the grid, even after transient user activation has expired.
    assert.ok(Math.abs(await pip.evaluate(()=>innerHeight)-142)<=3);
    await assertGrid(pip,'compact assignment without activation');
    assert.deepEqual(await pip.evaluate(()=>({x:screenX,y:screenY})),beforeAssignment);
    await pip.screenshot({path:path.join(results,'assignment-without-resize.png')});
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
    const summary={result:'PASS',events:report.length,renderedStates:report.length*2,longNameStates:report.length,boundaries,fieldCases,progressiveShortWindow:true,errors,scenarios:report};
    fs.writeFileSync(path.join(results,'report.json'),JSON.stringify(summary,null,2));
    fs.writeFileSync(path.join(results,'languages.html'),`<!doctype html><meta charset="utf-8"><title>Etapas nos três idiomas</title><style>body{font:14px Arial;background:#f5f5f5;margin:24px}table{border-collapse:collapse}td,th{padding:12px;border:1px solid #ddd;vertical-align:top}img{width:350px;display:block}</style><h1>Comparação de tipografia e alinhamento</h1><p>Mesmas colunas e fonte de 12 px nas etapas. Capturas reais do Edge com dados sintéticos.</p><table><tr><th>Português</th><th>English</th><th>Español</th></tr>${['preparation_started','dispatched'].map(event=>`<tr>${['pt','en','es'].map(language=>`<td><img src="${event}-full-${language}.png" alt="${event} ${language}"></td>`).join('')}</tr>`).join('')}</table>`);
    fs.writeFileSync(path.join(results,'index.html'),`<!doctype html><meta charset="utf-8"><title>iFood PiP — Simulação de eventos</title><style>body{font:14px Arial;margin:28px;background:#f5f5f5;color:#333}table{border-collapse:collapse}th,td{padding:12px;border:1px solid #ddd;vertical-align:top}img{display:block;width:350px}h1{font-size:23px}small{display:block;margin-top:8px;color:#666}</style><h1>iFood PiP — ${report.length} eventos · ${report.length*2} estados</h1><p>Capturas da PiP real no Edge. Dados sintéticos. Todos os cenários passaram pelas verificações de horários, layout e SVGs.</p><table><tr><th>Evento</th><th>Completo</th><th>Compacto</th></tr>${report.map(item=>`<tr><td>${escape(item.event)}<small>${escape(item.stage)}</small></td>${['full','compact'].map(mode=>`<td><img src="${item.modes[mode].file}" alt="${escape(item.event)} ${mode}"><small>${escape(item.modes[mode].eta)}</small></td>`).join('')}</tr>`).join('')}</table>`);
    await pip.close();
    fs.writeFileSync(path.join(results,'stress.html'),`<!doctype html><meta charset="utf-8"><title>Revisão de nomes e previsões</title><style>body{font:14px Arial;background:#f5f5f5;margin:24px}img{display:block;margin:8px 0 24px;width:350px}</style><h1>Nomes longos e limites de tempo</h1>${fieldCases.map(c=>`<h2>${escape(c.name||'Sem entregador')} · ${c.code?'com código':'sem código'}</h2><img src="${c.file}">`).join('')}${boundaries.map(b=>`<h2>${b.count} minutos de estimativa</h2><img src="${b.file}">`).join('')}${report.map(r=>`<h2>${escape(r.event)}</h2><img src="${r.modes.compact.longFile}">`).join('')}`);
    console.log(JSON.stringify({result:'PASS',events:report.length,renderedStates:report.length*2,errors,gallery:path.join(results,'index.html')},null,2));
  } finally {await context.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
})().catch(error=>{console.error(error);process.exitCode=1});
