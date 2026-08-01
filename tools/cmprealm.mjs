// The realm model, field by field, between two builds — at the default dials it must not move.
import {buildContext} from "./harness.mjs";
const A = buildContext(process.argv[2]), B = buildContext(process.argv[3]);
const num = m => Object.fromEntries(Object.entries(m).filter(([,v]) => typeof v === "number"));
const a = num(A.ctx.FM.realmLast), b = num(B.ctx.FM.realmLast);
const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
const diff = keys.filter(k => Math.abs((a[k] ?? NaN) - (b[k] ?? NaN)) > 1e-9 && !(isNaN(a[k]) && isNaN(b[k])));
console.log(`realm model: ${keys.length - diff.length}/${keys.length} fields identical`);
diff.forEach(k => console.log(`  ${k}: ${a[k]} -> ${b[k]}`));
