// ---- the technical-debt register: where the NEXT shadow probably is ---------------------------
//
// check_rule_owners.mjs is the gate, and it is narrow on purpose — it covers only rules that have
// actually been centralized. This is its sibling and its opposite: broad, heuristic, and about
// everything that has NOT been centralized yet. It finds candidate duplications by SHAPE rather
// than by name, so it can point at families nobody has thought to look for.
//
// ---- why this is identity-based and not a count ------------------------------------------------
//
// The first version compared a total against a baseline: at or below, exit 0; above, exit 1. That
// has a hole, and it is not a small one. Suppose the baseline is six:
//
//   one old candidate is fixed · one entirely new duplicate is introduced · count is still six · PASS
//
// Or two shadows are fixed and nobody lowers the baseline, leaving two units of silent headroom for
// future regressions. So "a new duplicate is stopped at the door" was simply not true of a count.
//
// The register below carries STABLE IDS instead, each with a status and a reason, and the check
// runs BOTH directions:
//
//   found − KNOWN  → fail. A new candidate. Centralize it, or register it with a reason.
//   KNOWN − found  → fail. A resolved candidate. Delete its entry IN THE SAME COMMIT.
//
// The second is a *good* failure: it forces the ratchet to tighten when it can, and leaves no
// unused allowance lying about. A changed candidate becomes one removed ID plus one new ID, so it
// cannot hide behind an unchanged total.
//
// This is not a hidden ignore list. Every entry is printed on every run, every entry carries a
// reason, legitimate data stays visible rather than being suppressed, and the queue is ordered.
// An `IGNORE` list you cannot see is how a check dies; a register you must read is how it lives.
//
//   node tools/audit_semantic_shadows.mjs feudal_manors_v3g.html
import fs from "node:fs";
import crypto from "node:crypto";

// ---- IDENTITY vs FINGERPRINT ------------------------------------------------------------------
// A first version keyed expression families on a hash of their source text. That is a fingerprint,
// not an identity, and the difference showed within a minute: unrelated edits shifted the medReq
// hash and the register reported "one resolved, one new" for a family that had not moved at all.
// Safe — it errs toward asking — but it is noise, and noise is what teaches people to skip a check.
//
// So the two jobs are separated. A candidate has a STABLE SEMANTIC ID, matched by a pattern that
// survives reformatting, and a FINGERPRINT of its normalised text. Three distinct events:
//
//   unknown semantic ID              → NEW: a candidate nobody has registered
//   registered ID not found          → RESOLVED (or renamed): remove it in this commit
//   registered ID, changed print     → CHANGED: one copy was edited. Review — this is how two
//                                       copies of a rule drift, and it is the event worth catching
//
// The third is new and is the reason to do this at all: under a bare fingerprint, an edit to one of
// two duplicate copies looked identical to a fix plus an unrelated regression. Now it says what it
// is. Normalisation strips comments and collapses whitespace, so cosmetic edits are silent.
//
// `match` identifies the family semantically. For key-signature and array families the signature IS
// the identity, so `match` is omitted and the ID stands alone.
const KNOWN = {
  "arr:[24,36,48]": {
    status: "debt", priority: 1,
    reason: "a garrison triple (12 families × GARR) computed at two sites instead of derived once"
  },
  "militia:medium-horse-requirement": {
    status: "debt", priority: 2,
    match: /const medReq\s*=/,
    print: "c567b283",
    reason: "the assize's mounted-serjeant rule (medReq) written out in renderLadder and again in " +
            "quotaOf — the most load-bearing of the queue, and the next migration"
  },
  "keys:esq,kt1,kt2,kt4": {
    status: "debt", priority: 3,
    reason: "RUNGANCH / RUNGFEE and a third rung map. Named by the round-3 review; deferred, not " +
            "overlooked — the Realms closure keys its own roster the same way"
  },
  "keys:ang,dis,dom": {
    status: "debt", priority: 4,
    reason: "definition display-name maps in different prose forms — the same family SCUT was, " +
            "before the drifted copies were found printing '(undefined)'"
  },
  "keys:fam,id,parent": {
    status: "legitimate-data", priority: 99,
    reason: "the vassal roster's own rows. Registered rather than filtered because a real shadow " +
            "could wear this shape, and a reader should see that it was considered"
  },
  "keys:h_fam,h_holder,l_assess": {
    status: "legitimate-data", priority: 99,
    reason: "self-test fixtures painting an estate — repetition is what a fixture IS"
  }
};

const file = process.argv[2] || "feudal_manors_v3g.html";
const src  = fs.readFileSync(file, "utf8");
const code = [...src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "))
  .replace(/(^|[^:"'\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(Math.max(0, m.length - p.length)));
const lineOf = idx => code.slice(0, idx).split("\n").length;
const hash8  = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);

const seen = new Map();              // id -> {text, lines[]}
const note = (id, text, idx) => {
  if(!seen.has(id)) seen.set(id, {text, lines: []});
  seen.get(id).lines.push(lineOf(idx));
};

// ---- 1. object literals with the same KEY SIGNATURE -------------------------------------------
// Two objects keyed {dom, ang, dis, ord} are two answers to "what does each definition mean", and
// the four scutage name maps were exactly this shape. The keys are the rule; the values drift.
for(const m of code.matchAll(/\{([^{}\n]{12,200})\}/g)){
  const keys = [...m[1].matchAll(/(^|,)\s*([A-Za-z_$][\w$]*)\s*:/g)].map(k => k[2]);
  if(keys.length < 3) continue;
  const sig = keys.slice().sort().join(",");
  note("keys:" + sig, "{" + sig + "}", m.index);
}

// ---- 2. numeric array literals ------------------------------------------------------------------
// [2,3,4] was transcribed three times. Any repeated numeric tuple is a candidate constant.
for(const m of code.matchAll(/\[\s*-?\d+(?:\s*,\s*-?\d+){1,9}\s*\]/g)){
  const lit = m[0].replace(/\s/g, "");
  note("arr:" + lit, lit, m.index);
}

// ---- 3. identical non-trivial expressions ---------------------------------------------------------
// A ternary or arithmetic expression written out twice is a rule with two implementations, whether
// or not anyone has named it. These get a SEMANTIC id where the register supplies a `match` pattern,
// and fall back to a fingerprint id only while unregistered — so a new candidate announces itself
// with something a human then names, rather than living forever as a hash.
const SEMANTIC = Object.entries(KNOWN).filter(([, v]) => v.match);
for(const m of code.matchAll(/[^\n;{}]{24,120}\?[^\n;{}]{4,60}:[^\n;{}]{2,60}/g)){
  const t = m[0].trim().replace(/\s+/g, " ");
  if(!/[<>=+\-*/]/.test(t)) continue;
  const hit = SEMANTIC.find(([, v]) => v.match.test(t));
  note(hit ? hit[0] : "expr:" + hash8(t), t, m.index);
}

// ---- the contiguity filter --------------------------------------------------------------------
// The seven rows of the title table all share one key signature — because they are seven rows of
// ONE table, which is the opposite of a shadow. A duplication only matters when the copies are in
// different PLACES. Without this the tool reports every data literal and is ignored within a week.
const SPREAD = 4;
const separated = lines => {
  const ls = lines.slice().sort((a, b) => a - b);
  return ls.some((l, i) => i > 0 && l - ls[i-1] > SPREAD);
};

const found = new Map([...seen.entries()].filter(([, v]) => v.lines.length > 1 && separated(v.lines)));

// ---- the three-way diff -------------------------------------------------------------------------
const isNew    = [...found.keys()].filter(id => !(id in KNOWN));
const resolved = Object.keys(KNOWN).filter(id => !found.has(id));
// …and the event a bare fingerprint could not name: the family is still there and its text moved.
// One of two duplicate copies was edited, which is precisely how a pair drifts apart.
const changed  = Object.entries(KNOWN)
  .filter(([id, k]) => k.print && found.has(id) && hash8(found.get(id).text) !== k.print)
  .map(([id, k]) => ({id, was: k.print, now: hash8(found.get(id).text), text: found.get(id).text}));

const order = id => (KNOWN[id]?.priority ?? 0);
console.log(`semantic shadows: ${found.size} candidates, ${Object.keys(KNOWN).length} registered\n`);
[...found.keys()].sort((a, b) => order(a) - order(b)).forEach(id => {
  const f = found.get(id), k = KNOWN[id];
  console.log(`  ×${f.lines.length}  ${id}${k ? `  [${k.status}]` : "  ← NOT REGISTERED"}`);
  console.log(`        ${f.text.slice(0, 96)}`);
  console.log(`        lines ${f.lines.join(", ")}`);
  if(k) console.log(`        ${k.reason}`);
  console.log("");
});

if(isNew.length){
  console.log(`NEW: ${isNew.length} candidate${isNew.length>1?"s":""} not in the register — ${isNew.join(", ")}`);
  console.log("Centralize it, or add it to KNOWN with a status and a reason. Do not delete the finding.");
}
if(resolved.length){
  console.log(`RESOLVED: ${resolved.join(", ")} — no longer detected.`);
  console.log("Remove the entr" + (resolved.length>1?"ies":"y") + " from KNOWN in this same commit. A stale");
  console.log("register is unused headroom, and unused headroom is where the next shadow hides.");
}
if(changed.length){
  changed.forEach(c => {
    console.log(`CHANGED: ${c.id} — fingerprint ${c.was} → ${c.now}`);
    console.log(`  ${c.text.slice(0, 96)}`);
  });
  console.log("The family is still duplicated and its text has moved: one copy was edited. Check that");
  console.log("EVERY copy got the edit — a pair that no longer agrees is the defect this register");
  console.log("exists to find. Then update `print` to the new fingerprint.");
}
if(isNew.length || resolved.length || changed.length) process.exitCode = 1;
else console.log("Register exact. The queue above is the migration backlog, in priority order.");
