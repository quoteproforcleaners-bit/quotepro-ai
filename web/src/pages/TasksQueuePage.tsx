import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  AlertCircle,
  Repeat,
  Star,
  Gift,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  Phone,
  Mail,
  Clock,
  Check,
  ListTodo,
} from "lucide-react";
import {
  PageHeader,
  Card,
  EmptyState,
  Spinner,
} from "../components/ui";
import { ProGate } from "../components/ProGate";
import { apiRequest } from "../lib/api";

type TaskType =
  | "QUOTE_FOLLOWUP"
  | "ABANDONED_RECOVERY"
  | "REBOOK_NUDGE"
  | "REVIEW_REQUEST"
  | "REFERRAL_ASK"
  | "UPSELL_DEEP_CLEAN"
  | "REACTIVATION";

const TASK_META: Record<TaskType, { icon: typeof MessageCircle; color: string; label: string }> = {
  QUOTE_FOLLOWUP: { icon: MessageCircle, color: "#007AFF", label: "Quote Follow-Up" },
  ABANDONED_RECOVERY: { icon: AlertCircle, color: "#EF4444", label: "Quote Recovery" },
  REBOOK_NUDGE: { icon: Repeat, color: "#F97316", label: "Rebook Nudge" },
  REVIEW_REQUEST: { icon: Star, color: "#8B5CF6", label: "Review Request" },
  REFERRAL_ASK: { icon: Gift, color: "#2F7BFF", label: "Referral Ask" },
  UPSELL_DEEP_CLEAN: { icon: TrendingUp, color: "#8B5CF6", label: "Deep Clean Upsell" },
  REACTIVATION: { icon: RefreshCw, color: "#F59E0B", label: "Reactivation" },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "QUOTE_FOLLOWUP", label: "Follow Up" },
  { key: "REVIEW_REQUEST", label: "Reviews" },
  { key: "REBOOK_NUDGE", label: "Rebook" },
  { key: "UPSELL_DEEP_CLEAN", label: "Upsell" },
];

function getPriorityLabel(priority: number): { label: string; color: string; bg: string } {
  if (priority >= 70) return { label: "High", color: "#EF4444", bg: "#FEF2F2" };
  if (priority >= 40) return { label: "Med", color: "#F59E0B", bg: "#FFFBEB" };
  return { label: "Low", color: "#2F7BFF", bg: "#EFF6FF" };
}

function formatDueDate(dateStr?: string): string {
  if (!dateStr) return "";
  const due = new Date(dateStr);
  const diffHours = Math.round((due.getTime() - Date.now()) / (1000 * 60 * 60));
  if (diffHours < 0) {
    const overdue = Math.abs(diffHours);
    return overdue < 24 ? `${overdue}h overdue` : `${Math.round(overdue / 24)}d overdue`;
  }
  return diffHours < 24 ? `Due in ${diffHours}h` : `Due in ${Math.round(diffHours / 24)}d`;
}

function EscalationDots({ stage, color }: { stage: number; color: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: s <= stage ? color : "#CBD5E1" }}
        />
      ))}
    </div>
  );
}

function TaskCard({ task, onAction }: { task: any; onAction: (id: number, type: string) => void }) {
  const meta = TASK_META[task.type as TaskType] || TASK_META.QUOTE_FOLLOWUP;
  const priority = getPriorityLabel(task.priority || 50);
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: meta.color + "15" }}
        >
          <Icon className="w-5 h-5" style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{task.customerName || "Customer"}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: meta.color }}>{meta.label}</p>
          {task.messagePreview && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{task.messagePreview}</p>
          )}
          {task.scheduledFor && (
            <p className="text-xs text-slate-400 mt-0.5">{formatDueDate(task.scheduledFor)}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold"
            style={{ backgroundColor: priority.bg, color: priority.color }}
          >
            {priority.label}
          </span>
          <EscalationDots stage={task.escalationStage || 1} color={meta.color} />
        </div>
      </div>
      <div className="flex border-t border-slate-100">
        {[
          { type: "sms", icon: Phone, label: "SMS", color: "text-primary-600" },
          { type: "email", icon: Mail, label: "Email", color: "text-primary-600" },
          { type: "snooze", icon: Clock, label: "Snooze", color: "text-amber-600" },
          { type: "done", icon: Check, label: "Done", color: "text-emerald-600" },
        ].map(({ type, icon: ActionIcon, label, color }) => (
          <button
            key={type}
            onClick={() => onAction(task.id, type)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100 last:border-r-0"
          >
            <ActionIcon className={`w-3.5 h-3.5 ${color}`} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TasksQueueContent() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/growth-tasks"],
  });

  const filteredTasks = useMemo(() => {
    if (activeFilter === "all") return tasks;
    return tasks.filter((t: any) => t.type === activeFilter);
  }, [tasks, activeFilter]);

  const handleAction = async (id: number, type: string) => {
    try {
      if (type === "sms" || type === "email") {
        await apiRequest("POST", `/api/growth-tasks/${id}/action`, { action: "sent", channel: type });
      } else if (type === "snooze") {
        await apiRequest("POST", `/api/growth-tasks/${id}/snooze`, { hours: 24 });
      } else if (type === "done") {
        await apiRequest("POST", `/api/growth-tasks/${id}/action`, { action: "completed" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/growth-tasks"] });
    } catch (e) {
      console.error("Task action failed:", e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === tab.key
                ? "border-primary-300 bg-primary-50 text-primary-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1.5 text-xs text-slate-400">
                {tasks.filter((t: any) => t.type === tab.key).length || ""}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={CheckCircle}
            title="All caught up!"
            description="No growth tasks right now. Your automation engine will queue new tasks as opportunities arise."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task: any) => (
            <TaskCard key={task.id} task={task} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TasksQueuePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Tasks Queue"
        subtitle="Your prioritized growth action items"
      />
      <ProGate feature="Growth Tasks">
        <TasksQueueContent />
      </ProGate>
    </div>
  );
}
