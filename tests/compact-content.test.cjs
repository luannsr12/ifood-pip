const test=require('node:test');
const assert=require('node:assert/strict');
const {estimate}=require('../src/compact-content');
test('compact courier identity uses first name and only the second initial',()=>{
  const {courierName}=require('../src/compact-content');
  assert.equal(courierName('Mariana Aparecida dos Santos'),'Mariana A.');
  assert.equal(courierName(' Ana S. '),'Ana S.');
  assert.equal(courierName('João'),'João');
  assert.equal(courierName('Érica oliveira'),'Érica O.');
  assert.equal(courierName(''),'');
});
test('compact estimates show at most two minute digits and use the merchant window beyond that',()=>{
  const eta=count=>({title:{key:'order_arrives',values:{count}}});
  const extras={eta:'Hoje, 14:00 – 14:30'};
  assert.deepEqual(estimate(eta(1),extras),{minutes:1});
  assert.deepEqual(estimate(eta(99),extras),{minutes:99});
  assert.deepEqual(estimate(eta(100),extras),{window:'14:00 – 14:30'});
  assert.deepEqual(estimate(eta(120),{}),{});
});
