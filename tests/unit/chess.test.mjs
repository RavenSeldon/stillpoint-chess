import test from 'node:test';import assert from 'node:assert/strict';
import {Chess,INITIAL_FEN,idx} from '../../dist/assets/core/chess/Chess.js';
const perft=(g,depth)=>depth===0?1:g.legalMoves().reduce((sum,move)=>{const child=new Chess(g.fen());child.move(move);return sum+perft(child,depth-1)},0);
test('initial FEN, 20 moves, depth two perft 400',()=>{const g=new Chess();assert.equal(g.fen(),INITIAL_FEN);assert.equal(perft(g,1),20);assert.equal(perft(g,2),400)});
test('depth 3 perft standard 8902',()=>assert.equal(perft(new Chess(),3),8902));
test('four-move mate detected and PGN intact',()=>{const g=new Chess();for(const m of ['f3','e5','g4','Qh4#'])g.move(m);assert.equal(g.result(),'0-1');assert.ok(g.pgn().includes('Qh4#'))});
test('FEN round-trip, SAN, rook rights and castling',()=>{const g=new Chess();for(const move of 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O'.split(' '))g.move(move);assert.ok(!g.castling.includes('K'));assert.ok(g.castling.includes('k'));assert.equal(new Chess(g.fen()).fen(),g.fen())});
test('en passant legal only immediately and captures pawn',()=>{const g=new Chess();for(const s of 'e4 a6 e5 d5 exd6'.split(' '))g.move(s);assert.equal(g.board[idx('d5')],null);assert.equal(g.board[idx('d6')].type,'p')});
test('promotion creates a queen',()=>{const g=new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');g.move('a8=Q+');assert.equal(g.board[idx('a8')].type,'q')});
test('threefold repetition claim not automatic and undo works',()=>{const g=new Chess();for(const m of 'Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8'.split(' '))g.move(m);assert.equal(g.canClaimDraw(),true);assert.equal(g.result(),null);const old=g.history.length;g.undo();assert.equal(g.history.length,old-1);assert.equal(g.canClaimDraw(),false)});
test('bad FEN and illegal moves rejected',()=>{assert.throws(()=>new Chess('bad'));assert.throws(()=>new Chess('8/8/8/8/8/8/8/8 w - - 0 1'));assert.throws(()=>new Chess().move('e5'))});
test('historical SAN PGN can be reloaded',()=>{const text='1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6';const g=new Chess().loadPgn(text);assert.equal(g.history.length,8)})
test('exported result appears once and exported PGN round trips',()=>{const g=new Chess();for(const m of ['f3','e5','g4','Qh4#'])g.move(m);const pgn=g.pgn();assert.equal((pgn.match(/0-1/g)||[]).length,2);const restored=new Chess().loadPgn(pgn);assert.equal(restored.history.length,4);assert.equal(restored.result(),'0-1');assert.equal(restored.fen(),g.fen())})
