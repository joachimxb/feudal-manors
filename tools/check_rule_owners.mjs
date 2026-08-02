// ---- the ownership gate: a shared rule may have exactly one owner -----------------------------
//
// The defect class this exists for is not "a hardcoded number". It is a SHADOW COPY of a shared
// constant — a second transcription that agrees with the first until some dial makes them disagree,
// at which point one surface is quietly wrong and no numeric diff can see it, because both copies
// were right yesterday. This file shipped with seven of them for the rural revenue rate alone, and
// four name maps for the scutage dial, two of which had drifted so far that three of the five
// settings printed a literal "(undefined)".
//
// A numeric diff cannot catch this. A grep for one formula catches one instance. What catches the
// class is asking, of each centralized rule, whether anything outside its owner still computes it.
//
// THE SCOPE IS DELIBERATELY NARROW, and the narrowness is the design. A gate that fails on the day
// it lands gets waived, then disabled, and a disabled gate reads as green — which is worse than no
// gate, because it is a green light nobody is behind. So this covers ONLY what has actually been
// centralized: the rural revenue profile and the garrison rates. Everything else known to be
// duplicated (the 60/100 definition test in the Realms closure, the rung maps, the grade loops,
// relief 120, the title bands) is real, documented, and lives in audit_semantic_shadows.mjs until
// its migration commit — at which point it moves here, with a seeded reintroduction proving it.
//
// The ratchet: each centralization commit removes one family's shadows, extends this gate by one
// entry, and proves the new entry fails on a seeded copy. Never add an entry that is not green.
//
//   node tools/check_rule_owners.mjs feudal_manors_v3g.html
//
// Exit 1 on a finding. This IS a gate.
import fs from "node:fs";

const file = process.argv[2] || "feudal_manors_v3g.html";
const src  = fs.readFileSync(file, "utf8");

// ---- what counts as production code ----------------------------------------------------------
// Only the script. Prose in the HTML body legitimately SAYS "land+3" — that is the module
// explaining its own arithmetic to a reader, and forbidding it would forbid the documentation.
// Inside the script, comments are stripped for the same reason: a comment recording that a site
// USED to read `land+1-cls` is the record of the fix, not a reintroduction of it.
const scripts = [...src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
if(!scripts.length){ console.log("no <script> found — nothing to check"); process.exitCode = 1; }

// The self-test is deliberately excluded: it asserts the RAW figures as literals ON PURPOSE (its
// whole fixture is pinned to ACKS RAW so the legacy suite becomes the clean-switch proof), so
// `r.fam*(6+3)` there is an assertion about the rate, not a second implementation of it.
const SELFTEST_START = /function\s+selfTest\s*\(|const\s+selfTest\s*=/;

function strip(code){
  // line numbers must survive, so replacements keep newlines
  return code
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(Math.max(0, m.length - p.length)));
}

// ---- the rules under ownership ----------------------------------------------------------------
// Each: a name, the owner it belongs to, and patterns that would be a second implementation of it.
const RULES = [
  {
    rule:  "rural revenue",
    owner: "ruralRevenue() / CUSTOMS — and the stash FM.last for consumers downstream of a render",
    why:   "the rate moves 9 → 4 with the custom of record; a shadow keeps computing the RAW rate " +
           "beside a card showing the customary one, and both look right until the dial splits them",
    pats: [
      [/\bland\s*\+\s*3\b/,                       "land + 3 — the RAW fee-holder's net, recomputed"],
      [/\bland\s*\+\s*4\s*\+\s*2\b/,              "land + 4 + 2 — the RAW gross, recomputed"],
      [/\bland\s*\+\s*1\s*-\s*cls\b/,             "land + 1 − cls — the RAW demesne triplet, recomputed"],
      [/\/\s*\(\s*land\s*\+\s*3\s*\)/,            "division by (land + 3) — a land cost at the RAW rate"],
      [/\.perFam\s*=\s*[^;]*\bland\s*\+\s*3/,     "perFam assigned from land + 3 rather than consumed"],
      [/\bperFam\s*=\s*land\s*\+\s*3\b/,          "a local perFam declared as land + 3"],
      [/\bS_RATE\s*=\s*\[/,                       "S_RATE re-declared as a literal (it derives from GARR)"]
    ]
  },
  {
    rule:  "garrison rates",
    owner: "GARR",
    why:   "RR p.341-2's 2/3/4 by district class. A third transcription is invisible until one of " +
           "them is corrected and the others are not",
    pats: [
      [/\bS_GARR\s*=\s*\[/,                       "S_GARR re-declared as a literal (it aliases GARR)"],
      [/=\s*\[\s*2\s*,\s*3\s*,\s*4\s*\]/,         "a [2,3,4] garrison array outside GARR"]
    ]
  },
  {
    rule:  "the militia ceiling",
    owner: "militiaCount()",
    why:   "RAW does not settle the rounding of 2-per-10, so the module rules on it — and a module " +
           "ruling with two implementations is two rulings. Domains and Realms disagreed for a year",
    pats: [
      [/Math\.floor\(\s*\w+\s*\/\s*10\s*\)\s*\*\s*2/,  "floor(fam/10)×2 — the complete-tens reading"],
      [/Math\.floor\(\s*\w+\s*\*\s*2\s*\/\s*10\s*\)/,  "floor(fam×2/10) inline rather than militiaCount()"]
    ]
  },
  {
    rule:  "the scutage rate names",
    owner: "SCUT / scutName() / scutGloss()",
    why:   "four transcriptions existed and two had drifted behind a dial split, printing " +
           "'(undefined)' on three of five settings",
    pats: [
      [/\{\s*raw\s*:\s*"[^"]*"\s*,\s*(ang|hist)\s*:/, "a scutage name map declared outside SCUT"]
    ]
  },
  {
    rule:  "the recorded requirement",
    owner: "reqOf() / replaceOf()",
    why:   "the paper body is 60 under the Survey's rider and 100 otherwise, and what REPLACING it " +
           "costs is a different figure again at the ordinance — restating either invites the " +
           "'full replacement' error, where a label was true in three definitions and false in one",
    pats: [
      // deliberately loose on the left-hand side: the Realms copy read
      // `(dG("l_def") && dG("l_def").value === "dom") ? 60 : 100`, which a pattern anchored on a
      // bare identifier would have walked straight past. Match the DECISION, not the variable.
      [/===?\s*"dom"[^\n]*\?\s*60\s*:\s*100/,      "the 60/100 requirement test, restated"],
      [/\?\s*60\s*:\s*100/,                       "a 60/100 branch outside reqOf()"]
    ]
  }
];

// ---- ownership exemptions ---------------------------------------------------------------------
// The OWNER of a rule must obviously be allowed to implement it. Each entry names a rule and the
// single line-anchor that is permitted to match it.
const OWNS = {
  "the militia ceiling":       [/const militiaCount\s*=/],
  "the recorded requirement":  [/const reqOf\s*=/, /const replaceOf\s*=/],
  "the scutage rate names":    [/^const SCUT\s*=/m],
  "garrison rates":            [/^const GARR\s/m],
  "rural revenue":             [/^function ruralRevenue\s*\(/m]
};

let findings = [];
scripts.forEach(code => {
  const clean = strip(code);
  const stIdx = (() => { const m = clean.match(SELFTEST_START); return m ? m.index : Infinity; })();
  clean.split("\n").forEach((line, i) => {
    if(i >= 0 && clean.split("\n").slice(0, i).join("\n").length >= stIdx) return;  // self-test: exempt
    for(const R of RULES){
      const owns = OWNS[R.rule] || [];
      if(owns.some(o => o.test(line))) continue;
      for(const [pat, what] of R.pats)
        if(pat.test(line))
          findings.push({rule:R.rule, owner:R.owner, why:R.why, what, line:i+1, text:line.trim().slice(0,120)});
    }
  });
});

// the self-test cut above is coarse; recompute it precisely against absolute offsets
const full   = strip(scripts.join("\n"));
const stAbs  = (()=>{ const m = full.match(SELFTEST_START); return m ? m.index : Infinity; })();
const offset = (() => { const lines = full.split("\n"); let acc = 0, out = [];
  lines.forEach(l => { out.push(acc); acc += l.length + 1; }); return out; })();
findings = findings.filter(f => (offset[f.line-1] ?? 0) < stAbs);

if(!findings.length){
  console.log(`rule owners: ${RULES.length} rules checked, 0 shadows`);
  RULES.forEach(R => console.log(`  ✓ ${R.rule} — owned by ${R.owner.split(" —")[0]}`));
} else {
  console.log(`rule owners: ${findings.length} SHADOW${findings.length>1?"S":""} of a centralized rule\n`);
  findings.forEach(f => {
    console.log(`  line ${f.line} — ${f.what}`);
    console.log(`    rule:  ${f.rule}`);
    console.log(`    owner: ${f.owner}`);
    console.log(`    why:   ${f.why}`);
    console.log(`    code:  ${f.text}\n`);
  });
  process.exitCode = 1;
}
