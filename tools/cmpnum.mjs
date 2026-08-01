// After a markup-only change (badges, unit spans), the NUMBERS must be untouched. Strip the badge
// spans (their tooltips carry page cites, which are digits), keep everything else, and compare the
// ordered sequence of numerals rendered by each build.
import {buildContext} from "./harness.mjs";

const A = buildContext(process.argv[2]), B = buildContext(process.argv[3]);
const setOn = h => (id, v) => { const e = h.byId(id); if(e.type === "checkbox") e.checked = !!v; else e.value = String(v); };
const clean = s => s.replace(/<span class="bdg[^"]*"[^>]*>[\s\S]*?<\/span>/g, "")
                    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
// text the CANDIDATE deliberately adds, removed before comparing so the rest must match exactly
// Reset for the item-3 baseline. base_item1 predated the badge and three-ledger work, so those
// two exclusions hid text items 1 and 2 deliberately ADDED; base_item3 already contains it, and
// keeping them would strip from the candidate only and manufacture a diff. Item 3 adds no text
// inside the four compared regions, so both lists stay empty and the diff stays strict.
// EMPTY is the correct state, and it is the state to hand a new item. The last entry here was the
// equation drawer, needed only while the baseline predated it; the drawer shipped in v3, so both
// sides carry it now and the exclusion had to go — left in, it would strip the drawer from the
// candidate alone and hide any regression inside it. An exclusion list belongs to its baseline.
const ADDED = [];
const REBUILT = [];
const strip = s => ADDED.reduce((t, re) => t.replace(re, ""), s);
const both  = s => REBUILT.reduce((t, re) => t.replace(re, ""), s);
const nums = (s, isB) => (clean(both(isB ? strip(s) : s)).match(/-?[\d,]*\.?\d+/g) || []).map(x => x.replace(/,/g, ""));

const STATES = [];
for(const holder of ["esq","kt1","kt2","kt4","lag","bar"])
for(const def of ["dom","ang","dis","ord"])
for(const assess of ["ancient","current"])
for(const asz of [true,false])
for(const land of [3,6,9])
  STATES.push({h_holder:holder, l_def:def, l_assess:assess, l_asz:asz, land,
               h_cls:1, dens:375, l_sq:true, h_chart:"1", h_cdef:"ang", h_fam:24, l_era:""});

const render = (h, st) => { const set = setOn(h);
  Object.keys(st).forEach(k => set(k, st[k]));
  h.ctx.renderLadder(); h.ctx.renderUnits(); h.ctx.renderHousehold();
  return {card: h.byId("hcards").innerHTML, rungs: h.byId("rungs").innerHTML,
          glance: h.byId("hglance").innerHTML, cmp: h.byId("cmptable").innerHTML}; };

let ok = 0; const bad = [];
for(const st of STATES){
  const a = render(A, st), b = render(B, st);
  let where = null;
  for(const k of ["card","rungs","glance","cmp"]){
    const x = nums(a[k], false), y = nums(b[k], true);
    if(x.join("|") !== y.join("|")){
      let i = 0; while(i < x.length && x[i] === y[i]) i++;
      where = `${k} @#${i}: base […${x.slice(Math.max(0,i-4), i+4).join(" ")}…] vs new […${y.slice(Math.max(0,i-4), i+4).join(" ")}…]`;
      break;
    }
  }
  if(where) bad.push(`${st.h_holder}/${st.l_def}/${st.l_assess}/asz=${st.l_asz}/land=${st.land} · ${where}`);
  else ok++;
}
console.log(`${STATES.length} states · ${ok} numerically identical · ${bad.length} differing`);
const seen = new Set();
for(const d of bad){ const k = d.split("· ")[1].slice(0, 80); if(seen.has(k)) continue; seen.add(k);
  console.log("  " + d); if(seen.size >= 6) break; }

// ---- the exit code, which is the only thing a workflow reads ----------------------------------
// This script printed its findings and exited 0 regardless. In CI that means a run reporting
// defects stays GREEN, and a README calling this a gate is telling the truth about the intent and
// not about the behaviour. process.exitCode rather than process.exit(): the latter can truncate
// pending stdout on a pipe, and the output most at risk is the failure detail you actually need.
if(bad.length) process.exitCode = 1;
