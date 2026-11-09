import fs from 'node:fs';import {execFileSync}from'node:child_process';import {fromNztm}from'../terrain/nztm.ts';
const p='auckland/3d/city-ar-manifest.json',m=JSON.parse(fs.readFileSync(p)),b=m.projectedBounds;
m.cropCornersWGS84=[[b.west,b.south],[b.east,b.south],[b.east,b.north],[b.west,b.north]].map(([x,y])=>fromNztm(x,y));
m.realWorldCropDimensionsMetres=[b.east-b.west,b.north-b.south];m.geographicGroundReference='Original LINZ NZVD2016 elevations; shared source y = 0.018 + elevationMetres / 30720. Native core applies one uniform XYZ scale and presentation translation. Water reference plane is NZVD2016 zero, not an observed tide or bathymetry. Plinth is presentation geometry.';
fs.writeFileSync(p,JSON.stringify(m,null,2));execFileSync('python3',['tools/pointcloud/tabletop/fix-usdz.py','auckland/3d/auckland-city.usdz'],{stdio:'inherit'});execFileSync('python3',['tools/pointcloud/city-ar/validate.py'],{stdio:'inherit'});
