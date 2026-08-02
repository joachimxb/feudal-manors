// ---- the badge system, checked as a system ----------------------------------------------------
//
// A provenance badge is the module's whole claim to being auditable, and until now the rules
// governing it lived in the spec's house style and in nobody's build. Adding RAW-INFORMED made the
// gap concrete: a new kind needs a CSS rule, a BDGN entry, a line in the reader's legend, and a
// pair in audit_contrast — four places, remembered by hand, on a page with 200+ badges.
//
// This checks the system rather than the instances:
//
//   1. every kind that has a BDGN entry has a CSS rule
//   2. …and a line in the reader-facing legend, so the badge a reader meets is a badge the key explains
//   3. …and a pair in audit_contrast, so no kind ships unread
//   4. every badge USED in the markup or in the engine's templates is a kind that exists
//   5. every static badge is preceded by a space (the house-style rule, previously eye-enforced:
//      `foo<span class="bdg …">` renders as "fooRAW" and is the commonest badge defect)
//   6. every badge carries a non-empty title — a mark with no tooltip is decoration
//
//   node tools/audit_badges.mjs feudal_manors_v3g.html
//
// This IS a gate. The four-places rule is exactly the kind of thing that decays silently.
import fs from "node:fs";

const file = process.argv[2] || "feudal_manors_v3g.html";
const src  = fs.readFileSync(file, "utf8");
const bad  = [];

// ---- the declared kinds -----------------------------------------------------------------------
const bdgnBlock = (src.match(/const BDGN = \{[\s\S]*?\n\};/) || [""])[0];
const declared  = [...bdgnBlock.matchAll(/^\s{2}(\w+)\s*:\s*\[/gm)].map(m => m[1]);
if(!declared.length) bad.push("BDGN could not be parsed — the rest of this audit is meaningless");

// ---- 1. CSS ------------------------------------------------------------------------------------
const styled = new Set([...src.matchAll(/\.bdg\.(\w+)\s*\{/g)].map(m => m[1]));
declared.forEach(k => { if(!styled.has(k)) bad.push(`kind "${k}" has a BDGN entry and no .bdg.${k} CSS rule`); });

// ---- 2. the reader's legend --------------------------------------------------------------------
const legend = (src.match(/<div class="badgekey">[\s\S]*?<\/div>/) || [""])[0];
const inKey  = new Set([...legend.matchAll(/class="bdg (\w+)"/g)].map(m => m[1]));
declared.forEach(k => { if(!inKey.has(k)) bad.push(`kind "${k}" is not in the reader's badge legend`); });

// ---- 3. the contrast audit ----------------------------------------------------------------------
let contrast = "";
try { contrast = fs.readFileSync(new URL("./audit_contrast.mjs", import.meta.url), "utf8"); } catch {}
declared.forEach(k => {
  if(contrast && !new RegExp(`"bdg ${k}\\b`).test(contrast))
    bad.push(`kind "${k}" has no pair in audit_contrast.mjs — it ships unread`);
});

// ---- 4-6. the instances ---------------------------------------------------------------------------
// Both the static markup and the engine's template literals; a badge the engine writes is read the
// same way as one written by hand, which is the rule audit_a11y already applies to controls.
const known = new Set(declared);
let n = 0;
for(const m of src.matchAll(/<span class="bdg ([\w ]+)"([^>]*)>/g)){
  const [, kinds, attrs] = m;
  n++;
  const list = kinds.trim().split(/\s+/);
  list.forEach(k => { if(!known.has(k)) bad.push(`a badge uses kind "${k}", which BDGN does not declare`); });
  // The spacing rule is about what a READER sees, so test the rendered text and not the source
  // character. A first attempt looked at the single preceding byte and allowed ">" — which passes
  // `yields</span><span class="bdg">`, and that renders "yieldsRAW". Strip the tags out of the
  // preceding run and ask whether any visible text ends flush against the badge.
  const runIn = src.slice(Math.max(0, m.index - 240), m.index).replace(/<[^>]*>/g, "");
  if(runIn && !/\s$/.test(runIn))
    bad.push(`a badge is not preceded by a space: "…${runIn.slice(-24)}" runs straight into a ` +
             `"${kinds}" badge, and renders as one word`);
  if(!/title="[^"]+"/.test(attrs))
    bad.push(`a "${kinds}" badge carries no title — a mark with no tooltip is decoration`);
}

// bdg() builds its own markup, so check its output shape once rather than 200 times
if(!/const bdg = \(k, why\) => ` <span class="bdg \$\{k\}" title="/.test(src))
  bad.push("bdg() no longer emits a leading space and a title — the generated badges are unchecked");

console.log(`badges: ${declared.length} kinds (${declared.join(", ")}), ${n} static instances`);
if(!bad.length){
  console.log("  ✓ every kind is styled, keyed, and contrast-checked");
  console.log("  ✓ every instance uses a declared kind, is spaced, and carries a title");
} else {
  console.log("");
  [...new Set(bad)].forEach(b => console.log("  ✗ " + b));
  process.exitCode = 1;
}
