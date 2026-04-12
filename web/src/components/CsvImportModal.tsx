import { useState, useRef, useCallback } from "react";
import { X, Upload, Download, ChevronRight, ChevronLeft, Check, AlertCircle, SkipForward } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../lib/api";

// ─── Simple inline CSV parser ─────────────────────────────────────────────────
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === "," && !inQuote) {
        fields.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = parseRow(nonEmpty[0]).map(h => h.replace(/^["']|["']$/g, ""));
  const rows = nonEmpty.slice(1).map(line => {
    const vals = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^["']|["']$/g, ""); });
    return obj;
  });
  return { headers, rows };
}

// ─── Field detection ──────────────────────────────────────────────────────────
const TARGET_FIELDS = [
  { key: "firstName", label: "First Name", patterns: ["first_name","firstname","first name","first"] },
  { key: "lastName",  label: "Last Name",  patterns: ["last_name","lastname","last name","surname","last"] },
  { key: "fullName",  label: "Full Name",  patterns: ["name","full_name","fullname","full name","customer name","contact name"] },
  { key: "email",     label: "Email",      patterns: ["email","email_address","e-mail","e_mail"] },
  { key: "phone",     label: "Phone",      patterns: ["phone","phone_number","phonenumber","mobile","cell","telephone","tel"] },
  { key: "notes",     label: "Notes",      patterns: ["notes","note","comments","comment","description"] },
  { key: "status",    label: "Status",     patterns: ["status","type","customer_type","customertype"] },
];

function autoDetect(header: string): string {
  const h = header.toLowerCase().trim();
  for (const field of TARGET_FIELDS) {
    if (field.patterns.includes(h)) return field.key;
  }
  return "skip";
}

// ─── Mapping resolution ───────────────────────────────────────────────────────
function resolveRow(
  row: Record<string, string>,
  mapping: Record<string, string>
): { firstName: string; lastName: string; email: string; phone: string; notes: string; status: string } {
  const get = (key: string) => {
    const col = Object.keys(mapping).find(k => mapping[k] === key);
    return col ? (row[col] || "").trim() : "";
  };

  let firstName = get("firstName");
  let lastName = get("lastName");

  const fullNameCol = Object.keys(mapping).find(k => mapping[k] === "fullName");
  if (fullNameCol && (!firstName || !lastName)) {
    const parts = (row[fullNameCol] || "").trim().split(/\s+/);
    if (!firstName) firstName = parts[0] || "";
    if (!lastName) lastName = parts.slice(1).join(" ");
  }

  return {
    firstName,
    lastName,
    email: get("email").toLowerCase(),
    phone: get("phone"),
    notes: get("notes"),
    status: get("status"),
  };
}

function isRowValid(resolved: ReturnType<typeof resolveRow>) {
  return !!(resolved.email || resolved.phone);
}

const SAMPLE_CSV = `first_name,last_name,email,phone,notes,status
Jane,Smith,jane@example.com,(555) 123-4567,Referred by neighbor,active
Bob,Johnson,bob@example.com,555-987-6543,,lead
Maria,Garcia,,5551234568,Prefers morning appointments,active`;

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function CsvImportModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (count: number) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dragging, setDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ imported: number; duplicates: number; failed: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (customers: any[]) =>
      apiPost("/api/customers/import", { customers }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setResult(data);
      setStep(4);
      onSuccess(data.imported);
    },
  });

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows } = parseCsv(text);
      setHeaders(h);
      setCsvRows(rows);
      const autoMapping: Record<string, string> = {};
      h.forEach(col => { autoMapping[col] = autoDetect(col); });
      setMapping(autoMapping);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const validRows = csvRows.map(r => resolveRow(r, mapping)).filter(isRowValid);
  const skippedRows = csvRows.length - validRows.length;

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "customers-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const rows = csvRows.map(r => resolveRow(r, mapping)).filter(isRowValid);
    importMutation.mutate(rows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Import Customers from CSV</h2>
            {step < 4 && (
              <p className="text-xs text-slate-400 mt-0.5">
                Step {step} of 3 — {step === 1 ? "Upload file" : step === 2 ? "Map columns" : "Review & import"}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex px-6 pt-4 gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? "bg-blue-600" : "bg-slate-100"}`} />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">Drop your CSV here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                <p className="text-xs text-slate-300 mt-3">.csv files only &middot; max 500 rows</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download sample template
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-600 mb-2">Accepted column names</p>
                {TARGET_FIELDS.map(f => (
                  <div key={f.key} className="flex gap-2">
                    <span className="font-medium text-slate-700 w-24 shrink-0">{f.label}:</span>
                    <span className="text-slate-400">{f.patterns.slice(0, 3).join(", ")}{f.patterns.length > 3 ? "…" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Column mapping ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-700 text-sm rounded-xl px-4 py-3 font-medium">
                {csvRows.length} rows found &middot; {validRows.length} valid &middot; {skippedRows} will be skipped
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 gap-0 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CSV Column</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">QuotePro Field</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {headers.map(col => (
                    <div key={col} className="grid grid-cols-2 items-center px-4 py-2.5 gap-3">
                      <div className="text-sm font-medium text-slate-700 truncate">{col}</div>
                      <select
                        value={mapping[col] || "skip"}
                        onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                        className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="skip">Skip this column</option>
                        {TARGET_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Each row must have at least an email or phone number to be imported
              </p>
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-3.5 text-center">
                  <p className="text-2xl font-black text-green-600">{validRows.length}</p>
                  <p className="text-xs font-semibold text-green-700 mt-0.5">Customers to import</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-center">
                  <p className="text-2xl font-black text-amber-600">{skippedRows}</p>
                  <p className="text-xs font-semibold text-amber-700 mt-0.5">Rows skipped</p>
                </div>
              </div>

              {csvRows.length > 500 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">File exceeds 500 rows. Only the first 500 valid rows will be imported. Please split your file for larger imports.</p>
                </div>
              )}

              {validRows.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Preview (first 5 rows)</p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-3 py-2 font-semibold text-slate-500">Name</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-500 hidden sm:table-cell">Email</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-500">Phone</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-500 hidden sm:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validRows.slice(0, 5).map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-slate-700">{[r.firstName, r.lastName].filter(Boolean).join(" ") || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2 text-slate-500 hidden sm:table-cell truncate max-w-[140px]">{r.email || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2 text-slate-500">{r.phone || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2 hidden sm:table-cell">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                r.status === "active" ? "bg-green-100 text-green-700" :
                                r.status === "inactive" ? "bg-slate-100 text-slate-500" :
                                "bg-blue-100 text-blue-700"
                              }`}>{r.status || "lead"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {validRows.length > 5 && (
                    <p className="text-xs text-slate-400 mt-2 text-center">+{validRows.length - 5} more rows</p>
                  )}
                </div>
              )}

              {skippedRows > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Why rows are skipped</p>
                  <p className="text-xs text-amber-600">Rows missing both email and phone cannot be imported. Check your column mapping if this is unexpected.</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Results ── */}
          {step === 4 && result && (
            <div className="space-y-4 py-2">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Import Complete</h3>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  <Check className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">{result.imported} imported successfully</p>
                  </div>
                </div>
                {result.duplicates > 0 && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <SkipForward className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-800">{result.duplicates} duplicates skipped</p>
                      <p className="text-xs text-amber-600 mt-0.5">Already in your customer list</p>
                    </div>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <X className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-800">{result.failed} rows failed</p>
                      {result.errors.slice(0, 3).map((e, i) => (
                        <p key={i} className="text-xs text-red-600 mt-0.5">{e}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {step === 4 ? (
            <button
              onClick={onClose}
              className="w-full px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors text-sm"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : onClose()}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {step === 1 ? "Cancel" : "Back"}
              </button>

              {step === 1 && (
                <button
                  disabled
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-200 text-slate-400 font-semibold rounded-xl text-sm cursor-not-allowed"
                >
                  Upload a file to continue
                </button>
              )}

              {step === 2 && (
                <button
                  onClick={() => setStep(3)}
                  disabled={validRows.length === 0}
                  className={`flex items-center gap-1.5 px-5 py-2.5 font-semibold rounded-xl text-sm transition-colors ${
                    validRows.length > 0
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Review {validRows.length} rows
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending || validRows.length === 0}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60"
                >
                  {importMutation.isPending ? "Importing…" : `Import ${validRows.length} Customers`}
                  {!importMutation.isPending && <Check className="w-4 h-4" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
