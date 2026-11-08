// A closed-batch ideal water model, not a recipe or appliance prediction.
// Constant net heat removal; equilibrium freezing at 0 C; no supercooling.
export const SPEC=Object.freeze({mass:1,cp:4180,latent:334000,startTemperature:20});
export function at(seconds=0,inputs={}){
 const t=Math.max(0,Math.min(1800,Number(seconds)||0));
 const cooling=Math.max(0,Math.min(350,Number(inputs.cooling??200)));
 const rpm=Math.max(0,Math.min(60,Number(inputs.rpm??24)));
 const sensible=SPEC.mass*SPEC.cp*SPEC.startTemperature;
 const capacity=sensible+SPEC.mass*SPEC.latent;
 const energy=Math.min(cooling*t,capacity);
 const ice=Math.max(0,Math.min(1,(energy-sensible)/(SPEC.mass*SPEC.latent)));
 const temperature=Math.max(0,SPEC.startTemperature-energy/(SPEC.mass*SPEC.cp));
 return {seconds:t,cooling,rpm,energy,temperature,ice,angle:t*rpm*Math.PI/30,stage:ice>=1?'Frozen solid':ice>=.2?'Slush zone':ice>0?'Ice is forming':'Cooling liquid',freezeStart:cooling?sensible/cooling:Infinity};
}
export function checks(){return [
{name:'Start temperature',got:at(0).temperature,want:20,unit:'°C'},
{name:'Sensible energy to zero',got:at(418).energy,want:83600,unit:'J'},
{name:'Freezing temperature',got:at(1000).temperature,want:0,unit:'°C'},
{name:'50% ice requires latent heat',got:at(1253).ice,want:.5,unit:'fraction'},
{name:'Mixing alone does not remove heat',got:at(1000,{cooling:0,rpm:60}).temperature,want:20,unit:'°C'}];}
