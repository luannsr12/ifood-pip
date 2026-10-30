module.exports = function createPreferences(storage) {
  const definitions = {
    language: {key:'ifood-pip-language', values:['pt','en','es'], fallback:'pt'},
    mode: {key:'ifood-pip-mode', values:['full','compact'], fallback:'full'}
  };
  return {
    read(name) {
      const rule = definitions[name];
      try { const value = storage().getItem(rule.key); return rule.values.includes(value) ? value : rule.fallback; }
      catch { return rule.fallback; }
    },
    write(name,value) {
      const rule = definitions[name];
      if (!rule.values.includes(value)) return false;
      try { storage().setItem(rule.key,value); } catch { /* The session remains usable when storage is blocked. */ }
      return true;
    }
  };
};
