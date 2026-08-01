# tools/ — the verification harness

Dev-time only. **`index.html` never loads any of this**, so "one self-contained file, no build step,
no dependencies, works offline from a memory stick" stays true of the thing actually shipped.

Requires Node (24 tested). No packages, no install, no lockfile — clone and run.

These are published because the page's claims about itself ought to be checkable by someone other
than its author. The module argues that a reader should be able to audit where every figure comes
from; publishing the harness is that argument applied to the verification.

## Run everything

```
node tools/run_selftest.mjs index.html      # the in-page suite, driven headless
node tools/sweep.mjs        index.html      # ~4,800 states, no NaN or undefined
node tools/check_nav.mjs    index.html      # the estate survives a nav click
node tools/audit_a11y.mjs   index.html
node tools/audit_contrast.mjs
node tools/audit_units.mjs  index.html
```

`.github/workflows/verify.yml` runs exactly these on every push.

## Which of these can actually fail

| Script | Behaviour |
|---|---|
| `run_selftest.mjs` | **gate** — exits 1 on any failed check |
| `sweep.mjs` | **gate** — exits 1 if any state is defective |
| `check_nav.mjs` | **gate** — exits 1 on any failed check |
| `cmpnum` · `cmpnumoffice` · `cmprealm` | **gate**, but needs a baseline — local pre-release, not CI |
| `audit_a11y` · `audit_contrast` · `audit_units` | **not gates, by design** — always exit 0 |

This table is here because it was once false. `sweep.mjs` and the three numeric diffs printed their
findings and exited 0 regardless, so a run reporting fifty defective states stayed green and a diff
that found a real numeric change reported it and passed. The claim that they "fail" described the
intent, not the behaviour. All four now set `process.exitCode`.

`process.exitCode` rather than `process.exit()` throughout: the latter can truncate pending stdout
on a pipe, and the output most at risk is the failure detail that is the whole reason to run the
thing. That applies to the two scripts that always did gate, so they were changed too.

The audits stay non-gating deliberately — they are lists, and a number that grows is the finding.
That is a choice, not an oversight, and it is why they are named separately above.

## What each one is

**`harness.mjs`** — the shared core. A `vm` context with about a hundred lines of fake DOM, enough
to evaluate the single `<script>` in `index.html` and drive its real controls. Everything else
imports it; nothing re-implements it.

**`run_selftest.mjs`** — prints the opening writ, fires the load handlers, shows all three tabs, and
runs `FM.selfTest()`. The suite itself lives **in the page**: run it in any browser by appending
`#selftest` to the URL, or by calling `FM.selfTest()` in the console. This script is only a way to
run it without one. **192 checks, 0 failures** at the current build.

**`sweep.mjs`** — walks ~4,800 dial combinations and fails on any `NaN`, `undefined` or empty figure
reaching the writ, a card or the ladder. Catches the class of bug where one rare combination of
century, definition and assessment produces a sentence with a hole in it.

**`check_nav.mjs`** — the only one that fires a real event. Clicks an anchor through the page's own
delegated handler and asserts what lands in the address: tab, estate and section together. It exists
because every anchor was once an ordinary `<a href="#sec-…">`, so one nav click replaced the whole
fragment and a configured estate fell out of it — invisibly, until a reload.

**`audit_a11y.mjs`** — controls with no accessible name; **visually-hidden controls still reachable**;
`for`/`aria-*` pointing at no id; duplicated ids; tables with no caption; `<th>` with no scope. It
reads the markup *and* the engines' template literals, so a control generated at runtime is checked
like one written by hand. Currently **0 · 0 · 0 · 0 · 0 · 0**.

The second check is the one worth understanding. Ten choice controls were each *two* controls: a
`<select>` clipped to one pixel — invisible, still focusable, still announced — behind a visible
group of buttons. Four tab stops per setting, the same choice announced twice. Visually hiding an
interactive element is only safe if it is **also** `tabindex="-1"` **and** `aria-hidden="true"`, or
genuinely `display:none`.

**`audit_contrast.mjs`** — 53 colour pairs against WCAG 2.1, **0 failing**. `--before` restores the
earlier palette and reproduces its 11 failures, so the finding survives the fix. Pairs are listed by
hand rather than parsed out of the CSS: a reader meets a badge on a card on parchment, three
backgrounds deep, and a parser would report which colours *meet* rather than which are actually read
against each other. **Add a coloured rule to the page, add its pair here.**

**`audit_units.mjs`** — the standing bare-`gp` audit. Every quantity should carry its unit (`gp/mo`,
`gp once`, `gp for the term`, `gp/yr`, `gp/family`), with two deliberate exemptions: figures inside
an equation whose result carries the unit, and hyphenated grade-names like "the 100-gp body", which
are names rather than quantities. It scans the first two tabs only.

**The three audits are LISTS, not gates.** They print what they find and always exit 0. A number
that grows is the finding. They are in the workflow so the numbers are on the record for every
commit, not because they can fail a build.

## The three that need a baseline, and are not in CI

```
node tools/cmpnum.mjs       BASE.html index.html    # 288 estate states
node tools/cmpnumoffice.mjs BASE.html index.html    # 2,700 office states
node tools/cmprealm.mjs     BASE.html index.html    # 49 realm-model fields
```

These render both files across many dial states and compare every number. They turn "that probably
didn't break anything" into "288 estate and 2,700 office states are numerically identical", which is
what makes a presentation or accessibility change safe to ship.

They are **not** in the workflow, because a baseline belongs to the release it was taken from and no
workflow can invent one. Take a copy before starting work, and diff against it:

```
cp index.html /tmp/base.html
# …make changes…
node tools/cmpnum.mjs /tmp/base.html index.html
```

`cmpnum.mjs` carries two exclusion lists: `ADDED` (text the candidate deliberately adds — stripped
from the **candidate only**) and `REBUILT` (sections deliberately rewritten — stripped from
**both**). Empty is the correct state and the state to start from. **An exclusion list belongs to
its baseline**: point an old list at a new baseline and it strips text the baseline already
contains, manufacturing a difference on every state.

## What the harness cannot see

**It has no geometry.** `getBoundingClientRect()` returns zeros and `querySelectorAll` returns an
empty list. Every layout fault this project has had was found by eye, in a real browser — including
one where the harness reported a feature's arithmetic correct while that feature was, on screen,
unreadable. Look at the page once per change. The harness proves what a page computes, never what
it looks like.

It also auto-creates any id it is asked for, so a check that depends on `getElementById` returning
null cannot be written against it.
