import test from 'node:test';import assert from 'node:assert/strict';
import {Chess} from '../../dist/assets/core/chess/Chess.js';
import {validateContent,masters,openings,endgames,calculations,starterBlunders,calculationStart} from '../../dist/assets/data/content.js';
test('6 openings, 5 historical full games, 5 drills, 8 calculations legally verified',()=>{assert.equal(openings.length,6);assert.equal(masters.length,5);assert.equal(endgames.length,5);assert.equal(calculations.length,8);assert.equal(validateContent(),24)});
test('historical games complete scores and commentary attached to existing positions',()=>{const counts=[33,71,51,82,87];masters.forEach((m,i)=>{const g=new Chess().loadPgn(m.score);assert.equal(g.history.length,counts[i],m.id);assert.ok(m.notes.length>=4);for(const n of m.notes)assert.ok(n.ply<g.history.length)})});
test('three starter mate-in-one examples verified as legal mates',()=>{const examples=starterBlunders();assert.equal(examples.length,3);for(const b of examples){const g=new Chess(b.fen);g.move(b.best);assert.ok(g.result())}});
test('every calculate sequence comes from recorded opening path',()=>{for(const c of calculations){const g=calculationStart(c);for(const m of c.sequence)g.move(m);assert.doesNotThrow(()=>g.move(c.answer))}});
