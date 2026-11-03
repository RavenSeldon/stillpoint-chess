import type {Color} from '../chess/Chess.js';
export type Score = {kind:'cp'; value:number; perspective:Color}|{kind:'mate'; moves:number; perspective:Color};
/** Absolute white-positive score, regardless of which side the original UCI score represents. */
export function whiteScore(score:Score){const raw=score.kind==='cp'?score.value:score.moves>0?10000-10*Math.abs(score.moves):-10000+10*Math.abs(score.moves);return score.perspective==='w'?raw:-raw}
export function cpToWinProbability(cp:number){return 100/(1+Math.exp(-0.00368208*cp))}
export function moveAccuracy(loss:number){return Math.max(0,Math.min(100,103.1668*Math.exp(-0.04354*Math.max(0,loss))-3.1669))}
export type Grade='Best'|'Excellent'|'Good'|'Inaccuracy'|'Mistake'|'Blunder';
export function classify(loss:number):Grade{if(loss<=1.5)return 'Best';if(loss<=4)return 'Excellent';if(loss<=8)return 'Good';if(loss<=14)return 'Inaccuracy';if(loss<=24)return 'Mistake';return 'Blunder'}
export function perspectiveCp(scoreCp:number,player:Color){return player==='w'?scoreCp:-scoreCp}
