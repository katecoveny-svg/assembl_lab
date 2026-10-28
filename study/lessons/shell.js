// Reusable, account-free lesson state. No persistence, network or grading.
export function createLesson(steps) {
  return {mode:'explore', index:0, steps, answers:{}, snapshots:[],
    progress:{explored:false,watchedDemonstration:false,independentlyAttempted:false},
    assisted:false,
    move(delta){this.index=Math.max(0,Math.min(steps.length-1,this.index+delta));},
    demonstrate(){this.assisted=true;this.progress.watchedDemonstration=true;},
    freshAttempt(){this.assisted=false;this.snapshots=[];this.answers={};},
    attempt(){if(!this.assisted && this.snapshots[0] && this.snapshots[1] && this.snapshots[0].inputs.surfaceAlbedo !== this.snapshots[1].inputs.surfaceAlbedo && this.snapshots.every(s=>!s.assisted) && this.answers.transfer?.trim()) this.progress.independentlyAttempted=true;},
    reset(){this.mode='explore';this.index=0;this.answers={};this.snapshots=[];this.assisted=false;
      this.progress={explored:false,watchedDemonstration:false,independentlyAttempted:false};}
  };
}
export function embedCode(origin,path,title) {
  const url=new URL(path,origin).href;
  return `<iframe src="${url}embed/" title="${title}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-downloads allow-popups" allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'" style="width:100%;height:850px;border:0" width="100%" height="850"></iframe>\n<p><a href="${url}" target="_blank" rel="noopener">Open full experience</a></p>`;
}
