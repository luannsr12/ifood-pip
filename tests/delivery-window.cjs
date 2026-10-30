// Future merchant window for browser fixtures, anchored at test startup.
module.exports = (now=Date.now()) => {
  const start=new Date(now+20*60000),end=new Date(now+30*60000);
  const time=date=>new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(date);
  const range=`${time(start)} – ${time(end)}`;
  const day=end.toDateString()===new Date(now).toDateString()?'Hoje':'Amanhã';
  return {range,label:`${day}, ${range}`};
};
