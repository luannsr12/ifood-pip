const test=require('node:test');
const assert=require('node:assert/strict');
function harness() {
  const timers=new Map();let id=0,calls=0,result={ok:false,reason:'HTTP 503'};
  const state={pip:{closed:false,setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id},clearTimeout:id=>timers.delete(id)},snapshot:{},pollFailures:0,pollCompleted:false,pollTimer:null,lastPageUpdateAt:0};
  const polling=require('../src/polling')({state,getOrderId:()=> 'order',POLL_INTERVAL:60000,renderPip:()=>{},refreshCaptured:async()=>{calls++;if(result instanceof Error)throw result;return result}});
  return {state,polling,timers,calls:()=>calls,result:value=>result=value};
}
test('four consecutive failures stop all automatic and manual requests until fresh page data',async()=>{
  const h=harness();
  for(let n=1;n<=4;n++) {
    if(n===2)h.result(new Error('offline'));else h.result({ok:false,reason:n===3?'invalid response':'HTTP 429'});
    await h.polling.pollEvents(true);
    assert.equal(h.state.pollFailures,n);
    assert.equal(h.timers.size,n===4?0:1);
  }
  assert.equal(h.state.snapshot.issue,'ui_refresh_paused_open_order');
  await h.polling.pollEvents(true);h.polling.queueNextPoll();
  assert.equal(h.calls(),4);assert.equal(h.timers.size,0);
  h.polling.resetFailures();h.result({ok:true});await h.polling.pollEvents(true);
  assert.equal(h.calls(),5);assert.equal(h.state.pollFailures,0);assert.equal(h.state.snapshot.issue,'');
});
test('a successful request resets the consecutive failure budget',async()=>{
  const h=harness();
  await h.polling.pollEvents(true);await h.polling.pollEvents(true);
  h.result({ok:true});await h.polling.pollEvents(true);
  h.result({ok:false,reason:'HTTP 500'});await h.polling.pollEvents(true);
  assert.equal(h.state.pollFailures,1);assert.equal(h.timers.size,1);
});
test('a completed order cancels scheduled polling and rejects manual requests',async()=>{
  const h=harness();h.polling.queueNextPoll();
  h.state.pollCompleted=true;h.polling.queueNextPoll();await h.polling.pollEvents(true);
  assert.equal(h.timers.size,0);assert.equal(h.calls(),0);
});
