// Every rendered "gp" that is NOT inside a .u unit span, with context — the bare-figure audit.
import {buildContext} from "./harness.mjs";
const h = buildContext(process.argv[2]);
const set = (id, v) => { const e = h.byId(id); if(e.type === "checkbox") e.checked = !!v; else e.value = String(v); };
const hits = new Map();
for(const holder of ["esq","kt1","kt2","kt4","lag","bar"])
for(const def of ["dom","ang","dis","ord"])
for(const assess of ["ancient","current"])
for(const asz of [true,false]){
  Object.entries({l_era:"", l_def:def, l_assess:assess, l_asz:asz, land:6, dens:375, l_sq:true,
                  h_holder:holder, h_cls:1, h_fam:24, h_chart:"1", h_cdef:"ang"}).forEach(([k,v]) => set(k,v));
  h.ctx.renderLadder(); h.ctx.renderHousehold(); h.ctx.renderOffice();
  for(const id of ["rungs","hcards","ocards","oflags","hglance","cmptable","serflag","levyflag","standing","parcel"]){
    let s = h.byId(id).innerHTML;
    if(!s) continue;
    s = s.replace(/<span class="bdg[^"]*"[^>]*>[\s\S]*?<\/span>/g, "")   // badge tooltips carry page cites
         .replace(/<span class=['"]u['"]>[\s\S]*?<\/span>/g, " ")        // unit spans: accounted for
         .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    for(const m of s.matchAll(/[\d,.]+[ -]?gp\b(?!\/)/g)){
      const c = s.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20).trim();
      if(!hits.has(c)) hits.set(c, id);
    }
  }
}
console.log(hits.size + " distinct bare-gp contexts");
[...hits].slice(0, 40).forEach(([c, id]) => console.log("[" + id + "] ..." + c + "..."));
