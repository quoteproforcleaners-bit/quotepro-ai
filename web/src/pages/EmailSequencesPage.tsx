import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Send,
  Users,
  Star,
  Sun,
  Heart,
  Wind,
  Book,
  RefreshCw,
  Zap,
  Gift,
  Sunrise,
  Droplet,
  Home,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Trash2,
  X,
  UserPlus,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { PageHeader, Card, Spinner, Badge } from "../components/ui";
import { apiRequest } from "../lib/api";
import { useQuery as useCustomersQuery } from "@tanstack/react-query";

interface SequenceStep {
  subject: string;
  delayDays: number;
  body: string;
}

interface BuiltInSequence {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  steps: SequenceStep[];
}

interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  customerName: string;
  customerEmail: string;
  status: string;
  currentStep: number;
  stepsCompleted: Array<{ stepIndex: number; sentAt: string; subject: string }>;
  enrolledAt: string;
  lastSentAt: string | null;
  completedAt: string | null;
  notes: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  star: Star,
  sun: Sun,
  heart: Heart,
  wind: Wind,
  book: Book,
  "refresh-cw": RefreshCw,
  zap: Zap,
  gift: Gift,
  sunrise: Sunrise,
  users: Users,
  droplet: Droplet,
  home: Home,
};

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  pink: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  yellow: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
  red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
  teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "text-green-600 dark:text-green-400", icon: Play },
  paused: { label: "Paused", color: "text-yellow-600 dark:text-yellow-400", icon: Pause },
  completed: { label: "Completed", color: "text-blue-600 dark:text-blue-400", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-slate-400 dark:text-slate-500", icon: X },
};

const CATEGORY_FILTERS = ["All", "Seasonal", "Onboarding", "Retention", "Growth", "Promotion"];

export default function EmailSequencesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"library" | "enrollments">("library");
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);
  const [enrollModal, setEnrollModal] = useState<BuiltInSequence | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [enrollmentFilter, setEnrollmentFilter] = useState("all");
  const [searchEnrollment, setSearchEnrollment] = useState("");

  // Enroll modal state
  const [enrollMode, setEnrollMode] = useState<"manual" | "customers">("manual");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [customerSearch, setCustomerSearch] = useState("");
  const [enrollNotes, setEnrollNotes] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  const [sendingStepId, setSendingStepId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: sequences = [], isLoading: seqLoading } = useQuery<BuiltInSequence[]>({
    queryKey: ["/api/email-sequences/library"],
  });

  const { data: enrollments = [], isLoading: enrollLoading } = useQuery<SequenceEnrollment[]>({
    queryKey: ["/api/email-sequences/enrollments"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredSequences = sequences.filter(s =>
    categoryFilter === "All" || s.category === categoryFilter
  );

  const filteredEnrollments = enrollments.filter(e => {
    const matchesStatus = enrollmentFilter === "all" || e.status === enrollmentFilter;
    const matchesSearch = !searchEnrollment ||
      e.customerName.toLowerCase().includes(searchEnrollment.toLowerCase()) ||
      e.customerEmail.toLowerCase().includes(searchEnrollment.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredCustomers = customers.filter(c =>
    !customerSearch ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const openEnroll = (seq: BuiltInSequence) => {
    setEnrollModal(seq);
    setEnrollMode("manual");
    setManualName("");
    setManualEmail("");
    setSelectedCustomerIds(new Set());
    setCustomerSearch("");
    setEnrollNotes("");
    setEnrollError("");
  };

  const handleEnroll = async () => {
    if (!enrollModal) return;
    setEnrolling(true);
    setEnrollError("");
    try {
      let contacts: { customerName: string; customerEmail: string; customerId?: string }[] = [];
      if (enrollMode === "manual") {
        if (!manualName.trim() || !manualEmail.trim()) {
          setEnrollError("Name and email are required");
          setEnrolling(false);
          return;
        }
        contacts = [{ customerName: manualName.trim(), customerEmail: manualEmail.trim() }];
      } else {
        contacts = Array.from(selectedCustomerIds).map(id => {
          const c = customers.find(x => x.id === id)!;
          return {
            customerName: `${c.firstName} ${c.lastName}`.trim(),
            customerEmail: c.email,
            customerId: c.id,
          };
        }).filter(c => c.customerEmail);
        if (contacts.length === 0) {
          setEnrollError("Select at least one customer with an email address");
          setEnrolling(false);
          return;
        }
      }

      const result = await apiRequest("POST", `/api/email-sequences/${enrollModal.id}/enroll`, {
        contacts,
        notes: enrollNotes,
      }) as { enrolled: number };

      await queryClient.invalidateQueries({ queryKey: ["/api/email-sequences/enrollments"] });
      setEnrollModal(null);
      if (result.enrolled > 0) {
        setActiveTab("enrollments");
      }
    } catch (err: any) {
      setEnrollError(err.message || "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  const handleSendStep = async (enrollmentId: string) => {
    setSendingStepId(enrollmentId);
    try {
      await apiRequest("POST", `/api/email-sequences/enrollments/${enrollmentId}/send-step`);
      await queryClient.invalidateQueries({ queryKey: ["/api/email-sequences/enrollments"] });
    } catch (err: any) {
      alert(err.message || "Failed to send");
    } finally {
      setSendingStepId(null);
    }
  };

  const handleToggleStatus = async (enrollment: SequenceEnrollment) => {
    setTogglingId(enrollment.id);
    try {
      const newStatus = enrollment.status === "active" ? "paused" : "active";
      await apiRequest("PATCH", `/api/email-sequences/enrollments/${enrollment.id}/status`, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ["/api/email-sequences/enrollments"] });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiRequest("DELETE", `/api/email-sequences/enrollments/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/email-sequences/enrollments"] });
    } finally {
      setDeletingId(null);
    }
  };

  const getSequenceName = (id: string) =>
    sequences.find(s => s.id === id)?.name || id;

  const activeCount = enrollments.filter(e => e.status === "active").length;
  const completedCount = enrollments.filter(e => e.status === "completed").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Email Sequences"
        description="Pre-built email campaigns to nurture leads, re-engage clients, and grow your business."
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{sequences.length}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Campaigns</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCount}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Active</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{completedCount}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Completed</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {(["library", "enrollments"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab === "library" ? "Campaign Library" : `Enrollments${enrollments.length > 0 ? ` (${enrollments.length})` : ""}`}
          </button>
        ))}
      </div>

      {activeTab === "library" && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? "bg-primary-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {seqLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <div className="grid gap-3">
              {filteredSequences.map(seq => {
                const IconComp = ICON_MAP[seq.icon] || Mail;
                const isExpanded = expandedSeq === seq.id;
                const iconClass = COLOR_MAP[seq.color] || COLOR_MAP.blue;
                const enrolledCount = enrollments.filter(e => e.sequenceId === seq.id && e.status === "active").length;

                return (
                  <Card key={seq.id}>
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconClass}`}>
                          <IconComp size={20} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{seq.name}</h3>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                  {seq.category}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                  {seq.steps.length} emails
                                </span>
                                {enrolledCount > 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                    {enrolledCount} active
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{seq.description}</p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => openEnroll(seq)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                              >
                                <UserPlus size={14} />
                                Enroll
                              </button>
                              <button
                                onClick={() => setExpandedSeq(isExpanded ? null : seq.id)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                              {seq.steps.map((step, idx) => (
                                <div key={idx} className="flex gap-3">
                                  <div className="flex-shrink-0 flex flex-col items-center">
                                    <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold">
                                      {idx + 1}
                                    </div>
                                    {idx < seq.steps.length - 1 && (
                                      <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 mt-1 mb-1 min-h-4" />
                                    )}
                                  </div>
                                  <div className="flex-1 pb-3">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{step.subject}</p>
                                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                        <Clock size={11} />
                                        {idx === 0 ? "Send on day 1" : `Day ${step.delayDays + 1}`}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                      {step.body.split("\n")[0]}...
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "enrollments" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchEnrollment}
                onChange={e => setSearchEnrollment(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm"
              />
            </div>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              {["all", "active", "paused", "completed", "cancelled"].map(s => (
                <button
                  key={s}
                  onClick={() => setEnrollmentFilter(s)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                    enrollmentFilter === s
                      ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {enrollLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filteredEnrollments.length === 0 ? (
            <Card>
              <div className="py-12 text-center">
                <Mail className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={40} />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No enrollments yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  Go to Campaign Library and click Enroll to get started
                </p>
                <button
                  onClick={() => setActiveTab("library")}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                >
                  Browse Campaigns
                </button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredEnrollments.map(enrollment => {
                const seq = sequences.find(s => s.id === enrollment.sequenceId);
                const totalSteps = seq?.steps.length ?? 0;
                const progress = totalSteps > 0 ? (enrollment.currentStep / totalSteps) * 100 : 0;
                const statusConf = STATUS_CONFIG[enrollment.status] || STATUS_CONFIG.active;
                const StatusIcon = statusConf.icon;
                const isComplete = enrollment.status === "completed" || enrollment.currentStep >= totalSteps;
                const isCancelled = enrollment.status === "cancelled";

                return (
                  <Card key={enrollment.id}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {enrollment.customerName}
                            </p>
                            <span className={`flex items-center gap-1 text-xs font-medium ${statusConf.color}`}>
                              <StatusIcon size={12} />
                              {statusConf.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{enrollment.customerEmail}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {getSequenceName(enrollment.sequenceId)}
                            {" · "}Step {Math.min(enrollment.currentStep + 1, totalSteps)} of {totalSteps}
                            {enrollment.lastSentAt && (
                              <> · Last sent {new Date(enrollment.lastSentAt).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!isComplete && !isCancelled && (
                            <>
                              <button
                                onClick={() => handleSendStep(enrollment.id)}
                                disabled={sendingStepId === enrollment.id || enrollment.status === "paused"}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                title={enrollment.status === "paused" ? "Resume to send" : "Send next email now"}
                              >
                                {sendingStepId === enrollment.id ? <Spinner /> : <Send size={13} />}
                                Send Next
                              </button>
                              <button
                                onClick={() => handleToggleStatus(enrollment)}
                                disabled={togglingId === enrollment.id}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title={enrollment.status === "active" ? "Pause" : "Resume"}
                              >
                                {togglingId === enrollment.id ? <Spinner /> : (
                                  enrollment.status === "active" ? <Pause size={15} /> : <Play size={15} />
                                )}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(enrollment.id)}
                            disabled={deletingId === enrollment.id}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            {deletingId === enrollment.id ? <Spinner /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
                          <span>{enrollment.currentStep} of {totalSteps} emails sent</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isComplete
                                ? "bg-blue-500"
                                : enrollment.status === "paused"
                                ? "bg-yellow-400"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Steps completed */}
                      {Array.isArray(enrollment.stepsCompleted) && enrollment.stepsCompleted.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {enrollment.stepsCompleted.map((step, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs"
                            >
                              <CheckCircle size={11} />
                              <span>Email {step.stepIndex + 1} sent</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Enroll Modal */}
      {enrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Enroll in Campaign</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{enrollModal.name}</p>
              </div>
              <button
                onClick={() => setEnrollModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Mode selector */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                {(["manual", "customers"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setEnrollMode(mode)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      enrollMode === mode
                        ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {mode === "manual" ? "Enter Manually" : `From Customers (${customers.filter(c => c.email).length})`}
                  </button>
                ))}
              </div>

              {enrollMode === "manual" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      placeholder="e.g. Jane Smith"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={e => setManualEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Search customers..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm"
                    />
                  </div>

                  {selectedCustomerIds.size > 0 && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                      {selectedCustomerIds.size} selected
                    </p>
                  )}

                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filteredCustomers.filter(c => c.email).length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                        No customers with email addresses
                      </p>
                    ) : filteredCustomers.filter(c => c.email).map(c => {
                      const isSelected = selectedCustomerIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            const next = new Set(selectedCustomerIds);
                            if (isSelected) next.delete(c.id);
                            else next.add(c.id);
                            setSelectedCustomerIds(next);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isSelected
                              ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "bg-primary-600 border-primary-600"
                              : "border-slate-300 dark:border-slate-600"
                          }`}>
                            {isSelected && <CheckCircle size={12} className="text-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{c.email}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (optional)
                </label>
                <input
                  value={enrollNotes}
                  onChange={e => setEnrollNotes(e.target.value)}
                  placeholder="e.g. First contacted via website"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">How it works</p>
                <p className="text-blue-700 dark:text-blue-300 text-xs">
                  After enrolling, go to the Enrollments tab and click "Send Next" to manually send each email in the sequence. This gives you full control over timing.
                </p>
              </div>

              {enrollError && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  {enrollError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
              <button
                onClick={() => setEnrollModal(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {enrolling ? <Spinner /> : <UserPlus size={15} />}
                {enrolling ? "Enrolling..." : "Enroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
