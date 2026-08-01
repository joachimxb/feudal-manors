// The anchor takeover, fired for real. Node is the only ground truth here for two reasons: the
// preview pane serves cached snapshots of a file: URL (it served a HALF-updated one while this
// very item was being built — the build stamp present, commitDial absent), and the in-page
// #selftest cannot fire a delegated document click without a real DOM behind it.
//
// What it guards — the defect the second external review found, which is the worst the page has
// had. Every anchor on the page was an ordinary <a href="#sec-…">, so ONE nav click replaced the
// whole fragment and the estate fell out of the address. Nothing on screen changed. It surfaced
// only on reload, or on handing the link to someone else, by which time the manor was gone.
//
// #selftest covers the fragment WRITER (hashStr, pure). This covers the WIRING: that a click on
// an anchor is intercepted at all, that it is prevented, and that what lands in the address after
// it carries the tab, the estate and the section together.
//
//   node tools/check_nav.mjs feudal_manors_v3g.html
import {buildContext} from "./harness.mjs";

const FILE = process.argv[2];
if(!FILE){ console.error("usage: node tools/check_nav.mjs <file.html>"); process.exit(1); }
const {ctx, win, fire, hashes} = buildContext(FILE);
win._load.forEach(fn => fn());

const L = ctx.FM.link;
let pass = 0, fail = 0;
const T = (name, fn) => {
  let r; try{ r = fn(); }catch(e){ r = e.message; }
  if(r === true){ pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + "  — " + r); }
};

// a stand-in for the anchor the reader clicked: the delegated handler reads exactly two things
// off it, and this supplies exactly those two
const clickAnchor = href => {
  const a = {getAttribute: k => (k === "href" ? href : null)};
  return fire("click", {target:{closest: sel => (sel === 'a[href^="#"]' ? a : null)}});
};
const lastHash = () => hashes[hashes.length - 1] || "";

console.log("\nthe anchor takeover — a nav click must not drop the estate\n");

T("a document click listener is registered at all",
  () => Object.keys(ctx.FM.link).length > 0 && typeof L.hash === "function"
        ? true : "FM.link.hash missing — the chrome did not run");

T("a click on a real section is intercepted",
  () => clickAnchor("#sec-ladder") === true ? true : "the default was allowed to run");

T("…and the section reaches the address",
  () => lastHash().indexOf("sec-ladder") > 0 ? true : lastHash());

T("…alongside the tab",
  () => lastHash().indexOf("#tab-domains") === 0 ? true : lastHash());

// NB the "unknown anchor falls through to the browser" branch cannot be checked here: this stub's
// getElementById auto-creates any id it is asked for, so goAnchor finds a section for every href.
// What CAN be checked is the other half of the guard — a click on something that is not an anchor
// at all must never be touched, and that is the case a delegated handler most easily gets wrong.
T("a click on something that is not an anchor is left alone",
  () => fire("click", {target:{closest: () => null}}) === false ? true : "it was intercepted anyway");

// now arm the address with an estate, exactly as the Copy-link button does, and click again
const shot = L.encode();
T("with an estate in the address, a nav click keeps it", () => {
  const before = hashes.length;
  // the Copy-link handler is what arms LINK_ADDR; drive the same path it does
  ctx.document.getElementById("sheetlink").dispatchEvent(new ctx.Event("click"));
  clickAnchor("#sec-muster");
  const h = lastHash();
  if(hashes.length <= before) return "nothing was written to the address";
  if(h.indexOf("fm=") < 0)          return "the estate fell out: " + h;
  if(h.indexOf("sec-muster") < 0)   return "the section fell out: " + h;
  if(h.indexOf("#tab-domains") !== 0) return "the tab fell out: " + h;
  // and the estate in the address must be the estate on the dials, not a stale copy
  return h.indexOf(shot) > 0 ? true : "the estate written is not the one on the dials: " + h;
});

T("Reset empties the estate out of the address again", () => {
  L.reset();
  const h = lastHash();
  return h.indexOf("fm=") < 0 ? true : "the discarded manor is still in the address: " + h;
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
