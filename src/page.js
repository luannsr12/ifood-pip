const {cleanStore,safeImage,finiteDistance,readPageStatus} = require('./order');
module.exports = function createPageReader(state) {
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
    const store = cleanStore(merchantNode?.textContent || '') || cleanStore(identityName) || state.orderDetails.store || cleanStore(merchantLink?.textContent || '');
    const merchantImage = document.querySelector('[data-testid="merchant-logo"], [data-testid="restaurant-logo"], .merchant-info img, .order-details__merchant img');
    // An exact alt/name match is safer than taking the first image (often the driver).
    const image = merchantImage || (store ? [...document.querySelectorAll('img[alt], [role="img"][alt]')]
      .find(img => img.getAttribute('alt')?.trim() === store) : null) ||
      orderHeader?.querySelector('img, [role="img"][src]');
    const storePhoto = safeImage(image?.currentSrc || image?.src || image?.getAttribute('src')) || state.orderDetails.storePhoto || '';
    const number = lines.join(' ').match(/Pedido\s*(?:N\s*[º°o.]?|#)\s*(\d{2,})/i)?.[1] || '';
    const codeText = lines.join(' ').match(/c[oó]digo (?:de|da) entrega\s*[:–-]?\s*(\d{4,6})\b/i)?.[1] || '';
    const routeNode = document.querySelector('[data-route-distance-meters], [data-testid="delivery-distance"], [data-testid="route-distance"]');
    const routeAttr = routeNode?.getAttribute('data-route-distance-meters');
    const routeText = routeNode?.textContent?.match(/(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
    const routeDistanceMeters = finiteDistance(routeAttr ? Number(routeAttr) : routeText ? Number(routeText[1].replace(',','.')) * (routeText[2].toLowerCase()==='km' ? 1000 : 1) : null);
    return { store, storePhoto, number, code: codeText, routeDistanceMeters, pageStatus: readPageStatus(lines.join('\n')), eta: etaMatch ? etaMatch[0].replace(/\s*[-—]\s*/g, ' – ') : '' };
  }


  return readOptionalPageInfo;
};
