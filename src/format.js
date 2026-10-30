module.exports = function createFormat(locale) {
  return {
    time: value => value ? new Intl.DateTimeFormat(locale(), {hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : '',
    number: value => new Intl.NumberFormat(locale(), {maximumFractionDigits:1}).format(value)
  };
};
