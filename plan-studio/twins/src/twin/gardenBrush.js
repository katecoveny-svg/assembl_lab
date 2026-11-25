/**
 * Behaviour inspired by Site Scatter (andreyruvi/site-scatter, MIT,
 * 05672b5e5f7b9200fea8a7a1865af022a463df15). This implementation is original;
 * no third-party source/assets copied.
 * Inputs and brush radius/spacing are in metres, y is supplied by hit().
 */
export function stampSweep(from,to,hit,mark,step=.19){
 if(!to)return false;
 if(!from)return Boolean(mark(to));
 const n=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/step));
 let changed=false;
 for(let i=1;i<=n;i++){const f=i/n,p=hit({x:from.x+(to.x-from.x)*f,z:from.z+(to.z-from.z)*f});if(p)changed=Boolean(mark(p))||changed;}
 return changed;
}
export function revealNear(rows,p,radius=.64,allowed=()=>true){
 let changed=false;
 if(p)for(const row of rows)if(!row.seen&&Math.hypot(row.p.x-p.x,row.p.z-p.z)<=radius&&allowed(row.p)){row.seen=true;changed=true;}
 return changed;
}
