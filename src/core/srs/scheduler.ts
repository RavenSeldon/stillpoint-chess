export type SRS={attempts:number;correctCount:number;lapseCount:number;intervalDays:number;easeFactor:number;nextDueTimestamp:number;masteryPercent:number};
export const intervals=[0,1,3,7,14,30] as const;
export function freshSrs():SRS{return {attempts:0,correctCount:0,lapseCount:0,intervalDays:0,easeFactor:2.5,nextDueTimestamp:0,masteryPercent:0}}
export function review(prev:SRS,correct:boolean,now=Date.now()):SRS{
 const p={...prev,attempts:prev.attempts+1,correctCount:prev.correctCount+(correct?1:0),lapseCount:prev.lapseCount+(correct?0:1)};
 if(!correct){p.intervalDays=1;p.easeFactor=Math.max(1.3,prev.easeFactor-.2)}
 else{const pos=intervals.findIndex(v=>v>=prev.intervalDays);p.intervalDays=intervals[Math.min(intervals.length-1,Math.max(1,pos+1))];p.easeFactor=Math.min(3,prev.easeFactor+.04)}
 p.masteryPercent=Math.min(100,Math.round((p.correctCount/Math.max(1,p.attempts))*60+(Math.log2(p.intervalDays+1)/Math.log2(31))*40));
 p.nextDueTimestamp=now+p.intervalDays*86400000;return p;
}
export function due(s:SRS,now=Date.now()){return s.nextDueTimestamp<=now}
