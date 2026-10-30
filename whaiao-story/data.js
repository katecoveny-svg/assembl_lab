export const PROJECT = {
  id:'community-pavilion-demo', title:'A place to gather', subtitle:'An illustrative community pavilion',
  truth:'Independent assembl demonstrator for a conversation with Whaiao. This is not a Whaiao design, commission or approved project.',
  revision:'Demonstration 01', source:'Illustrative geometry and narrative authored for this demonstrator.',
  rooms:[
    {id:'arrival',label:'Arrival & welcome',point:[0,1,6],view:[16,8,21],target:[0,1,4]},
    {id:'gather',label:'The shared room',point:[-5,1.5,0],view:[-15,10,14],target:[-5,1,0]},
    {id:'make',label:'A flexible room',point:[5,1.5,1],view:[17,8,12],target:[5,1,1]},
    {id:'outside',label:'The courtyard',point:[0,0.6,2],view:[8,12,18],target:[0,0,2]}
  ]
};
export const CHAPTERS=[
 {id:'overview',number:'01',title:'The whole idea',eyebrow:'Begin with the place',room:null,view:[24,21,27],target:[0,0,0],
  story:'Two simple wings hold a shared courtyard. This spatial study demonstrates how a project story could connect a model, the reasons behind it and the conversations still to come.',
  choice:'A shared outdoor heart',reason:'Make the relationship between rooms, arrival and outdoor space easy to discuss at a distance.',
  question:'What needs to be understood before the next hui?',stage:'Concept discussion',permission:'demo'},
 {id:'arrival',number:'02',title:'Arrive & find your way',eyebrow:'A legible beginning',room:'arrival',
  story:'Follow the front edge into the courtyard. A continuous terrace makes the route visible in this study; a real project would need its access, gradients and details checked by the design team.',
  choice:'One visible arrival edge',reason:'Help people discuss where visitors enter, pause and orient themselves without relying on a plan alone.',
  question:'Where should the first welcome happen?',stage:'Brief & circulation review',permission:'demo'},
 {id:'gather',number:'03',title:'Come together',eyebrow:'The shared room',room:'gather',
  story:'The larger wing opens towards the courtyard. Movable tables illustrate how the same room could support different activities. Its capacity, acoustics and use would be confirmed from the actual brief.',
  choice:'A connection to the courtyard',reason:'Let the conversation move between the inside space, its threshold and the outdoor room.',
  question:'Which activities should be able to happen together?',stage:'Spatial options review',permission:'demo'},
 {id:'make',number:'04',title:'Make room for change',eyebrow:'A flexible second space',room:'make',
  story:'A second room gives the study a quieter, separate setting. The furniture is deliberately simple. It represents an activity zone rather than a specification or equipment list.',
  choice:'A second room with its own focus',reason:'Make separation and connection visible while the brief is still being discussed.',
  question:'What needs separation, and what should stay connected?',stage:'Brief & operational review',permission:'demo'},
 {id:'outside',number:'05',title:'The space between',eyebrow:'Compare the outdoor edge',room:'outside',
  story:'Switch between a deeper covered edge and a larger planted area. Both are illustrative alternatives. Comparing them makes the trade-off visible without implying either has been approved.',
  choice:'Shelter or more garden',reason:'Use an agreed question to compare design options rather than presenting an unexplained A and B.',
  question:'What matters most here: shelter, planting, or a different balance?',stage:'Option comparison',permission:'demo'}
];
export const OPTIONS={
 shelter:{id:'shelter',name:'A · The covered edge',label:'More shelter',canopyDepth:2,canopyWidth:14,gardenWidth:6,gardenDepth:3,description:'A deeper canopy along the shared edge, with a smaller planted area.'},
 garden:{id:'garden',name:'B · The planted courtyard',label:'More garden',canopyDepth:1,canopyWidth:14,gardenWidth:8,gardenDepth:4,description:'A shallower canopy leaves more room for planting in this illustrative option.'}
};
export const RESERVED = [{id:'knowledge',title:'Knowledge-holder narrative',state:'Not supplied',reason:'No cultural narrative is invented or included in this demonstrator.'},{id:'project',title:'Approved project information',state:'Not supplied',reason:'Model, imagery, design statements, costs and consent to share would come from Whaiao and the relevant holders.'}];
export function safeState(input={}){
 return {chapter:CHAPTERS.some(c=>c.id===input.chapter)?input.chapter:'overview',option:Object.hasOwn(OPTIONS,input.option)?input.option:'shelter',roof:input.roof!==false&&input.roof!=='off',light:input.light==='evening'?'evening':'day'};
}
export function readState(search){const p=new URLSearchParams(search);return safeState({chapter:p.get('chapter'),option:p.get('option'),roof:p.get('roof'),light:p.get('light')});}
export function stateQuery(state){const s=safeState(state),p=new URLSearchParams({chapter:s.chapter,option:s.option,roof:s.roof?'on':'off',light:s.light});return p.toString();}
export function packet(state,questions=[],includeQuestions=false){
 const s=safeState(state),o=OPTIONS[s.option];
 return {schema:'assembl.project-story/1',project:PROJECT.title,truth:PROJECT.truth,revision:PROJECT.revision,source:PROJECT.source,
  selectedOption:o.name,optionStatus:'Illustrative alternative, not approved',areas:{covered:o.canopyDepth*o.canopyWidth,planted:o.gardenWidth*o.gardenDepth,unit:'square metres in the illustrative model'},
  chapters:CHAPTERS.filter(c=>c.permission==='demo').map(c=>({title:c.title,designChoice:c.choice,reason:c.reason,discussionQuestion:c.question,stage:c.stage})),
  nextSteps:['Agree the project, audience and permission to share.','Receive the approved architectural model and source revision.','Confirm chapter text, viewpoints and options with Whaiao.','Have relevant knowledge holders decide what may be included.','Review the browser experience before any project release.'],
  ...(includeQuestions?{myQuestions:questions.filter(q=>typeof q==='string').map(q=>q.slice(0,500)).slice(0,20)}:{})};
}
export function escapeHtml(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function validateGlb(buffer){
 const v=new DataView(buffer);if(buffer.byteLength<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buffer.byteLength)throw Error('Choose a valid GLB 2.0 file.');
 const length=v.getUint32(12,true);if(v.getUint32(16,true)!==0x4e4f534a||length>buffer.byteLength-20)throw Error('This GLB does not contain a readable scene.');
 const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));
 const external=[...(json.buffers||[]),...(json.images||[])].some(x=>x.uri&&!x.uri.startsWith('data:'));
 if(external)throw Error('Export one self-contained GLB with embedded textures. External resources are not loaded.');
 if((json.extensionsRequired||[]).some(x=>/draco|meshopt/i.test(x)))throw Error('Please export a GLB without Draco or Meshopt compression for this demonstrator.');
 return json;
}
