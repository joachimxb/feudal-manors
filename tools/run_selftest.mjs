// Prints the opening writ, fires the load handlers, shows all three tabs, runs FM.selfTest().
// NOT the shipped test — the shipped test is the in-page #selftest block. This exists only
// because the preview pane serves cached snapshots of a file: URL.
//
// It used to carry its OWN copy of buildContext — a second transcription of the fake DOM, with no
// build step to keep the two honest, which is exactly the drift the artifact itself is one file to
// avoid. The copies then diverged: harness.mjs was fixed to resolve the duplicated id="land" the
// way getElementById does (first in document order — the Domains slider), and this file was not,
// so a link carrying land=99 read as unclamped here and clamped everywhere else. One core now.
import {buildContext} from "./harness.mjs";

const {ctx, byId, win} = buildContext(process.argv[2]);

const FM = ctx.FM;
if(!FM || !FM.selfTest){
  console.error("no FM.selfTest — keys:", FM ? Object.keys(FM) : "no FM");
  process.exit(1);
}

// the opening writ, as the page renders it before anything is touched — the regression that
// matters most, since the whole point of the stash is that this sentence keeps saying the same thing
const writ = byId("sbwrit").innerHTML.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
console.log("\nOPENING WRIT:\n" + writ + "\n");

// the load handlers, then every tab — the "switch each tab, check the console" pass, headless
try {
  win._load.forEach(fn => fn());
  ["domains", "officers", "realms", "domains"].forEach(t => ctx.showTab(t));
} catch(e){
  console.error("TAB/LOAD THREW:", e.message, e.stack.split("\n")[1]);
  process.exit(1);
}
console.log("load handlers + all three tabs: no throw");

let r;
try { r = FM.selfTest(); }
catch(e){
  console.error("selfTest THREW:", e.message, "\n", e.stack.split("\n").slice(0, 6).join("\n"));
  process.exit(1);
}
console.log(`\n${r.pass} passed, ${r.fail} failed${r.skip ? `, ${r.skip} skipped` : ""}\n`);
for(const o of r.out) if(o.ok === false) console.log("FAIL · " + o.name + "  — " + o.got);
// exitCode, not exit(): those FAIL lines are the whole reason to run this, and process.exit()
// can truncate pending stdout on a pipe — cutting exactly the output CI exists to surface.
process.exitCode = r.fail ? 1 : 0;
