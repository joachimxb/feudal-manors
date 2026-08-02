# tools/ — the verification harness

Dev-time only. **The artifact never loads any of this**, so "one file, no build step, no
dependencies, works offline off a memory stick" remains true of the thing you actually ship. These
exist because the preview pane serves *cached snapshots* of a `file:` URL — a tab opened mid-edit
reports old code and looks like a passing test. Node is the only ground truth.

Requires Node (24 tested). No packages, no install.

## The checks — run all of them after every change

```
node tools/run_selftest.mjs      feudal_manors_v3g.html   # 1. must be 222 passed, 0 failed
node tools/sweep.mjs             feudal_manors_v3g.html   # 2. 9,600 states, 0 defective
node tools/cmpnum.mjs       BASE.html feudal_manors_v3g.html   # 3. 288 estate states
node tools/cmpnumoffice.mjs BASE.html feudal_manors_v3g.html   #    2,700 office states
node tools/cmprealm.mjs     BASE.html feudal_manors_v3g.html   #    49 realm-model fields
node tools/check_nav.mjs         feudal_manors_v3g.html   # 5. must be 7 passed, 0 failed
node tools/check_rule_owners.mjs feudal_manors_v3g.html   # 6. must be 0 shadows
node tools/audit_semantic_shadows.mjs feudal_manors_v3g.html   # 7. register must be exact
node tools/audit_badges.mjs       feudal_manors_v3g.html  # 8. must be 0 findings
```

**The sweep carries a named SURFACE MANIFEST, and it prints how many it exercised.** A surface that
renders nothing is indistinguishable from a surface nobody scanned, and that indistinguishability
is the defect: a seeded fault in the glance line left all 9,600 states green because the sweep read
four surfaces and the glance line was not one of them. Now there are eight, each named, each
asserted non-empty, with two recorded as `skip` and a reason (Realms and Officers, covered by their
own diffs). **Add a summary to the page, add it to `SURFACES`** — or say why not, in writing.

Adding the manifest retroactively covered the `(undefined)` scutage bug that four review rounds
found only by reading code: `scutread` is a surface now, and the sweep walks all five rate settings.

**The sweep is 9,600, not 4,800, and the doubling is the point.** The revenue profile
(`l_cust`) re-prices every figure on the page by 2.25×, so a sweep that ran on whichever economy
the page happened to open in had explored the whole state space exactly once, on one side of a
dial. Same rule as always: a dial pinned in the fixture is a dial the suite is blind to.

**`cmpnum` drives `l_cust` itself rather than using a pinned fixture file**, and that is a rule
now, not a preference. The first RAW-pinned comparison was built by editing the markup's selected
option — which did nothing, because the page fires the era preset on load and the preset then
carried a custom, so the "RAW-pinned" run was still computing Customary and reported differences
that read as regressions. **A fixture that depends on the boot sequence preserving it can be
silently overwritten; a dial set after boot cannot.** On a baseline predating the dial the setting
is a harmless no-op (the harness auto-creates unknown ids), which is exactly what makes the run a
backward-compatibility proof against the *original* build rather than against a doctored copy.

### 6 and 7 — the ownership gate and its backlog

`check_rule_owners.mjs` is a **gate** and is deliberately narrow: it covers only rules that have
actually been centralized (rural revenue, garrison, the militia ceiling, the scutage names, the
recorded requirement). A gate that fails on the day it lands gets waived, then disabled, and a
disabled gate reads as green. Each centralization commit removes one family's shadows, adds one
entry here, and proves the entry with a seeded reintroduction.

It earns its place immediately: it found a **fourth** militia site nobody's greps had reached —
the demesne militia in the Realms closure, which counts `dem` rather than `fam`, so every search
written around the variable name walked past it. It asks about the *rule*, not the spelling.

`audit_semantic_shadows.mjs` is its opposite — broad, heuristic, shape-based, and about everything
*not* yet centralized. It is **a ratchet, not a wall**, and it is **identity-based, not a count**.

A count-only baseline has a hole that is not small: fix one candidate, introduce one new one, and
the total is unchanged — so the check passes. Or fix two and forget to lower the baseline, and two
units of silent headroom sit there waiting for the next regression. So the tool carries a `KNOWN`
register of **stable IDs**, each with a status and a reason, and diffs both directions:

```
found − KNOWN  → fail.  A new candidate. Centralize it, or register it with a reason.
KNOWN − found  → fail.  A resolved candidate. Delete its entry IN THE SAME COMMIT.
```

The second is a *good* failure — it forces the ratchet to tighten when it can. A changed candidate
becomes one removed ID plus one new ID, so a swap cannot hide behind an unchanged total. This is
not a hidden ignore list: every entry prints on every run, carries a reason, and legitimate data is
**registered rather than filtered** so a reader can see it was considered.

`audit_badges.mjs` gates the badge system as a system. A provenance badge is this module's whole
claim to being auditable, and adding `RAW-INFORMED` showed the system had **four hand-maintained
places** — CSS, `BDGN`, the reader's legend, `audit_contrast` — and no check. It now also enforces
the house-style rules that were previously eye-enforced: every instance uses a declared kind, is
preceded by a space **as rendered** (a first version tested the preceding source byte and allowed
`>`, which passes `yields</span><span class="bdg">` — that renders "yieldsRAW"), and carries a title.

Check 4 — load handlers plus all three tabs — is folded into `run_selftest.mjs`; it prints
`load handlers + all three tabs: no throw`.

**Which of these can actually fail.** `run_selftest`, `sweep`, `check_nav` and the three numeric
diffs are **gates** — they set `process.exitCode = 1` on a finding. The three audits are **not**,
by design. That distinction was once untrue in the source: `sweep` and the three diffs printed
their findings and exited 0, so a sweep reporting fifty defective states stayed green in CI and a
`cmpnum` that found a real numeric difference reported it and passed. Every release before
2026-08-02 was verified by reading output, not by a gate.

`process.exitCode`, never `process.exit()`: the latter can truncate pending stdout on a pipe, and
the output most at risk is the failure detail you are running the script to see. The two scripts
that always did gate were changed for the same reason.

Proven both ways, which is the standing rule here: a copy of the artifact with one interpolation
misspelled makes `sweep` report every state defective and **exit 1**; a copy with one garrison constant
changed makes `run_selftest` fail two checks and `cmpnum` report 288 differing, both **exit 1**.

The round-5 checks were proven the same way — **twelve seeded faults, twelve red** — and two of
them taught something the green board could not:

- **A seed that does not apply looks exactly like a test that does not work.** One earlier seed was
  written as `return feeNet - …;` against code that is an arrow expression `=> feeNet - …`. It
  silently did not apply and reported a clean pass. Always assert the seed pattern was found before
  believing the result.
- **A seed that stays green may be right about the tool.** Breaking the glance line's interpolation
  left all 9,600 states green — because `sweep` scanned the writ, sheet, card and rungs, and the
  glance line is none of those. It is the most default-facing text on the page. The fix was to the
  sweep, not to the seed.

Round 6 added nine more, all red, and taught a third thing:

- **A non-zero exit is not proof; the reason is.** One seed modified a *tool* rather than the
  artifact, and the modified copy was written to scratch — where its relative import of
  `harness.mjs` failed. The run exited 1 on a module-load error, which reads exactly like a check
  firing. The seed harness now requires the output to carry the check's own vocabulary before it
  counts as proven, and tool-seeds are written into `tools/` so their imports resolve.
- Two seeds proved things the *previous design* of a check would have passed: the swap case for the
  shadow register (one resolved, one new, total unchanged), and a badge run flush against the word
  before it for the spacing rule.

**Check 5 is new, and it is the only one that fires a real event.** `check_nav.mjs` clicks an
anchor and asserts what lands in the address: the tab, the estate and the section, together. It
exists because the second external review found that every anchor was an ordinary
`<a href="#sec-…">`, so one nav click replaced the whole fragment and the estate fell out of it —
invisibly, until a reload. `#selftest` covers the fragment *writer* (`hashStr`, pure); this covers
the *wiring*. Note its one blind spot, recorded in the file: this stub's `getElementById`
auto-creates any id, so "an unknown anchor falls through to the browser" cannot be checked here.

To make it possible the harness grew four things, all of which the rest of the suite now also
sees — re-run everything after touching them:

- **`document.addEventListener` is recorded, not dropped.** A no-op stub reported a delegated
  handler as working while never once calling it.
- **`history.replaceState` records, and updates `location.hash`.** A no-op made every fragment
  assertion vacuous.
- **`fire(type, spec)`**, returned from `buildContext` — dispatches at the document-level handlers
  with a stand-in target, and reports whether the default was prevented.
- **`scrollIntoView`, `select`, `hasAttribute`, `insertAdjacentElement`, `setTimeout`** on the
  element stub. `setTimeout` fires *immediately* rather than never, so a label that restores itself
  on a timer reads as what it will settle to.

`node tools/audit_units.mjs feudal_manors_v3g.html` is the standing bare-`gp` audit: **40 lines,
46 distinct contexts**, all in the two documented exemption classes. Note it scans the Domains and
Officers containers only — the Feudal Realms tab has never been under the unit discipline (see
`structure.md` §5).

`node tools/audit_a11y.mjs feudal_manors_v3g.html` is its sibling, added with item 7: controls with
no accessible name, **visually-hidden controls still reachable**, `for`/`aria-*` pointing at no id,
duplicated ids, tables with no caption, `<th>` with no scope. It reads the markup **and** the
engines' template literals, so a control the Realms engine generates is checked like one written by
hand. Baseline **0 · 0 · 0 · 0 · 0 · 0** — clean on all six.

The second check is the newest and the one worth understanding, because it is the general form of a
fault this page shipped with. The ten `.srsel` selects were clipped to a pixel — invisible — while
staying focusable *and* in the accessibility tree, each shadowed by a visible `.cbox` group: one
setting, two controls, four tab stops, announced twice. Visually hiding a control is only safe if it
is **also** `tabindex="-1"` **and** `aria-hidden="true"`, or genuinely `display:none`. Anything else
is a control nobody can see and everybody can reach. Run it against a build from before the fix and
it reports **9**, so the finding survives the fix.

`node tools/audit_contrast.mjs` is the third: **53 colour pairs against WCAG 2.1, 0 failing**
(47 at item 7; +3 for the `.boundnote` on its three grounds, +3 for the ledger reading on the bar). `--before` restores the pre-item-7 palette and reproduces all **11** original failures, so
the finding survives the fix. The pairs are listed by hand rather than parsed out of the CSS — a
reader reads a badge on a card on parchment, three backgrounds deep, and a parser would tell you
which colours *meet*, not which ones are read one against the other. **Add a coloured rule to the
page, add its pair here.**

**None of the three is a gate.** They are lists, and a number that grows is the finding.

## Before you start an item

**Copy the artifact to a baseline first.** Check 3 is worthless without it, and it is the check
that turns "that probably didn't break anything" into "288 estate states and 2,700 office states
are numerically identical".

```
cp feudal_manors_v3g.html /somewhere/base_item7.html
```

Baselines are **not** kept here — they are 500 KB each and belong in scratch space.

## The exclusion lists, and the trap in them

`cmpnum.mjs` has `ADDED` (text the candidate deliberately adds — stripped from the **candidate
only**) and `REBUILT` (sections deliberately rewritten — stripped from **both**).

**Both lists are empty, which is the correct state.** The last entry was the equation drawer in
`REBUILT` — needed only while the baseline predated the muster drawer. That drawer shipped with v3
on 2026-08-02, so both sides carry it now and the entry had to go: left in, it would strip the
drawer from both files and hide any regression inside it.

When a difference is intentional, add it to `ADDED` *with a comment saying why*: the list is the
record of what you meant to change, and it is what lets the next diff be strict again.

The trap: **an exclusion list belongs to its baseline.** Point an old list at a new baseline and it
strips text the baseline already contains, manufacturing a difference on every state. Item 3 lost
time to exactly this. If you inherit a `cmpnum` copy with entries in it, check they still apply.

## The fault the four checks could not see, and the two tests that now do

All four checks passed at 100% while the grown-manor card told a reader that an estate meeting its
keep to the shilling was *below* it — because `base()` pins **land 6**, and the fault only exists at
the land values it does not pin.

The quantity is `clears` = ⌈anchor ÷ (land+3)⌉ × (land+3) − anchor: a **remainder**, not an income.
It is exactly 0 whenever the keep divides the land value — **all four rungs at land 7**, two at land
5, one each at land 3 and 9 — and three separate cards divide by it. Two carried a zero branch; the
third had `> 0` where it needed three ways, so 1,153 reachable configurations printed the shortfall
prose over a headline reading `0 gp/mo of surplus`.

`cmpnum` could not see it either: **both strings are prose with no digits in them**, and cmpnum
compares the ordered numerals. It reported 288/288 identical across the fix, correctly.

The lesson is the general one, and §18a of the self-test is written to it: **when a dial's default is
pinned in the fixture, the test suite is blind to that dial.** Where a quantity can be zero, sweep
the dial inside the test rather than asserting at the default — `no card divides by a zero surplus,
land 3–9` walks 3..9 and asserts that a zero is always *named* and never divided.

## What the harness cannot see

It has **no geometry** — `getBoundingClientRect()` returns zeros and `querySelectorAll` returns an
empty list. Every layout fault this project has found was found by eye, in a real browser, and item 7
made that three items running: the sidenotes had been anchored to markers **in hidden tabs** (which
measure zero) since the tabs were introduced, so notes 1 and 2 flew up over the header on every tab.
The harness reported 144/144 throughout. One live look per item, and read the newest tab **without
reloading it** — the pane serves the snapshot the tab was opened with.

## Two things that have already gone wrong here

- **`run_selftest.mjs` used to carry its own copy of `buildContext`** instead of importing
  `harness.mjs` — two transcriptions of the fake DOM with nothing keeping them honest. They
  diverged over the duplicated `id="land"`, and a self-test failed in Node while passing in a
  browser. It imports the core now. **Do not re-fork it.**
- **`id="land"` used to be duplicated in the artifact** (the Domains slider, then the Realms select),
  and `harness.mjs` resolves ids in **document order, first wins**, exactly as `getElementById` does.
  Two separate scan passes got this backwards and handed out the Realms select, which carries no
  `min`/`max` — so the harness bounded nothing where a browser bounds 3–9, and a self-test failed in
  Node while passing in a browser. The collision is fixed (the Realms dial is `r_land`), so nothing
  turns on it today; **the single-pass scan stays** — it is what `getElementById` actually does, and
  the next duplicate should not cost the same forty minutes.

## Rebuilding from scratch

`feudal_manors_handoff.md` §2.3 specifies `buildContext` line by line, including the non-obvious
step (seeding `fn_*`/`fc_*` from the Realms closure's own `RUNGS` literal, without which the realm
models a realm with no fees in it). Prefer fixing this folder to rebuilding.
