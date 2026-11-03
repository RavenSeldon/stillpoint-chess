import {Chess,type Color,type Move,type Piece} from '../chess/Chess.js';
const values={p:100,n:320,b:330,r:500,q:900,k:0};
function sideSign(c:Color){return c==='w'?1:-1}
export function staticEval(game:Chess){let total=0;for(let i=0;i<64;i++){const p:Piece|null=game.board[i];if(!p)continue;const rank=Math.floor(i/8),file=i%8;
 let bonus=0;if(p.type==='n'||p.type==='b')bonus=10*(3.5-Math.abs(3.5-file))+8*(3.5-Math.abs(3.5-rank));
 if(p.type==='p')bonus=6*(p.color==='w'?rank:7-rank);if(p.type==='k'&&game.board.filter(q=>q&&q.type==='q').length===0)bonus=4*(3.5-Math.abs(3.5-file));
 total+=(values[p.type]+bonus)*sideSign(p.color)}return Math.round(total)}
export type Analysis={bestMove:string|null;san:string|null;scoreCp:number;depth:number;nodes:number};
export function search(fen:string,depth:number,maxNodes=24000):Analysis{
 const chess=new Chess(fen),root=chess.turn;let nodes=0;
 const evaluate=(g:Chess)=>staticEval(g)*sideSign(g.turn);
 const negamax=(g:Chess,d:number,alpha:number,beta:number,ply:number):number=>{
  nodes++;if(nodes>=maxNodes)return evaluate(g);
  const moves=g.legalMoves();if(moves.length===0)return g.inCheck()?-100000+ply:0;
  if(g.isInsufficientMaterial()||g.halfmove>=100)return 0;
  if(d<=0)return evaluate(g);
  moves.sort((a,b)=>Number(!!g.board[b.to])-Number(!!g.board[a.to]));
  let best=-Infinity;for(const m of moves){const child=new Chess(g.fen());child.move(m);const v=-negamax(child,d-1,-beta,-alpha,ply+1);
   if(v>best)best=v;if(v>alpha)alpha=v;if(alpha>=beta||nodes>=maxNodes)break}return best;
 };
 const legal=chess.legalMoves();if(!legal.length)return {bestMove:null,san:null,scoreCp:chess.inCheck()?-100000:0,depth,nodes};
 let best=legal[0],score=-Infinity,alpha=-Infinity,beta=Infinity;
 // Iterative deepening guarantees a completed fallback if node budget expires.
 for(let d=1;d<=Math.max(1,Math.min(4,depth));d++){
  let localBest=best,localScore=-Infinity;const ordered=[best,...legal.filter(m=>chess.moveUci(m)!==chess.moveUci(best))];
  for(const m of ordered){const child=new Chess(chess.fen());child.move(m);const v=-negamax(child,d-1,-beta,-alpha,1);
   if(v>localScore){localScore=v;localBest=m}if(nodes>=maxNodes)break}
  if(nodes<maxNodes||d===1){best=localBest;score=localScore}if(nodes>=maxNodes)break;
  alpha=-Infinity;beta=Infinity;
 }
 return {bestMove:chess.moveUci(best),san:chess.moveSan(best),scoreCp:Math.round(score)*sideSign(root),depth,nodes};
}
/** This is explicitly NOT Stockfish: deterministic offline minimax used only for the verified slice. */
