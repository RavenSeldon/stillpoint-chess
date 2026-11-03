import {idx,coord} from '../chess/Chess.js';
const offsets=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
export function knightNeighbors(i:number){const x=i%8,y=Math.floor(i/8);return offsets.map(([dx,dy])=>[x+dx,y+dy]).filter(([a,b])=>a>=0&&a<8&&b>=0&&b<8).map(([a,b])=>b*8+a)}
export function shortestKnightPath(start:string,end:string):string[]{const s=idx(start),e=idx(end);const queue=[s],parent=Array(64).fill(-1);parent[s]=s;for(let i=0;i<queue.length;i++){const v=queue[i];if(v===e)break;for(const n of knightNeighbors(v))if(parent[n]<0){parent[n]=v;queue.push(n)}}if(parent[e]<0)throw Error('No knight path');const path:number[]=[];for(let n=e;n!==s;n=parent[n])path.push(n);path.push(s);return path.reverse().map(coord)}
export function validateKnightPath(path:string[],from:string,to:string){if(path.length<1||path[0]!==from||path[path.length-1]!==to)return false;try{return path.every((square,i)=>{const n=idx(square);return i===0||knightNeighbors(idx(path[i-1])).includes(n)})}catch{return false}}
export function squareIsLight(square:string){const i=idx(square);return ((i%8)+Math.floor(i/8))%2===1}
