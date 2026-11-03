import {App} from './ui/app.js';
const el=document.getElementById('app');if(!el)throw Error('Application root not found');
new App(el).init().catch(error=>{const panel=document.createElement('div');panel.className='fatal';panel.textContent='Unable to initialize the local chess trainer: '+(error instanceof Error?error.message:String(error));el.replaceChildren(panel);console.error(error)});
if('serviceWorker' in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Offline cache unavailable',error)));
