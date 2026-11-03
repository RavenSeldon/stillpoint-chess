import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";

const out = "dist";
async function walk(directory) {
  const all = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) all.push(...(await walk(absolute)));
    else all.push(absolute);
  }
  return all;
}

const assets = (await walk(out))
  .filter((file) => !file.endsWith("sw.js"))
  .map((file) => "./" + relative(out, file).replaceAll("\\", "/"));
const digest = createHash("sha256");
for (const asset of assets) {
  digest.update(asset);
  digest.update(await readFile(join(out, asset.slice(2))));
}
const revision = digest.digest("hex").slice(0, 12);
const sw = `const CACHE='stillpoint-${revision}';
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('stillpoint-')&&name!==CACHE).map(name=>caches.delete(name)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)))}
    return response;
  }).catch(()=>request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
`;
await writeFile(join(out, "sw.js"), sw);
console.log(`Packaged ${assets.length} offline assets; cache ${revision}`);
