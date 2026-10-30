// Data being present in an early API/DOM payload is not permission to show it.
module.exports = function visibility(data) {
  const orderKnown=['received','preparing','driver','atStore','shipping','arriving','delivered','cancelled'].includes(data.stage);
  const terminal=['delivered','cancelled'].includes(data.stage);
  return {
    order:orderKnown,
    courier:orderKnown && (Boolean(data.driverPhase) || ['shipping','arriving','delivered'].includes(data.stage)),
    deliveryCode:['shipping','arriving'].includes(data.stage) && !data.codeValidated && !terminal,
    routeEstimate:data.stage==='shipping',
    merchantWindow:orderKnown && !['shipping','arriving','delivered','cancelled'].includes(data.stage)
  };
};
