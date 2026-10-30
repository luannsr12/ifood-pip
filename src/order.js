const MILESTONES = Object.freeze({
  CREATED:                { rank: 1,  stage: 'received', label: "ui_order_created" },
  PLACED:                 { rank: 2,  stage: 'received', label: "ui_order_placed" },
  CONFIRMED:              { rank: 3,  stage: 'received', label: "ui_order_confirmed" },
  PREPARATION_STARTED:    { rank: 4,  stage: 'preparing', label: "ui_the_restaurant_is_preparing_your_order" },
  SEPARATION_STARTED:     { rank: 4,  stage: 'preparing', label: "ui_your_order_is_being_packed" },
  ASSIGN_DRIVER:          { rank: 4.5,stage: 'driver', label: "ui_courier_assigned" },
  DELIVERY_ACCEPTED:      { rank: 4.5,stage: 'driver', label: "ui_courier_accepted_the_delivery" },
  GOING_TO_ORIGIN:        { rank: 5,  stage: 'driver', label: "ui_courier_heading_to_the_restaurant" },
  DELIVERY_GOING_TO_ORIGIN:{rank: 5,  stage: 'driver', label: "ui_courier_heading_to_the_restaurant" },
  ARRIVED_AT_ORIGIN:      { rank: 6,  stage: 'atStore',label: "ui_courier_arrived_at_the_restaurant" },
  DELIVERY_ARRIVED_AT_ORIGIN:{ rank: 6,stage: 'atStore',label: "ui_courier_arrived_at_the_restaurant" },
  READY_TO_PICKUP:        { rank: 6,  stage: 'atStore',label: "ui_order_ready_for_pickup" },
  SEPARATION_ENDED:       { rank: 6,  stage: 'atStore',label: "ui_order_packed" },
  COLLECTED:              { rank: 6.5,stage: 'atStore',label: "ui_courier_picked_up_your_order" },
  DELIVERY_COLLECTED:     { rank: 6.5,stage: 'atStore',label: "ui_courier_picked_up_your_order" },
  DISPATCHED:             { rank: 7,  stage: 'shipping',label: "ui_order_out_for_delivery" },
  GOING_TO_DESTINATION:   { rank: 8,  stage: 'shipping',label: "ui_your_order_is_on_its_way" },
  DELIVERY_GOING_TO_DESTINATION:{rank: 8, stage:'shipping',label: "ui_your_order_is_on_its_way" },
  ARRIVED_AT_DESTINATION:{ rank: 9,  stage: 'arriving',label: "ui_courier_arrived_at_your_address" },
  DELIVERY_ARRIVED_AT_DESTINATION:{ rank: 9,stage:'arriving',label: "ui_courier_arrived_at_your_address" },
  DELIVERED:              { rank: 10, stage: 'delivered',label: "ui_order_delivered" },
  CONCLUDED:              { rank: 10, stage: 'delivered',label: "ui_order_completed" },
  COMPLETED:              { rank: 10, stage: 'delivered',label: "ui_order_completed" },
  DELIVERY_COMPLETED:     { rank: 10, stage: 'delivered',label: "ui_order_delivered" },
  ARRIVED:               { rank: 9, stage: 'arriving',label: "ui_courier_arrived_at_your_address" },
  CANCELLED:              { rank: 11, stage: 'cancelled',label: "ui_order_canceled" },
  ORDER_CANCELLED:        { rank: 11, stage: 'cancelled',label: "ui_order_canceled" }
});

function blankSnapshot() {
  return { stage: 'loading', label: "ui_checking_order_updates", confirmed:false,
    driver: '', driverPhoto: '', driverLabel: '', modal: '', code: '', codeValidated: false,
    etaAt: 0, departedAt: 0, routeDistanceMeters: null, origin: null, destination: null,
    eventTime: '', checkedAt: '', issue: '', timeline:{} };
}

function safeImage(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value, location.href);
    if (url.username || url.password) return '';
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
}

function cleanStore(value) {
  return typeof value === 'string' && value.length <= 100 &&
    !/entregador|motoboy|a caminho|indo ao|chegou|código|previsão|detalhes|pagamento/i.test(value) ? value.trim() : '';
}

function extractDetails(json) {
  const data = json?.data?.order || json?.order || json?.data || json;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const merchant = data.merchant || data.restaurant || {};
  const delivery = data.delivery || {};
  const driver = delivery.driver || data.driver || {};
  return {
    store: cleanStore(merchant.name), storePhoto: safeImage(merchant.logoUrl || merchant.imageUrl || merchant.logo),
    driverPhoto: safeImage(driver.photoUrl), driver: typeof driver.name === 'string' ? driver.name.slice(0,60) : '',
    ...extractRoute(data),
    modal: normalizeModal(driver.modal || driver.vehicleType || delivery.modal || delivery.vehicleType),
    departedAt: Date.parse(delivery.dispatchedAt || data.dispatchedAt || '') || 0
  };
}

function point(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.type === 'Point' && Array.isArray(value.coordinates)) return point({ longitude:value.coordinates[0], latitude:value.coordinates[1] });
  if (value.coordinates && !Array.isArray(value.coordinates)) return point(value.coordinates);
  if (value.location) return point(value.location);
  if (value.geoCoordinates) return point(value.geoCoordinates);
  const rawLat = value.latitude ?? value.lat, rawLng = value.longitude ?? value.lng ?? value.lon;
  if (rawLat === null || rawLat === undefined || rawLat === '' || rawLng === null || rawLng === undefined || rawLng === '') return null;
  const lat = Number(rawLat), lng = Number(rawLng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0) ? { lat, lng } : null;
}

function finiteDistance(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 200000 ? value : null;
}

function normalizeModal(value) {
  const key = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return ({MOTORCYCLE:"ui_motorbike",MOTORBIKE:"ui_motorbike",MOTO:"ui_motorbike",MOTOCICLETA:"ui_motorbike",BICYCLE:"ui_bicycle",BIKE:"ui_bicycle",BICICLETA:"ui_bicycle",CAR:"ui_car",CARRO:"ui_car"})[key] || '';
}

function extractRoute(data) {
  const delivery = data.delivery || data.deliveryInfo || {};
  const merchant = data.merchant || data.restaurant || {};
  const firstPoint = (...values) => values.map(point).find(Boolean) || null;
  return {
    origin: firstPoint(delivery.origin,delivery.pickupAddress,merchant.address,merchant.location,merchant.coordinates,data.origin),
    destination: firstPoint(delivery.destination,delivery.destinationAddress,delivery.address,data.deliveryAddress,data.shippingAddress,data.address),
    // Explicit meters for the FULL store → customer route. Never remainingDistanceMeters.
    routeDistanceMeters: [delivery.routeDistanceMeters,delivery.distanceMeters,delivery.route?.distanceMeters,data.routeDistanceMeters].map(finiteDistance).find(value=>value!==null) ?? null
  };
}

function geographicRouteMeters(from, to) {
  if (!from || !to) return null;
  const rad = n => n * Math.PI / 180;
  const a = Math.sin(rad(to.lat-from.lat)/2)**2 + Math.cos(rad(from.lat))*Math.cos(rad(to.lat))*Math.sin(rad(to.lng-from.lng)/2)**2;
  return finiteDistance(6371000 * 2 * Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a))) * 1.3);
}

function readPageStatus(text) {
  // Explicit current-status phrases only. "Logo sairá" must never mean dispatched.
  const statuses = [
    ['cancelled', /(?:Seu |O )?pedido (?:foi |est[aá] )?cancelado/i],
    ['delivered', /(?:Seu |O )?pedido (?:(?:foi )?entregue|(?:foi )?conclu[ií]do)/i],
    ['arriving', /(?:O )?entregador chegou (?:ao seu endere[çc]o|ao destino)/i],
    ['shipping', /(?:Seu |O )?pedido (?:saiu para entrega|est[aá] a caminho)/i],
    ['preparing', /(?:O |Seu )?pedido (?:est[aá] sendo preparado(?: e logo sair[aá] para entrega)?|est[aá] em prepara[çc][aã]o|em preparo)/i]
  ];
  for (const [stage, pattern] of statuses) {
    const match = text.match(pattern);
    if (match) return { stage, label: ({cancelled:'ui_order_canceled',delivered:'ui_order_delivered',arriving:'ui_courier_arrived_at_your_address',shipping:'ui_your_order_is_on_its_way',preparing:'ui_the_restaurant_is_preparing_your_order'})[stage] };
  }
  return null;
}

function displaySnapshot(events, extras) {
  const page = extras.pageStatus;
  const phase = { loading:-1, unknown:-1, received:0, preparing:1, driver:1, atStore:1, shipping:2, arriving:3, delivered:4, cancelled:5 };
  // DOM can advance a lagging HTTP summary, but cannot roll back a delivery event.
  return page && phase[page.stage] >= phase[events.stage] ? { ...events, ...page } : events;
}

function summarizeEvents(json, id) {
  if (!Array.isArray(json)) throw new Error('Formato inesperado: a API não retornou uma lista de eventos.');
  let best = null;
  let name = '';
  let modal = '';
  let driverPhoto = '', code = '', codeValidated = false, etaAt = 0, driverPhase = '', driverLabel = '', driverRank = 0;
  let routeDistanceMeters = null, origin = null, destination = null, departedAt = 0;
  const timeline = {};
  const events = json.filter(item => item?.orderId === id).slice().sort((a,b) =>
    (Date.parse(a.timestamp || a.processedAt || '') || 0) - (Date.parse(b.timestamp || b.processedAt || '') || 0));
  for (let index = 0; index < events.length; index++) {
    const item = events[index];
    if (!item || item.orderId !== id || typeof item.value !== 'string') continue;
    const value = item.value.toUpperCase();
    if ((value === 'ASSIGN_DRIVER' || value === 'DELIVERY_ACCEPTED') && item.metadata) {
      if (typeof item.metadata.driverName === 'string') name = item.metadata.driverName.slice(0, 60);
      if (item.metadata.driverPhotoUrl) driverPhoto = safeImage(item.metadata.driverPhotoUrl);
      modal = normalizeModal(item.metadata.modal) || modal;
    }
    const meta = item.metadata || {};
    if (/^DELIVERY_DROP_CODE_/.test(value) && meta.HANDSHAKE_TYPE === 'DELIVERY') {
      if (/^\d{4,6}$/.test(String(meta.HANDSHAKE_CODE || ''))) code = String(meta.HANDSHAKE_CODE);
      if (value === 'DELIVERY_DROP_CODE_VALIDATION_SUCCESS') codeValidated = true;
    }
    const eta = Date.parse(meta.newEta || '');
    if (Number.isFinite(eta)) etaAt = eta;
    const route = extractRoute(meta);
    if (route.routeDistanceMeters !== null) routeDistanceMeters = route.routeDistanceMeters;
    if (route.origin) origin = route.origin;
    if (route.destination) destination = route.destination;
    const mapping = MILESTONES[value];
    if (mapping && mapping.rank >= driverRank && /^(ASSIGN_DRIVER|DELIVERY_ACCEPTED|(?:DELIVERY_)?(?:GOING_TO_ORIGIN|ARRIVED_AT_ORIGIN|COLLECTED|GOING_TO_DESTINATION|ARRIVED_AT_DESTINATION)|DISPATCHED)$/.test(value)) { driverPhase = mapping.stage; driverLabel = mapping.label; driverRank = mapping.rank; }
    if (!mapping) continue; // Ignora NUPAY, CHAT, HANDSHAKE_CODE, outros metadados internos.
    const timestamp = Date.parse(item.timestamp || item.processedAt || '') || 0;
    const moment = ({CREATED:'created',PLACED:'created',CONFIRMED:'confirmed',PREPARATION_STARTED:'preparing',SEPARATION_STARTED:'preparing',DISPATCHED:'departed',GOING_TO_DESTINATION:'departed',DELIVERY_GOING_TO_DESTINATION:'departed',ARRIVED_AT_DESTINATION:'arrived',DELIVERY_ARRIVED_AT_DESTINATION:'arrived',ARRIVED:'arrived',DELIVERED:'completed',CONCLUDED:'completed',COMPLETED:'completed',DELIVERY_COMPLETED:'completed'})[value];
    if (moment && timestamp && !timeline[moment]) timeline[moment] = timestamp;
    if (timestamp > 0 && /^(DISPATCHED|(?:DELIVERY_)?GOING_TO_DESTINATION)$/.test(value)) departedAt = departedAt ? Math.min(departedAt,timestamp) : timestamp;
    const candidate = { ...mapping, time: timestamp, index };
    // Nunca regride para uma etapa anterior por causa de eventos auxiliares/tardios.
    if (!best || candidate.rank > best.rank ||
        (candidate.rank === best.rank && (candidate.time > best.time ||
          (candidate.time === best.time && candidate.index > best.index)))) {
      best = candidate;
    }
  }
  const eventTime = best?.time || 0;
  const waitingForDriver = best?.stage === 'atStore' && driverPhase === 'driver';
  return {
    stage: waitingForDriver ? 'driver' : best?.stage || 'unknown',
    confirmed:Boolean(best && best.rank>=3),
    label: waitingForDriver ? "ui_order_ready_courier_heading_to_the_store" : best?.label || "ui_waiting_for_an_order_update",
    driver: name, driverPhase, driverLabel, driverPhoto, modal, code, codeValidated, etaAt, departedAt, routeDistanceMeters, origin, destination, eventTime, timeline,
    checkedAt: Date.now(),
    issue: ''
  };
}


module.exports = {MILESTONES,blankSnapshot,safeImage,cleanStore,extractDetails,point,finiteDistance,normalizeModal,extractRoute,geographicRouteMeters,readPageStatus,displaySnapshot,summarizeEvents};
