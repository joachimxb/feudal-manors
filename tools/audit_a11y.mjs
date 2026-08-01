// The standing accessibility audit — the sibling of audit_units.mjs, and the same kind of thing:
// a list of what is still unnamed, not a pass/fail gate. It reads the MARKUP (regex, no DOM),
// because that is where the page's semantics are authored; anything the engines generate at
// runtime is checked in the same pass by scanning the template literals in the script.
//
//   node tools/audit_a11y.mjs feudal_manors_v3g.html
//
// What it reports:
//   · a control (<input>/<select>/<textarea>) with no accessible name — no <label for>, no
//     aria-label, no aria-labelledby, and not wrapped in a <label>
//   · a <button> with neither text nor aria-label
//   · a for= / aria-labelledby / aria-controls that points at an id nothing carries
//   · a duplicated id (id="land" is the known one — see the handoff)
//   · a <table> with no <caption>, and a <th> with no scope
// Counts at the item-7 baseline: 0 unnamed, 0 dangling, 1 duplicated id (land), 0 uncaptioned,
// 0 unscoped. A number that grows is the finding.
import fs from "node:fs";

const FILE = process.argv[2] || "feudal_manors_v3g.html";
const html = fs.readFileSync(FILE, "utf8");
// comments talk ABOUT the markup — this file's comments quote tags and ids constantly, and every
// one of them was a false positive before they were stripped. CSS is stripped for the same reason.
const script = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"))
                   .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const markup = html.slice(html.indexOf("</style>"), html.indexOf("<script>"))
                   .replace(/<!--[\s\S]*?-->/g, "");

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`)) ||
            tag.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`));
  return m ? m[1] : undefined;
};
// ---- every id in the file, markup and generated alike -----------------------------------------
// Anchored to a real tag, so an id NAMED in a comment ("the id=\"land\" collision") is not counted
// as one. Template ids (id="vf_${v.id}") count once, as the one line that writes them.
const ids = new Map();
for(const src of [markup, script])
  for(const m of src.matchAll(/<[a-zA-Z][^>]*?\bid\s*=\s*["']([^"']+)["'][^>]*>/g))
    ids.set(m[1], (ids.get(m[1]) || 0) + 1);

const report = (title, rows) => {
  console.log(`\n${title}: ${rows.length}`);
  rows.forEach(r => console.log("   " + r));
};

const both = markup + "\n" + script;

// ---- labels ------------------------------------------------------------------------------------
const labelled = new Set();                               // ids a <label for> names
for(const m of both.matchAll(/<label\b[^>]*>/g)){
  const f = attr(m[0], "for");
  if(f) labelled.add(f);
}
// a control written INSIDE a <label> is named by it — the .tick rows on Feudal Realms do this
const wrapped = new Set();
for(const m of markup.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g))
  for(const c of m[1].matchAll(/<(?:input|select|textarea)\b[^>]*>/g)){
    const id = attr(c[0], "id"); if(id) wrapped.add(id);
    if(!id) wrapped.add("§" + c.index);                   // unidentified but still wrapped
  }

const unnamed = [], dangling = [];
const scan = (src, where) => {
  for(const m of src.matchAll(/<(input|select|textarea)\b[^>]*>/g)){
    const t = m[0], type = (attr(t, "type") || "").toLowerCase();
    if(type === "hidden") continue;
    const id = attr(t, "id");
    const named = (id && labelled.has(id)) || attr(t, "aria-label") || attr(t, "aria-labelledby") ||
                  (id && wrapped.has(id)) || attr(t, "title");
    // a control inside a <label>…</label> in generated markup: cheap containment test
    const near = src.slice(Math.max(0, m.index - 400), m.index);
    const inLabel = /<label\b[^>]*>(?:(?!<\/label>)[\s\S])*$/.test(near);
    if(!named && !inLabel) unnamed.push(`${where} ${t.slice(0, 90)}`);
  }
  for(const m of src.matchAll(/<button\b[^>]*>([\s\S]{0,200}?)<\/button>/g)){
    const text = m[1].replace(/<[^>]*>/g, "").replace(/\$\{[^}]*\}/g, "x").trim();
    if(!text && !attr(m[0], "aria-label")) unnamed.push(`${where} ${m[0].slice(0, 90)} (no text)`);
  }
};
scan(markup, "markup");
scan(script, "script");

// ---- references that point nowhere -------------------------------------------------------------
// Scanned TAG BY TAG, not over the raw text: the script also *talks about* these attributes —
// `c.indexOf('aria-controls="' + pop + '"')` inside the self-test parses as four broken references
// if you read the file as a flat string. An ARIA reference only means anything on a tag.
for(const t of both.matchAll(/<[a-zA-Z][^>]*>/g))
  for(const a of ["for", "aria-labelledby", "aria-controls", "aria-describedby"]){
    const v = attr(t[0], a);
    if(v === undefined || v.indexOf("$") >= 0) continue;      // a template id resolves at runtime
    // `for` on <output> lists the controls that fed it; on <label> it is the control it names
    for(const ref of v.split(/\s+/))
      if(ref && !ids.has(ref)) dangling.push(`${a}="${ref}" — ${t[0].slice(0, 90)}`);
  }

// ---- tables -------------------------------------------------------------------------------------
const nocap = [], noscope = [];
for(const m of both.matchAll(/<table\b[^>]*>/g)){
  // an empty shell in the markup is filled by the engine — its caption lives in that template
  const empty = /^<table\b[^>]*><\/table>/.test(both.slice(m.index));
  if(!/<caption\b/.test(both.slice(m.index, m.index + 400)) && !empty)
    nocap.push(both.slice(m.index, m.index + 60));
}
for(const m of both.matchAll(/<th\b([^>]*)>/g))
  if(!/\bscope=/.test(m[1])) noscope.push("<th" + m[1] + ">");

// ---- a control that is hidden to the eye but not to the keyboard ---------------------------------
// The general form of the duplicate-keyboard-path fault: the ten .srsel <select>s were clipped to
// one pixel — invisible — while remaining focusable AND in the accessibility tree, each shadowed by
// a visible .cbox group. One setting, two controls, four tab stops. Visually hiding a control is
// only safe if it is ALSO out of the tab order (tabindex="-1") and out of the tree (aria-hidden),
// or genuinely display:none. Anything else is a control nobody can see and everybody can reach.
const VHCLASS = /\b(srsel|vh)\b/;
const ghosts = [];
for(const m of both.matchAll(/<(input|select|textarea|button|a)\b([^>]*)>/g)){
  const at = m[2];
  const cls = (at.match(/\bclass\s*=\s*"([^"]*)"/) || [, ""])[1];
  if(!VHCLASS.test(cls)) continue;
  if(/\bhidden\b/.test(at)) continue;                       // truly out of the document
  const hasTab = /\btabindex\s*=\s*"-1"/.test(at);
  const hasAria = /\baria-hidden\s*=\s*"true"/.test(at);
  if(!hasTab || !hasAria)
    ghosts.push(`<${m[1]} ${(at.match(/\bid="[^"]*"/) || ["(no id)"])[0]}> — ` +
                `${!hasTab ? "still in the tab order" : ""}${!hasTab && !hasAria ? " and " : ""}` +
                `${!hasAria ? "still in the accessibility tree" : ""}`);
}

report("controls with no accessible name", unnamed);
report("visually-hidden controls still reachable", ghosts);
report("references pointing at no id", dangling);
report("duplicated ids", [...ids].filter(([, n]) => n > 1).map(([k, n]) => `${k} × ${n}`));
report("tables with no caption", nocap);
report("<th> with no scope", noscope);
console.log(`
No duplicated id is expected: the file has none. The last was id="land" — the Domains slider and
the Realms select — which left the Realms dial inert for as long as the tabs have existed; the
Realms one is r_land now. Before treating a NEW duplicate as a fault, check whether it is written
by a template that REPLACES its markup copy (nav-jump was, until it went): that shape reads as a
duplicate here while only one is ever in the DOM.`);
