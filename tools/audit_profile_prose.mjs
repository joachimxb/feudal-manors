// ---- no prose may state a profile-dependent rate as bare fact ---------------------------------
//
// The module opens on the CUSTOMARY rent, where a fee-holder nets `land − 2`. For most of this
// file's life the only economy was RAW's, so the prose says `land+3` in a dozen places as though it
// were a fact about fees rather than a fact about one profile. Every one of those sentences became
// wrong on the day the dial shipped, and none of them could be caught by any check the project had:
// they are static markup, so the sweep never renders them, and they contain no digits the numeric
// diffs compare.
//
// This is the check for that class. Every occurrence of a profile-dependent rate in prose must sit
// near a SCOPING token — "ACKS RAW", "customary", "by RAW", and so on — so a reader always knows
// which ledger the sentence is keeping.
//
// It reads the HTML BODY only. Rates inside <script> are the engine's business and are governed by
// check_rule_owners.mjs, which asks a stronger question of them.
//
//   node tools/audit_profile_prose.mjs feudal_manors_v3g.html
//
// This IS a gate. The Library pass that made it green is the kind of work that silently un-does
// itself the next time somebody writes a paragraph from memory.
import fs from "node:fs";

const file = process.argv[2] || "feudal_manors_v3g.html";
const src  = fs.readFileSync(file, "utf8");

// body prose only — everything outside <script>…</script>
const prose = src.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, m => m.replace(/[^\n]/g, " "));

// the rates that move with the custom of record. `land+6` is the GROSS (idle-plough) rate;
// `land+1 / land / land−1` is the RAW demesne triplet.
const RATES = [
  /land\s*\+\s*3\b/g,
  /land\s*\+\s*6\b/g,
  /land\s*\+\s*4\s*\+\s*2\b/g,
  /land\s*\+\s*1\s*\/\s*land\s*\/\s*land\s*[−-]\s*1/g,
  /\b9\s*gp\s*(?:\/|per\s+)famil/gi
];

// a sentence is scoped if any of these appears within WINDOW characters either side
const SCOPES = /ACKS RAW|RAW revenues|RAW ledger|by RAW|under RAW|at RAW|strict RAW|RAW's own|customary|Customary|RAW fee-holder/;
const WINDOW = 420;

const lineOf = i => src.slice(0, i).split("\n").length;
const findings = [];
for(const re of RATES){
  re.lastIndex = 0;
  let m;
  while((m = re.exec(prose))){
    const around = prose.slice(Math.max(0, m.index - WINDOW), m.index + WINDOW);
    if(SCOPES.test(around)) continue;
    findings.push({
      line: lineOf(m.index),
      rate: m[0],
      text: prose.slice(Math.max(0, m.index - 90), m.index + 90).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
    });
  }
}

const total = RATES.reduce((s, re) => s + (prose.match(re) || []).length, 0);
console.log(`profile prose: ${total} profile-dependent rates in the body, ${findings.length} unscoped`);
if(!findings.length){
  console.log("  ✓ every one sits beside the ledger it belongs to");
} else {
  console.log("");
  findings.forEach(f => {
    console.log(`  ✗ line ${f.line} — "${f.rate}" stated without saying which profile`);
    console.log(`      …${f.text}…`);
    console.log(`      Say "under ACKS RAW revenues" or give both readings. The module opens CUSTOMARY,`);
    console.log(`      where a fee-holder nets land − 2, so an unqualified land+3 is simply wrong on load.\n`);
  });
  process.exitCode = 1;
}
