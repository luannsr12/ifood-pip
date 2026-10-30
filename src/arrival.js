const {message} = require('./i18n');
const {finiteDistance,geographicRouteMeters} = require('./order');
module.exports = function createArrival(state,format,t) {
  function estimateArrival(data, extras, now = Date.now()) {
    if (data.stage === 'delivered') return { title: "ui_enjoy_your_meal", detail: "ui_your_order_has_been_delivered", source: "ui_completed" };
    if (data.stage === 'cancelled') return { title: "ui_order_canceled", detail: "ui_see_details_on_the_order_page", source: "ui_closed" };
    if (data.stage === 'arriving') return { title: "ui_your_courier_is_here", detail: "ui_get_ready_to_receive_your_order", source: "ui_courier_at_your_address" };
    if (data.stage === 'shipping') return routeArrival(data,extras,now);
    let arrival = 0;
    if (extras.eta) {
      const times = [...extras.eta.matchAll(/(\d{1,2}):(\d{2})/g)];
      if (times.length) {
        const end = times[times.length - 1], date = new Date(now);
        date.setHours(Number(end[1]), Number(end[2]), 0, 0);
        if (/amanhã/i.test(extras.eta)) date.setDate(date.getDate() + 1);
        else if (date.getTime() < now - 12 * 3600000) date.setDate(date.getDate() + 1);
        arrival = date.getTime();
      }
    }
    if (arrival) {
      // Until actual dispatch, the merchant's full delivery window is the
      // source of truth. A single newEta must not replace it with a countdown.
      const window = extras.eta.replace(/^(?:Hoje|Amanh[aã]|\w+-feira),?\s*/i, '');
      return { title: window, detail: /amanh[aã]/i.test(extras.eta) ? "ui_delivery_window_tomorrow" : "ui_delivery_window", source: '', preDispatch: true, late:arrival<=now };
    }
    return { title: "ui_tracking_your_order", detail: "ui_the_estimate_appears_when_ifood_provides_it", source: "ui_not_enough_data_for_an_estimate" };
  }

  function routeArrival(data, extras, now) {
    const explicitMeters = [data.routeDistanceMeters,state.orderDetails.routeDistanceMeters,extras.routeDistanceMeters]
      .map(finiteDistance).find(value=>value!==null) ?? null;
    const meters = explicitMeters ?? geographicRouteMeters(data.origin || state.orderDetails.origin, data.destination || state.orderDetails.destination);
    const departedAt = data.departedAt || state.orderDetails.departedAt;
    const modal = data.modal || state.orderDetails.modal || '';
    const speed = { ui_motorbike:22, ui_bicycle:12, ui_car:18 }[modal];
    const missing = [];
    if (meters === null) missing.push("ui_store_to_address_distance");
    if (!speed) missing.push("ui_vehicle");
    if (!departedAt || departedAt > now) missing.push("ui_departure_time");
    if (missing.length) return { title:"ui_out_for_delivery", detail:message('order_waiting',{items:missing.map(t).join(', ')}), source:"ui_not_enough_trip_data_for_an_estimate" };
    // Fixed arrival anchored to departure. Polling/reopening must not restart the trip.
    const tripMinutes = meters / 1000 / speed * 60 + 2;
    const arrival = departedAt + tripMinutes * 60000;
    const remaining = Math.ceil((arrival-now)/60000);
    if (remaining <= 0) {
      const late = Math.max(0,Math.floor((now-arrival)/60000));
      return { title:"ui_order_delayed", detail:late ? message('order_route_late',{count:late}) : "ui_estimated_trip_time_exceeded", source:"ui_local_route_and_vehicle_estimate", late:true };
    }
    const distance = format.number(meters/1000);
    const time = format.time(departedAt);
    return { title:message('order_arrives',{count:remaining}), detail:message('order_route',{distance:(explicitMeters===null?'~':'')+distance,vehicle:t(modal),time}), source:explicitMeters===null?"ui_local_estimate_geographic_distance_1_3":"ui_local_estimate_route_distance" };
  }


  return estimateArrival;
};
