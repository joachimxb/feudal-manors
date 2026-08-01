// Throwaway Node harness: enough fake DOM to evaluate the single <script> of a Feudal Manors file.
// NOT the shipped test — the shipped test is the in-page #selftest block. This exists only because
// the preview pane serves cached snapshots of a file: URL.
import fs from "node:fs";
import vm from "node:vm";

export function buildContext(FILE){
  const html = fs.readFileSync(FILE, "utf8");
  const src = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));

  const CTRL = {};
  const attr = (tag, name) => {
    const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
    return m ? m[1] : undefined;
  };
  // Document order, first wins — getElementById's own rule, and the reason both tags are scanned
  // in ONE pass rather than all inputs and then all selects.
  // The file no longer has a duplicate id (the Realms land select became r_land), so nothing
  // depends on this today. It cost forty minutes once and the rule stays: id="land" was carried by
  // the Domains slider and the Realms select, a two-pass scan handed out the second — which has no
  // min/max — and the harness then bounded nothing where a browser bounds 3..9, making a link
  // carrying land=999 look as though the page's clamp had failed. Keep the single pass.
  for(const m of html.matchAll(/<input\b[^>]*>|<select\b[^>]*>[\s\S]*?<\/select>/g)){
    const t = m[0], id = attr(t, "id");
    if(!id || CTRL[id]) continue;
    if(t.slice(0, 7) === "<select"){
      const options = [...t.matchAll(/<option\b[^>]*>([\s\S]*?)<\/option>/g)].map(o => ({
        value: attr(o[0], "value") ?? "", text: o[1].replace(/<[^>]*>/g, "").trim(),
        selected: /\bselected\b/.test(o[0]), disabled: /\bdisabled\b/.test(o[0])
      }));
      const sel = options.find(o => o.selected) || options[0];
      CTRL[id] = {tag:"SELECT", type:"select-one", value: sel ? sel.value : "", options};
    } else {
      CTRL[id] = {tag:"INPUT", type:attr(t,"type")||"text", value:attr(t,"value")??"",
                  checked:/\bchecked\b/.test(t), min:attr(t,"min"), max:attr(t,"max")};
    }
  }
  // the Realms fee table is generated at runtime, so seed its inputs from the closure's own RUNGS
  for(const m of src.matchAll(/\{key:"(\w+)",\s*name:"[^"]*",\s*anchor:\d+,\s*fees:[\d.]+,\s*dflt:(\d+),\s*sc:(\d+)\}/g)){
    CTRL["fn_"+m[1]] = {tag:"INPUT", type:"number", value:m[2]};
    CTRL["fc_"+m[1]] = {tag:"INPUT", type:"number", value:m[3]};
  }

  const REG = new Map();
  class El {
    constructor(id, spec){
      this.id = id; this.tagName = spec?.tag || "DIV"; this.type = spec?.type || "";
      this._value = spec?.value ?? ""; this.checked = !!spec?.checked;
      this.min = spec?.min; this.max = spec?.max;
      this.options = (spec?.options || []).map(o => ({...o}));
      this.disabled = false; this.hidden = false; this.textContent = ""; this.innerHTML = "";
      this.style = {setProperty(){}, removeProperty(){}};
      this.dataset = {}; this.children = []; this.firstChild = null; this.nextElementSibling = null;
      this.classList = {add(){}, remove(){}, toggle(){}, contains(){return false;}};
      this._on = {};
    }
    get value(){ return this._value; }
    set value(v){ this._value = String(v); }
    addEventListener(t, fn){ (this._on[t] ||= []).push(fn); }
    removeEventListener(){}
    dispatchEvent(ev){ (this._on[ev?.type] || []).forEach(f => f.call(this, {target:this, ...ev})); return true; }
    querySelector(){ return null; }
    querySelectorAll(){ return []; }
    closest(){ return null; }
    getBoundingClientRect(){ return {top:0, left:0, bottom:0, right:0, width:0, height:0}; }
    setAttribute(k, v){ if(k === "style") return; this[k] = v; }
    getAttribute(k){ return this[k]; }
    hasAttribute(k){ return this[k] !== undefined; }
    removeAttribute(k){ delete this[k]; }
    appendChild(c){ this.children.push(c); return c; }
    insertBefore(c){ this.children.unshift(c); return c; }
    // commitDial writes its "bounded to 80" notice next to the field it just rewrote; without
    // this the clamp write-back tests throw instead of asserting
    insertAdjacentElement(where, c){ this.children.push(c); return c; }
    // the anchor takeover jumps and focuses in place of the native anchor; the Copy-link
    // fallback selects the field it just filled. Both are geometry the stub does not have,
    // and both only need to not throw. See tools/check_nav.mjs.
    scrollIntoView(){} select(){}
    remove(){} focus(){} matches(){ return false; }
    get offsetHeight(){ return 0; }
    get offsetTop(){ return 0; }
  }
  const byId = id => { if(!REG.has(id)) REG.set(id, new El(id, CTRL[id])); return REG.get(id); };
  const body = new El("__body"), docEl = new El("__html");

  // document-level listeners are RECORDED, not dropped: the anchor takeover that keeps the estate
  // in the address is one delegated click handler on the document, and a no-op stub would report
  // it as working while never once calling it. See tools/check_nav.mjs.
  const docOn = {};
  // …and the same for the address. A no-op replaceState made every fragment assertion vacuous.
  const hashes = [];
  const win = {
    document: {getElementById: byId, querySelector: () => null, querySelectorAll: () => [],
               createElement: () => new El("__new"), body, documentElement: docEl,
               addEventListener(t, fn){ (docOn[t] ||= []).push(fn); }},
    location: {hash:"", href:"file:///fm", replace(){}},
    history: {replaceState(s, ti, url){ hashes.push(url);
                                        win.location.hash = String(url || "").replace(/^[^#]*/, ""); }},
    console,
    MutationObserver: class { observe(){} disconnect(){} },
    requestAnimationFrame: fn => fn(),
    // the Copy-link button restores its own label on a timer; fire it at once rather than never,
    // so the button's text is what it will actually settle to
    setTimeout: (fn) => { try{ fn(); }catch(e){} return 0; },
    clearTimeout(){},
    getComputedStyle: () => ({getPropertyValue: () => ""}),
    Event: class { constructor(t){ this.type = t; } },
    matchMedia: () => ({matches:false, addListener(){}, addEventListener(){}}),
    _load: [],
    addEventListener(t, fn){ if(t === "load") win._load.push(fn); }
  };
  win.window = win;
  const ctx = vm.createContext(win);
  // const/let bindings are script-scoped, not properties of the global — hand out what we need
  // v3f predates FM/clampInt/TRIBBAND, so each name is handed out only if it exists
  const NAMES = ["FM","showTab","renderLadder","renderUnits","renderHousehold","renderOffice",
                 "readState","facts","renderWrit","clampInt","TRIBBAND","ERAS"];
  const EPILOGUE = "\n;" + NAMES.map(n =>
    `try{ window.${n} = ${n}; }catch(e){}`).join(" ");
  vm.runInContext(src + EPILOGUE, ctx, {filename:"fm_engine.js"});
  // fire a delegated document-level event at a stand-in element. `spec` is whatever the handler
  // reads off ev.target — for the anchor takeover that is closest() and getAttribute().
  const fire = (type, spec) => {
    let prevented = false;
    const ev = {type, ...spec, defaultPrevented:false, button:0,
                preventDefault(){ prevented = true; this.defaultPrevented = true; }};
    (docOn[type] || []).forEach(fn => fn(ev));
    return prevented;
  };
  return {ctx, byId, win, src, html, fire, hashes, docOn};
}
