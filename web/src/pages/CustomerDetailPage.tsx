import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiPut, apiDelete } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { ArrowLeft, Save, Trash2, Star, FileText } from "lucide-react";
import { useState, useEffect } from "react";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-50 text-blue-700",
    accepted: "bg-green-50 text-green-700",
    declined: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || styles.draft}`}>
      {status.replace(/-/g, " ")}
    </span>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: customer, isLoading } = useQuery<any>({
    queryKey: [`/api/customers/${id}`],
  });
  const { data: quotes = [] } = useQuery<any[]>({ queryKey: ["/api/quotes"] });

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", address: "",
  });

  useEffect(() => {
    if (customer) {
      setForm({
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiPut(`/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      navigate("/customers");
    },
  });

  const vipMutation = useMutation({
    mutationFn: () => apiPut(`/api/customers/${id}`, { isVip: !customer?.isVip }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}`] });
    },
  });

  const customerQuotes = quotes.filter((q: any) => q.customerId === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/customers")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to customers
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {customer.firstName} {customer.lastName}
          </h1>
          {customer.isVip && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
              <Star className="w-3 h-3 fill-amber-500" />
              VIP
            </span>
          )}
        </div>
        <button
          onClick={() => vipMutation.mutate()}
          className={`flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-lg border transition-colors ${
            customer.isVip
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${customer.isVip ? "fill-amber-500 text-amber-500" : ""}`} />
          {customer.isVip ? "VIP" : "Set VIP"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Contact Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "firstName", label: "First name" },
                { key: "lastName", label: "Last name" },
                { key: "email", label: "Email", type: "email" },
                { key: "phone", label: "Phone" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
              {updateMutation.isSuccess && (
                <span className="flex items-center text-sm text-green-600">Saved</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Quotes</h2>
            </div>
            {customerQuotes.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No quotes for this customer</p>
                <button
                  onClick={() => navigate("/quotes/new")}
                  className="mt-2 text-sm text-primary-600 font-medium"
                >
                  Create a quote
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Total</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerQuotes.map((q: any) => (
                      <tr
                        key={q.id}
                        onClick={() => navigate(`/quotes/${q.id}`)}
                        className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="px-5 py-3 text-right font-medium">${Number(q.total || 0).toFixed(2)}</td>
                        <td className="px-5 py-3"><StatusBadge status={q.status} /></td>
                        <td className="px-5 py-3 text-right text-slate-500">{new Date(q.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate("/quotes/new")}
                className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Create Quote
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this customer? This cannot be undone.")) deleteMutation.mutate();
                }}
                className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
