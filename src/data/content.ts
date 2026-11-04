import {Chess,INITIAL_FEN} from '../core/chess/Chess.js';
import {classifyPattern,type TacticPattern} from '../core/learning/patterns.js';
export type Opening={id:string;title:string;side:'w'|'b';moves:string[];explanations:string[];idea:string;trap:string;alternatives?:Record<number,string[]>};
export const openings:Opening[]=[
 {id:'italian',title:'Italian Game',side:'w',moves:'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3'.split(' '),explanations:[
  'The pawn occupies the center and opens diagonals for the queen and the f1 bishop.',
  'Black claims matching central space and opens paths for the queen and f8 bishop.',
  'The knight develops and attacks e5, asking Black to consider that pawn.',
  'The knight develops while protecting e5. One move can therefore serve two purposes.',
  'The bishop develops toward f7, a sensitive square near Black’s king. This creates pressure, not an immediate threat to win a pawn.',
  'Black develops a bishop toward f2 and waits to see White’s plan.',
  'This pawn supports a later d4 advance. White is preparing central action rather than forcing it immediately.',
  'Black develops and attacks e4, creating counterplay instead of only defending.',
  'This supports e4 and opens a path for the c1 bishop, choosing a solid setup before further central action.'
 ],idea:'Develop rapidly, claim central squares, and prepare d4 with c3.',trap:'Early queen adventures lose tempi; watch for ...Nf6 attacks.',alternatives:{8:['O-O']}},
 {id:'ruy',title:'Ruy Lopez',side:'w',moves:'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7'.split(' '),explanations:[
  'The pawn occupies the center and opens diagonals for the queen and f1 bishop.',
  'Black matches White’s central space and opens lines for development.',
  'The knight develops and attacks e5.',
  'The knight develops and defends e5.',
  'The bishop attacks the knight that defends e5. This is pressure on the center; it does not immediately win the pawn.',
  'Black asks the bishop to choose a square and gains the option to challenge it again with ...b5.',
  'The bishop keeps pressure on c6 while stepping away from the pawn attack.',
  'Black develops the knight and attacks e4, giving White something concrete to consider.',
  'Castling protects the king and connects the rooks before the position becomes more tactical.',
  'The bishop develops and prepares kingside castling.'
 ],idea:'Pressure e5 through the c6 defender; castle before launching tactics.',trap:'Do not assume the e5 pawn can simply be won.'},
 {id:'queens',title:"Queen's Gambit",side:'w',moves:'d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7'.split(' '),explanations:[
  'The d-pawn takes central space and opens the c1 bishop’s diagonal.',
  'Black occupies a central square and opens the c8 bishop’s diagonal.',
  'The c-pawn challenges d5. If Black captures, White can try to use the open center and develop with tempo.',
  'The e-pawn supports d5 and opens the f8 bishop; the tradeoff is that the c8 bishop remains behind the pawn chain.',
  'The knight develops and adds pressure to d5.',
  'The knight develops and defends d5.',
  'The bishop develops and pins the f6 knight to the queen, indirectly adding pressure to d5.',
  'The bishop develops, reduces the effect of the pin, and prepares castling.'
 ],idea:'Offer the c-pawn to challenge the center; develop before recovering material.',trap:'Greedily holding c4 often costs Black development.'},
 {id:'sicilian',title:'Sicilian Najdorf',side:'b',moves:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'.split(' '),explanations:[
  'White occupies the center and opens two pieces for development.',
  'Black attacks d4 from the flank instead of copying ...e5, creating an asymmetrical struggle.',
  'The knight develops and prepares the d4 advance.',
  'This pawn controls e5 and opens the c8 bishop while keeping a flexible center.',
  'White challenges the c5 pawn and opens more lines in the center.',
  'Black exchanges a flank pawn for a central pawn, leaving Black with more pawns in the center files.',
  'White recaptures and develops a knight onto an active central square.',
  'The knight develops and attacks e4, provoking White to define the center.',
  'The knight develops and protects e4.',
  'This small pawn move keeps White’s pieces away from b5 and can support ...b5 later; it is useful, but not magic or mandatory in every Sicilian.'
 ],idea:'Fight for d4 asymmetrically and prepare a flexible ...a6.',trap:'Premature ...e5 creates weak d5 squares.'},
 {id:'caro',title:'Caro-Kann',side:'b',moves:'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5'.split(' '),explanations:[
  'White occupies the center and opens the queen and f1 bishop.',
  'Black prepares ...d5 by giving that advance support from the c-pawn.',
  'White builds a second central pawn and opens the c1 bishop.',
  'Black challenges e4 immediately rather than letting White keep an uncontested center.',
  'The knight develops and protects e4.',
  'Black exchanges into e4, removing White’s central pawn and resolving the immediate tension.',
  'White recaptures and places the knight centrally; Black can now develop while asking where that knight belongs.',
  'The bishop develops outside the coming pawn chain, before ...e6 could shut it in.'
 ],idea:'Challenge e4 with a solid pawn base while developing the light bishop.',trap:'Do not trap the bishop behind ...e6 before it develops.'},
 {id:'french',title:'French Advance',side:'b',moves:'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6'.split(' '),explanations:[
  'White takes central space and opens paths for the queen and bishop.',
  'Black prepares ...d5. The cost is that the c8 bishop is temporarily confined.',
  'White builds a broad center with a second pawn.',
  'Black challenges e4 and opens development for the c8 bishop, although the e6 pawn still limits it.',
  'White gains space and fixes the pawn chain. Black now knows which central structure to attack.',
  'Black attacks d4, the base of White’s advanced pawn chain, instead of waiting passively.',
  'White reinforces d4 with another pawn.',
  'The knight develops and adds direct pressure to d4.',
  'The knight develops and defends d4.',
  'The queen moves toward b2 and prepares more pressure on the center. This early queen move has a concrete target, rather than being a general rule.'
 ],idea:'Attack d4 with ...c5, ...Nc6, and ...Qb6; watch b2.',trap:'Do not let White permanently lock your c8 bishop without counterplay.'}
];
export type MasterGame={id:string;title:string;white:string;black:string;year:number;result:string;score:string;source:string;notes:{ply:number;text:string}[]};
export const masters:MasterGame[]=[
 {id:'morphy',title:'The Opera Game',white:'Paul Morphy',black:'Duke Karl / Count Isouard',year:1858,result:'1-0',source:'https://en.wikipedia.org/wiki/Opera_Game',score:'1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#',notes:[{ply:12,text:'The queen joins the threat on f7 while development leads the attack.'},{ply:18,text:'A tactical knight sacrifice exposes the consequences of lagging development.'},{ply:25,text:'The rook sacrifice opens lines when piece activity matters more than material.'},{ply:32,text:'The final rook delivers mate: the position was prepared long before the last move.'}]},
 {id:'capablanca',title:'Defending the Marshall Attack',white:'José Raúl Capablanca',black:'Frank Marshall',year:1918,result:'1-0',source:'https://chessmotion.com/explore/famous-chess-games/capablanca-marshall-attack',score:'1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5 9. exd5 Nxd5 10. Nxe5 Nxe5 11. Rxe5 Nf6 12. Re1 Bd6 13. h3 Ng4 14. Qf3 Qh4 15. d4 Nxf2 16. Re2 Bg4 17. hxg4 Bh2+ 18. Kf1 Bg3 19. Rxf2 Qh1+ 20. Ke2 Bxf2 21. Bd2 Bh4 22. Qh3 Rae8+ 23. Kd3 Qf1+ 24. Kc2 Bf2 25. Qf3 Qg1 26. Bd5 c5 27. dxc5 Bxc5 28. b4 Bd6 29. a4 a5 30. axb5 axb4 31. Ra6 bxc3 32. Nxc3 Bb4 33. b6 Bxc3 34. Bxc3 h6 35. b7 Re3 36. Bxf7+',notes:[{ply:15,text:'The Marshall gambit begins with ...d5: initiative is exchanged for material.'},{ply:29,text:'Marshall invests further material; White must weigh king safety against grabbing pawns.'},{ply:37,text:'Capablanca consolidates under pressure instead of rushing to counterattack.'},{ply:70,text:'A calculated forcing move closes a long defensive conversion.'}]},
 {id:'tal',title:'The Initiative Transforms',white:'Mikhail Tal',black:'Vasily Smyslov',year:1959,result:'1-0',source:'https://chessmotion.com/explore/famous-chess-games/tal-smyslov-1959',score:'1. e4 c6 2. d3 d5 3. Nd2 e5 4. Ngf3 Nd7 5. d4 dxe4 6. Nxe4 exd4 7. Qxd4 Ngf6 8. Bg5 Be7 9. O-O-O O-O 10. Nd6 Qa5 11. Bc4 b5 12. Bd2 Qa6 13. Nf5 Bd8 14. Qh4 bxc4 15. Qg5 Nh5 16. Nh6+ Kh8 17. Qxh5 Qxa2 18. Bc3 Nf6 19. Qxf7 Qa1+ 20. Kd2 Rxf7 21. Nxf7+ Kg8 22. Rxa1 Kxf7 23. Ne5+ Ke6 24. Nxc6 Ne4+ 25. Ke3 Bb6+ 26. Bd4',notes:[{ply:18,text:'A knight outpost on d6 helps coordinate a direct assault.'},{ply:27,text:'The queen moves toward h4 while a bishop is exposed: initiative is a concrete calculation.'},{ply:31,text:'A knight check forces the king to account for threats to h5 and f7.'},{ply:43,text:'The attack resolves into a favorable material balance, not necessarily checkmate.'}]},
 {id:'fischer',title:'Game of the Century',white:'Donald Byrne',black:'Bobby Fischer',year:1956,result:'0-1',source:'https://www.bobbychess.com/en/games/byrne-fischer-1956-game-of-the-century/',score:'1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2#',notes:[{ply:21,text:'...Na4 gains time on the queen: a forcing move creates tactical possibilities.'},{ply:33,text:'...Be6 offers the queen to exploit White’s uncastled king.'},{ply:48,text:'Fischer prioritizes active pieces and a stream of checks over recovering material immediately.'},{ply:81,text:'A coordinated final mating net ends the struggle.'}]},
 {id:'kasparov',title:"Kasparov's Immortal",white:'Garry Kasparov',black:'Veselin Topalov',year:1999,result:'1-0',source:'https://github.com/kerry-huang-nyu/chessRobot/blob/main/kasparov_topalov_1999.pgn',score:'1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7',notes:[{ply:47,text:'The exchange sacrifice begins a king hunt. Concrete checks matter more than a quick material count.'},{ply:53,text:'The exposed king survives only through precise calculation on both sides.'},{ply:71,text:'A quiet retreat, Bf1, appears in the middle of a forcing attack.'},{ply:73,text:'The rook joins the tactical net and converts the initiative.'}]}
];
export type EndgameSuccess='promote'|'mate'|'draw'|'win';
export type Endgame={id:string;title:string;fen:string;side:'w'|'b';goal:string;lesson:string;success:EndgameSuccess;source?:string};
export const endgames:Endgame[]=[
 {id:'pawn',title:'Opposition & Key Squares',fen:'8/8/4k3/8/4P3/4K3/8/8 w - - 0 1',side:'w',goal:'Promote your pawn or checkmate.',lesson:'Keep your king active and protect the pawn; avoid stalemate.',success:'promote'},
 {id:'lucena',title:'Lucena — Build the Bridge',fen:'1K6/1P1k4/8/8/8/8/r7/4R3 w - - 0 1',side:'w',goal:'Build the bridge and promote the b-pawn.',lesson:'Use a rook lift to shield your king from side checks.',success:'promote',source:'https://chessmotion.com/explore/endgames/lucena-position'},
 {id:'philidor',title:'Philidor — Third-Rank Defense',fen:'r7/8/8/8/3pk3/3R4/3K4/8 w - - 0 1',side:'w',goal:'Defend the pawn ending and seek a draw.',lesson:'Your rook must constrain the opposing king before checking from behind.',success:'draw'},
 {id:'queenpawn',title:'Queen vs. Advanced Pawn',fen:'8/8/8/5Q2/4K3/8/2p5/k7 w - - 0 1',side:'w',goal:'Stop the pawn without stalemating the king.',lesson:'The pawn one square from promotion can create stalemate resources.',success:'win'},
 {id:'mate',title:'Queen & King Mate',fen:'7k/8/5K2/8/8/8/8/6Q1 w - - 0 1',side:'w',goal:'Deliver checkmate.',lesson:'Limit the lone king’s space and bring your king closer.',success:'mate'}
];
export type Calculation={id:string;intro:string;sequence:string[];answer:string;explanation:string;sourceLine:string};
export const calculations:Calculation[]=[
 {id:'calc1',intro:'Italian development',sequence:'e4 e5 Nf3 Nc6 Bc4'.split(' '),answer:'Bc5',explanation:'The bishop develops toward f2 and mirrors White’s active setup.',sourceLine:'italian'},
 {id:'calc2',intro:'Opening tension',sequence:'e4 e5 Nf3 Nc6 Bb5'.split(' '),answer:'a6',explanation:'The pawn asks the bishop to choose a square and prepares a later ...b5 challenge.',sourceLine:'ruy'},
 {id:'calc3',intro:'Queen’s Gambit',sequence:'d4 d5 c4'.split(' '),answer:'e6',explanation:'The e-pawn reinforces d5 and opens the f8 bishop’s diagonal.',sourceLine:'queens'},
 {id:'calc4',intro:'Sicilian structure',sequence:'e4 c5 Nf3 d6 d4'.split(' '),answer:'cxd4',explanation:'Black exchanges a flank pawn for White’s central d-pawn.',sourceLine:'sicilian'},
 {id:'calc5',intro:'Caro-Kann center',sequence:'e4 c6 d4 d5 Nc3'.split(' '),answer:'dxe4',explanation:'Black removes the e4 pawn and resolves the central tension.',sourceLine:'caro'},
 {id:'calc6',intro:'French Advance',sequence:'e4 e6 d4 d5 e5'.split(' '),answer:'c5',explanation:'Black attacks d4, the base supporting White’s advanced e5 pawn.',sourceLine:'french'},
 {id:'calc7',intro:'Italian follow-up',sequence:'Nf3 Nc6 Bc4 Bc5'.split(' '),answer:'c3',explanation:'The c-pawn supports a later d4 advance instead of forcing it unprepared.',sourceLine:'italian'},
 {id:'calc8',intro:'Queen’s Gambit response',sequence:'c4 e6 Nc3 Nf6'.split(' '),answer:'Bg5',explanation:'The bishop develops and pins the f6 knight to the queen, adding indirect pressure to d5.',sourceLine:'queens'}
];
export function calculationStart(c:Calculation){const g=new Chess();const line=openings.find(o=>o.id===c.sourceLine);if(!line)throw Error('Unknown source line');const start=line.moves.join(' ').indexOf(c.sequence.join(' '));if(start<0)throw Error('Calculation sequence absent');const prefix=line.moves.slice(0,line.moves.join(' ').slice(0,start).trim().split(/\s+/).filter(Boolean).length);for(const s of prefix)g.move(s);return g}
export type TransferPuzzle={id:string;pattern:TacticPattern;fen:string;best:string;title:string;lesson:string};
/**
 * Transfer tests: the same verified tactical idea in a previously unseen
 * position. Every declared pattern is re-verified from the rules at startup;
 * a position whose claim cannot be verified fails validation loudly.
 */
export const transferPuzzles:TransferPuzzle[]=[
 {id:'transfer-mate-1',pattern:'mate-one',fen:'r1bqk2r/pppp1ppp/2n5/2b1p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1',best:'Qxf7#',title:'The battery lands',lesson:'The queen captures f7 with mate because the c4 bishop protects her. The idea is the coordinated battery, not the early queen raid itself.'},
 {id:'transfer-mate-2',pattern:'mate-one',fen:'6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',best:'Qd8#',title:'The sealed back rank',lesson:'The queen reaches d8 with mate: the king is walled in by its own f7, g7, and h7 pawns and cannot answer the check.'},
 {id:'transfer-hang-1',pattern:'hanging-piece',fen:'r1bqkb1r/pppp1ppp/4p3/8/3nP3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',best:'Nxd4',title:'The knight that walked alone',lesson:'The d4 knight has no defender: the e6 pawn covers d5, not d4, and the queen is blocked by her own d7 pawn. Count defenders before trusting a central outpost.'},
 {id:'transfer-hang-2',pattern:'hanging-piece',fen:'r1bqk2r/pp1p1ppp/2n5/4p3/2b1P3/2N2N2/PPP1QPPP/R1B1KB1R w KQkq - 0 1',best:'Qxc4',title:'The bishop nobody watched',lesson:'The c4 bishop is attacked by the queen and defended by no one. Active squares still need protection.'},
 {id:'transfer-fork-1',pattern:'fork',fen:'r1bqk2r/pp2pppp/2nb1n2/2p5/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 1',best:'e5',title:'One pawn, two targets',lesson:'The pawn advance attacks the d6 bishop and the f6 knight at once; Black cannot save both. Pawn forks are easy to overlook because pawns feel small.'},
 {id:'transfer-fork-2',pattern:'fork',fen:'r1bqk2r/pp1p1ppp/2n5/1N2p3/4P3/8/PPPP1PPP/R1BQKBNR w KQkq - 0 1',best:'Nc7+',title:'The royal fork',lesson:'The knight checks the king from c7 while attacking the a8 rook; the check forces the issue and the rook is lost.'}
];
export function validateContent(){let n=0;for(const o of openings){if(o.explanations.length!==o.moves.length||o.explanations.some(text=>!text.trim()))throw Error('Every opening move needs an explanation: '+o.id);const g=new Chess();for(let i=0;i<o.moves.length;i++){const before=g.fen();g.move(o.moves[i]);for(const alt of o.alternatives?.[i]||[]){const branch=new Chess(before);branch.move(alt)}}n++}
 for(const m of masters){const g=new Chess().loadPgn(m.score);if(!g.history.length)throw Error('Empty master game');for(const note of m.notes){if(note.ply<0||note.ply>=g.history.length)throw Error('Master note outside game')};n++}
 for(const e of endgames){new Chess(e.fen);if(!['promote','mate','draw','win'].includes(e.success))throw Error('Endgame needs a measurable success condition: '+e.id);n++}
 for(const c of calculations){if(!c.explanation.trim())throw Error('Calculation needs an explanation: '+c.id);const g=calculationStart(c);for(const move of c.sequence)g.move(move);g.move(c.answer);n++}
 for(const t of transferPuzzles){new Chess(t.fen).move(t.best);if(classifyPattern(t.fen,t.best)!==t.pattern)throw Error('Transfer puzzle fails pattern verification: '+t.id);if(t.lesson.trim().length<50)throw Error('Transfer puzzle needs a concrete lesson: '+t.id);n++}return n}
export function starterBlunders(){const a=new Chess().loadPgn('1. f3 e5 2. g4');const b=new Chess().loadPgn('1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6');const c=new Chess('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1');
 const entries=[
  {g:a,best:'Qh4#',bad:'Nc6',title:'Fool’s Mate missed',lesson:'The queen reaches h4 with check along the diagonal to e1. White’s f- and g-pawn advances have exposed the king, and there is no legal answer to this check.'},
  {g:b,best:'Qxf7#',bad:'Qh3',title:'Scholar’s Mate missed',lesson:'The queen captures f7 with check while the c4 bishop protects her. Black’s king cannot answer the attack. The lesson is to notice the coordinated attack—not to assume early queen moves are always good.'},
  {g:c,best:'Re8#',bad:'Re2',title:'Back-rank mate missed',lesson:'The rook moves to e8 with check. Black’s king is trapped by its own f7, g7, and h7 pawns, with no legal escape from the back rank.'}
 ];
 return entries.map(({g,best,bad,title,lesson},i)=>{const test=new Chess(g.fen());const move=test.move(best);if(test.result()!==(g.turn==='w'?'1-0':'0-1'))throw Error('Starter mate is not checkmate: '+best);new Chess(g.fen()).move(bad);return {id:'example-'+i,fen:g.fen(),bad,best:move.san,solved:0,starter:true,title,lesson,pattern:'mate-one' as const}})
}
