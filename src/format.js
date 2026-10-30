module.exports = function createFormat(locale) {
  return {
    time: value => value ? new Intl.DateTimeFormat(locale(), {hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : '',
    number: value => new Intl.NumberFormat(locale(), {maximumFractionDigits:1}).format(value),
    kilometers: meters => {
      const km=meters/1000;
      const value=new Intl.NumberFormat(locale(),{maximumFractionDigits:km<.1?3:1}).format(Math.max(.001,km));
      return (km<.001?'<':'')+value+'km';
    }
  };
};
