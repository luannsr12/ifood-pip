const {randomUUID}=require('node:crypto');
const {MILESTONES}=require('../../src/order');
const minute=60000;
const PLAN=Object.freeze([
  {after:0,value:'CREATED',label:'Criação'},
  {after:1000,value:'PLACED',label:'Pedido recebido'},
  {after:30000,value:'CONFIRMED',label:'Confirmação da loja'},
  {after:2*minute,value:'PREPARATION_STARTED',label:'Preparo'},
  {after:8*minute,value:'ASSIGN_DRIVER',label:'Atribuição do entregador'},
  {after:8.5*minute,value:'DELIVERY_ACCEPTED',label:'Aceite da entrega'},
  {after:9*minute,value:'GOING_TO_ORIGIN',label:'Ida até a loja'},
  {after:12*minute,value:'ARRIVED_AT_ORIGIN',label:'Chegada à loja'},
  {after:13*minute,value:'READY_TO_PICKUP',label:'Pronto para retirada'},
  {after:14*minute,value:'COLLECTED',label:'Retirada na loja'},
  {after:15*minute,value:'DISPATCHED',label:'Saída para entrega'},
  {after:15*minute,value:'DELIVERY_DROP_CODE_REQUESTED',label:'Código de entrega disponível'},
  {after:15.5*minute,value:'GOING_TO_DESTINATION',label:'Em rota'},
  {after:22*minute,value:'ARRIVED_AT_DESTINATION',label:'Chegada ao endereço'},
  {after:23*minute,value:'DELIVERY_DROP_CODE_VALIDATION_SUCCESS',label:'Validação do código'},
  {after:23.5*minute,value:'DELIVERED',label:'Conclusão'}
]);

function createScenario({now=Date.now,schedule=setTimeout,cancel=clearTimeout,onEvent=()=>{}}={}) {
  let startedAt=0, orderId='', running=false, timers=[], events=[];
  const currentTime=value=>new Date(value).toISOString();
  function stop() {timers.forEach(cancel);timers=[];running=false}
  function start() {
    stop();startedAt=now();orderId=randomUUID();events=[];running=true;
    for(const step of PLAN) {
      const emit=()=>{
        const metadata={};
        if(step.value==='CREATED')metadata.newEta=currentTime(startedAt+30*minute);
        if(['ASSIGN_DRIVER','DELIVERY_ACCEPTED'].includes(step.value))Object.assign(metadata,{driverName:'Ana Souza',modal:'MOTORCYCLE'});
        if(['COLLECTED','DISPATCHED'].includes(step.value))metadata.routeDistanceMeters=2200;
        if(step.value.startsWith('DELIVERY_DROP_CODE_'))Object.assign(metadata,{HANDSHAKE_TYPE:'DELIVERY',HANDSHAKE_CODE:'8042'});
        events.push({orderId,value:step.value,timestamp:currentTime(startedAt+step.after),metadata});
        if(step.value==='DELIVERED')running=false;
        onEvent(state());
      };
      if(step.after===0)emit();else timers.push(schedule(emit,step.after));
    }
    return state();
  }
  function details() {
    const assigned=events.some(event=>event.value==='ASSIGN_DRIVER');
    const dispatched=events.find(event=>event.value==='DISPATCHED');
    return {merchant:{name:'Cozinha da Praça'},delivery:{...(assigned?{driver:{name:'Ana Souza',modal:'MOTORCYCLE'}}:{}),...(dispatched?{dispatchedAt:dispatched.timestamp,routeDistanceMeters:2200}:{})}};
  }
  function state() {
    const current=[...events].reverse().find(event=>MILESTONES[event.value]);
    return {orderId,startedAt,running,now:now(),windowStart:startedAt+20*minute,windowEnd:startedAt+30*minute,expectedCompletion:startedAt+23.5*minute,elapsed:startedAt?Math.max(0,now()-startedAt):0,currentEvent:current?.value || '',currentLabel:current?MILESTONES[current.value].label:'',events:structuredClone(events),plan:PLAN.map(step=>({...step,at:startedAt+step.after,done:events.some(event=>event.value===step.value)})),details:details()};
  }
  return {start,stop,state,events:()=>structuredClone(events),details};
}
module.exports={createScenario,PLAN};
