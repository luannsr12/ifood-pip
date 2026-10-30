module.exports = function createLauncher({state,HOST_ID,tx,openOrClosePip}) {
  function mountLaunchButton() {
    if (state.host || !document.body) return;
    state.host = document.createElement('div');
    state.host.id = HOST_ID;
    state.host.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:2147483647;';
    const shadow = state.host.attachShadow({ mode:'open' });
    const style = document.createElement('style');
    style.textContent = require('./launcher.css');
    shadow.append(style);
    const widget = document.createElement('div');
    widget.className = 'widget';
    state.feedback = document.createElement('div');
    state.feedback.className = 'feedback';
    state.feedback.setAttribute('role','status');
    state.launchButton = document.createElement('button');
    state.launchButton.type = 'button';
    state.launchButton.title = tx("ui_open_ifood_order_in_picture_in_picture");
    state.launchButton.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="15" rx="3"/><rect x="11" y="11" width="8" height="6" rx="1" fill="currentColor" stroke="none"/></svg><span>${tx('ui_order_mini_window')}</span>`;
    state.launchButton.addEventListener('click', openOrClosePip);
    widget.append(state.feedback,state.launchButton);
    shadow.append(widget);
    document.body.append(state.host);
  }

  function setFeedback(message) {
    if (!state.feedback) return;
    state.feedback.dataset.message = message;
    state.feedback.textContent = tx(message);
    if (message) setTimeout(() => {
      if (state.feedback?.dataset.message === message) { state.feedback.textContent = ''; delete state.feedback.dataset.message; }
    }, 6000);
  }

  function syncLaunchButton() {
    if (!state.launchButton) return;
    const opened = Boolean(state.pip && !state.pip.closed);
    state.launchButton.classList.toggle('is-open',opened);
    const text = tx(opened ? "ui_close_mini_window" : "ui_order_mini_window");
    state.launchButton.title = tx("ui_open_ifood_order_in_picture_in_picture");
    const span = state.launchButton.querySelector('span');
    if (span.textContent !== text) span.textContent = text;
  }


  return {mountLaunchButton,setFeedback,syncLaunchButton};
};
