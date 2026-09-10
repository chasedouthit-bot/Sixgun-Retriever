// Local, seed-only UI fixture. No authentication or remote data is used.
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404);return res.end();}
    if(file.endsWith('index.html')){
      const imports=url.searchParams.has('imports')?`if(!importRows.length)importRows=[1,2].map(i=>({id:'fixture-'+i,parsed:{filename:'fixture-'+i+'.csv',computed:{n:3,avg:1000,sd:20,es:40},reported:{avg:1000,sd:20,es:40},delta:{avg:0},shots:[],sessionDatetime:'2026-09-10T12:00:00Z'},gunKey:'',loadKey:'',notes:'',status:'unsaved'}));`:'';
      data=data.toString().replace(/cloudBoot\(\);\s*<\/script>/,`window.SixgunCloud={saveState:async()=>{await new Promise(r=>setTimeout(r,500));},saveNow:async onLocal=>{onLocal();throw new Error("Test connection unavailable. Retry to sync.");}};document.getElementById("cloudAuth").classList.add("hidden");${imports}renderAll();renderLanding();</script>`);
      const scripts=[...fs.readFileSync(path.join(root,'worker.js'),'utf8').matchAll(/'([^']+\.js)'/g)].map(m=>`<script src="/${m[1]}"></script>`).join('');
      data=data.replace('</body>',scripts+'</body>');
    }
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':file.endsWith('.jpg')?'image/jpeg':'application/octet-stream');res.end(data);
  });
}).listen(8766,'127.0.0.1',()=>console.log('Seed-only preview: http://127.0.0.1:8766'));
