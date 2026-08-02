// The standing contrast audit — the third of the three (units, a11y, contrast).
//
//   node tools/audit_contrast.mjs                    # the palette as applied
//   node tools/audit_contrast.mjs --before           # …and what it was before item 7
//
// WCAG 2.1: ordinary text needs 4.5:1, large text (≥24px, or ≥18.66px bold) 3:1, and the boundary
// of a UI COMPONENT 3:1 (1.4.11). A decorative rule is not a component — that distinction is why
// only control borders moved to --rule2 and every card and table keeps --rule.
//
// The pairs below are read off the stylesheet by hand rather than computed from it: a CSS parser
// would tell you which colours meet, not which ones a reader actually reads one against the other
// (a badge on a card on parchment resolves three backgrounds deep). Adding a coloured rule to the
// page means adding its pair here. 53 pairs, 0 failing.
const BEFORE = process.argv.includes("--before");

const hex = h => { h = h.replace("#", ""); if(h.length === 3) h = h.split("").map(c => c + c).join("");
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = h => { const [r, g, b] = hex(h).map(lin); return 0.2126*r + 0.7152*g + 0.0722*b; };
const ratio = (a, b) => { const l1 = L(a), l2 = L(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05); };

// the five variables item 7 moved, and what they were
const V = BEFORE
  ? {gold:"#8a6d1f", goldbg:"#8a6d1f", goldlit:"#8a6d1f", rule2:"#c3ad79", hint:"#8a8270",
     hsub:"#cdbf98"}
  : {gold:"#7d6218", goldbg:"#6d5410", goldlit:"#d6b24a", rule2:"#9c854c", hint:"#736b5a",
     hsub:"#e2d5ad"};
Object.assign(V, {green:"#20492e", green2:"#2f6b41", ink:"#241f16", rule:"#c3ad79",
  alt:"#f3eee1", parch:"#f9f5eb", mute:"#5b5443", red:"#7a2b20",
  white:"#ffffff", bar:"#1a3b26", cream:"#f4ecd6", tan:"#cdbf98"});

// [what, fg, bg, px, bold] — px 0 means a non-text UI boundary, judged at 3:1
const PAIRS = [
  ["body ink on parchment",                V.ink,   V.parch, 16, 0],
  ["body ink on white card",               V.ink,   V.white, 13, 0],
  ["--mute prose on parchment",            V.mute,  V.parch, 13.5, 0],
  ["--mute prose on white card",           V.mute,  V.white, 12.5, 0],
  ["--mute on --alt (zebra rows)",         V.mute,  V.alt,   12.5, 0],
  ["--green heads on parchment",           V.green, V.parch, 21, 1],
  ["--green on white card",                V.green, V.white, 12.5, 1],
  ["--gold .lname on white card",          V.gold,  V.white, 13, 1],
  ["--gold .sect on white card",           V.gold,  V.white, 10.5, 1],
  ["--gold .sk sheet key on white",        V.gold,  V.white, 9.5, 1],
  ["--gold .step .k on white",             V.gold,  V.white, 10.5, 1],
  ["--gold on parchment",                  V.gold,  V.parch, 12, 1],
  ["--gold summary .fold on parchment",    V.gold,  V.parch, 12, 1],
  ["--red flag text on #fbe9df",           V.red,   "#fbe9df", 12.5, 0],
  // the .boundnote — "bounded to 80" beside a numeric dial. Its three grounds, because the dials
  // sit on all three: the levers on parchment, the household card on white, zebra rows on --alt
  ["--red .boundnote on white",            V.red,   V.white, 11.5, 0],
  ["--red .boundnote on parchment",        V.red,   V.parch, 11.5, 0],
  ["--red .boundnote on --alt",            V.red,   V.alt,   11.5, 0],
  ["--red sheetwarn on #f8eceb",           V.red,   "#f8eceb", 11.5, 0],
  ["--hint .lrow.sub on white",            V.hint,  V.white, 11, 0],
  ["--hint .hint on white",                V.hint,  V.white, 12, 0],
  ["--hint .hint on parchment",            V.hint,  V.parch, 12, 0],
  ["header p tan on --green",              V.tan,   V.green, 13, 0],
  // the ledger reading in the state bar — three faces on the bar's own dark green
  ["sbledger row label tan on bar",         V.tan,   V.bar,   12, 1],
  ["sbledger value cream on bar",           V.cream, V.bar,   12, 0],
  ["sbledger note sage on bar",             "#8fa285", V.bar, 12, 0],
  ["header .hframe #e6dcc0 on --green",    "#e6dcc0", V.green, 13.5, 0],
  // the version chip — 11px on the masthead's green, so it is the smallest text on that ground and
  // the pair worth checking. A first draft used a dark grey, which would have been near-invisible:
  // styled for a light background out of habit, on the one dark panel in the document.
  ["header .vchip #cdbf98 on --green",      V.tan,    V.green, 11,   0],
  ["topnav link tan on --green",           V.tan,   V.green, 12.5, 1],
  ["topnav .on #fff on --green",           V.white, V.green, 12.5, 1],
  ["card h4 cream on --green",             V.cream, V.green, 14, 1],
  ["card h4 sub tan on --green",           V.tan,   V.green, 11, 0],
  ["card h4 cream on --goldbg",            V.cream, V.goldbg, 14, 1],
  ["card h4 sub on --goldbg",              V.hsub,  V.goldbg, 11, 0],
  ["table th cream on --green",            V.cream, V.green, 10.5, 1],
  ["writ text #e8dfc6 on the bar",         "#e8dfc6", V.bar, 13, 0],
  ["writ .wed #f7e9b8 on the bar",         "#f7e9b8", V.bar, 13, 1],
  ["writ .wed.bad #ffbfa8 on the bar",     "#ffbfa8", V.bar, 13, 1],
  ["writ .wq #a7b99b on the bar",          "#a7b99b", V.bar, 13, 0],
  ["sbtitle --goldlit on the bar",         V.goldlit, V.bar, 10, 1],
  ["sbhint #8fa285 on the bar",            "#8fa285", V.bar, 10, 0],
  ["wed.open ink on --goldlit",            "#1a1409", V.goldlit, 13, 1],
  ["bdg raw #1c4429 on #eaf2ec",           "#1c4429", "#eaf2ec", 8.5, 1],
  // RAW-INFORMED reuses raw's pair on purpose — same ink, same ground, dashed rule. Listed anyway:
  // a badge kind that is not in this list is a badge kind nobody checked, and the pair being
  // identical is the finding, not a reason to omit it.
  ["bdg rin #1c4429 on #eaf2ec (dashed)",  "#1c4429", "#eaf2ec", 8.5, 1],
  ["bdg mod #6d5410 on #faf3df",           "#6d5410", "#faf3df", 8.5, 1],
  ["bdg his #5b5443 on #f2eee4",           "#5b5443", "#f2eee4", 8.5, 1],
  ["bdg hrn #39587a on #eaf1f7",           "#39587a", "#eaf1f7", 8.5, 1],
  ["bdg dbt #7a2b20 on #f8eceb",           V.red,    "#f8eceb", 8.5, 1],
  ["exchip --mute on parchment",           V.mute,  V.parch, 8.5, 1],
  ["sbtn --green on parchment",            V.green, V.parch, 11.5, 0],
  ["flag ink on #fff7e2",                  V.ink,   "#fff7e2", 12.5, 0],
  ["cbox .cbl green on #fff7e2 (on)",      V.green, "#fff7e2", 12.5, 1],
  ["cbox .cbn mute on #fff7e2 (on)",       V.mute,  "#fff7e2", 11, 0],
  ["--rule2 control border on white",      V.rule2, V.white, 0, 0],
  ["--rule2 control border on parchment",  V.rule2, V.parch, 0, 0],
  ["range accent --green on white",        V.green, V.white, 0, 0],
];

const large = (px, bold) => px >= 24 || (bold && px >= 18.66);
let fails = 0;
console.log(`the palette ${BEFORE ? "BEFORE item 7" : "as applied"}\n`);
console.log("pair".padEnd(38), "ratio", " need", " verdict");
for(const [name, fg, bg, px, bold] of PAIRS){
  const r = ratio(fg, bg), ui = px === 0;
  const need = ui ? 3 : (large(px, bold) ? 3 : 4.5);
  const ok = r >= need;
  if(!ok) fails++;
  console.log(name.padEnd(38), r.toFixed(2).padStart(5), String(need).padStart(5), " ",
    ok ? "AA" + (r >= 7 && !ui ? " (AAA)" : "") : "**FAIL**" + (px ? ` @${px}px` : " (non-text)"));
}
console.log(`\n${fails} failing pair(s) of ${PAIRS.length}` +
  (BEFORE ? " — run without --before for the palette as it now stands" : ""));
