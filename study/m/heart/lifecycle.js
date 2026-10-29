// Cancellation and stale completion protection, independent of a rendering engine.
export function graphicsLifecycle(load,onChange){
 let generation=0,abort,scene,dead=false;
 const release=()=>{abort?.abort();abort=null;scene?.dispose();scene=null};
 return {
  async choose(mode){if(dead)return;const token=++generation;release();
   if(mode==='diagram'){onChange('diagram');return}
   const controller=new AbortController();abort=controller;onChange('loading');
   try{const next=await load(controller.signal);
    if(dead||token!==generation){next.dispose();return}
    scene=next;onChange('ready',scene);
   }catch(e){if(!dead&&token===generation){release();onChange('error',null,e)}}
  },
  update(s){scene?.update(s)},
  fail(error){if(dead)return;++generation;release();onChange('error',null,error)},
  dispose(){if(dead)return;dead=true;++generation;release()},
 };
}
