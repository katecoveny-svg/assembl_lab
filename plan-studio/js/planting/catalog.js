// Original Plan Studio display definitions. Name and flowering references are
// NZPCN species records, not a claim of cultivar, nursery grade or site suitability.
const nzpcn=s=>"https://www.nzpcn.org.nz/flora/species/"+s+"/";
export const PLANTS=Object.freeze({
  harakeke:{label:"Harakeke · flax",botanical:"Phormium tenax",layer:"Structure",spacing:1.05,clear:.27,source:nzpcn("phormium-tenax"),bloom:[10,11],seed:[12]},
  toetoe:{label:"Toetoe (species not specified)",botanical:"",layer:"Ground layer",spacing:1.25,clear:.32,source:""},
  "ti-kouka":{label:"Tī kōuka · cabbage tree",botanical:"Cordyline australis",layer:"Canopy",spacing:2.8,clear:.45,source:nzpcn("cordyline-australis")},
  "coastal-toetoe":{label:"Coastal toetoe",botanical:"Austroderia splendens",layer:"Ground layer",spacing:1.3,clear:.36,source:nzpcn("austroderia-splendens"),bloom:[9,10,11]}
});
export const MIX="native-layers";
export const MONTHS=[[0,"Neutral"],[10,"Spring · October"],[12,"Summer · December"],[3,"Autumn · March"],[7,"Winter · July"]];
export function displayPhase(species,month) {
  const p=PLANTS[species];
  if(p?.bloom?.includes(month))return "flower";
  if(p?.seed?.includes(month))return "seed";
  return "leaf";
}
