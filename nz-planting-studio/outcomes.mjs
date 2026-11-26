export const finishes={
  cedar:{label:'Oiled cedar',rate:150,workRate:.36,map:'cedar.webp',color:0xebbd89},
  dark:{label:'Charred timber',rate:182,workRate:.42,map:'charred.webp',color:0x7c6c63},
  mineral:{label:'Pale mineral finish',rate:119,workRate:.49,map:'plastered_wall_04.webp',color:0xe3d8c3}
};
// Supply and labour are model assumptions, not retail quotes. Crew-hours add; assumed 2-person days do not include cure time.
export function outcome(s,finish,{surfaceRate=22,plantFactor=1,labourRate=78,qty=0,finishRate,house=true}={}){
 const cladding=house?finishes[finish]:null;
 const materials=(s.plantCost||0)*plantFactor+(s.edgingCost||0)+(s.propCost||0)+(s.landscapedArea||0)*surfaceRate+(cladding?(finishRate??cladding.rate)*qty:0);
 const hours=(s.totalPlants||0)*.09+(s.landscapedArea||0)*.11+(s.totalProps||0)*.65+(cladding?cladding.workRate*qty+4:0);
 return {materials,hours,days:hours/16,labour:hours*labourRate,total:materials+hours*labourRate};
}
