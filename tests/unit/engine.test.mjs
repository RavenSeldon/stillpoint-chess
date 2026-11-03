import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUciInfo} from '../../dist/assets/core/engine/adapter.js';

test('UCI parser preserves side-to-move centipawn scores and PV',()=>{
  const parsed=parseUciInfo('info depth 12 nodes 54321 score cp 240 pv e2e4 e7e5','b');
  assert.equal(parsed.depth,12);assert.equal(parsed.nodes,54321);
  assert.deepEqual(parsed.score,{kind:'cp',value:240,perspective:'b'});
  assert.equal(parsed.scoreCp,-240);assert.deepEqual(parsed.pv,['e2e4','e7e5']);
});

test('UCI mate scores remain typed and normalize for graphs',()=>{
  const white=parseUciInfo('info depth 20 score mate 3 pv e2e4','w');
  const black=parseUciInfo('info depth 20 score mate -2 pv e7e5','b');
  assert.deepEqual(white.score,{kind:'mate',moves:3,perspective:'w'});
  assert.equal(white.scoreCp,9970);assert.equal(black.scoreCp,9980);
});

test('non-score UCI lines do not invent evaluations',()=>{
  assert.deepEqual(parseUciInfo('bestmove e2e4','w'),{});
  assert.equal(parseUciInfo('info depth 4 string book','w').score,undefined);
});
