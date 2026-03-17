import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  XCircle,
  Target,
  DollarSign,
  Award,
  AlertTriangle,
  Phone,
  Flag,
  Edit2,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  StatCard,
  Spinner,
  Modal,
  ProgressBar,
  Button,
} from "../components/ui";
import { ProGate } from "../components/ProGate";
import { apiRequest } from "../lib/api";
import { useNavigate } from "react-router-dom";

interface WeeklyRecapData {
  quotesSent: number;
  quotesAccepted: number;
  quotesDeclined: number;
  quotesExpired: number;
  closeRate: number;
  revenueWon: number;
  biggestWin: number | { id: string; total: number; customerFirstName: string; customerLastName: string } | null;
  mostAtRiskOpen: { id: string; total: number; sentAt: string; customerFirstName: string; customerLastName: string } | null;
}

interface Preferences {
  weeklyGoal?: string;
  weeklyGoalTarget?: number;
  [key: string]: any;
}

interface StreakData {
  currentStreak?: number;
  weekStreak?: number;
  [key: string]: any;
}

const GOAL_OPTIONS = [
  { label: "Send 5 quotes", goal: "send_quotes", target: 5 },
  { label: "Send 10 quotes", goal: "send_quotes", target: 10 },
  { label: "Send 15 quotes", goal: "send_quotes", target: 15 },
  { label: "Follow up daily", goal: "follow_up_daily", target: 7 },
];

function getWeekRange(weekOffset: number): { label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return { label: `Week of ${months[monday.getMonth()]} ${monday.getDate()} – ${months[sunday.getMonth()]} ${sunday.getDate()}` };
}

function getDaysAgo(dateStr: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)));
}

function WeeklyRecapContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(-1);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const isCurrentWeek = weekOffset === 0;
  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  const { data: recap, isLoading } = useQuery<WeeklyRecapData>({
    queryKey: [`/api/weekly-recap?weekOffset=${weekOffset}`],
  });

  const { data: preferences } = useQuery<Preferences>({
    queryKey: ["/api/preferences"],
  });

  const { data: streaks } = useQuery<StreakData>({
    queryKey: ["/api/streaks"],
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (params: { weeklyGoal: string; weeklyGoalTarget: number }) => {
      await apiRequest("PUT", "/api/preferences", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      setGoalModalOpen(false);
    },
  });

  const goalProgress = useMemo(() => {
    if (!preferences?.weeklyGoal || !preferences?.weeklyGoalTarget || !recap) return null;
    const target = preferences.weeklyGoalTarget;
    let current = 0;
    if (preferences.weeklyGoal === "send_quotes") current = recap.quotesSent;
    else if (preferences.weeklyGoal === "follow_up_daily") current = streaks?.weekStreak ?? streaks?.currentStreak ?? 0;
    return { current, target };
  }, [preferences, recap, streaks]);

  const goalLabel = useMemo(() => {
    if (!preferences?.weeklyGoal) return "";
    if (preferences.weeklyGoal === "send_quotes") return `Send ${preferences.weeklyGoalTarget} quotes`;
    return "Follow up daily";
  }, [preferences]);

  const biggestWinAmount = recap?.biggestWin != null
    ? typeof recap.biggestWin === "number"
      ? recap.biggestWin
      : (recap.biggestWin as any)?.total ?? 0
    : 0;

  const biggestWinName = recap?.biggestWin != null && typeof recap.biggestWin === "object"
    ? `${(recap.biggestWin as any).customerFirstName || ""} ${(recap.biggestWin as any).customerLastName || ""}`.trim()
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <p className="font-semibold text-slate-900 text-sm">{weekRange.label}</p>
        <button
          onClick={() => { if (!isCurrentWeek) setWeekOffset((o) => o + 1); }}
          disabled={isCurrentWeek}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Quotes Sent" value={(recap?.quotesSent ?? 0).toString()} icon={FileText} />
            <StatCard label="Accepted" value={(recap?.quotesAccepted ?? 0).toString()} icon={CheckCircle} color="emerald" />
            <StatCard
              label="Declined / Expired"
              value={((recap?.quotesDeclined ?? 0) + (recap?.quotesExpired ?? 0)).toString()}
              icon={XCircle}
              color="red"
            />
            <StatCard label="Close Rate" value={`${recap?.closeRate ?? 0}%`} icon={Target} />
            <StatCard label="Revenue Won" value={`$${(recap?.revenueWon ?? 0).toLocaleString()}`} icon={DollarSign} color="emerald" />
            <StatCard
              label="Biggest Win"
              value={biggestWinAmount > 0 ? `$${biggestWinAmount.toLocaleString()}` : "—"}
              icon={Award}
              color="amber"
              subtitle={biggestWinName || undefined}
            />
          </div>

          {recap?.mostAtRiskOpen && (
            <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">Most at risk</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  {recap.mostAtRiskOpen.customerFirstName} {recap.mostAtRiskOpen.customerLastName} —{" "}
                  ${recap.mostAtRiskOpen.total.toLocaleString()} (sent {getDaysAgo(recap.mostAtRiskOpen.sentAt)} days ago)
                </p>
              </div>
              <button
                onClick={() => navigate("/follow-ups")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors flex-shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                Follow Up
              </button>
            </div>
          )}

          <Card>
            <CardHeader
              title="Weekly Goal"
              icon={Flag}
              actions={
                <button
                  onClick={() => setGoalModalOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-slate-400" />
                </button>
              }
            />
            {goalProgress ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-700">{goalLabel}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {goalProgress.current}/{goalProgress.target}
                  </p>
                </div>
                <ProgressBar
                  value={Math.min(100, Math.round((goalProgress.current / goalProgress.target) * 100))}
                  max={100}
                />
                <p className="text-xs text-slate-500">
                  {goalProgress.current >= goalProgress.target
                    ? "Goal reached! Great work this week."
                    : `${goalProgress.target - goalProgress.current} more to reach your goal`}
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-3">Set a weekly goal to stay on track.</p>
                <Button variant="primary" icon={Target} size="sm" onClick={() => setGoalModalOpen(true)}>
                  Set a Goal
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal isOpen={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Choose a Goal">
        <div className="space-y-2">
          {GOAL_OPTIONS.map((option, idx) => {
            const isSelected = preferences?.weeklyGoal === option.goal && preferences?.weeklyGoalTarget === option.target;
            return (
              <button
                key={idx}
                onClick={() => saveGoalMutation.mutate({ weeklyGoal: option.goal, weeklyGoalTarget: option.target })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  isSelected ? "border-primary-500 bg-primary-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <FileText className={`w-5 h-5 ${isSelected ? "text-primary-600" : "text-slate-400"}`} />
                <span className={`text-sm font-medium flex-1 ${isSelected ? "text-primary-700" : "text-slate-900"}`}>
                  {option.label}
                </span>
                {isSelected && <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

export default function WeeklyRecapPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Weekly Recap"
        subtitle="Review your performance and stay on track"
      />
      <ProGate feature="Weekly Recap">
        <WeeklyRecapContent />
      </ProGate>
    </div>
  );
}
