import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Briefcase,
  Clock,
  CheckCircle,
  Play,
  Calendar,
  MapPin,
  DollarSign,
  User,
  Star,
  FileText,
  Camera,
  ChevronRight,
  Truck,
  Wrench,
  Sparkles,
  Send,
  MessageSquare,
  Link2,
  Copy,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowRight,
  Image as ImageIcon,
  Repeat,
  SkipForward,
  AlertCircle,
} from "lucide-react";
import { apiPost, apiPut, apiGet, apiDelete } from "../lib/api";
import DispatchCard from "../components/DispatchCard";
import { queryClient } from "../lib/queryClient";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  Tabs,
  EmptyState,
  Spinner,
  ProgressBar,
  Timeline,
  Toggle,
  Modal,
  Textarea,
  SegmentedControl,
  Toast,
} from "../components/ui";

const STATUS_FLOW = [
  { key: "scheduled", label: "Scheduled", icon: Calendar },
  { key: "en_route", label: "En Route", icon: Truck },
  { key: "service_started", label: "Started", icon: Play },
  { key: "in_progress", label: "In Progress", icon: Wrench },
  { key: "final_touches", label: "Final Touches", icon: Sparkles },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

// Auto-computed stages — not manually tappable
const AUTO_STATUSES = new Set(["in_progress", "final_touches"]);

function getStatusIndex(status: string): number {
  const idx = STATUS_FLOW.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { business } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [noteContent, setNoteContent] = useState("");
  const [noteCustomerVisible, setNoteCustomerVisible] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [messageModal, setMessageModal] = useState(false);
  const [messageType, setMessageType] = useState("en_route");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [messageError, setMessageError] = useState("");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);

  const { data: job, isLoading } = useQuery<any>({
    queryKey: ["/api/jobs", id],
    queryFn: () => apiGet(`/api/jobs/${id}`),
    enabled: !!id,
  });

  const { data: timeline = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs", id, "timeline"],
    queryFn: () => apiGet(`/api/jobs/${id}/timeline`),
    enabled: !!id,
  });

  const { data: photos = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs", id, "photos"],
    queryFn: () => apiGet(`/api/jobs/${id}/photos`),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs", id, "notes"],
    queryFn: () => apiGet(`/api/jobs/${id}/notes`),
    enabled: !!id,
  });

  const { data: jobCustomer } = useQuery<any>({
    queryKey: [`/api/customers/${job?.customerId}`],
    enabled: !!job?.customerId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { status: string; note?: string }) =>
      apiPost(`/api/jobs/${id}/update-status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", id, "timeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setStatusModal(false);
      setStatusNote("");
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: (item: any) =>
      apiPut(`/api/checklist/${item.id}`, { completed: !item.completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", id] });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: () =>
      apiPost(`/api/jobs/${id}/notes`, {
        content: noteContent,
        customerVisible: noteCustomerVisible,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", id, "notes"] });
      setNoteContent("");
      setNoteCustomerVisible(false);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => apiDelete(`/api/jobs/${id}/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", id, "notes"] });
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: () => apiPost(`/api/jobs/${id}/generate-update-token`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", id] });
    },
  });

  const generateMessageMutation = useMutation({
    mutationFn: (type: string) =>
      apiPost(`/api/ai/job-update-message`, {
        type,
        customerName: job?.customer
          ? `${job.customer.firstName} ${job.customer.lastName}`.trim()
          : "Customer",
        companyName: business?.companyName || "",
        senderName: business?.senderName || "",
        updateLink: job?.updateToken
          ? `${window.location.origin}/live-update/${job.updateToken}`
          : "",
      }),
    onSuccess: (data: any) => {
      setMessageError("");
      setGeneratedMessage(data.message || "");
    },
    onError: () => {
      setMessageError("Failed to generate message. Please try again.");
    },
  });

  const rateMutation = useMutation({
    mutationFn: (data: { rating: number; comment?: string }) =>
      apiPost(`/api/jobs/${id}/rate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", id] });
    },
  });

  if (isLoading) return <Spinner />;
  if (!job) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Job not found"
        description="This job may have been deleted"
      />
    );
  }

  const detailedStatus = job.detailedStatus || job.status || "scheduled";
  const statusIdx = getStatusIndex(detailedStatus);
  const progressPct = ((statusIdx + 1) / STATUS_FLOW.length) * 100;
  const checklist = job.checklist || [];
  const completedItems = checklist.filter((c: any) => c.completed).length;
  const checklistPct = checklist.length > 0 ? (completedItems / checklist.length) * 100 : 0;

  const roomGroups: Record<string, any[]> = {};
  checklist.forEach((item: any) => {
    const group = item.roomGroup || "General";
    if (!roomGroups[group]) roomGroups[group] = [];
    roomGroups[group].push(item);
  });

  const beforePhotos = photos.filter((p: any) => p.photoType === "before");
  const afterPhotos = photos.filter((p: any) => p.photoType === "after");

  const tabs = ["overview", "progress", "checklist", "photos"];

  const handleAdvanceStatus = () => {
    // Skip auto-computed stages and find the next manual one
    let nextIdx = statusIdx + 1;
    while (nextIdx < STATUS_FLOW.length && AUTO_STATUSES.has(STATUS_FLOW[nextIdx].key)) {
      nextIdx++;
    }
    if (nextIdx < STATUS_FLOW.length) {
      setSelectedStatus(STATUS_FLOW[nextIdx].key);
      setStatusModal(true);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <PageHeader
        title={job.title || "Cleaning Job"}
        subtitle={job.address || undefined}
        backTo="/jobs"
        badge={<Badge status={detailedStatus} dot />}
        actions={
          <div className="flex items-center gap-2">
            {detailedStatus !== "completed" ? (
              <Button
                icon={ArrowRight}
                onClick={handleAdvanceStatus}
                size="sm"
              >
                Advance Status
              </Button>
            ) : null}
          </div>
        }
      />

      <Card padding={false} className="mb-6">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-1 overflow-x-auto pb-px">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all duration-150 ${
                  activeTab === t
                    ? "bg-primary-50 text-primary-700 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 lg:p-6">
          {activeTab === "overview" ? (
            <OverviewTab
              job={job}
              progressPct={progressPct}
              detailedStatus={detailedStatus}
              checklistPct={checklistPct}
              completedItems={completedItems}
              totalItems={checklist.length}
              notes={notes}
              noteContent={noteContent}
              setNoteContent={setNoteContent}
              noteCustomerVisible={noteCustomerVisible}
              setNoteCustomerVisible={setNoteCustomerVisible}
              addNoteMutation={addNoteMutation}
              deleteNoteMutation={deleteNoteMutation}
              rateMutation={rateMutation}
              jobCustomer={jobCustomer}
              onToast={(msg: string, variant: any) => setToast({ message: msg, variant: variant || "success" })}
            />
          ) : activeTab === "progress" ? (
            <ProgressTab
              job={job}
              detailedStatus={detailedStatus}
              statusIdx={statusIdx}
              timeline={timeline}
              onUpdateStatus={(status: string) => {
                setSelectedStatus(status);
                setStatusModal(true);
              }}
              generateTokenMutation={generateTokenMutation}
              onGenerateMessage={(type: string) => {
                setMessageType(type);
                setGeneratedMessage("");
                setMessageError("");
                setMessageModal(true);
                generateMessageMutation.mutate(type);
              }}
              copyToClipboard={copyToClipboard}
            />
          ) : activeTab === "checklist" ? (
            <ChecklistTab
              roomGroups={roomGroups}
              completedItems={completedItems}
              totalItems={checklist.length}
              checklistPct={checklistPct}
              toggleChecklistMutation={toggleChecklistMutation}
            />
          ) : (
            <PhotosTab
              beforePhotos={beforePhotos}
              afterPhotos={afterPhotos}
              photos={photos}
            />
          )}
        </div>
      </Card>

      <Modal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        title="Update Status"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Change status to{" "}
            <span className="font-semibold capitalize">
              {selectedStatus.replace(/[_-]/g, " ")}
            </span>
          </p>
          <Textarea
            label="Note (optional)"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Add a note about this status change..."
            rows={3}
          />
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setStatusModal(false)}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateStatusMutation.mutate({
                  status: selectedStatus,
                  note: statusNote,
                })
              }
              loading={updateStatusMutation.isPending}
              size="sm"
            >
              Update
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={messageModal}
        onClose={() => { setMessageModal(false); setGeneratedMessage(""); setMessageError(""); }}
        title="AI Message Draft"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(["en_route", "started", "in_progress", "completed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setMessageType(t);
                  setGeneratedMessage("");
                  setMessageError("");
                  generateMessageMutation.mutate(t);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  messageType === t
                    ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          {generateMessageMutation.isPending ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
              <Spinner size="sm" />
              <span>Generating message...</span>
            </div>
          ) : messageError ? (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">
              {messageError}
            </div>
          ) : generatedMessage ? (
            <div className="relative">
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {generatedMessage}
              </div>
              <button
                onClick={() => copyToClipboard(generatedMessage)}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white shadow-sm hover:bg-slate-100 transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic py-1">
              Select a status above to generate a customer message.
            </p>
          )}
        </div>
      </Modal>

      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

function OverviewTab({
  job,
  progressPct,
  detailedStatus,
  checklistPct,
  completedItems,
  totalItems,
  notes,
  noteContent,
  setNoteContent,
  noteCustomerVisible,
  setNoteCustomerVisible,
  addNoteMutation,
  deleteNoteMutation,
  rateMutation,
  jobCustomer,
  onToast,
}: any) {
  const [ratingValue, setRatingValue] = useState(job.satisfactionRating || 0);
  const [skipConfirm, setSkipConfirm] = useState(false);

  const { data: series } = useQuery<any>({
    queryKey: [`/api/recurring-series/${job.seriesId}`],
    enabled: !!job.seriesId,
  });

  const skipMutation = useMutation({
    mutationFn: () => apiPost(`/api/jobs/${job.id}/skip`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/calendar"] });
      setSkipConfirm(false);
    },
  });

  const FREQ_LABEL: Record<string, string> = {
    weekly: "Every week",
    biweekly: "Every 2 weeks",
    monthly: "Every month",
    custom: "Custom interval",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {job.customer ? (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Customer</p>
              <p className="text-sm font-medium text-slate-900">
                {job.customer.firstName} {job.customer.lastName}
              </p>
              {job.customer.phone ? (
                <p className="text-xs text-slate-500">{job.customer.phone}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        {job.startDatetime ? (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Scheduled</p>
              <p className="text-sm font-medium text-slate-900">
                {new Date(job.startDatetime).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ) : null}
        {job.address ? (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Location</p>
              <p className="text-sm font-medium text-slate-900">{job.address}</p>
            </div>
          </div>
        ) : null}
        {job.total ? (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Amount</p>
              <p className="text-sm font-semibold text-slate-900">
                ${Number(job.total).toLocaleString()}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {(job.address || job.customerName) ? (
        <DispatchCard
          data={{
            customerName: job.customerName || (jobCustomer ? `${jobCustomer.firstName || ""} ${jobCustomer.lastName || ""}`.trim() : undefined),
            address: job.address || undefined,
            serviceType: job.title || job.type || undefined,
            scheduledDate: job.startDatetime || undefined,
            startTime: job.startDatetime || undefined,
            endTime: job.endDatetime || undefined,
            total: job.total || undefined,
            phone: jobCustomer?.phone || undefined,
            email: jobCustomer?.email || undefined,
            customerId: job.customerId || undefined,
            notes: job.notes || undefined,
          }}
          onToast={onToast}
        />
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Job Progress</p>
          <p className="text-xs text-slate-500 capitalize">
            {detailedStatus.replace(/[_-]/g, " ")}
          </p>
        </div>
        <ProgressBar
          value={progressPct}
          color={progressPct >= 100 ? "emerald" : "primary"}
          size="md"
        />
      </div>

      {totalItems > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Checklist</p>
            <p className="text-xs text-slate-500">
              {completedItems}/{totalItems} done
            </p>
          </div>
          <ProgressBar
            value={checklistPct}
            color={checklistPct >= 100 ? "emerald" : "amber"}
            size="sm"
          />
        </div>
      ) : null}

      {job.internalNotes ? (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Internal Notes</p>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.internalNotes}</p>
          </div>
        </div>
      ) : null}

      {job.seriesId ? (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-violet-600" />
            <p className="text-sm font-semibold text-violet-700">Recurring Series</p>
            {series ? (
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                series.status === "active" ? "bg-emerald-100 text-emerald-700" :
                series.status === "paused" ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-500"
              }`}>
                {series.status}
              </span>
            ) : null}
          </div>
          {series ? (
            <p className="text-xs text-violet-600 font-medium">
              {FREQ_LABEL[series.frequency] || series.frequency}
              {series.arrivalTime ? ` · ${series.arrivalTime}` : ""}
              {series.endDate ? ` · until ${new Date(series.endDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : " · ongoing"}
            </p>
          ) : null}
          {job.skipped ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5" />
              This occurrence is skipped
            </div>
          ) : null}
          {!job.skipped && job.status !== "completed" ? (
            skipConfirm ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-600 flex-1">Skip this occurrence?</p>
                <button
                  onClick={() => skipMutation.mutate()}
                  disabled={skipMutation.isPending}
                  className="text-xs font-semibold px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {skipMutation.isPending ? "Skipping…" : "Yes, skip"}
                </button>
                <button
                  onClick={() => setSkipConfirm(false)}
                  className="text-xs font-semibold px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSkipConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-violet-600 font-semibold hover:text-violet-800 transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip this occurrence
              </button>
            )
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-700">Notes</p>
          <span className="text-xs text-slate-400">{notes.length} notes</span>
        </div>
        <div className="space-y-3 mb-4">
          {notes.map((note: any) => (
            <div
              key={note.id}
              className="bg-slate-50 rounded-lg p-3 group relative"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-700 flex-1">{note.content}</p>
                <button
                  onClick={() => deleteNoteMutation.mutate(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-slate-400">
                  {new Date(note.created_at).toLocaleString()}
                </span>
                {note.customer_visible ? (
                  <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5" /> Visible to customer
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <EyeOff className="w-2.5 h-2.5" /> Internal only
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add a note..."
            rows={2}
          />
          <div className="flex items-center justify-between">
            <Toggle
              checked={noteCustomerVisible}
              onChange={setNoteCustomerVisible}
              label="Customer visible"
            />
            <Button
              size="xs"
              icon={Plus}
              onClick={() => addNoteMutation.mutate()}
              loading={addNoteMutation.isPending}
              disabled={!noteContent.trim()}
            >
              Add Note
            </Button>
          </div>
        </div>
      </div>

      {detailedStatus === "completed" ? (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Rating</p>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => {
                  setRatingValue(star);
                  rateMutation.mutate({ rating: star });
                }}
                className="p-0.5"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    star <= ratingValue
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`}
                />
              </button>
            ))}
            {ratingValue > 0 ? (
              <span className="text-sm text-slate-500 ml-2">{ratingValue}/5</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProgressTab({
  job,
  detailedStatus,
  statusIdx,
  timeline,
  onUpdateStatus,
  generateTokenMutation,
  onGenerateMessage,
  copyToClipboard,
}: any) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-4">Status Flow</p>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((step, i) => {
            const Icon = step.icon;
            const isActive = i <= statusIdx;
            const isCurrent = step.key === detailedStatus;
            const isAutoStage = AUTO_STATUSES.has(step.key);
            const isClickable = i > statusIdx && !isAutoStage;
            return (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => {
                    if (isClickable) onUpdateStatus(step.key);
                  }}
                  disabled={!isClickable}
                  title={isAutoStage && !isActive ? "This stage updates automatically" : undefined}
                  className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all min-w-[80px] ${
                    isCurrent
                      ? "bg-primary-50 ring-2 ring-primary-200"
                      : isActive
                      ? "bg-emerald-50"
                      : isAutoStage
                      ? "bg-sky-50 cursor-not-allowed opacity-70"
                      : "bg-slate-50 hover:bg-slate-100 cursor-pointer"
                  } ${!isClickable ? "cursor-default" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCurrent
                        ? "bg-primary-500 text-white"
                        : isActive
                        ? "bg-emerald-500 text-white"
                        : isAutoStage
                        ? "bg-sky-200 text-sky-500"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isActive && !isCurrent ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium text-center leading-tight ${
                      isCurrent
                        ? "text-primary-700"
                        : isActive
                        ? "text-emerald-700"
                        : isAutoStage
                        ? "text-sky-500"
                        : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {isAutoStage && !isActive ? (
                    <span className="text-[9px] text-sky-400 font-medium">auto</span>
                  ) : null}
                </button>
                {i < STATUS_FLOW.length - 1 ? (
                  <div
                    className={`w-4 h-0.5 shrink-0 ${
                      i < statusIdx ? "bg-emerald-300" : "bg-slate-200"
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          In Progress and Final Touches advance automatically based on elapsed time after Service Started.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">Timeline</p>
        {timeline.length > 0 ? (
          <Timeline
            items={timeline.map((entry: any) => ({
              title: entry.status.replace(/[_-]/g, " "),
              description: entry.note || undefined,
              time: new Date(entry.created_at).toLocaleString(),
              active: true,
            }))}
          />
        ) : (
          <p className="text-sm text-slate-400">No timeline entries yet</p>
        )}
      </div>

      <div className="border-t border-slate-100 pt-5">
        <p className="text-sm font-medium text-slate-700 mb-3">
          Live Update Page
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Generate a shareable link so your customer can track the job progress in real time.
        </p>
        {job.updateToken ? (
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
            <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-600 truncate flex-1">
              {window.location.origin}/live-update/{job.updateToken}
            </span>
            <button
              onClick={() =>
                copyToClipboard(
                  `${window.location.origin}/live-update/${job.updateToken}`
                )
              }
              className="p-1.5 rounded-md bg-white shadow-sm hover:bg-slate-100 transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        ) : (
          <Button
            size="sm"
            icon={Link2}
            variant="secondary"
            onClick={() => generateTokenMutation.mutate()}
            loading={generateTokenMutation.isPending}
          >
            Generate Link
          </Button>
        )}
      </div>

      <div className="border-t border-slate-100 pt-5">
        <p className="text-sm font-medium text-slate-700 mb-3">
          AI Customer Message
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Generate an AI-drafted message to send your customer a status update.
        </p>
        <div className="flex gap-2 flex-wrap">
          {["en_route", "started", "in_progress", "completed"].map((t) => (
            <Button
              key={t}
              size="xs"
              variant="secondary"
              icon={MessageSquare}
              onClick={() => onGenerateMessage(t)}
            >
              {t.replace(/[_-]/g, " ")}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChecklistTab({
  roomGroups,
  completedItems,
  totalItems,
  checklistPct,
  toggleChecklistMutation,
}: any) {
  const groups = Object.keys(roomGroups);

  if (totalItems === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="No checklist items"
        description="Checklist items are created when the job is set up"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          {completedItems}/{totalItems} completed
        </p>
        <span className="text-xs text-slate-500">{Math.round(checklistPct)}%</span>
      </div>
      <ProgressBar
        value={checklistPct}
        color={checklistPct >= 100 ? "emerald" : "amber"}
        size="md"
      />

      {groups.map((group) => (
        <div key={group}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            {group}
          </p>
          <div className="space-y-1">
            {roomGroups[group].map((item: any) => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <button
                  onClick={() => toggleChecklistMutation.mutate(item)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                    item.completed
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-slate-300 group-hover:border-slate-400"
                  }`}
                >
                  {item.completed ? (
                    <CheckCircle className="w-3 h-3 text-white" />
                  ) : null}
                </button>
                <span
                  className={`text-sm flex-1 ${
                    item.completed
                      ? "text-slate-400 line-through"
                      : "text-slate-700"
                  }`}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotosTab({
  beforePhotos,
  afterPhotos,
  photos,
}: any) {
  const [photoFilter, setPhotoFilter] = useState("all");

  const displayPhotos =
    photoFilter === "before"
      ? beforePhotos
      : photoFilter === "after"
      ? afterPhotos
      : photos;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          {photos.length} photos
        </p>
        <div className="flex gap-1">
          {["all", "before", "after"].map((f) => (
            <button
              key={f}
              onClick={() => setPhotoFilter(f)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                photoFilter === f
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {f} {f === "before" ? `(${beforePhotos.length})` : f === "after" ? `(${afterPhotos.length})` : `(${photos.length})`}
            </button>
          ))}
        </div>
      </div>

      {displayPhotos.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No photos"
          description="Photos are uploaded from the mobile app during jobs"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayPhotos.map((photo: any) => (
            <div
              key={photo.id}
              className="relative group rounded-xl overflow-hidden bg-slate-100 aspect-square"
            >
              <img
                src={photo.photoUrl}
                alt={photo.caption || "Job photo"}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <Badge
                    status={photo.photoType === "before" ? "info" : "success"}
                    label={photo.photoType}
                    size="sm"
                  />
                  {photo.caption ? (
                    <p className="text-[10px] text-white/90 mt-1 truncate">
                      {photo.caption}
                    </p>
                  ) : null}
                </div>
              </div>
              {photo.customerVisible === false ? (
                <div className="absolute top-2 right-2">
                  <div className="bg-black/50 rounded-full p-1">
                    <EyeOff className="w-3 h-3 text-white" />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
