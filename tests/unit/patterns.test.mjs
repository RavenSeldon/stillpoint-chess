import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPattern } from '../../dist/assets/core/learning/patterns.js';
import { transferPuzzles } from '../../dist/assets/data/content.js';

test('rules-verified patterns classify honestly', () => {
  assert.equal(classifyPattern('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 1', 'Qh4#'), 'mate-one');
  assert.equal(classifyPattern('r1bqkb1r/pppp1ppp/4p3/8/3nP3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1', 'Nxd4'), 'hanging-piece');
  assert.equal(classifyPattern('r1bqk2r/pp1p1ppp/2n5/1N2p3/4P3/8/PPPP1PPP/R1BQKBNR w KQkq - 0 1', 'Nc7+'), 'fork');
  assert.equal(classifyPattern('r1bqk2r/pp2pppp/2nb1n2/2p5/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 1', 'e5'), 'fork');
});

test('unverifiable or quiet positions stay unclassified', () => {
  assert.equal(classifyPattern('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e4'), null);
  // A defended capture is not loose material.
  assert.equal(classifyPattern('rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 1', 'Nxd5'), null);
  // A pawn nobody defends is loose material too, however small.
  assert.equal(classifyPattern('rnbqkb1r/pppp1ppp/5n2/4p3/4P3/2N2N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1', 'Nxe5'), 'hanging-piece');
  assert.equal(classifyPattern('invalid fen', 'e4'), null);
});

test('every authored transfer puzzle verifies against its declared pattern', () => {
  assert.equal(transferPuzzles.length, 6);
  for (const puzzle of transferPuzzles)
    assert.equal(classifyPattern(puzzle.fen, puzzle.best), puzzle.pattern, puzzle.id);
});
