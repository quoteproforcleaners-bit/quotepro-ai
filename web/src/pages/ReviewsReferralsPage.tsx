import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Send,
  Gift,
  Plus,
  Search,
  X,
  ChevronRight,
  RefreshCw,
  Loader2,
  User,
  ArrowLeft,
  Mail,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  StatCard,
  EmptyState,
  Spinner,
  Modal,
  Input,
  Textarea,
  Button,
} from "../components/ui";
import { ProGate } from "../components/ProGate";
import { apiRequest } from "../lib/api";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          fill={i <= rating ? "#F59E0B" : "none"}
          stroke={i <= rating ? "#F59E0B" : "#CBD5E1"}
        />
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    clicked: "bg-violet-50 text-violet-700 border-violet-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    sent: "Sent",
    clicked: "Clicked",
    completed: "Completed",
  };
  const cls = styles[status] || styles.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
      {labels[status] || status}
    </span>
  );
}

type ModalStep = "pick-customer" | "draft-email";

function ReviewsReferralsContent() {
  const queryClient = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("pick-customer");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: reviewRequests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/review-requests"],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const stats = useMemo(() => {
    const sent = reviewRequests.filter((r: any) => r.status !== "pending").length;
    const clicks = reviewRequests.filter((r: any) => r.reviewClicked).length;
    const referrals = reviewRequests.filter((r: any) => r.referralSent).length;
    return { sent, clicks, referrals };
  }, [reviewRequests]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => {
      const name = `${c.firstName || ""} ${c.lastName || ""}`.trim().toLowerCase();
      return name.includes(q) || (c.email || "").toLowerCase().includes(q);
    });
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(
    () => (selectedCustomerId ? customers.find((c: any) => c.id === selectedCustomerId) : null),
    [customers, selectedCustomerId]
  );

  const getCustomerName = (item: any) =>
    item.metadata?.customerName ||
    item.customerName ||
    `Customer #${item.customerId || item.id}`;

  const getFullName = (c: any) =>
    `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.name || `#${c.id}`;

  const handleSendReview = async (id: number) => {
    setLoadingId(`review-${id}`);
    try {
      await apiRequest("PUT", `/api/review-requests/${id}`, { reviewClicked: true });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
    } catch {}
    setLoadingId(null);
  };

  const handleAskReferral = async (id: number) => {
    setLoadingId(`referral-${id}`);
    try {
      await apiRequest("PUT", `/api/review-requests/${id}`, { referralSent: true });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
    } catch {}
    setLoadingId(null);
  };

  const generateEmailContent = async () => {
    setGenerating(true);
    const fallbackSubject = "We would love your feedback";
    const fallbackBody =
      "Thank you for choosing our services. We strive to provide the best experience possible and your feedback helps us improve.\n\nWould you take a moment to share your experience? Your review means a lot to us and helps other customers find quality service.\n\nThank you for your time.";
    try {
      const res = await apiRequest("POST", "/api/ai/generate-review-email", {});
      const data = await res.json();
      const content = data.content || data.body || "";
      let subject = data.subject || "";
      if (!content) {
        setEmailSubject(fallbackSubject);
        setEmailContent(fallbackBody);
        return;
      }
      if (!subject) {
        const match = content.match(/^(?:Subject:\s*)(.+?)(?:\n|$)/i);
        subject = match ? match[1].trim() : fallbackSubject;
      }
      const body = content.replace(/^Subject:\s*.+?\n/i, "").trim();
      setEmailSubject(subject || fallbackSubject);
      setEmailContent(body || fallbackBody);
    } catch {
      setEmailSubject(fallbackSubject);
      setEmailContent(fallbackBody);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectCustomer = async (id: number) => {
    setSelectedCustomerId(id);
    setModalStep("draft-email");
    setEmailSubject("");
    setEmailContent("");
    await generateEmailContent();
  };

  const handleSendEmail = async () => {
    if (!selectedCustomerId || !emailSubject || !emailContent) return;
    setSending(true);
    try {
      await apiRequest("POST", "/api/review-requests", { customerId: selectedCustomerId });
      await apiRequest("POST", "/api/communications", {
        customerId: selectedCustomerId,
        type: "email",
        channel: "email",
        subject: emailSubject,
        content: emailContent,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
      closeModal();
    } catch {}
    setSending(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalStep("pick-customer");
    setSelectedCustomerId(null);
    setEmailSubject("");
    setEmailContent("");
    setCustomerSearch("");
    setGenerating(false);
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Reviews Sent" value={stats.sent.toString()} icon={Send} />
        <StatCard label="Review Clicks" value={stats.clicks.toString()} icon={Star} color="amber" />
        <StatCard label="Referrals Sent" value={stats.referrals.toString()} icon={Gift} color="emerald" />
      </div>

      <Card>
        <CardHeader
          title="Review Requests"
          actions={
            <Button variant="primary" icon={Plus} size="sm" onClick={() => { setModalOpen(true); setModalStep("pick-customer"); }}>
              Request Review
            </Button>
          }
        />
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : reviewRequests.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No review requests yet"
            description="Tap the button above to send your first review request to a customer."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {reviewRequests.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <User className="w-4.5 h-4.5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{getCustomerName(item)}</p>
                  {item.rating ? <StarRating rating={item.rating} /> : null}
                  {item.jobId ? <p className="text-xs text-slate-400 mt-0.5">Job #{item.jobId}</p> : null}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusPill status={item.status || "pending"} />
                  <button
                    onClick={() => handleSendReview(item.id)}
                    disabled={loadingId === `review-${item.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition-colors disabled:opacity-50"
                  >
                    {loadingId === `review-${item.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Review Link</span>
                  </button>
                  <button
                    onClick={() => handleAskReferral(item.id)}
                    disabled={loadingId === `referral-${item.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {loadingId === `referral-${item.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Ask Referral</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalStep === "pick-customer" ? "Select a Customer" : "Review Request Email"}
      >
        {modalStep === "pick-customer" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
              {filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No customers found</div>
              ) : (
                filteredCustomers.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{getFullName(c)}</p>
                      {c.email && <p className="text-xs text-slate-500 truncate">{c.email}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => { setModalStep("pick-customer"); setSelectedCustomerId(null); }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            {selectedCustomer && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-50 border border-primary-100">
                <Mail className="w-4 h-4 text-primary-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">To</p>
                  <p className="text-sm font-medium text-slate-900">{getFullName(selectedCustomer)}</p>
                </div>
              </div>
            )}
            {generating ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
                <p className="text-sm text-slate-500">Drafting your review request...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                  <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
                  <Textarea value={emailContent} onChange={(e) => setEmailContent(e.target.value)} rows={8} placeholder="Email content" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={generateEmailContent}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                  <Button
                    variant="primary"
                    icon={sending ? Loader2 : Send}
                    onClick={handleSendEmail}
                    disabled={sending || !emailSubject || !emailContent}
                    className="flex-1"
                  >
                    {sending ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ReviewsReferralsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Reviews & Referrals"
        subtitle="Request reviews and referrals from happy customers"
      />
      <ProGate feature="Reviews & Referrals">
        <ReviewsReferralsContent />
      </ProGate>
    </div>
  );
}
