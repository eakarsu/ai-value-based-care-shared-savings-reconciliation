// Deterministic domain insights over this app's own records. No provider call is made here.
export function filterRecords(items, { q = "", status = "", risk = "" } = {}) {
  const needle = String(q).trim().toLowerCase();
  return (items || []).filter((r) => {
    if (status && r.status !== status) return false;
    if (risk && r.risk !== risk) return false;
    if (!needle) return true;
    return [r.reference, r.title, r.status, r.owner, r.risk, r.due_date, JSON.stringify(r.payload ?? {})].filter((v) => v != null).join(" ").toLowerCase().includes(needle);
  });
}
const esc = (v) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function recordsToCsv(items) {
  const cols = ["id","reference","title","status","owner","risk","due_date","amount","payload"];
  return [cols.join(","), ...(items || []).map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
export function recordsToJson(items) { return JSON.stringify(items || [], null, 2); }
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const isOpen = (r) => !["Closed","Approved","Done","Cancelled"].includes(r.status);
const due = (r) => r.due_date || r.reviewDeadline || null;
function section(kind, records, now) {
  const open = records.filter(isOpen);
  if (kind === "risk") { const hit = open.filter((r) => ["High","Critical"].includes(r.risk) || r.payload?.evidenceState === "Exception"); return { title: TITLES[0][0], detail: TITLES[0][1], count: hit.length, totalValue: hit.reduce((s,r)=>s+num(r.amount),0), references: hit.slice(0,10).map(r=>r.reference||String(r.id)) }; }
  if (kind === "overdue") { const hit = open.filter((r) => due(r) && new Date(due(r)) < now); return { title: TITLES[1][0], detail: TITLES[1][1], count: hit.length, totalValue: hit.reduce((s,r)=>s+num(r.amount),0), references: hit.slice(0,10).map(r=>r.reference||String(r.id)) }; }
  const hit = open.filter((r) => num(r.amount) > 0); return { title: TITLES[2][0], detail: TITLES[2][1], count: hit.length, totalValue: hit.reduce((s,r)=>s+num(r.amount),0), references: hit.slice(0,10).map(r=>r.reference||String(r.id)) };
}
const TITLES = [["Shared-savings variance summary (operational)", "Counts open High/Critical operational records and sums amount as settlement variance at risk (0 when none); no clinical or diagnostic use."], ["Settlement deadline queue (operational)", "Lists open operational records past due; count is 0 when nothing is overdue."], ["Reconciliation candidates (operational)", "Open records with positive amount that merit payer settlement review by a human; operational only."]];
export function buildDomainInsights(records, now = new Date()) {
  const rows = records || [];
  return { aiGenerated: false, source: "deterministic-fallback", label: "Deterministic fallback — not AI-generated", metrics: { records: rows.length, open: rows.filter(isOpen).length, totalValue: rows.reduce((s,r)=>s+num(r.amount),0), overdue: section("overdue", rows, now).count }, sections: [section("risk", rows, now), section("overdue", rows, now), section("candidates", rows, now)] };
}
