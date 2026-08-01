// A wider sweep than the shipped self-test: every combination of the estate dials, checking the
// rendered card AND the writ for NaN / undefined / [object Object]. Harness-only.
import fs from "node:fs";
import vm from "node:vm";
import {buildContext} from "./harness.mjs";

const {ctx, byId} = buildContext(process.argv[2]);
const g = ctx;
const bad = /NaN|undefined|\[object [A-Za-z]+\]/;
let n = 0, hits = [];

const HOLD = ["esq","kt1","kt2","kt4","lag","bar"];
const DEF  = ["dom","ang","dis","ord"];
const CDEF = ["dom","ang","dis"];
const ASSESS = ["ancient","current"];
const LAND = [3,6,9];
const FAM  = [8,14,23,24,80];
const SCUT = ["raw","ang","john","late","full"];   // the dial's own option values

const set = (id, v) => { const e = byId(id); if(e.type === "checkbox") e.checked = !!v; else e.value = String(v); };

for(const holder of HOLD)
for(const def of DEF)
for(const assess of ASSESS)
for(const asz of [true,false])
for(const land of LAND)
for(const cdef of (holder === "lag" ? CDEF : ["ang"]))
for(const fam of (holder === "lag" ? FAM : [23]))
for(const smode of SCUT){
  set("l_era",""); set("h_holder",holder); set("l_def",def); set("l_assess",assess);
  set("l_asz",asz); set("land",land); set("h_cdef",cdef); set("h_fam",fam);
  set("h_cls",1); set("dens",375); set("l_sq",true); set("h_chart","1"); set("l_scut",smode);
  let where = "";
  try {
    g.renderLadder(); g.renderUnits(); g.renderHousehold();
    const st = g.readState();
    const F = g.facts(st);
    const writ = g.renderWrit(st, F);
    // the sheet is written from the same st + F, and is swept for the same three symptoms: it is
    // a second surface onto the stash, so a field the stash never set surfaces here as readily
    g.renderSheet(st, F);
    const sheet = byId("sheetgrid").innerHTML + byId("sheetwarn").innerHTML + byId("sheetnote").innerHTML;
    const card = byId("hcards").innerHTML;
    const rungs = byId("rungs").innerHTML;
    if(bad.test(writ))  where = "WRIT " + (writ.match(bad)||[])[0];
    else if(bad.test(sheet)) where = "SHEET " + (sheet.match(bad)||[])[0];
    else if(bad.test(card))  where = "CARD " + (card.match(bad)||[])[0];
    else if(bad.test(rungs)) where = "RUNGS " + (rungs.match(bad)||[])[0];
  } catch(e){ where = "THREW " + e.message; }
    if(!where){ const p = g.FM.link.encode().slice(3).split("_");
      if(p.length !== g.FM.link.dials.length + 1) where = "LINK token count " + p.length;
      else if(p.some(x => x === "")) where = "LINK empty token"; }
  n++;
  if(where) hits.push(`${where} · ${holder}/${def}/${assess}/asz=${asz}/land=${land}/cdef=${cdef}/fam=${fam}/scut=${smode}`);
}
console.log(`${n} states swept, ${hits.length} defective`);
hits.slice(0, 25).forEach(h => console.log("  " + h));

// ---- the exit code, which is the only thing a workflow reads ----------------------------------
// This script printed its findings and exited 0 regardless. In CI that means a run reporting
// defects stays GREEN, and a README calling this a gate is telling the truth about the intent and
// not about the behaviour. process.exitCode rather than process.exit(): the latter can truncate
// pending stdout on a pipe, and the output most at risk is the failure detail you actually need.
if(hits.length) process.exitCode = 1;
