import fs from 'node:fs';
import qrcode from '../../ar/vendor/qrcode/qrcode.module.js';
const manifest=JSON.parse(fs.readFileSync('study/ar/manifest.json'));
for(const [i,e] of manifest.experiences.entries()){
 const q=qrcode(0,'H');q.addData('https://study.assembl.co.nz'+e.page);q.make();
 const n=q.getModuleCount(),s=6,pad=4,w=(n+pad*2)*s;
 let cells='';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.isDark(y,x))cells+=`<rect x="${(x+pad)*s}" y="${(y+pad)*s}" width="${s}" height="${s}"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w+48}" viewBox="0 0 ${w} ${w+48}"><rect width="${w}" height="${w+48}" rx="12" fill="#f1e7f1"/><rect width="${w}" height="${w}" fill="white"/><g fill="#291b2b">${cells}</g><circle cx="18" cy="${w+24}" r="6" fill="#a77c96"/><text x="32" y="${w+29}" fill="#51314f" font-family="sans-serif" font-size="12">${String(i+1).padStart(2,'0')} · ${e.id}</text></svg>`;
 fs.writeFileSync(`study/ar/qr/${e.id}.svg`,svg);
}
console.log(`Generated ${manifest.experiences.length} unique QR cards`);
