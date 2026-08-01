import {buildContext} from "./harness.mjs";
const A = buildContext(process.argv[2]), B = buildContext(process.argv[3]);
const set = h => (id,v) => { const e = h.byId(id); if(e.type==="checkbox") e.checked=!!v; else e.value=String(v); };
const clean = s => s.replace(/<span class="bdg[^"]*"[^>]*>[\s\S]*?<\/span>/g,"").replace(/<[^>]*>/g," ").replace(/\s+/g," ");
const nums = s => (clean(s).match(/-?[\d,]*\.?\d+/g)||[]).map(x=>x.replace(/,/g,""));
let ok=0; const bad=[];
for(const mode of ["h","a1","a2","a3","a4"])
for(const dem of [0,160,780,2000]) for(const bnd of [0,600,20000])
for(const rate of [1,2,3]) for(const cls of [0,1,2]) for(const pay of [0,8,9,4096,16384]){
  const st={o_hench:mode,o_dem:dem,o_bnd:bnd,o_rate:rate,o_cls:cls,o_pay:pay};
  const run=h=>{Object.keys(st).forEach(k=>set(h)(k,st[k])); h.ctx.renderOffice();
    return nums(h.byId("ocards").innerHTML+" | "+h.byId("oflags").innerHTML+" | "+h.byId("odial").innerHTML);};
  const a=run(A), b=run(B);
  if(a.join("|")===b.join("|")) ok++; else { let i=0; while(i<a.length&&a[i]===b[i])i++;
    bad.push(JSON.stringify(st)+` @#${i}: […${a.slice(Math.max(0,i-3),i+3).join(" ")}…] vs […${b.slice(Math.max(0,i-3),i+3).join(" ")}…]`); }
}
console.log(`offices: ${ok} numerically identical, ${bad.length} differing`);
bad.slice(0,4).forEach(d=>console.log("  "+d));

// ---- the exit code, which is the only thing a workflow reads ----------------------------------
// This script printed its findings and exited 0 regardless. In CI that means a run reporting
// defects stays GREEN, and a README calling this a gate is telling the truth about the intent and
// not about the behaviour. process.exitCode rather than process.exit(): the latter can truncate
// pending stdout on a pipe, and the output most at risk is the failure detail you actually need.
if(bad.length) process.exitCode = 1;
