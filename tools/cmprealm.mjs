// The realm model, field by field, between two builds — at the default dials it must not move.
import {buildContext} from "./harness.mjs";
const A = buildContext(process.argv[2]), B = buildContext(process.argv[3]);
const num = m => Object.fromEntries(Object.entries(m).filter(([,v]) => typeof v === "number"));
const a = num(A.ctx.FM.realmLast), b = num(B.ctx.FM.realmLast);
const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
const diff = keys.filter(k => Math.abs((a[k] ?? NaN) - (b[k] ?? NaN)) > 1e-9 && !(isNaN(a[k]) && isNaN(b[k])));
console.log(`realm model: ${keys.length - diff.length}/${keys.length} fields identical`);
diff.forEach(k => console.log(`  ${k}: ${a[k]} -> ${b[k]}`));

// ---- the exit code, which is the only thing a workflow reads ----------------------------------
// This script printed its findings and exited 0 regardless. In CI that means a run reporting
// defects stays GREEN, and a README calling this a gate is telling the truth about the intent and
// not about the behaviour. process.exitCode rather than process.exit(): the latter can truncate
// pending stdout on a pipe, and the output most at risk is the failure detail you actually need.
if(diff.length) process.exitCode = 1;
