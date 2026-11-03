import {Chess} from '../chess/Chess.js';
import type {SRS} from '../srs/scheduler.js';
export type Blunder={id:string;fen:string;bad:string;best:string;solved:number;starter:boolean;title:string;timestamp?:number};
export type SavedGame={id:string;date:number;pgn:string;result:string;playerSide:'w'|'b'};
export type SaveState={version:1;seededStarter:boolean;games:SavedGame[];blunders:Blunder[];srs:Record<string,SRS>;stats:{coordinateBest:number;colorCorrect:number;colorAttempts:number;knightSolved:number;calcSolved:number;masterSolved:number};settings:{theme:'dark'|'light';coords:boolean;sound:boolean}};
export function freshState():SaveState{return {version:1,seededStarter:false,games:[],blunders:[],srs:{},stats:{coordinateBest:0,colorCorrect:0,colorAttempts:0,knightSolved:0,calcSolved:0,masterSolved:0},settings:{theme:'dark',coords:true,sound:false}}}
export function validateSave(data:unknown):SaveState{
 if(!data||typeof data!=='object')throw Error('Backup must be a JSON object');const x=data as Record<string,unknown>;
 if(x.version!==1)throw Error('Unsupported backup version');const p=freshState();if(x.seededStarter!==undefined&&typeof x.seededStarter!=='boolean')throw Error('Invalid starter seeding flag');p.seededStarter=x.seededStarter===true;
 if(!Array.isArray(x.games)||x.games.length>2000)throw Error('Invalid games list');
 p.games=x.games.map((raw:unknown)=>{const g=raw as SavedGame;if(!g||typeof g.id!=='string'||typeof g.pgn!=='string'||typeof g.date!=='number'||!['w','b'].includes(g.playerSide)||typeof g.result!=='string')throw Error('Invalid game');new Chess().loadPgn(g.pgn);return {...g}});
 if(!Array.isArray(x.blunders)||x.blunders.length>3000)throw Error('Invalid blunders');
 p.blunders=x.blunders.map((raw:unknown)=>{const b=raw as Blunder;if(!b||typeof b.id!=='string'||typeof b.fen!=='string'||typeof b.best!=='string'||typeof b.bad!=='string'||!Number.isInteger(b.solved)||b.solved<0||typeof b.starter!=='boolean'||typeof b.title!=='string')throw Error('Invalid blunder');const test=new Chess(b.fen);test.move(b.best);new Chess(b.fen).move(b.bad);return {...b}});
 if(!x.srs||typeof x.srs!=='object'||Array.isArray(x.srs))throw Error('Invalid SRS progress');
 p.srs={};for(const [key,value] of Object.entries(x.srs)){const v=value as SRS;if(!/^[a-z-]{1,40}$/.test(key)||!v||typeof v!=='object'||!['attempts','correctCount','lapseCount','intervalDays','easeFactor','nextDueTimestamp','masteryPercent'].every(k=>typeof (v as unknown as Record<string,unknown>)[k]==='number'&&Number.isFinite((v as unknown as Record<string,number>)[k])))throw Error('Invalid SRS record');p.srs[key]={...v}}
 if(!x.stats||typeof x.stats!=='object')throw Error('Missing stats');for(const k of Object.keys(p.stats) as (keyof SaveState['stats'])[]){const val=(x.stats as Record<string,unknown>)[k];if(typeof val!=='number'||!Number.isFinite(val)||val<0)throw Error('Invalid stats');p.stats[k]=val}
 if(!x.settings||typeof x.settings!=='object')throw Error('Missing settings');const v=x.settings as Record<string,unknown>;if(!['light','dark'].includes(String(v.theme))||typeof v.coords!=='boolean'||typeof v.sound!=='boolean')throw Error('Invalid settings');p.settings={theme:v.theme as 'light'|'dark',coords:v.coords,sound:v.sound};return p;
}
export class LocalDatabase{
 private db:IDBDatabase|null=null;
 async open():Promise<void>{return new Promise((resolve,reject)=>{const req=indexedDB.open('zen-chess-lab',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('state'))req.result.createObjectStore('state')};req.onsuccess=()=>{this.db=req.result;resolve()};req.onerror=()=>reject(req.error)})}
 async read():Promise<SaveState>{if(!this.db)throw Error('Database not opened');return new Promise((resolve,reject)=>{const tx=this.db!.transaction('state','readonly'),req=tx.objectStore('state').get('current');req.onsuccess=()=>{try{resolve(req.result?validateSave(req.result):freshState())}catch(e){reject(e)}};req.onerror=()=>reject(req.error)})}
 async write(state:SaveState):Promise<void>{const valid=validateSave(state);if(!this.db)throw Error('Database not opened');return new Promise((resolve,reject)=>{const tx=this.db!.transaction('state','readwrite');tx.objectStore('state').put(valid,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
 async reset(){await this.write(freshState())}
 async close(){this.db?.close();this.db=null}
}
