const locales = {pt:'pt-BR',en:'en-US',es:'es-ES'};
const message = (key, values = {}) => ({key, values});

function createI18n(catalogs, getLanguage) {
  function t(input, values = {}) {
    if (!input) return '';
    if (typeof input === 'object') return t(input.key, input.values);
    const lang = getLanguage();
    const entry = catalogs[lang]?.[input] || catalogs.pt[input];
    if (!entry) return input;
    // All current duration messages use the invariant unit "min". Optional
    // singular forms can be added as <key>_one without changing consumers.
    const key = values.count === 1 && catalogs[lang]?.[input+'_one'] ? input+'_one' : input;
    const template = (catalogs[lang]?.[key] || catalogs.pt[key] || entry).message;
    return template.replace(/\$(\w+)\$/g, (_, name) => String(values[name] ?? ''));
  }
  return {t, locale:()=>locales[getLanguage()] || locales.pt};
}
module.exports = {createI18n, message};
