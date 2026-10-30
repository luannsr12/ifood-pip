const {message} = require('./i18n');
module.exports = function createPolling(context) {
  const {state,getOrderId,renderPip,refreshCaptured,POLL_INTERVAL} = context;
  function stopPolling() {
    if (state.pollTimer !== null && state.pip) state.pip.clearTimeout(state.pollTimer);
    state.pollTimer = null;
  }

  function queueNextPoll(delay = POLL_INTERVAL) {
    stopPolling();
    // O relógio vive no documento PiP, que permanece visível com a aba em segundo plano.
    if (state.pip && !state.pip.closed && getOrderId()) {
      state.pollTimer = state.pip.setTimeout(() => { state.pollTimer = null; pollEvents(); }, delay);
    }
  }

  async function pollEvents(force = false) {
    if (!state.pip || state.pip.closed || state.pollInFlight) return;
    const requestWindow = state.pip;
    stopPolling();
    const orderId = getOrderId();
    if (!orderId) return;
    // Não duplica consultas enquanto o próprio site já está atualizando.
    if (!force && Date.now() - state.lastPageUpdateAt < POLL_INTERVAL * .85) {
      queueNextPoll();
      return;
    }
    state.pollInFlight = true;
    renderPip();
    let retryAfter = POLL_INTERVAL;
    try {
      const result = await refreshCaptured(orderId);
      if (state.pip !== requestWindow || requestWindow.closed || getOrderId() !== orderId) return;
      if (!result.ok) {
        state.snapshot.issue = result.reason === 'waiting'
          ? "ui_waiting_for_ifood_data_reload_the_page_if_needed"
          : message('order_unavailable',{reason:result.reason});
        if (result.reason === 'HTTP 429') retryAfter = 60000;
      } else {
        state.snapshot.issue = '';
      }
      renderPip();
    } catch {
      if (state.pip === requestWindow && !requestWindow.closed) {
        state.snapshot.issue = "ui_could_not_refresh_waiting_for_ifood";
        renderPip();
      }
    } finally {
      state.pollInFlight = false;
      renderPip();
      if (state.pip === requestWindow) queueNextPoll(retryAfter);
    }
  }


  return {stopPolling,queueNextPoll,pollEvents};
};
