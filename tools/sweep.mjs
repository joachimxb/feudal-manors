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
// 800 replaces 80 as the top of the range: the scope bound moved with the profile work, and a sweep
// that still stopped at the old maximum would leave the whole new decade of the field unswept.
const FAM  = [8,14,23,24,800];
const SCUT = ["raw","ang","john","late","full"];   // the dial's own option values
// THE PROFILE IS A SWEEP DIMENSION, not a fixture pin. Everything above was swept against whatever
// economy the page happened to open in — which is to say the whole state space was explored once,
// on one side of a dial that re-prices every figure in it by 2.25×. tools/README's standing rule:
// a dial pinned in the fixture is a dial the suite is blind to. ~4,800 → ~9,600. (Round-4 review §8.)
const CUST = ["cust","raw"];

const set = (id, v) => { const e = byId(id); if(e.type === "checkbox") e.checked = !!v; else e.value = String(v); };

// ---- the surface manifest ----------------------------------------------------------------------
// A seeded fault broke the glance line's interpolation and all 9,600 states stayed green, because
// the sweep scanned four surfaces and the glance line was not one of them — despite being the most
// default-facing text on the page. The lesson generalises: EVERY default-facing output surface needs
// an explicit place in the verification manifest, or a future summary can sit outside the sweep
// silently for as long as this one did.
//
// So the surfaces are NAMED, and the run asserts every named surface was actually reached and
// non-empty. A surface that renders nothing is indistinguishable from a surface nobody scanned, and
// that indistinguishability is the whole defect.
//
// ADD A SUMMARY TO THE PAGE, ADD IT HERE. If it cannot be read from this harness, say so in `skip`
// with a reason — an honest exclusion is a record; a silent one is the bug.
const SURFACES = [
  {name:"writ",            read:g => g.__writ},
  {name:"sheet",           read:() => byId("sheetgrid").innerHTML + byId("sheetwarn").innerHTML +
                                      byId("sheetnote").innerHTML},
  {name:"household cards", read:() => byId("hcards").innerHTML},
  {name:"rungs",           read:() => byId("rungs").innerHTML},
  {name:"glance",          read:() => byId("hglance").innerHTML + "|" + (byId("glanceland").textContent || "")},
  {name:"units",           read:() => byId("ucards").innerHTML},
  {name:"ladder table",    read:() => byId("cmptable").innerHTML},
  {name:"scutage reading", read:() => byId("scutread").innerHTML},
  // Feudal Realms and Officers are driven by their own engines and are covered by cmprealm and
  // cmpnumoffice rather than by this dial sweep. Recorded rather than omitted.
  {name:"realm readout",   skip:"driven by the Realms closure — covered by cmprealm.mjs"},
  {name:"officers",        skip:"driven by renderOffice — covered by cmpnumoffice.mjs"}
];
const reached = new Set();

for(const holder of HOLD)
for(const def of DEF)
for(const assess of ASSESS)
for(const asz of [true,false])
for(const land of LAND)
for(const cdef of (holder === "lag" ? CDEF : ["ang"]))
for(const fam of (holder === "lag" ? FAM : [23]))
for(const smode of SCUT)
for(const cust of CUST){
  set("l_era",""); set("h_holder",holder); set("l_def",def); set("l_assess",assess);
  set("l_asz",asz); set("land",land); set("h_cdef",cdef); set("h_fam",fam);
  set("h_cls",1); set("dens",375); set("l_sq",true); set("h_chart","1"); set("l_scut",smode);
  set("l_cust",cust);
  let where = "";
  try {
    g.renderLadder(); g.renderUnits(); g.renderHousehold();
    const st = g.readState();
    const F = g.facts(st);
    const writ = g.renderWrit(st, F);
    // the sheet is written from the same st + F, and is swept for the same three symptoms: it is
    // a second surface onto the stash, so a field the stash never set surfaces here as readily
    g.renderSheet(st, F);
    g.__writ = writ;                       // the one surface that is a return value, not an element
    // every NAMED surface, read through the manifest rather than by hand — so adding a surface to
    // the page and forgetting to add it here is a finding rather than a silence
    for(const s of SURFACES){
      if(s.skip) continue;
      const text = String(s.read(g) ?? "");
      if(text.trim()) reached.add(s.name);
      if(!where && bad.test(text)) where = s.name.toUpperCase() + " " + (text.match(bad)||[])[0];
    }
  } catch(e){ where = "THREW " + e.message; }
    if(!where){ const p = g.FM.link.encode().slice(3).split("_");
      if(p.length !== g.FM.link.dials.length + 1) where = "LINK token count " + p.length;
      else if(p.some(x => x === "")) where = "LINK empty token"; }
  n++;
  if(where) hits.push(`${where} · ${holder}/${def}/${assess}/asz=${asz}/land=${land}/cdef=${cdef}/fam=${fam}/scut=${smode}/cust=${cust}`);
}
console.log(`${n} states swept, ${hits.length} defective`);
hits.slice(0, 25).forEach(h => console.log("  " + h));

// ---- and the manifest itself, which is the check the glance-line seed asked for -----------------
// A surface that was never reached is not "clean"; it is unswept, and the two are indistinguishable
// from a green board. This is what stops the next summary sitting outside the sweep for a year.
const missed = SURFACES.filter(s => !s.skip && !reached.has(s.name)).map(s => s.name);
const skipped = SURFACES.filter(s => s.skip);
console.log(`surfaces: ${reached.size}/${SURFACES.length - skipped.length} exercised` +
            (skipped.length ? `, ${skipped.length} covered elsewhere` : ""));
skipped.forEach(s => console.log(`  – ${s.name}: ${s.skip}`));
if(missed.length){
  console.log(`\nUNSWEPT SURFACE${missed.length>1?"S":""}: ${missed.join(", ")}`);
  console.log("Never rendered anything across the whole run. Either the surface is dead, or the");
  console.log("manifest is reading the wrong element — both are findings, neither is a pass.");
  process.exitCode = 1;
}

// ---- the exit code, which is the only thing a workflow reads ----------------------------------
// This script printed its findings and exited 0 regardless. In CI that means a run reporting
// defects stays GREEN, and a README calling this a gate is telling the truth about the intent and
// not about the behaviour. process.exitCode rather than process.exit(): the latter can truncate
// pending stdout on a pipe, and the output most at risk is the failure detail you actually need.
if(hits.length) process.exitCode = 1;
