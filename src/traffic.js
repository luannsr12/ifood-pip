const {extractDetails,summarizeEvents} = require('./order');
module.exports = function createTraffic(context) {
  const {state,getOrderId,renderPip,queueNextPoll} = context;
  function installTrafficObservation() {
    const nativeFetch = window.fetch;
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSend = XMLHttpRequest.prototype.send;
    const nativeSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    const xhrInfo = new WeakMap();

    function eventOrderId(url) {
      try {
        const parsed = new URL(url instanceof Request ? url.url : String(url), location.href);
        if (parsed.origin !== location.origin) return null;
        return /^\/site-api\/v1\/customers\/me\/orders\/([a-f\d-]{30,50})\/events\/?$/i.exec(parsed.pathname)?.[1] || null;
      } catch { return null; }
    }

    function detailOrderId(url) {
      try {
        const parsed = new URL(url instanceof Request ? url.url : String(url), location.href);
        return parsed.origin === location.origin ? /^\/site-api\/v\d+\/customers\/me\/orders\/([a-f\d-]{30,50})\/?$/i.exec(parsed.pathname)?.[1] : null;
      } catch { return null; }
    }

    function recordDetails(data, id) {
      if (id !== getOrderId()) return;
      const details = Object.fromEntries(Object.entries(extractDetails(data)).filter(([,value])=>value!==null && value!==undefined && value!=='' && value!==0));
      state.orderDetails = { ...(state.orderDetails.orderId===id ? state.orderDetails : {}), ...details, orderId: id };
      renderPip();
    }

    function recordEvents(json, orderId, fromPage = true) {
      try {
        const summary = summarizeEvents(json, orderId);
        if (orderId !== getOrderId()) return false;
        state.capturedSummary = { orderId, summary };
        if (fromPage) {
          state.lastPageUpdateAt = Date.now();
          state.pollFailures = 0;
        }
        if (state.pip && !state.pip.closed && state.activeOrderId === orderId) {
          state.snapshot = summary;
          renderPip();
          if (fromPage) queueNextPoll();
        }
        return true;
      } catch (error) {
        // Respostas inesperadas não afetam o funcionamento normal do site.
        if (state.pip && !state.pip.closed) {
          state.snapshot.issue = "ui_unexpected_order_response_from_ifood";
          renderPip();
        }
        return false;
      }
    }

    function observeFetchResponse(promise, orderId) {
      Promise.resolve(promise).then((response) => {
        if (!response?.ok) return;
        response.clone().json().then(data => recordEvents(data, orderId)).catch(() => {});
      }).catch(() => {});
    }

    window.fetch = function (input, init) {
      const orderId = eventOrderId(input);
      const detailId = detailOrderId(input);
      let request = null;
      if (orderId) {
        try {
          request = new Request(input, init); // cópia dos headers enviados pelo site
        } catch { /* preservar chamada nativa intacta */ }
      }
      const response = Reflect.apply(nativeFetch, this, arguments);
      if (detailId) Promise.resolve(response).then(res => {
        if (res.ok) res.clone().json().then(data => recordDetails(data, detailId)).catch(() => {});
      }).catch(() => {});
      if (orderId && request && request.method === 'GET') {
        state.replay = {
          orderId,
          call: (contextWindow) => Reflect.apply(contextWindow.fetch, contextWindow, [new Request(request, { cache: 'no-store' })])
        };
        observeFetchResponse(response, orderId);
      }
      return response;
    };

    XMLHttpRequest.prototype.open = function (method, url) {
      const orderId = String(method).toUpperCase() === 'GET' ? eventOrderId(url) : null;
      const detailId = String(method).toUpperCase() === 'GET' ? detailOrderId(url) : null;
      xhrInfo.set(this, orderId || detailId ? { orderId, detailId, url: new URL(String(url), location.href).href, headers: [] } : null);
      return Reflect.apply(nativeOpen, this, arguments);
    };
    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      const xhrState = xhrInfo.get(this);
      if (xhrState) xhrState.headers.push([String(name), String(value)]);
      return Reflect.apply(nativeSetHeader, this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      const xhrState = xhrInfo.get(this);
      if (xhrState) {
        const xhr = this;
        const credentials = xhr.withCredentials ? 'include' : 'same-origin';
        const headers = xhrState.headers.slice();
        if (xhrState.orderId) state.replay = {
          orderId: xhrState.orderId,
          call: (contextWindow) => Reflect.apply(contextWindow.fetch, contextWindow, [xhrState.url, {
            method: 'GET', cache: 'no-store', credentials, headers: new Headers(headers)
          }])
        };
        xhr.addEventListener('load', () => {
          if (xhr.status < 200 || xhr.status >= 300) return;
          try {
            const data = xhr.responseType === 'json' ? xhr.response : JSON.parse(xhr.responseText);
            if (xhrState.orderId) recordEvents(data, xhrState.orderId);
            else recordDetails(data, xhrState.detailId);
          } catch { /* o site continua funcionando normalmente */ }
        }, { once: true });
      }
      return Reflect.apply(nativeSend, this, arguments);
    };

    return async function refreshFromCapturedRequest(orderId) {
      if (!state.replay || state.replay.orderId !== orderId) return { ok: false, reason: 'waiting' };
      // Fetch parte do próprio documento PiP visível, não da aba em segundo plano.
      const response = await state.replay.call(state.pip);
      if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
      const data = await response.json();
      return recordEvents(data, orderId, false) ? { ok: true } : { ok:false, reason:'invalid response' };
    };
  }


  return installTrafficObservation();
};
