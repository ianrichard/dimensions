/** Merge coincident vertical display guides so opacity never counts vertices. */
export function mergeGuideSegments(segments,tolerance=1e-7){
 const columns=[];
 for(const {a,b,selected=false}of segments){
  if([...a,...b].some(v=>!Number.isFinite(v)))continue;
  if(Math.abs(a[0]-b[0])>tolerance)throw new Error('Correspondence guides must preserve horizontal position.');
  const x=(a[0]+b[0])/2,lo=Math.min(a[1],b[1]),hi=Math.max(a[1],b[1]);if(hi-lo<=tolerance)continue;
  let column=columns.find(c=>c.selected===selected&&Math.abs(c.x-x)<=tolerance);
  if(!column){column={x,selected,intervals:[]};columns.push(column)}column.intervals.push([lo,hi]);
 }
 const result=[];
 for(const c of columns){c.intervals.sort((a,b)=>a[0]-b[0]);const joined=[];for(const interval of c.intervals){const last=joined.at(-1);if(last&&interval[0]<=last[1]+tolerance)last[1]=Math.max(last[1],interval[1]);else joined.push(interval.slice())}for(const[lo,hi]of joined)result.push({a:[c.x,lo],b:[c.x,hi],selected:c.selected});}
 return result;
}
