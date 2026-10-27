/*
 * iFood PiP 0.0.6 — observa as requisições oficiais da página.
 * Reproduz a requisição capturada DENTRO do PiP, sem recarregar a aba.
 * Os headers são reutilizados apenas em memória, sem persistir ou exibir tokens.
 * Também observa respostas de fetch / XMLHttpRequest que o próprio iFood realiza.
 * Eventos JSON e status visível na página são conciliados sem regredir a entrega.
 * Fotos e código de entrega são exibidos apenas na janela local, sem persistência.
 */
(() => {
  'use strict';

  // Pacote de produção: executa somente no site oficial, nunca no simulador.
  if (location.origin !== 'https://www.ifood.com.br') return;

  const HOST_ID = 'ifood-pip-companion-root';
  const ORDER_PATH = /^\/pedido\/([a-f\d-]{30,50})\/acompanhar\/?$/i;
  const POLL_INTERVAL = 20000;

  if (document.getElementById(HOST_ID)) return;

  let host = null;
  let launchButton = null;
  let feedback = null;
  let pip = null;
  let pollTimer = null;
  let pollInFlight = false;
  let replay = null;
  let capturedSummary = null;
  let lastPageUpdateAt = 0;
  let domTimer = null;
  let activeOrderId = null;
  let previousSignature = '';
  let snapshot = blankSnapshot();
  let orderDetails = {};
  let clockTimer = null;
  const LANGUAGE_KEY = 'ifood-pip-language';
  let language = readLanguage();

  function readLanguage() {
    try { const saved=window.localStorage.getItem('ifood-pip-language'); return ['en','pt','es'].includes(saved) ? saved : 'en'; }
    catch { return 'en'; }
  }

  // Domain/API parsing stays in Portuguese; only presentation is localized.
  // Names, order IDs, photos, codes and authentication are never translated.
  const TEXT = {
    'Pedido criado':['Order created','Pedido creado'],
    'Pedido realizado':['Order placed','Pedido realizado'],
    'Pedido confirmado':['Order confirmed','Pedido confirmado'],
    'Restaurante preparando o pedido':['The restaurant is preparing your order','El restaurante está preparando tu pedido'],
    'Pedido em separação':['Your order is being packed','Tu pedido se está preparando'],
    'Entregador atribuído':['Courier assigned','Repartidor asignado'],
    'Entregador aceitou a entrega':['Courier accepted the delivery','El repartidor aceptó la entrega'],
    'Entregador indo ao restaurante':['Courier heading to the restaurant','El repartidor va al restaurante'],
    'Entregador chegou ao restaurante':['Courier arrived at the restaurant','El repartidor llegó al restaurante'],
    'Pedido pronto para retirada':['Order ready for pickup','Pedido listo para recoger'],
    'Separação concluída':['Order packed','Preparación terminada'],
    'Entregador retirou o pedido':['Courier picked up your order','El repartidor recogió tu pedido'],
    'Pedido saiu para entrega':['Order out for delivery','Pedido en reparto'],
    'Pedido a caminho de você':['Your order is on its way','Tu pedido está en camino'],
    'Entregador chegou ao destino':['Courier arrived at your address','El repartidor llegó a tu dirección'],
    'Pedido entregue':['Order delivered','Pedido entregado'],
    'Pedido concluído':['Order completed','Pedido completado'],
    'Pedido cancelado':['Order canceled','Pedido cancelado'],
    'Pedido pronto · entregador indo à loja':['Order ready · courier heading to the store','Pedido listo · repartidor hacia la tienda'],
    'Nenhuma etapa conhecida nos eventos':['Waiting for an order update','Esperando actualización del pedido'],
    'Consultando eventos do pedido…':['Checking order updates…','Consultando el pedido…'],
    'O pedido está sendo preparado e logo sairá para entrega':['Your order is being prepared for delivery','Tu pedido se está preparando para el reparto'],
    'Pedido iFood':['iFood order','Pedido iFood'],
    'Pedido':['Order','Pedido'],
    'Acompanhamento ao vivo':['Live order tracking','Seguimiento en vivo'],
    'Seu pedido · iFood PiP':['Your order · iFood PiP','Tu pedido · iFood PiP'],
    'Mini janela do pedido':['Order mini window','Ventana del pedido'],
    'Fechar mini janela':['Close mini window','Cerrar miniventana'],
    'Abrir acompanhamento do iFood em Picture-in-Picture':['Open iFood order in Picture-in-Picture','Abrir pedido iFood en Picture-in-Picture'],
    'Seu navegador não oferece Document Picture-in-Picture nesta página.':['Your browser does not support Document Picture-in-Picture here.','Tu navegador no admite Document Picture-in-Picture aquí.'],
    'Não foi possível abrir a mini janela. Clique novamente no botão.':['Could not open the mini window. Click the button again.','No se pudo abrir la ventana. Pulsa el botón otra vez.'],
    'Falha ao abrir a janela PiP.':['Could not open the PiP window.','No se pudo abrir la ventana PiP.'],
    'Resposta inesperada de eventos do iFood.':['Unexpected order response from iFood.','Respuesta inesperada de iFood.'],
    'Aguardando a primeira requisição do iFood. Recarregue a página se necessário.':['Waiting for iFood data. Reload the page if needed.','Esperando datos de iFood. Recarga la página si es necesario.'],
    'Não foi possível atualizar agora. Aguardando o iFood.':['Could not refresh. Waiting for iFood.','No se pudo actualizar. Esperando a iFood.'],
    'Bom apetite!':['Enjoy your meal!','¡Buen provecho!'],
    'Seu pedido foi entregue.':['Your order has been delivered.','Tu pedido ha sido entregado.'],
    'Concluído':['Completed','Completado'],
    'Veja os detalhes na página do pedido.':['See details on the order page.','Consulta los detalles en la página del pedido.'],
    'Encerrado':['Closed','Finalizado'],
    'Chegou por aí!':['Your courier is here!','¡Tu repartidor llegó!'],
    'Prepare-se para receber seu pedido.':['Get ready to receive your order.','Prepárate para recibir tu pedido.'],
    'Entregador no destino':['Courier at your address','Repartidor en tu dirección'],
    'Pedido atrasado':['Order delayed','Pedido retrasado'],
    'O horário previsto já passou':['The expected time has passed','La hora prevista ya pasó'],
    'Aguardando nova previsão do iFood':['Waiting for an updated iFood estimate','Esperando nueva previsión de iFood'],
    'Previsão de entrega':['Delivery window','Horario de entrega'],
    'Previsão de entrega · amanhã':['Delivery window · tomorrow','Horario de entrega · mañana'],
    'Acompanhando pedido':['Tracking your order','Siguiendo tu pedido'],
    'A previsão aparece quando o iFood informar.':['The estimate appears when iFood provides it.','La previsión aparecerá cuando iFood la indique.'],
    'Sem dados suficientes para estimar':['Not enough data for an estimate','Faltan datos para estimar'],
    'Em rota de entrega':['Out for delivery','En reparto'],
    'distância loja → destino':['store-to-address distance','distancia tienda → destino'],
    'veículo':['vehicle','vehículo'],
    'horário de saída':['departure time','hora de salida'],
    'Sem dados suficientes para estimar o trajeto':['Not enough trip data for an estimate','Faltan datos para estimar el trayecto'],
    'Tempo estimado de trajeto ultrapassado':['Estimated trip time exceeded','Tiempo estimado de trayecto superado'],
    'Estimativa local por percurso e veículo':['Local route and vehicle estimate','Estimación local por trayecto y vehículo'],
    'Estimativa local · distância geográfica × 1,3':['Local estimate · geographic distance × 1.3','Estimación local · distancia geográfica × 1,3'],
    'Estimativa local · distância do percurso':['Local estimate · route distance','Estimación local · distancia del trayecto'],
    'Andamento do pedido':['Order status','Estado del pedido'],
    'Etapas do pedido':['Order progress','Progreso del pedido'],
    'Confirmado':['Confirmed','Confirmado'],
    'Preparando':['Preparing','Preparando'],
    'A caminho':['On the way','En camino'],
    'Entregue':['Delivered','Entregado'],
    'Entrega encerrada':['Delivery completed','Entrega finalizada'],
    'Indo ao restaurante':['Heading to the restaurant','Hacia el restaurante'],
    'No restaurante':['At the restaurant','En el restaurante'],
    'Responsável pela sua entrega':['Delivering your order','Llevando tu pedido'],
    'Entregador':['Courier','Repartidor'],
    'Moto':['Motorbike','Moto'],
    'Bicicleta':['Bicycle','Bicicleta'],
    'Carro':['Car','Coche'],
    'Código de entrega':['Delivery code','Código de entrega'],
    'Informe ao receber o pedido':['Share when receiving your order','Indícalo al recibir tu pedido'],
    'Atualizar':['Refresh','Actualizar'],
    'Ver pedido':['View order','Ver pedido'],
    'Consultar eventos agora':['Check for updates now','Consultar actualizaciones ahora'],
    'Esperando o iFood':['Waiting for iFood','Esperando a iFood'],
    'Logo do restaurante':['Restaurant logo','Logo del restaurante'],
    'Foto do entregador':['Courier photo','Foto del repartidor'],
    'Idioma':['Language','Idioma']
  };
  const TEXT_FOLDED = Object.fromEntries(Object.entries(TEXT).map(([key,value])=>[key.toLowerCase(),value]));

  function tx(value) {
    if (!value || language==='pt') return value;
    const text=String(value), index=language==='es'?1:0;
    const fixed=TEXT[text] || TEXT_FOLDED[text.toLowerCase()];
    if (fixed) return fixed[index];
    const choose=(en,es)=>language==='es'?es:en;
    let match;
    if ((match=text.match(/^Chega em ~(\d+) min$/))) return choose(`Arrives in ~${match[1]} min`,`Llega en ~${match[1]} min`);
    if ((match=text.match(/^Há (\d+) min de atraso$/))) return choose(`${match[1]} min late`,`${match[1]} min de retraso`);
    if ((match=text.match(/^Há (\d+) min além da estimativa$/))) return choose(`${match[1]} min past the estimate`,`${match[1]} min sobre la estimación`);
    if ((match=text.match(/^Até (.+)$/))) return choose(`By ${match[1]}`,`Hasta ${match[1]}`);
    if ((match=text.match(/^Aguardando (.+)$/))) return choose('Waiting for ','Esperando ')+match[1].split(', ').map(tx).join(', ');
    if ((match=text.match(/^(~?)([\d.,]+) km · (Moto|Bicicleta|Carro) · saiu às (.+)$/))) {
      const distance=Number(match[2].replace(',','.')).toLocaleString(language==='es'?'es-ES':'en-US',{maximumFractionDigits:1});
      return `${match[1]}${distance} km · ${tx(match[3])} · ${choose('left','salió a las')} ${match[4]}`;
    }
    if ((match=text.match(/^Pedido (#.*|·.*)$/))) return `${tx('Pedido')} ${match[1]}`;
    if ((match=text.match(/^Evento (.+) · consulta (.+)$/))) return choose(`Event ${match[1]} · checked ${match[2]}`,`Evento ${match[1]} · consulta ${match[2]}`);
    if ((match=text.match(/^Atualização não autorizada \((.+)\)\. Aguardando o iFood atualizar\.$/))) return choose(`Update unavailable (${match[1]}). Waiting for iFood.`,`Actualización no disponible (${match[1]}). Esperando a iFood.`);
    return text;
  }

  function statusText(data) {
    const translated=tx(data.label);
    if (language==='pt' || translated!==data.label) return translated;
    return tx(({loading:'Consultando eventos do pedido…',unknown:'Nenhuma etapa conhecida nos eventos',received:'Pedido confirmado',preparing:'Restaurante preparando o pedido',driver:'Entregador indo ao restaurante',atStore:'Pedido pronto para retirada',shipping:'Pedido a caminho de você',arriving:'Entregador chegou ao destino',delivered:'Pedido entregue',cancelled:'Pedido cancelado'})[data.stage] || data.label);
  }

  function changeLanguage(value) {
    if (!['en','pt','es'].includes(value)) return;
    language=value;
    try { window.localStorage.setItem(LANGUAGE_KEY,value); } catch { /* preference storage may be disabled */ }
    previousSignature='';
    syncLaunchButton();
    if (feedback?.dataset.message) feedback.textContent=tx(feedback.dataset.message);
    renderPip();
  }

  const MILESTONES = Object.freeze({
    CREATED:                { rank: 1,  stage: 'received', label: 'Pedido criado' },
    PLACED:                 { rank: 2,  stage: 'received', label: 'Pedido realizado' },
    CONFIRMED:              { rank: 3,  stage: 'received', label: 'Pedido confirmado' },
    PREPARATION_STARTED:    { rank: 4,  stage: 'preparing', label: 'Restaurante preparando o pedido' },
    SEPARATION_STARTED:     { rank: 4,  stage: 'preparing', label: 'Pedido em separação' },
    ASSIGN_DRIVER:          { rank: 4.5,stage: 'driver', label: 'Entregador atribuído' },
    DELIVERY_ACCEPTED:      { rank: 4.5,stage: 'driver', label: 'Entregador aceitou a entrega' },
    GOING_TO_ORIGIN:        { rank: 5,  stage: 'driver', label: 'Entregador indo ao restaurante' },
    DELIVERY_GOING_TO_ORIGIN:{rank: 5,  stage: 'driver', label: 'Entregador indo ao restaurante' },
    ARRIVED_AT_ORIGIN:      { rank: 6,  stage: 'atStore',label: 'Entregador chegou ao restaurante' },
    DELIVERY_ARRIVED_AT_ORIGIN:{ rank: 6,stage: 'atStore',label: 'Entregador chegou ao restaurante' },
    READY_TO_PICKUP:        { rank: 6,  stage: 'atStore',label: 'Pedido pronto para retirada' },
    SEPARATION_ENDED:       { rank: 6,  stage: 'atStore',label: 'Separação concluída' },
    COLLECTED:              { rank: 7,  stage: 'shipping',label: 'Entregador retirou o pedido' },
    DELIVERY_COLLECTED:     { rank: 7,  stage: 'shipping',label: 'Entregador retirou o pedido' },
    DISPATCHED:             { rank: 7,  stage: 'shipping',label: 'Pedido saiu para entrega' },
    GOING_TO_DESTINATION:   { rank: 8,  stage: 'shipping',label: 'Pedido a caminho de você' },
    DELIVERY_GOING_TO_DESTINATION:{rank: 8, stage:'shipping',label: 'Pedido a caminho de você' },
    ARRIVED_AT_DESTINATION:{ rank: 9,  stage: 'arriving',label: 'Entregador chegou ao destino' },
    DELIVERY_ARRIVED_AT_DESTINATION:{ rank: 9,stage:'arriving',label: 'Entregador chegou ao destino' },
    DELIVERED:              { rank: 10, stage: 'delivered',label: 'Pedido entregue' },
    CONCLUDED:              { rank: 10, stage: 'delivered',label: 'Pedido concluído' },
    COMPLETED:              { rank: 10, stage: 'delivered',label: 'Pedido concluído' },
    DELIVERY_COMPLETED:     { rank: 10, stage: 'delivered',label: 'Pedido entregue' },
    ARRIVED:               { rank: 9, stage: 'arriving',label: 'Entregador chegou ao destino' },
    CANCELLED:              { rank: 11, stage: 'cancelled',label: 'Pedido cancelado' },
    ORDER_CANCELLED:        { rank: 11, stage: 'cancelled',label: 'Pedido cancelado' }
  });

  function blankSnapshot() {
    return { stage: 'loading', label: 'Consultando eventos do pedido…',
      driver: '', driverPhoto: '', modal: '', code: '', codeValidated: false,
      etaAt: 0, departedAt: 0, routeDistanceMeters: null, origin: null, destination: null,
      eventTime: '', checkedAt: '', issue: '' };
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
      departedAt: Date.parse(delivery.dispatchedAt || delivery.collectedAt || data.dispatchedAt || '') || 0
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
    return ({MOTORCYCLE:'Moto',MOTORBIKE:'Moto',MOTO:'Moto',MOTOCICLETA:'Moto',BICYCLE:'Bicicleta',BIKE:'Bicicleta',BICICLETA:'Bicicleta',CAR:'Carro',CARRO:'Carro'})[key] || '';
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

  function getOrderId() {
    return ORDER_PATH.exec(location.pathname)?.[1] || null;
  }

  function readOptionalPageInfo() {
    // Identidade, previsão e status visível complementam os eventos HTTP.
    const lines = (document.body?.innerText || '').split(/\n+/)
      .map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const etaIndex = lines.findIndex(s => /previs[aã]o de entrega/i.test(s));
    const etaLine = etaIndex >= 0 ? lines.slice(etaIndex, etaIndex + 5).join(' ') : '';
    const etaMatch = etaLine.match(/(?:Hoje|Amanh[aã]|\w+-feira)?,?\s*\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/i);
    const merchantNode = document.querySelector('[data-testid="merchant-name"], [data-testid="restaurant-name"], .merchant-info__name, .order-details__merchant-name, .order-details-header__merchant-name');
    const merchantLink = [...document.querySelectorAll('a[href*="/delivery/"], a[href*="/restaurantes/"]')]
      .find(a => cleanStore(a.textContent) && !/ver|voltar|início|restaurantes/i.test(a.textContent));
    // The live iFood page uses generated class names. Anchor the identity to
    // the order-number label: its preceding sibling is the merchant name.
    const orderNumberNode = [...document.querySelectorAll('span,p,small,strong')]
      .find(el => !el.children.length && /^Pedido\s*(?:N\s*[º°o.]?|#)\s*\d+$/i.test(el.textContent.trim()));
    const orderHeader = orderNumberNode?.parentElement?.parentElement;
    const identityName = orderNumberNode?.previousElementSibling?.textContent || '';
    const store = cleanStore(merchantNode?.textContent || '') || cleanStore(identityName) || orderDetails.store || cleanStore(merchantLink?.textContent || '');
    const merchantImage = document.querySelector('[data-testid="merchant-logo"], [data-testid="restaurant-logo"], .merchant-info img, .order-details__merchant img');
    // An exact alt/name match is safer than taking the first image (often the driver).
    const image = merchantImage || (store ? [...document.querySelectorAll('img[alt], [role="img"][alt]')]
      .find(img => img.getAttribute('alt')?.trim() === store) : null) ||
      orderHeader?.querySelector('img, [role="img"][src]');
    const storePhoto = safeImage(image?.currentSrc || image?.src || image?.getAttribute('src')) || orderDetails.storePhoto || '';
    const number = lines.join(' ').match(/Pedido\s*(?:N\s*[º°o.]?|#)\s*(\d{2,})/i)?.[1] || '';
    const codeText = lines.join(' ').match(/c[oó]digo (?:de|da) entrega\s*[:–-]?\s*(\d{4,6})\b/i)?.[1] || '';
    const routeNode = document.querySelector('[data-route-distance-meters], [data-testid="delivery-distance"], [data-testid="route-distance"]');
    const routeAttr = routeNode?.getAttribute('data-route-distance-meters');
    const routeText = routeNode?.textContent?.match(/(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
    const routeDistanceMeters = finiteDistance(routeAttr ? Number(routeAttr) : routeText ? Number(routeText[1].replace(',','.')) * (routeText[2].toLowerCase()==='km' ? 1000 : 1) : null);
    return { store, storePhoto, number, code: codeText, routeDistanceMeters, pageStatus: readPageStatus(lines.join('\n')), eta: etaMatch ? etaMatch[0].replace(/\s*[-—]\s*/g, ' – ') : '' };
  }

  function readPageStatus(text) {
    // Explicit current-status phrases only. "Logo sairá" must never mean dispatched.
    const statuses = [
      ['cancelled', /(?:Seu |O )?pedido (?:foi |est[aá] )?cancelado/i],
      ['delivered', /(?:Seu |O )?pedido (?:foi )?entregue/i],
      ['arriving', /(?:O )?entregador chegou (?:ao seu endere[çc]o|ao destino)/i],
      ['shipping', /(?:Seu |O )?pedido (?:saiu para entrega|est[aá] a caminho)/i],
      ['preparing', /(?:O |Seu )?pedido (?:est[aá] sendo preparado(?: e logo sair[aá] para entrega)?|est[aá] em prepara[çc][aã]o|em preparo)/i]
    ];
    for (const [stage, pattern] of statuses) {
      const match = text.match(pattern);
      if (match) return { stage, label: match[0] };
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
    let driverPhoto = '', code = '', codeValidated = false, etaAt = 0, driverPhase = '', driverRank = 0;
    let routeDistanceMeters = null, origin = null, destination = null, departedAt = 0, collectedAt = 0;
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
      if (mapping && mapping.rank > driverRank && /^(ASSIGN_DRIVER|DELIVERY_ACCEPTED|(?:DELIVERY_)?(?:GOING_TO_ORIGIN|ARRIVED_AT_ORIGIN|COLLECTED|GOING_TO_DESTINATION|ARRIVED_AT_DESTINATION)|DISPATCHED)$/.test(value)) { driverPhase = mapping.stage; driverRank = mapping.rank; }
      if (!mapping) continue; // Ignora NUPAY, CHAT, HANDSHAKE_CODE, outros metadados internos.
      const timestamp = Date.parse(item.timestamp || item.processedAt || '') || 0;
      if (timestamp > 0 && /^(DISPATCHED|(?:DELIVERY_)?GOING_TO_DESTINATION)$/.test(value)) departedAt = departedAt ? Math.min(departedAt,timestamp) : timestamp;
      else if (timestamp > 0 && /^(?:DELIVERY_)?COLLECTED$/.test(value)) collectedAt = collectedAt ? Math.min(collectedAt,timestamp) : timestamp;
      const candidate = { ...mapping, time: timestamp, index };
      // Nunca regride para uma etapa anterior por causa de eventos auxiliares/tardios.
      if (!best || candidate.rank > best.rank ||
          (candidate.rank === best.rank && (candidate.time > best.time ||
            (candidate.time === best.time && candidate.index > best.index)))) {
        best = candidate;
      }
    }
    const eventTime = best?.time ? new Date(best.time).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '';
    const waitingForDriver = best?.stage === 'atStore' && driverPhase === 'driver';
    return {
      stage: waitingForDriver ? 'driver' : best?.stage || 'unknown',
      label: waitingForDriver ? 'Pedido pronto · entregador indo à loja' : best?.label || 'Nenhuma etapa conhecida nos eventos',
      driver: name, driverPhase, driverPhoto, modal, code, codeValidated, etaAt, departedAt:departedAt || collectedAt, routeDistanceMeters, origin, destination, eventTime,
      checkedAt: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}),
      issue: ''
    };
  }

  // Executado em document_start, no MAIN world: intercepta as requisições do
  // frontend antes que ele inicie, sem precisar conhecer os nomes dos headers.
  // Os headers não são serializados nem enviados a outro contexto/processo.
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
      orderDetails = { ...(orderDetails.orderId===id ? orderDetails : {}), ...details, orderId: id };
      renderPip();
    }

    function recordEvents(json, orderId, fromPage = true) {
      try {
        const summary = summarizeEvents(json, orderId);
        if (orderId !== getOrderId()) return;
        capturedSummary = { orderId, summary };
        if (fromPage) lastPageUpdateAt = Date.now();
        if (pip && !pip.closed && activeOrderId === orderId) {
          snapshot = summary;
          renderPip();
          if (fromPage) queueNextPoll();
        }
      } catch (error) {
        // Respostas inesperadas não afetam o funcionamento normal do site.
        if (pip && !pip.closed) {
          snapshot.issue = 'Resposta inesperada de eventos do iFood.';
          renderPip();
        }
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
        replay = {
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
      const state = xhrInfo.get(this);
      if (state) state.headers.push([String(name), String(value)]);
      return Reflect.apply(nativeSetHeader, this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      const state = xhrInfo.get(this);
      if (state) {
        const xhr = this;
        const credentials = xhr.withCredentials ? 'include' : 'same-origin';
        const headers = state.headers.slice();
        if (state.orderId) replay = {
          orderId: state.orderId,
          call: (contextWindow) => Reflect.apply(contextWindow.fetch, contextWindow, [state.url, {
            method: 'GET', cache: 'no-store', credentials, headers: new Headers(headers)
          }])
        };
        xhr.addEventListener('load', () => {
          if (xhr.status < 200 || xhr.status >= 300) return;
          try {
            const data = xhr.responseType === 'json' ? xhr.response : JSON.parse(xhr.responseText);
            if (state.orderId) recordEvents(data, state.orderId);
            else recordDetails(data, state.detailId);
          } catch { /* o site continua funcionando normalmente */ }
        }, { once: true });
      }
      return Reflect.apply(nativeSend, this, arguments);
    };

    return async function refreshFromCapturedRequest(orderId) {
      if (!replay || replay.orderId !== orderId) return { ok: false, reason: 'waiting' };
      // Fetch parte do próprio documento PiP visível, não da aba em segundo plano.
      const response = await replay.call(pip);
      if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
      const data = await response.json();
      recordEvents(data, orderId, false);
      return { ok: true };
    };
  }

  const refreshCaptured = installTrafficObservation();

  function mountLaunchButton() {
    if (host || !document.body) return;
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:2147483647;';
    const shadow = host.attachShadow({ mode:'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host {font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
      .widget {display:flex;flex-direction:column;align-items:flex-end;gap:7px;}
      button {appearance:none;border:0;border-radius:999px;padding:13px 18px;display:flex;align-items:center;
        gap:9px;background:#ea1d2c;color:white;font:700 13px/1.1 system-ui,sans-serif;
        box-shadow:0 7px 26px rgba(22,29,42,.24);cursor:pointer;transition:transform .15s,background .15s;}
      button:hover {background:#cf1524;transform:translateY(-2px);}
      button:focus-visible {outline:3px solid #172b4d;outline-offset:3px;}
      button.is-open {background:#242b3b;}
      .feedback {max-width:280px;display:none;background:#18212d;color:#fff;font-size:12px;
        line-height:1.4;padding:9px 12px;border-radius:9px;box-shadow:0 8px 20px #1113;}
      .feedback:not(:empty) {display:block;}
    `;
    shadow.append(style);
    const widget = document.createElement('div');
    widget.className = 'widget';
    feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.setAttribute('role','status');
    launchButton = document.createElement('button');
    launchButton.type = 'button';
    launchButton.title = tx('Abrir acompanhamento do iFood em Picture-in-Picture');
    launchButton.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="15" rx="3"/><rect x="11" y="11" width="8" height="6" rx="1" fill="currentColor" stroke="none"/></svg><span>Mini janela do pedido</span>`;
    launchButton.addEventListener('click', openOrClosePip);
    widget.append(feedback,launchButton);
    shadow.append(widget);
    document.body.append(host);
  }

  function setFeedback(message) {
    if (!feedback) return;
    feedback.dataset.message = message;
    feedback.textContent = tx(message);
    if (message) setTimeout(() => {
      if (feedback?.dataset.message === message) { feedback.textContent = ''; delete feedback.dataset.message; }
    }, 6000);
  }

  function syncLaunchButton() {
    if (!launchButton) return;
    const opened = Boolean(pip && !pip.closed);
    launchButton.classList.toggle('is-open',opened);
    const text = tx(opened ? 'Fechar mini janela' : 'Mini janela do pedido');
    launchButton.title = tx('Abrir acompanhamento do iFood em Picture-in-Picture');
    const span = launchButton.querySelector('span');
    if (span.textContent !== text) span.textContent = text;
  }

  function stopPolling() {
    if (pollTimer && pip && !pip.closed) pip.clearTimeout(pollTimer);
    pollTimer = null;
  }

  function queueNextPoll(delay = POLL_INTERVAL) {
    stopPolling();
    // O relógio vive no documento PiP, que permanece visível com a aba em segundo plano.
    if (pip && !pip.closed && getOrderId()) {
      pollTimer = pip.setTimeout(() => { pollTimer = null; pollEvents(); }, delay);
    }
  }

  async function pollEvents(force = false) {
    if (!pip || pip.closed || pollInFlight) return;
    stopPolling();
    const orderId = getOrderId();
    if (!orderId) return;
    // Não duplica consultas enquanto o próprio site já está atualizando.
    if (!force && Date.now() - lastPageUpdateAt < POLL_INTERVAL * .85) {
      queueNextPoll();
      return;
    }
    pollInFlight = true;
    renderPip();
    let retryAfter = POLL_INTERVAL;
    try {
      const result = await refreshCaptured(orderId);
      if (!pip || pip.closed || getOrderId() !== orderId) return;
      if (!result.ok) {
        snapshot.issue = result.reason === 'waiting'
          ? 'Aguardando a primeira requisição do iFood. Recarregue a página se necessário.'
          : `Atualização não autorizada (${result.reason}). Aguardando o iFood atualizar.`;
        if (result.reason === 'HTTP 429') retryAfter = 60000;
      } else {
        snapshot.issue = '';
      }
      renderPip();
    } catch {
      if (pip && !pip.closed) {
        snapshot.issue = 'Não foi possível atualizar agora. Aguardando o iFood.';
        renderPip();
      }
    } finally {
      pollInFlight = false;
      renderPip();
      queueNextPoll(retryAfter);
    }
  }

  async function openOrClosePip() {
    if (pip && !pip.closed) {
      pip.close();
      return;
    }
    if (!getOrderId()) return;
    if (!window.documentPictureInPicture) {
      setFeedback('Seu navegador não oferece Document Picture-in-Picture nesta página.');
      return;
    }
    try {
      // Abrir ANTES de fazer fetch/await para preservar o gesto do clique.
      const opened = await window.documentPictureInPicture.requestWindow({
        width:350, height:310, disallowReturnToOpener:true
      });
      pip = opened;
      activeOrderId = getOrderId();
      snapshot = capturedSummary?.orderId === activeOrderId ? capturedSummary.summary : blankSnapshot();
      previousSignature = '';
      buildPipDocument(opened);
      opened.addEventListener('pagehide',() => {
        opened.clearInterval(clockTimer);
        clockTimer = null;
        if (pip === opened) {pip = null; stopPolling();}
        syncLaunchButton();
      },{once:true});
      renderPip();
      clockTimer = opened.setInterval(renderPip, 10000);
      syncLaunchButton();
      queueNextPoll(POLL_INTERVAL);
    } catch (error) {
      setFeedback(error?.name === 'NotAllowedError'
        ? 'Não foi possível abrir a mini janela. Clique novamente no botão.'
        : 'Falha ao abrir a janela PiP.');
      console.warn('[iFood PiP] Erro ao abrir PiP:',error?.name || error);
    }
  }


  function estimateArrival(data, extras, now = Date.now()) {
    if (data.stage === 'delivered') return { title: 'Bom apetite!', detail: 'Seu pedido foi entregue.', source: 'Concluído' };
    if (data.stage === 'cancelled') return { title: 'Pedido cancelado', detail: 'Veja os detalhes na página do pedido.', source: 'Encerrado' };
    if (data.stage === 'arriving') return { title: 'Chegou por aí!', detail: 'Prepare-se para receber seu pedido.', source: 'Entregador no destino' };
    if (data.stage === 'shipping') return routeArrival(data,extras,now);
    let arrival = data.etaAt;
    if (!arrival && extras.eta) {
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
      const minutes = Math.ceil((arrival - now) / 60000);
      if (minutes <= 0) {
        const late = Math.max(0, Math.floor((now - arrival) / 60000));
        return { title: 'Pedido atrasado', detail: late ? `Há ${late} min de atraso` : 'O horário previsto já passou', source: 'Aguardando nova previsão do iFood', late: true };
      }
      const window = extras.eta?.replace(/^(?:Hoje|Amanh[aã]|\w+-feira),?\s*/i, '') ||
        `Até ${new Date(arrival).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
      return { title: window, detail: /amanh[aã]/i.test(extras.eta || '') ? 'Previsão de entrega · amanhã' : 'Previsão de entrega', source: '', preDispatch: true };
    }
    return { title: 'Acompanhando pedido', detail: 'A previsão aparece quando o iFood informar.', source: 'Sem dados suficientes para estimar' };
  }

  function routeArrival(data, extras, now) {
    const explicitMeters = [data.routeDistanceMeters,orderDetails.routeDistanceMeters,extras.routeDistanceMeters]
      .map(finiteDistance).find(value=>value!==null) ?? null;
    const meters = explicitMeters ?? geographicRouteMeters(data.origin || orderDetails.origin, data.destination || orderDetails.destination);
    const departedAt = data.departedAt || orderDetails.departedAt;
    const modal = data.modal || orderDetails.modal || '';
    const speed = { Moto:22, Bicicleta:12, Carro:18 }[modal];
    const missing = [];
    if (meters === null) missing.push('distância loja → destino');
    if (!speed) missing.push('veículo');
    if (!departedAt || departedAt > now) missing.push('horário de saída');
    if (missing.length) return { title:'Em rota de entrega', detail:`Aguardando ${missing.join(', ')}`, source:'Sem dados suficientes para estimar o trajeto' };
    // Fixed arrival anchored to departure. Polling/reopening must not restart the trip.
    const tripMinutes = meters / 1000 / speed * 60 + 2;
    const arrival = departedAt + tripMinutes * 60000;
    const remaining = Math.ceil((arrival-now)/60000);
    if (remaining <= 0) {
      const late = Math.max(0,Math.floor((now-arrival)/60000));
      return { title:'Pedido atrasado', detail:late ? `Há ${late} min além da estimativa` : 'Tempo estimado de trajeto ultrapassado', source:'Estimativa local por percurso e veículo', late:true };
    }
    const distance = (meters/1000).toLocaleString('pt-BR',{maximumFractionDigits:1});
    const time = new Date(departedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    return { title:`Chega em ~${remaining} min`, detail:`${explicitMeters===null?'~':''}${distance} km · ${modal} · saiu às ${time}`, source:explicitMeters===null?'Estimativa local · distância geográfica × 1,3':'Estimativa local · distância do percurso' };
  }

  const ICONS = {
    store: '<path d="M3 10h18l-2-6H5l-2 6Zm1 0v10h16V10M9 20v-6h6v6M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0"/>',
    bike: '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="m5 17 5-9 5 9H5m9-13h3l2 10M8 5h4"/>',
    bag: '<path d="M5 7h14l1 14H4L5 7Zm4 0V5a3 3 0 0 1 6 0v2"/>',
    home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
    arrow: '<path d="M7 17 17 7H7m10 0v10"/>',
    key: '<circle cx="8" cy="9" r="4"/><path d="m11 12 9 9m-3-3 3-3m-6 0 3-3"/>'
  };
  function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.bag}</svg>`; }

  function buildPipDocument(win) {
    const doc = win.document;
    doc.title = tx('Seu pedido · iFood PiP');
    const style = doc.createElement('style');
    style.textContent = `

      :root{color-scheme:light;font:14px/1.4 Arial,Helvetica,sans-serif;color:#3e3e3e;background:#f5f5f5;--red:#ea1d2c}
      *{box-sizing:border-box}body{margin:0;min-width:260px;overflow:hidden}button{font:inherit;cursor:pointer}button:focus-visible,select:focus-visible{outline:2px solid var(--red);outline-offset:3px}svg{width:20px;height:20px;flex:none}[hidden]{display:none!important}
      .shell{margin:3px;padding:9px;min-height:calc(100dvh - 6px);background:#fff;border:1px solid #ebebeb;border-radius:9px;display:flex;flex-direction:column;gap:7px}
      .merchant{display:flex;align-items:center;gap:8px}.merchant>div:nth-child(2){min-width:0;flex:1}.merchant strong{display:block;max-width:235px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600}
      .avatar{width:28px;height:28px;border-radius:4px;background:#f5f5f5;display:grid;place-items:center;overflow:hidden;flex:none;color:#8a8a8a}.avatar img{width:100%;height:100%;object-fit:cover}.micro{font-size:9px;color:#717171;margin-top:1px}.ifood-mark{width:25px;height:25px;color:var(--red);margin-left:5px}
      .hero{position:relative;padding-left:22px}.eta-clock{position:absolute;left:0;top:4px;color:var(--red)}.eta-clock svg{width:15px;height:15px}.eta{font-size:24px;line-height:1.1;font-weight:700;letter-spacing:-.5px;margin:0 0 3px}.eta-detail{font-size:11px;color:#717171}.eta-source{font-size:8px;line-height:1.2;color:#8d8d8d;margin-top:2px}
      .journey{padding:8px;background:#fafafa;border:1px solid #f0f0f0;border-radius:9px}.status-head{display:flex;align-items:center;gap:6px;margin-bottom:7px}.status-symbol{display:grid;place-items:center;width:22px;height:22px;border-radius:5px;background:#fff0f1;color:var(--red);flex:none}.status-symbol svg{width:15px;height:15px}.status-head h1{font-size:11px;font-weight:600;line-height:1.3;margin:0}
      .segments{display:flex;gap:4px}.segment{height:4px;border-radius:2px;background:#f2f2f2;flex:1;position:relative;overflow:hidden}.segment.done{background:#50a773}.segment.active:before{content:'';position:absolute;inset:0;border-radius:inherit;background:#50a773;transform-origin:left center;animation:stage-fill 2s linear infinite}
      .steps{display:flex;justify-content:space-between;margin-top:4px;font-size:8px;color:#a6a6a6}.steps span{flex:1;text-align:center}.steps .current{color:#3e3e3e;font-weight:700}.steps .done{color:#717171}
      .driver{display:flex;align-items:center;gap:7px}.driver .avatar{width:27px;height:27px;border-radius:50%}.driver strong{font-size:11px;font-weight:600;display:block}.vehicle{display:flex;align-items:center;gap:3px;margin-left:auto;font-size:9px;color:#717171}.vehicle svg{width:13px;height:13px}
      .code{padding:7px 0;border-top:1px solid #f2f2f2;border-bottom:1px solid #f2f2f2;display:flex;align-items:center;justify-content:space-between;gap:8px}.code-label{display:flex;gap:4px;align-items:center;font-size:10px;font-weight:600}.code-label svg{width:12px;height:12px;color:var(--red)}.code small{display:block;font-size:8px;color:#717171;margin-top:1px}.digits{display:flex;gap:4px}.digit{display:grid;place-items:center;width:22px;height:25px;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;background:#f5f5f5;border-radius:3px}
      .notice{font-size:9px;line-height:1.4;color:#9b662c;background:#fff0d9;padding:5px 6px;border-radius:3px}.footer{display:flex;align-items:center;justify-content:space-between;min-height:21px;gap:4px}.updated{font-size:7px;color:#8d8d8d}.actions{display:flex;gap:5px}.action{display:flex;align-items:center;gap:3px;padding:3px 0 3px 3px;border:0;background:none;color:var(--red);font-size:8px}.action svg{width:12px;height:12px}.action:hover{background:#fff5f5}.action:disabled{opacity:.5;cursor:wait}.refreshing svg{animation:spin 1s linear infinite}
      .cancelled .segment.done{background:#a6a6a6}.has-issue .shell{gap:3px;padding:9px}
      .late .eta,.late .eta-clock{color:#ad6400}.late .segment.active:before{background:#d59118}
      .pre-dispatch .eta{font-size:28px;letter-spacing:-.7px}.eta-source:empty{display:none}
      .footer{margin-top:auto}.merchant strong{max-width:100%}
      .footer-meta{display:flex;align-items:center;gap:4px;min-width:0}.language{width:38px;flex:none;border:0;border-radius:3px;padding:2px 0;background:transparent;color:#717171;font:9px Arial,sans-serif;cursor:pointer}.language:hover{background:#f5f5f5}.language option{color:#3e3e3e;background:white}.updated{min-width:0}
      @keyframes stage-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes spin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){*,*:before{animation:none!important;transition:none!important}}
      @media(max-height:320px){.shell{padding:8px;gap:6px}.has-issue .shell{padding:8px;gap:3px}}
      @media(max-height:280px){.shell{padding:8px;gap:5px}.eta{font-size:23px}.eta-detail{font-size:10px;line-height:1.2}.eta-source{font-size:7px}.merchant .avatar,.driver .avatar{height:24px;width:24px}.merchant strong,.driver strong,.micro{line-height:1.2}.code{padding:5px 0}.code-label{line-height:1.1}.code small{line-height:1.15}.digit{height:23px}.journey{padding:6px}.status-head{margin-bottom:5px}.footer{min-height:18px}}
      @media(max-width:300px){.shell{padding:8px;gap:6px}.eta{font-size:22px}.updated{max-width:105px;font-size:7px}.action{font-size:8px}.merchant strong{max-width:185px}.digit{width:20px}}
    `;
    doc.head.append(style);
    doc.body.innerHTML = `<main class="shell">
      <section class="merchant"><div class="avatar" id="store-avatar">${icon('store')}</div><div><strong id="restaurant">Pedido iFood</strong><div class="micro" id="order-number">Acompanhamento ao vivo</div></div><svg class="ifood-mark" role="img" aria-label="iFood" viewBox="0 0 24 24" fill="currentColor"><title>iFood</title><path d="M8.428 1.67c-4.65 0-7.184 4.149-7.184 6.998 0 2.294 2.2 3.299 4.25 3.299l-.006-.006c4.244 0 7.184-3.854 7.184-6.998 0-2.29-2.175-3.293-4.244-3.293zm11.328 0c-4.65 0-7.184 4.149-7.184 6.998 0 2.294 2.2 3.299 4.25 3.299l-.006-.006C21.061 11.96 24 8.107 24 4.963c0-2.29-2.18-3.293-4.244-3.293zM14.172 14.52l2.435 1.834c-2.17 2.07-6.124 3.525-9.353 3.17A8.913 8.913 0 01.23 14.541H0a9.598 9.598 0 008.828 7.758c3.814.24 7.323-.905 9.947-3.13l-.004.007 1.08 2.988 1.555-7.623-7.234-.02Z"/></svg></section>
      <section class="hero" aria-label="Previsão de entrega"><span class="eta-clock">${icon('clock')}</span><div class="eta" id="eta">Acompanhando pedido</div><div class="eta-detail" id="eta-detail"></div><div class="eta-source" id="eta-source"></div></section>
      <section class="journey" aria-label="Andamento do pedido"><div class="status-head"><div class="status-symbol" id="status-symbol">${icon('bag')}</div><div><h1 id="status" role="status" aria-live="polite"></h1></div></div>
        <div class="segments" role="progressbar" aria-label="Etapas do pedido" aria-valuemin="0" aria-valuemax="4" id="progress">${[0,1,2,3].map(n=>`<div class="segment" id="segment-${n}"></div>`).join('')}</div>
        <div class="steps">${['Confirmado','Preparando','A caminho','Entregue'].map((s,n)=>`<span id="step-${n}" data-i18n="${s}">${tx(s)}</span>`).join('')}</div>
      </section>
      <section class="driver" id="driver-card" hidden><div class="avatar" id="driver-avatar"></div><div><strong id="driver-name"></strong><div class="micro" id="driver-state"></div></div><span class="vehicle">${icon('bike')}<span id="vehicle"></span></span></section>
      <section class="code" id="code-card" hidden><div><div class="code-label">${icon('key')} <span data-i18n="Código de entrega">${tx('Código de entrega')}</span></div><small data-i18n="Informe ao receber o pedido">${tx('Informe ao receber o pedido')}</small></div><div class="digits" id="code"></div></section>
      <div class="notice" id="note" role="status" hidden></div>
      <footer class="footer"><div class="footer-meta"><select class="language" id="language" aria-label="Language" title="Language"><option value="en" title="English">EN</option><option value="pt" title="Português">PT</option><option value="es" title="Español">ES</option></select><span class="updated" id="updated"></span></div><div class="actions"><button class="action" id="refresh" type="button" title="${tx('Consultar eventos agora')}">${icon('refresh')} <span data-i18n="Atualizar">${tx('Atualizar')}</span></button><button class="action" id="back" type="button"><span data-i18n="Ver pedido">${tx('Ver pedido')}</span> ${icon('arrow')}</button></div></footer>
    </main>`;
    doc.getElementById('back').addEventListener('click', () => window.focus());
    doc.getElementById('refresh').addEventListener('click', () => pollEvents(true));
    doc.getElementById('language').value=language;
    doc.getElementById('language').addEventListener('change',event=>changeLanguage(event.target.value));
  }

  function setAvatar(doc, id, url, fallbackIcon) {
    const el = doc.getElementById(id), safe = safeImage(url);
    const alt=tx(id === 'store-avatar' ? 'Logo do restaurante' : 'Foto do entregador');
    if (el.querySelector('img')) el.querySelector('img').alt=alt;
    if (el.dataset.source === safe) return;
    el.dataset.source = safe;
    el.innerHTML = icon(fallbackIcon);
    if (safe) {
      const img = doc.createElement('img');
      img.alt = alt;
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => { img.remove(); el.insertAdjacentHTML('afterbegin', icon(fallbackIcon)); }, {once:true});
      img.src = safe;
      el.replaceChildren(img);
    }
  }

  function renderPip() {
    if (!pip || pip.closed) return;
    const extras = readOptionalPageInfo(), data = displaySnapshot(snapshot, extras), eta = estimateArrival(data, extras);
    const signature = JSON.stringify({data, extras, eta, activeOrderId, pollInFlight, language});
    if (signature === previousSignature) return;
    previousSignature = signature;
    const doc = pip.document;
    doc.documentElement.lang=({en:'en',pt:'pt-BR',es:'es'})[language];
    doc.title=tx('Seu pedido · iFood PiP');
    doc.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=tx(el.dataset.i18n)});
    doc.getElementById('language').value=language;
    doc.getElementById('language').title=`${tx('Idioma')} · English / Português / Español`;
    doc.getElementById('language').setAttribute('aria-label',tx('Idioma'));
    doc.querySelector('.hero').setAttribute('aria-label',tx('Previsão de entrega'));
    doc.querySelector('.journey').setAttribute('aria-label',tx('Andamento do pedido'));
    doc.getElementById('progress').setAttribute('aria-label',tx('Etapas do pedido'));
    const set = (id,text) => { const el = doc.getElementById(id); if (el && el.textContent !== text) el.textContent = text; };
    const terminal = ['delivered','cancelled'].includes(data.stage);
    if (doc.body.dataset.stage !== data.stage) {
      doc.body.dataset.stage = data.stage;
      if (!pip.matchMedia('(prefers-reduced-motion: reduce)').matches) doc.querySelector('.status-head').animate([{opacity:.3,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:350});
    }
    const index = ({ loading:0, unknown:0, received:0, preparing:1, driver:1, atStore:1, shipping:2, arriving:2, delivered:4, cancelled:0 })[data.stage] ?? 0;
    doc.body.classList.toggle('terminal',terminal);
    doc.body.classList.toggle('late',Boolean(eta.late));
    doc.body.classList.toggle('pre-dispatch',Boolean(eta.preDispatch));
    doc.body.classList.toggle('has-issue',Boolean(data.issue));
    doc.body.classList.toggle('cancelled',data.stage === 'cancelled');
    set('restaurant',extras.store || tx('Pedido iFood'));
    doc.getElementById('restaurant').title=extras.store || tx('Pedido iFood');
    set('order-number',tx(extras.number ? `Pedido #${extras.number}` : `Pedido · ${activeOrderId?.slice(0,8) || '—'}`));
    setAvatar(doc,'store-avatar',extras.storePhoto,'store');
    set('eta',tx(eta.title)); set('eta-detail',tx(eta.detail)); set('eta-source',tx(eta.source));
    set('status',statusText(data));
    doc.getElementById('status-symbol').innerHTML = data.stage === 'cancelled' ? '<span aria-hidden="true">×</span>' : icon(terminal ? 'check' : ['shipping','arriving','driver'].includes(data.stage) ? 'bike' : 'bag');
    for (let n=0;n<4;n++) {
      doc.getElementById(`segment-${n}`).className = `segment${n<index ? ' done' : n===index && !terminal ? ' active' : ''}`;
      doc.getElementById(`step-${n}`).className = n<index ? 'done' : n===index && !terminal ? 'current' : '';
    }
    const progress = doc.getElementById('progress');
    progress.setAttribute('aria-valuenow',String(index)); progress.setAttribute('aria-valuetext',statusText(data));
    const driver = data.driver || orderDetails.driver;
    doc.getElementById('driver-card').hidden = !driver;
    const driverStage = data.driverPhase || data.stage;
    set('driver-name',driver || ''); set('driver-state',tx(terminal ? 'Entrega encerrada' : driverStage==='driver' ? 'Indo ao restaurante' : driverStage==='atStore' ? 'No restaurante' : ['shipping','arriving'].includes(data.stage) ? 'Responsável pela sua entrega' : 'Entregador atribuído'));
    set('vehicle',tx(data.modal || orderDetails.modal || 'Entregador')); setAvatar(doc,'driver-avatar',data.driverPhoto || orderDetails.driverPhoto,'bike');
    const code = data.code || extras.code;
    doc.getElementById('code-card').hidden = !code || data.codeValidated || terminal;
    const digits = doc.getElementById('code');
    if (digits.dataset.code !== code) {
      digits.dataset.code = code; digits.replaceChildren();
      for (const digit of code) { const span=doc.createElement('span'); span.className='digit'; span.textContent=digit; digits.append(span); }
    }
    set('note',tx(data.issue || '')); doc.getElementById('note').hidden = !data.issue;
    set('updated',tx(data.checkedAt ? `Evento ${data.eventTime || '—'} · consulta ${data.checkedAt}` : 'Esperando o iFood'));
    doc.getElementById('refresh').title=tx('Consultar eventos agora');
    const refresh = doc.getElementById('refresh'); refresh.disabled=pollInFlight; refresh.classList.toggle('refreshing',pollInFlight);
  }

  function scheduleDomRefresh() {
    if (domTimer) return;
    domTimer = setTimeout(() => {domTimer = null; checkNavigation(); renderPip();}, 400);
  }

  function checkNavigation() {
    const orderId = getOrderId();
    if (orderDetails.orderId && orderDetails.orderId !== orderId) orderDetails = {};
    if (!orderId) {
      if (host) host.hidden = true;
      if (pip && !pip.closed) pip.close();
      stopPolling();
      return;
    }
    if (!host || !host.isConnected) {
      host = null;
      mountLaunchButton();
    }
    if (host.hidden) host.hidden = false;
    if (pip && !pip.closed && activeOrderId !== orderId) {
      stopPolling();
      activeOrderId = orderId;
      snapshot = capturedSummary?.orderId === orderId ? capturedSummary.summary : blankSnapshot();
      previousSignature = '';
      renderPip();
      queueNextPoll(0);
    }
    syncLaunchButton();
  }

  function initUi() {
    checkNavigation();
    const observer = new MutationObserver(() => {
      // Reflete também avanços no status visível que ainda não chegaram em /events.
      if (pip && !pip.closed) scheduleDomRefresh();
      else checkNavigation();
    });
    observer.observe(document.documentElement, {childList:true, characterData:true,subtree:true});
    window.addEventListener('pagehide',stopPolling);
    setInterval(checkNavigation,3000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',initUi,{once:true});
  } else initUi();
})();
