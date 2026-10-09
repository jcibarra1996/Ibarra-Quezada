const { chromium } = require('playwright');
const fs=require('fs');
const B=require('path').join(__dirname,'..','..','assets','brand')+'/';
const jobs=[ // [svg, out, width]
 ['iq-monograma.svg','png/iq-monograma-512.png',512],
 ['iq-monograma-crema.svg','png/iq-monograma-crema-512.png',512],
 ['iq-lockup-horizontal.svg','png/iq-lockup-horizontal-1200.png',1200],
 ['iq-lockup-horizontal-negativo.svg','png/iq-lockup-horizontal-negativo-1200.png',1200],
 ['iq-lockup-vertical.svg','png/iq-lockup-vertical-800.png',800],
 ['iq-lockup-vertical-negativo.svg','png/iq-lockup-vertical-negativo-800.png',800],
 ['iq-favicon.svg','png/iq-favicon-32.png',32],
 ['iq-app-icon.svg','png/iq-apple-touch-icon-180.png',180],
];
(async()=>{
  fs.mkdirSync(B+'png',{recursive:true});
  const b=await chromium.launch();
  for(const [s,o,w] of jobs){
    const svg=fs.readFileSync(B+s,'utf8');
    const vb=svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
    const h=Math.round(w*vb[3]/vb[2]);
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
    await p.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${w}" height="${h}" style="display:block"></body></html>`);
    await p.screenshot({path:B+o,omitBackground:true});
    await p.close(); console.log(o,w,h);
  }
  await b.close();
})();
