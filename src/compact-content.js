// Keep estimates bounded and names within their measured grid cells.
function estimate(eta,extras) {
  const count=eta.title?.key==='order_arrives' ? eta.title.values.count : 0;
  if (count>0 && count<=99) return {minutes:count};
  const range=extras.eta?.match(/\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/)?.[0];
  return range ? {window:range.replace(/\s*[-–—]\s*/,' – ')} : {};
}
function fitName(element,text) {
  element.textContent=text;
  element.title=text;
  if (element.scrollWidth<=element.clientWidth) return;
  const chars=Array.from(text);
  do {chars.pop();element.textContent=chars.join('').trimEnd()+'...'} while(chars.length && element.scrollWidth>element.clientWidth);
}
function courierName(text) {
  const words=text.trim().split(/\s+/).filter(Boolean);
  return words.length>1 ? words[0]+' '+Array.from(words[1])[0].toLocaleUpperCase()+'.' : words[0] || '';
}
module.exports={estimate,fitName,courierName};
