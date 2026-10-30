const {blankSnapshot} = require('./order');
const createPreferences = require('./preferences');
const {createI18n} = require('./i18n');
const createFormat = require('./format');
const HOST_ID = 'ifood-pip-companion-root';
const ORDER_PATH = /^\/pedido\/([a-f\d-]{30,50})\/acompanhar\/?$/i;
const POLL_INTERVAL = 20000;

if (location.origin === 'https://www.ifood.com.br' && !document.getElementById(HOST_ID)) start();

function start() {
  const preferences = createPreferences(() => window.localStorage);
  const state = {
    host:null, launchButton:null, feedback:null, pip:null, pollTimer:null,
    pollInFlight:false, replay:null, capturedSummary:null, lastPageUpdateAt:0,
    domTimer:null, activeOrderId:null, previousSignature:'', snapshot:blankSnapshot(),
    orderDetails:{}, clockTimer:null, language:preferences.read('language'),
    mode:preferences.read('mode'), opening:false
  };
  const {t:tx,locale} = createI18n({
    pt:require('../_locales/pt_BR/messages.json'),
    en:require('../_locales/en/messages.json'),
    es:require('../_locales/es/messages.json')
  },() => state.language);
  const format = createFormat(locale);
  const getOrderId = () => ORDER_PATH.exec(location.pathname)?.[1] || null;
  let view, polling;
  const renderPip = () => view?.renderPip();
  const queueNextPoll = delay => polling.queueNextPoll(delay);
  const stopPolling = () => polling.stopPolling();
  const pollEvents = force => polling.pollEvents(force);
  const refreshCaptured = require('./traffic')({state,getOrderId,renderPip,queueNextPoll});
  polling = require('./polling')({state,getOrderId,renderPip,refreshCaptured,POLL_INTERVAL});
  view = require('./view')({state,tx,format,
    readOptionalPageInfo:require('./page')(state),
    estimateArrival:require('./arrival')(state,format,tx),
    changeLanguage,pollEvents,toggleMode
  });
  const buildPipDocument = win => view.buildPipDocument(win);

  function changeLanguage(value) {
    if (!preferences.write('language',value)) return;
    state.language = value;
    state.previousSignature = '';
    syncLaunchButton();
    if (state.feedback?.dataset.message) state.feedback.textContent=tx(state.feedback.dataset.message);
    renderPip();
  }

  function toggleMode() {
    state.mode = state.mode === 'full' ? 'compact' : 'full';
    preferences.write('mode',state.mode);
    state.previousSignature = '';
    renderPip();
    // Called synchronously from the user's click: resize consumes activation.
    // Older browsers may ignore it; scrollable layouts remain usable.
    try {
      const win = state.pip;
      if (!state.pipOuterWidth) {
        // requestWindow() can resolve before the native frame is laid out;
        // measure only at the first toggle, after it is visible.
        state.pipOuterWidth = win.outerWidth;
        state.pipFrameHeight = Math.max(0,win.outerHeight-win.innerHeight);
      }
      // Keep the user's horizontal position and width. Changing both axes
      // lets the browser clamp/reposition a corner window on every toggle.
      // Reuse the initial outer width rather than accumulating resizeBy(0)
      // rounding at fractional Windows display scales.
      const height = state.mode === 'compact' ? 164 : 310;
      win.resizeTo(state.pipOuterWidth, height + state.pipFrameHeight);
    } catch { /* Window dimensions are ultimately controlled by the browser. */ }
  }

  const {mountLaunchButton,setFeedback,syncLaunchButton} = require('./launcher')({state,HOST_ID,tx,openOrClosePip});

  async function openOrClosePip() {
    if (state.opening) return;
    if (state.pip && !state.pip.closed) {
      state.pip.close();
      return;
    }
    const requestedOrderId = getOrderId();
    if (!requestedOrderId) return;
    if (!window.documentPictureInPicture) {
      setFeedback("ui_your_browser_does_not_support_document_picture_in_picture_here");
      return;
    }
    try {
      state.opening = true;
      // Abrir ANTES de fazer fetch/await para preservar o gesto do clique.
      const opened = await window.documentPictureInPicture.requestWindow({
        width:350,
        height:state.mode === 'compact' ? 164 : 310,
        preferInitialWindowPlacement:false, disallowReturnToOpener:true
      });
      if (getOrderId() !== requestedOrderId) {opened.close(); return;}
      state.pip = opened;
      state.pipOuterWidth = null;
      state.pipFrameHeight = null;
      state.activeOrderId = getOrderId();
      state.snapshot = state.capturedSummary?.orderId === state.activeOrderId ? state.capturedSummary.summary : blankSnapshot();
      state.previousSignature = '';
      buildPipDocument(opened);
      opened.addEventListener('pagehide',() => {
        opened.clearInterval(state.clockTimer);
        state.clockTimer = null;
        opened.clearTimeout(state.pollTimer);
        if (state.pip === opened) {stopPolling(); state.pip = null;}
        syncLaunchButton();
      },{once:true});
      renderPip();
      state.clockTimer = opened.setInterval(renderPip, 10000);
      syncLaunchButton();
      queueNextPoll(POLL_INTERVAL);
    } catch (error) {
      setFeedback(error?.name === 'NotAllowedError'
        ? "ui_could_not_open_the_mini_window_click_the_button_again"
        : "ui_could_not_open_the_pip_window");
      console.warn('[iFood PiP] Erro ao abrir PiP:',error?.name || error);
    } finally {
      state.opening = false;
    }
  }


  function scheduleDomRefresh() {
    if (state.domTimer) return;
    state.domTimer = setTimeout(() => {state.domTimer = null; checkNavigation(); renderPip();}, 400);
  }

  function checkNavigation() {
    const orderId = getOrderId();
    if (state.orderDetails.orderId && state.orderDetails.orderId !== orderId) state.orderDetails = {};
    if (!orderId) {
      if (state.host) state.host.hidden = true;
      if (state.pip && !state.pip.closed) state.pip.close();
      stopPolling();
      return;
    }
    if (!state.host || !state.host.isConnected) {
      state.host = null;
      mountLaunchButton();
    }
    if (state.host.hidden) state.host.hidden = false;
    if (state.pip && !state.pip.closed && state.activeOrderId !== orderId) {
      stopPolling();
      state.activeOrderId = orderId;
      state.snapshot = state.capturedSummary?.orderId === orderId ? state.capturedSummary.summary : blankSnapshot();
      state.previousSignature = '';
      renderPip();
      queueNextPoll(0);
    }
    syncLaunchButton();
  }

  function initUi() {
    checkNavigation();
    const onNavigation = () => {checkNavigation(); renderPip();};
    // The script is present before entering an order. Observe same-document
    // URL changes even when the site's router has not mutated the DOM yet.
    window.navigation?.addEventListener('currententrychange',onNavigation);
    window.addEventListener('popstate',onNavigation);
    const observer = new MutationObserver(() => {
      // Reflete também avanços no status visível que ainda não chegaram em /events.
      if (state.pip && !state.pip.closed) scheduleDomRefresh();
      else checkNavigation();
    });
    observer.observe(document.documentElement, {childList:true, characterData:true,subtree:true});
    const navigationTimer = setInterval(checkNavigation,3000);
    window.addEventListener('pagehide',() => {
      stopPolling();
      clearInterval(navigationTimer);
      clearTimeout(state.domTimer);
      observer.disconnect();
      window.navigation?.removeEventListener('currententrychange',onNavigation);
      window.removeEventListener('popstate',onNavigation);
      if (state.pip && !state.pip.closed) state.pip.close();
    },{once:true});
  }
  window.addEventListener('pageshow',event => {
    // A document restored from the back/forward cache does not fire DOM ready.
    if (event.persisted) initUi();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initUi,{once:true});
  else initUi();
}
