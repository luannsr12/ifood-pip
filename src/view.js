const {safeImage,finiteDistance} = require('./order');
module.exports = function createView(context) {
  const {state,tx,format,readOptionalPageInfo,estimateArrival,changeLanguage,pollEvents,toggleMode} = context;
  const {displaySnapshot} = require('./order');
  const {message} = require('./i18n');
  const visibility = require('./visibility');
  const compactStatus = require('./compact-status');
  const compactContent = require('./compact-content');
  const statusText = data => tx(state.mode==='compact' ? compactStatus(data.label) : data.label);
  const compactHeight = () => 142;
  function deliveryWindow(data,extras,eta) {
    return visibility(data).order && !['delivered','cancelled'].includes(data.stage) && !eta.preDispatch
      ? require('./compact-content').estimate({},extras).window || '' : '';
  }
  function fullHeight(snapshot=state.snapshot) {
    const extras=readOptionalPageInfo(),data=displaySnapshot(snapshot,extras),allowed=visibility(data);
    const courier=allowed.courier && Boolean(data.driver || state.orderDetails.driver);
    const code=allowed.deliveryCode && Boolean(data.code || extras.code);
    const eta=estimateArrival(data,extras);
    return Math.max(280,244 + (courier?40:0) + (code?54:0) + (data.issue?40:0));
  }
  const ICONS = {
    expand: '<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6m0 6 7-7"/>',
    collapse: '<path d="M20 4l-7 7m0-6v6h6M4 20l7-7m-6 0h6v6"/>',
    store: '<path d="M3 10h18l-2-6H5l-2 6Zm1 0v10h16V10M9 20v-6h6v6M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0"/>',
    bike: '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="m5 17 5-9 5 9H5m9-13h3l2 10M8 5h4"/>',
    driver: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2M9 16l3 3 3-3"/>',
    bag: '<path d="M5 7h14l1 14H4L5 7Zm4 0V5a3 3 0 0 1 6 0v2"/>',
    home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
    arrow: '<path d="M7 17 17 7H7m10 0v10"/>',
    key: '<circle cx="7.5" cy="8.5" r="4.5"/><circle cx="7" cy="8" r=".75"/><path d="m11 12 8 8h3v-3l-2-2h-3v-3h-3"/>',
    pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>'
  };
  function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.bag}</svg>`; }

  function buildPipDocument(win) {
    const doc = win.document;
    doc.title = tx("ui_your_order_ifood_pip");
    const style = doc.createElement('style');
    style.textContent = require('./pip.css');
    doc.head.append(style);
    doc.body.innerHTML = `<main class="shell">
      <button class="mode-toggle" id="toggle-mode" type="button"></button>
      <section class="merchant"><div class="avatar" id="store-avatar">${icon('store')}</div><div><strong id="restaurant">${tx("ui_ifood_order")}</strong><div class="micro" id="order-number">${tx("ui_live_order_tracking")}</div></div><svg class="ifood-mark" role="img" aria-label="iFood" viewBox="0 0 24 24" fill="currentColor"><title>iFood</title><path d="M8.428 1.67c-4.65 0-7.184 4.149-7.184 6.998 0 2.294 2.2 3.299 4.25 3.299l-.006-.006c4.244 0 7.184-3.854 7.184-6.998 0-2.29-2.175-3.293-4.244-3.293zm11.328 0c-4.65 0-7.184 4.149-7.184 6.998 0 2.294 2.2 3.299 4.25 3.299l-.006-.006C21.061 11.96 24 8.107 24 4.963c0-2.29-2.18-3.293-4.244-3.293zM14.172 14.52l2.435 1.834c-2.17 2.07-6.124 3.525-9.353 3.17A8.913 8.913 0 01.23 14.541H0a9.598 9.598 0 008.828 7.758c3.814.24 7.323-.905 9.947-3.13l-.004.007 1.08 2.988 1.555-7.623-7.234-.02Z"/></svg></section>
      <section class="hero" aria-label="${tx("ui_delivery_window")}"><span class="eta-clock">${icon('clock')}</span><div class="eta" id="eta">${tx("ui_tracking_your_order")}</div><div class="eta-detail" id="eta-detail"></div></section>
      <section class="journey" aria-label="${tx("ui_order_status")}"><div class="status-head"><div class="status-symbol" id="status-symbol">${icon('bag')}</div><div><h1 id="status" role="status" aria-live="polite"></h1></div><div class="delivery-window" id="delivery-window" hidden><strong id="delivery-window-value"></strong></div></div>
        <div class="segments" role="progressbar" aria-label="${tx("ui_order_progress")}" aria-valuemin="0" aria-valuemax="4" id="progress">${[0,1,2,3].map(n=>`<div class="segment" id="segment-${n}"></div>`).join('')}</div>
        <div class="steps">${["ui_confirmed","ui_preparing","ui_on_the_way","ui_delivered"].map((s,n)=>`<span id="step-${n}" class="step"><span class="step-icon">${icon(['check','bag','bike','home'][n])}</span><span data-i18n="${s}">${tx(s)}</span></span>`).join('')}</div>
      </section>
      <section class="driver" id="driver-card" hidden><div class="avatar" id="driver-avatar"></div><div><strong id="driver-name"></strong><div class="micro" id="driver-state"></div></div><span class="vehicle">${icon('bike')}<span id="vehicle"></span></span></section>
      <section class="code" id="code-card" hidden><div><div class="code-label">${icon('key')} <span data-i18n="ui_delivery_code">${tx("ui_delivery_code")}</span></div><small data-i18n="ui_share_when_receiving_your_order">${tx("ui_share_when_receiving_your_order")}</small></div><div class="digits" id="code"></div></section>
      <section class="compact-distance" id="compact-distance" hidden>${icon('pin')}<span id="compact-distance-value"></span></section>
      <div class="notice" id="note" role="status" hidden></div>
      <footer class="footer"><div class="footer-meta"><select class="language" id="language" aria-label="${tx("ui_language")}"><option value="en" data-language="language_en">EN</option><option value="pt" data-language="language_pt">PT</option><option value="es" data-language="language_es">ES</option></select><span class="updated" id="updated"></span></div><div class="actions"><button class="action" id="refresh" type="button" title="${tx("ui_check_for_updates_now")}">${icon('refresh')} <span data-i18n="ui_refresh">${tx("ui_refresh")}</span></button><button class="action" id="back" type="button"><span data-i18n="ui_view_order">${tx("ui_view_order")}</span> ${icon('arrow')}</button></div></footer>
    </main>`;
    doc.getElementById('toggle-mode').addEventListener('click', toggleMode);
    doc.getElementById('back').addEventListener('click', () => window.focus());
    doc.getElementById('refresh').addEventListener('click', () => pollEvents(true));
    doc.getElementById('language').value=state.language;
    doc.getElementById('language').addEventListener('change',event=>changeLanguage(event.target.value));
  }

  function setAvatar(doc, id, url, fallbackIcon) {
    const el = doc.getElementById(id), safe = safeImage(url);
    const alt=tx(id === 'store-avatar' ? "ui_restaurant_logo" : "ui_courier_photo");
    el.setAttribute('role','img');
    el.setAttribute('aria-label',alt);
    if (el.querySelector('img')) el.querySelector('img').alt=alt;
    if (el.dataset.source === safe) return;
    el.dataset.source = safe;
    el.innerHTML = icon(fallbackIcon);
    if (safe) {
      const img = doc.createElement('img');
      img.alt = alt;
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('load', () => {
        if (el.dataset.source === safe) el.replaceChildren(img);
      }, {once:true});
      img.src = safe;
    }
  }

  function renderPip() {
    if (!state.pip || state.pip.closed) return;
    const extras = readOptionalPageInfo(), data = displaySnapshot(state.snapshot, extras), eta = estimateArrival(data, extras);
    const signature = JSON.stringify({data, extras, eta, details:state.orderDetails, orderId:state.activeOrderId, busy:state.pollInFlight, failures:state.pollFailures, completed:state.pollCompleted, language:state.language, mode:state.mode,height:state.pip.innerHeight,width:state.pip.innerWidth});
    if (signature === state.previousSignature) return;
    state.previousSignature = signature;
    const doc = state.pip.document;
    doc.documentElement.lang=({en:'en',pt:'pt-BR',es:'es'})[state.language];
    doc.title=tx("ui_your_order_ifood_pip");
    doc.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=tx(el.dataset.i18n)});
    doc.getElementById('language').value=state.language;
    doc.getElementById('language').title=tx("ui_language");
    doc.getElementById('language').setAttribute('aria-label',tx("ui_language"));
    doc.querySelector('.hero').setAttribute('aria-label',tx("ui_delivery_window"));
    doc.querySelector('.journey').setAttribute('aria-label',tx("ui_order_status"));
    doc.getElementById('progress').setAttribute('aria-label',tx("ui_order_progress"));
    const set = (id,text) => { const el = doc.getElementById(id); if (el && el.textContent !== text) el.textContent = text; };
    const terminal = ['delivered','cancelled'].includes(data.stage);
    const permitted = visibility(data);
    doc.body.dataset.mode = state.mode;
    const brand=doc.querySelector('.ifood-mark'),modeButton=doc.getElementById('toggle-mode');
    const vehicle=doc.querySelector('.vehicle');
    if(state.mode==='compact') {doc.querySelector('.footer').append(brand,modeButton);doc.querySelector('.shell').append(vehicle)}
    else {doc.querySelector('.merchant').append(brand);doc.querySelector('.shell').prepend(modeButton);doc.getElementById('driver-card').append(vehicle)}
    doc.body.classList.toggle('constrained',state.mode==='full' && state.pip.innerHeight<fullHeight()-4);
    const toggle = doc.getElementById('toggle-mode');
    const controlLabel = tx(state.mode === 'compact' ? 'pip_expand' : 'pip_collapse');
    toggle.title = controlLabel; toggle.setAttribute('aria-label',controlLabel);
    toggle.setAttribute('aria-expanded',String(state.mode === 'full'));
    toggle.innerHTML = icon(state.mode === 'compact' ? 'expand' : 'collapse');
    doc.querySelectorAll('[data-language]').forEach(el => {el.title=tx(el.dataset.language)});
    if (doc.body.dataset.stage !== data.stage) {
      doc.body.dataset.stage = data.stage;
    }
    const index = ({ loading:0, unknown:0, received:0, preparing:1, driver:1, atStore:1, shipping:2, arriving:2, delivered:4, cancelled:0 })[data.stage] ?? 0;
    const progressStarted=index>0 || data.confirmed===true;
    doc.body.classList.toggle('terminal',terminal);
    doc.body.classList.toggle('late',Boolean(eta.late));
    doc.body.classList.toggle('pre-dispatch',Boolean(eta.preDispatch));
    const issue=terminal ? '' : state.pollFailures>=4 ? 'ui_refresh_paused_open_order' : data.issue;
    doc.body.classList.toggle('has-issue',Boolean(issue));
    doc.body.classList.toggle('cancelled',data.stage === 'cancelled');
    const store=permitted.order ? extras.store : '';
    set('restaurant',store || tx("ui_ifood_order"));
    doc.getElementById('restaurant').title=store || tx("ui_ifood_order");
    set('order-number',permitted.order ? tx(message('order_number',{number:extras.number ? '#'+extras.number : '· '+(state.activeOrderId?.slice(0,8) || '—')})) : '');
    setAvatar(doc,'store-avatar',permitted.order ? extras.storePhoto : '','store');
    set('eta',tx(eta.title)); set('eta-detail',eta.preDispatch || eta.title?.key==='order_arrives' ? tx(eta.detail) : '');
    const merchantWindow=deliveryWindow(data,extras,eta);
    doc.getElementById('delivery-window').hidden=state.mode!=='full' || !merchantWindow;
    set('delivery-window-value',merchantWindow);
    doc.getElementById('delivery-window').setAttribute('aria-label',tx(/amanh[aã]/i.test(extras.eta || '')?'ui_delivery_window_tomorrow':'ui_delivery_window')+': '+merchantWindow);
    set('status',statusText(data));
    // Compact mode preserves the actual status and progress. Its optional
    // ETA rail only appears when there is useful, non-redundant information.
    const arrivalCode = permitted.deliveryCode && (data.code || extras.code);
    const usefulEta=Boolean(eta.preDispatch || eta.title?.key === 'order_arrives' || eta.late);
    const hasCompactEta = Boolean(usefulEta || arrivalCode);
    doc.body.classList.toggle('compact-estimate',usefulEta);
    doc.body.classList.toggle('compact-has-eta',hasCompactEta);
    doc.body.classList.toggle('compact-terminal',terminal);
    doc.body.classList.remove('compact-route');
    doc.getElementById('eta-detail').hidden = false;
    if (state.mode === 'compact') {
      const compactEta=!permitted.order || terminal || data.stage==='arriving' ? {} : compactContent.estimate(eta,extras);
      set('eta',compactEta.minutes ? tx(message('pip_eta_minutes',{count:compactEta.minutes})) : compactEta.window || '');
      doc.body.classList.toggle('compact-estimate',Boolean(compactEta.minutes || compactEta.window));
      if(data.stage==='shipping') {
        if(compactEta.minutes) {
          set('status',tx(message('pip_route_arrival',{count:compactEta.minutes})));
          doc.body.classList.add('compact-route');
        } else set('status',tx(compactStatus('ui_order_out_for_delivery')));
      }
      set('eta-detail',tx(eta.preDispatch ? eta.detail : 'pip_estimated_arrival'));
    }
    doc.getElementById('status-symbol').innerHTML = data.stage === 'cancelled' ? '<span aria-hidden="true">×</span>' : icon(terminal ? 'check' : ['shipping','arriving','driver'].includes(data.stage) ? 'bike' : 'bag');
    for (let n=0;n<4;n++) {
      doc.getElementById(`segment-${n}`).className = `segment${n<index ? ' done' : n===index && !terminal && progressStarted ? ' active' : ''}`;
      doc.getElementById(`step-${n}`).className = 'step ' + (n<index ? 'done' : n===index && !terminal && progressStarted ? 'current' : '');
      doc.getElementById(`step-${n}`).setAttribute('aria-label',tx(['ui_confirmed','ui_preparing','ui_on_the_way','ui_delivered'][n]));
      doc.getElementById(`step-${n}`).title=tx(['ui_confirmed','ui_preparing','ui_on_the_way','ui_delivered'][n]);
    }
    const progress = doc.getElementById('progress');
    progress.setAttribute('aria-valuenow',String(index)); progress.setAttribute('aria-valuetext',statusText(data));
    const driver = permitted.courier ? data.driver || state.orderDetails.driver : '';
    vehicle.hidden=state.mode==='compact' && !driver;
    doc.body.classList.toggle('compact-has-driver',Boolean(driver));
    doc.getElementById('driver-card').hidden = !driver;
    const driverStage = data.driverPhase || data.stage;
    set('driver-name',driver || ''); set('driver-state',tx(terminal ? "ui_delivery_completed" : data.driverLabel || (driverStage==='driver' ? "ui_heading_to_the_restaurant" : driverStage==='atStore' ? "ui_at_the_restaurant" : ['shipping','arriving'].includes(data.stage) ? "ui_delivering_your_order" : "ui_courier_assigned")));
    const modal=permitted.courier ? data.modal || state.orderDetails.modal || '' : '';
    set('vehicle',modal ? tx(modal) : state.mode==='full'?tx('ui_courier'):'');
    vehicle.hidden=state.mode==='compact' && (!driver || !modal);
    const meters=[data.routeDistanceMeters,state.orderDetails.routeDistanceMeters,extras.routeDistanceMeters].map(finiteDistance).find(value=>value!==null);
    const distance=doc.getElementById('compact-distance');
    distance.hidden=state.mode!=='compact' || !driver || meters===undefined;
    set('compact-distance-value',meters===undefined?'':format.kilometers(meters));
    distance.title=tx('ui_store_to_address_distance');
    distance.setAttribute('aria-label',tx('ui_store_to_address_distance')+(meters===undefined?'':': '+format.kilometers(meters).replace('km',' km')));
    setAvatar(doc,'driver-avatar',permitted.courier ? data.driverPhoto || state.orderDetails.driverPhoto : '','driver');
    const code = permitted.deliveryCode ? data.code || extras.code : '';
    doc.body.classList.toggle('long-code',code.length>4);
    doc.getElementById('code-card').setAttribute('aria-label',tx('ui_delivery_code'));
    doc.getElementById('code-card').hidden = !code || !permitted.deliveryCode || (state.mode==='compact' && !driver);
    doc.body.classList.toggle('compact-show-code',state.mode === 'compact' && Boolean(driver && code) && permitted.deliveryCode);
    const digits = doc.getElementById('code');
    if (digits.dataset.code !== code) {
      digits.dataset.code = code; digits.replaceChildren();
      for (const digit of code) { const span=doc.createElement('span'); span.className='digit'; span.textContent=digit; digits.append(span); }
    }
    set('note',tx(issue || '')); doc.getElementById('note').hidden = !issue;
    const updatedText = tx(data.checkedAt ? message('order_updated',{event:format.time(data.eventTime) || '—',time:format.time(data.checkedAt)}) : 'ui_waiting_for_ifood');
    const compactIssue = state.mode === 'compact' && issue;
    set('updated',state.mode==='compact' ? tx(message('pip_checked_at',{time:format.time(data.checkedAt) || '—'})) : updatedText);
    const updateDescription = compactIssue ? tx(issue) : updatedText;
    doc.getElementById('updated').title = updateDescription;
    doc.getElementById('updated').setAttribute('aria-label',updateDescription);
    doc.getElementById('refresh').title=tx("ui_check_for_updates_now");
    const refresh = doc.getElementById('refresh'); refresh.disabled=state.pollInFlight || state.pollFailures>=4 || state.pollCompleted || terminal; refresh.classList.toggle('refreshing',state.pollInFlight);
    if(state.mode==='compact') {
      const courierName=doc.getElementById('driver-name');
      doc.body.style.setProperty('--eta-width',Math.ceil(doc.getElementById('eta').getBoundingClientRect().width)+'px');
      compactContent.fitName(doc.getElementById('restaurant'),store || tx('ui_ifood_order'));
      courierName.dataset.displayName=compactContent.courierName(driver || '');
      compactContent.fitName(courierName,courierName.dataset.displayName);
      courierName.title=driver || '';
    }
  }


  return {buildPipDocument,renderPip,fullHeight,compactHeight};
};
