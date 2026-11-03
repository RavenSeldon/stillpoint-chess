import {search} from './search.js';
self.onmessage=(event:MessageEvent<{id:number;fen:string;depth:number;maxNodes?:number}>)=>{
  const {id,fen,depth,maxNodes}=event.data;
  try{self.postMessage({id,result:search(fen,depth,maxNodes)})}catch(e){self.postMessage({id,error:e instanceof Error?e.message:String(e)})}
};
