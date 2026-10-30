const test=require('node:test');
const assert=require('node:assert/strict');
const {summarizeEvents,extractDetails,normalizeModal}=require('../src/order');
const {createI18n}=require('../src/i18n');
const catalog=require('../_locales/pt_BR/messages.json');
const {t,locale}=createI18n({pt:catalog},()=> 'pt');
const estimate=require('../src/arrival')({orderDetails:{}},require('../src/format')(locale),t);
const now=new Date(2026,9,30,13,0).getTime();
const event=(value,offset=0,metadata={})=>({orderId:'test',value,timestamp:new Date(now+offset).toISOString(),metadata});
const assigned=event('ASSIGN_DRIVER',-10*60000,{driverName:'Ana',modal:'MOTORCYCLE',routeDistanceMeters:2200});
test('all pre-dispatch phases retain the entire merchant window even with a conflicting newEta',()=>{
  for(const stage of ['received','preparing','driver','atStore']) {
    const result=estimate({stage,etaAt:now+5*60000,departedAt:now-60000,routeDistanceMeters:2200,modal:normalizeModal('MOTO')},{eta:'Hoje, 13:30 – 14:00'},now);
    assert.equal(result.title,'13:30 – 14:00');assert.equal(result.preDispatch,true);
    assert.doesNotMatch(t(result.title),/~|\bmin\b/);
  }
});
test('an expired merchant window is not replaced by a minutes counter before dispatch',()=>{
  const result=estimate({stage:'preparing'},{eta:'Hoje, 12:30 – 12:45'},now);
  assert.equal(result.title,'12:30 – 12:45');assert.equal(result.late,true);
  assert.equal(estimate({stage:'preparing',etaAt:now+60000},{},now).preDispatch,undefined);
});
test('collection is not dispatch and never anchors the route clock',()=>{
  for(const value of ['COLLECTED','DELIVERY_COLLECTED']) {
    const data=summarizeEvents([assigned,event(value,-3*60000)],'test');
    assert.equal(data.stage,'atStore');assert.equal(data.departedAt,0);
    assert.equal(data.driverLabel,'ui_courier_picked_up_your_order');
    assert.equal(estimate(data,{eta:'13:30 – 14:00'},now).title,'13:30 – 14:00');
  }
  assert.equal(extractDetails({delivery:{collectedAt:new Date(now).toISOString()}}).departedAt,0);
});
test('assignment, acceptance and movement retain their distinct courier labels',()=>{
  assert.equal(summarizeEvents([assigned],'test').driverLabel,'ui_courier_assigned');
  const accepted=summarizeEvents([assigned,event('DELIVERY_ACCEPTED',-4*60000)],'test');
  assert.equal(accepted.driverLabel,'ui_courier_accepted_the_delivery');
  const moving=summarizeEvents([assigned,event('GOING_TO_ORIGIN',-3*60000)],'test');
  assert.equal(moving.driverLabel,'ui_courier_heading_to_the_restaurant');
});
test('countdown starts at actual dispatch, survives polls and later events, and decreases with time',()=>{
  const events=[assigned,event('COLLECTED',-3*60000),event('DISPATCHED')];
  const first=summarizeEvents(events,'test');
  assert.equal(first.departedAt,now);assert.equal(estimate(first,{},now).title.values.count,8);
  const later=summarizeEvents([...events,event('GOING_TO_DESTINATION',60000)],'test');
  assert.equal(later.departedAt,now);
  assert.equal(estimate(later,{},now+60000).title.values.count,7);
  assert.equal(estimate(summarizeEvents(events,'test'),{},now+2*60000).title.values.count,6);
});
test('route estimates require dispatch time; the next supported departure event can establish it',()=>{
  const noTime=summarizeEvents([assigned,{orderId:'test',value:'DISPATCHED'}],'test');
  assert.equal(estimate(noTime,{},now).title,'ui_out_for_delivery');
  for(const value of ['GOING_TO_DESTINATION','DELIVERY_GOING_TO_DESTINATION']) {
    const data=summarizeEvents([assigned,event(value)],'test');
    assert.equal(data.departedAt,now);assert.equal(estimate(data,{},now).title.values.count,8);
  }
});
