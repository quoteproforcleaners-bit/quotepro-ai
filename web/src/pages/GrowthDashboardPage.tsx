import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  TrendingUp,
  Star,
  Repeat,
  UserPlus,
  CheckCircle,
  Clock,
  Percent,
  ChevronRight,
  Zap,
  Send,
  Settings,
  MessageSquare,
  Mail,
  Sparkles,
  Pause,
  ArrowRight,
  Target,
  DollarSign,
  RefreshCw,
  Copy,
  Phone,
  BarChart3,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { apiPost, apiPut, apiRequest } from "../lib/api";
import {
  PageHeader,
  Card,
  CardHeader,
  HeroCard,
  Badge,
  Button,
  EmptyState,
  Spinner,
  StatCard,
  Tabs,
  MetricRing,
  ProgressBar,
  Avatar,
  Modal,
  Textarea,
  Input,
  Select,
} from "../components/ui";

const TASK_ICONS: Record<string, LucideIcon> = {
  review_request: Star,
  upsell: TrendingUp,
  rebook: Repeat,
  reactivation: UserPlus,
  follow_up: Phone,
  default: CheckCircle,
};

function getTimeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function GrowthDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tasks");
  const [campaignModal, setCampaignModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", segment: "dormant", channel: "email" });
  const [generatingContent, setGeneratingContent] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, { subject?: string; content: string }>>({});
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { data: growthTasks = [], isLoading: loadingTasks } = useQuery<any[]>({ queryKey: ["/api/growth-tasks"] });
  const { data: forecast } = useQuery<any>({ queryKey: ["/api/forecast"] });
  const { data: reviewRequests = [] } = useQuery<any[]>({ queryKey: ["/api/review-requests"] });
  const { data: upsellOpps = [] } = useQuery<any[]>({ queryKey: ["/api/upsell-opportunities"] });
  const { data: rebookCandidates = [] } = useQuery<any[]>({ queryKey: ["/api/rebook-candidates"] });
  const { data: dormantOpps = [] } = useQuery<any[]>({ queryKey: ["/api/opportunities/dormant"] });
  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });

  const pending = useMemo(() => growthTasks.filter((t: any) => t.status === "pending"), [growthTasks]);
  const completed = useMemo(() => growthTasks.filter((t: any) => t.status === "completed"), [growthTasks]);
  const snoozed = useMemo(() => growthTasks.filter((t: any) => t.status === "snoozed"), [growthTasks]);

  const growthScore = useMemo(() => {
    const s1 = Math.min(pending.length * 5, 30);
    const s2 = Math.min(completed.length * 3, 40);
    const s3 = Math.min(Math.round((forecast?.closeRate || 0) * 30), 30);
    return Math.min(s1 + s2 + s3, 100);
  }, [pending, completed, forecast]);

  const recentActivity = useMemo(() =>
    [...growthTasks]
      .filter((t: any) => t.completedAt || t.createdAt)
      .sort((a: any, b: any) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
      .slice(0, 5),
  [growthTasks]);

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, channel }: { id: string; action: string; channel?: string }) => {
      return apiPost(`/api/growth-tasks/${id}/action`, { action, channel });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/growth-tasks"] }),
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ id, hours }: { id: string; hours: number }) => {
      return apiPost(`/api/growth-tasks/${id}/snooze`, { hours });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/growth-tasks"] }),
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => apiPost("/api/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setCampaignModal(false);
      setNewCampaign({ name: "", segment: "dormant", channel: "email" });
    },
  });

  const generateCampaignContent = async (campaignId: string, campaignName: string, segment: string) => {
    setGeneratingContent(campaignId);
    try {
      const res = await apiPost<any>("/api/ai/generate-campaign-content", { campaignName, segment });
      setGeneratedContent(prev => ({ ...prev, [campaignId]: { subject: res.subject, content: res.content } }));
    } catch {
      setGeneratedContent(prev => ({ ...prev, [campaignId]: { content: "Unable to generate content." } }));
    }
    setGeneratingContent(null);
  };

  const sendCampaignMutation = useMutation({
    mutationFn: async (id: string) => apiPost(`/api/campaigns/${id}/send`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] }),
  });

  const handlePreviewCampaign = async (id: string) => {
    setLoadingPreview(true);
    setPreviewCampaignId(id);
    setPreviewHtml(null);
    try {
      const res = await apiRequest("POST", `/api/campaigns/${id}/preview`) as any;
      const data = await res.json();
      setPreviewHtml(data.html);
    } catch {
      setPreviewHtml("<p style='padding:20px;color:red;'>Failed to load preview.</p>");
    } finally {
      setLoadingPreview(false);
    }
  };

  const scoreColor = growthScore >= 70 ? "emerald" : growthScore >= 40 ? "amber" : "red";

  const opportunities = [
    { label: "Reviews", count: reviewRequests.length, icon: Star, color: "amber" as const },
    { label: "Upsells", count: upsellOpps.length, icon: TrendingUp, color: "emerald" as const },
    { label: "Rebook", count: rebookCandidates.length, icon: Repeat, color: "primary" as const },
    { label: "Reactivation", count: dormantOpps.length, icon: UserPlus, color: "red" as const },
  ];

  if (loadingTasks) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Growth Dashboard"
        subtitle="AI-powered growth engine for your business"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Settings} size="sm" onClick={() => navigate("/settings")}>
              Automations
            </Button>
            <Button icon={Zap} size="sm" onClick={() => setActiveTab("tasks")}>
              Tasks
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <HeroCard variant="blue" className="lg:col-span-1">
          <div className="flex items-center gap-6">
            <MetricRing value={growthScore} color={scoreColor} size={100} strokeWidth={8}>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{growthScore}</p>
                <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wide">Score</p>
              </div>
            </MetricRing>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-sm text-white/90">{completed.length} Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-sm text-white/90">{pending.length} Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <Percent className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-sm text-white/90">{Math.round((forecast?.closeRate || 0) * 100)}% Close Rate</span>
              </div>
            </div>
          </div>
        </HeroCard>

        <Card className="lg:col-span-2">
          <CardHeader title="Pipeline Snapshot" icon={BarChart3} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Open Quotes", value: `$${(forecast?.openQuoteValue || 0).toLocaleString()}` },
              { label: "Forecasted", value: `$${(forecast?.forecastedRevenue || 0).toLocaleString()}` },
              { label: "Close Rate", value: `${Math.round((forecast?.closeRate || 0) * 100)}%` },
              { label: "Confidence", value: forecast?.confidenceBand || "---" },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {opportunities.map(opp => (
          <StatCard
            key={opp.label}
            label={opp.label}
            value={opp.count}
            icon={opp.icon}
            color={opp.color}
          />
        ))}
      </div>

      <div className="mb-6">
        <Tabs
          tabs={["tasks", "reviews", "campaigns", "upsells", "activity"]}
          active={activeTab}
          onChange={setActiveTab}
          counts={{
            tasks: pending.length,
            reviews: reviewRequests.length,
            campaigns: campaigns.length,
            upsells: upsellOpps.length,
            activity: recentActivity.length,
          }}
        />
      </div>

      {activeTab === "tasks" ? (
        <div>
          {pending.length === 0 ? (
            <Card>
              <EmptyState
                icon={CheckCircle}
                title="All caught up!"
                description="No pending growth tasks. Your AI engine will generate new tasks as opportunities arise."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((task: any) => {
                const Icon = TASK_ICONS[task.taskType || task.type] || TASK_ICONS.default;
                return (
                  <Card key={task.id}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {task.title || task.taskType || "Growth Task"}
                            </h3>
                            <Badge status={task.priority === "high" ? "error" : task.priority === "medium" ? "warning" : "info"} label={task.priority || "normal"} size="sm" />
                          </div>
                          {task.customerName ? (
                            <p className="text-sm text-slate-500 truncate">{task.customerName}</p>
                          ) : null}
                          {task.description ? (
                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
                          ) : null}
                          {task.estimatedValue ? (
                            <p className="text-sm font-medium text-emerald-600 mt-1">
                              +${Number(task.estimatedValue).toLocaleString()} potential
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          icon={MessageSquare}
                          size="sm"
                          onClick={() => actionMutation.mutate({ id: task.id, action: "sms_sent", channel: "sms" })}
                        >
                          SMS
                        </Button>
                        <Button
                          variant="secondary"
                          icon={Mail}
                          size="sm"
                          onClick={() => actionMutation.mutate({ id: task.id, action: "email_sent", channel: "email" })}
                        >
                          Email
                        </Button>
                        <Button
                          variant="ghost"
                          icon={Pause}
                          size="sm"
                          onClick={() => snoozeMutation.mutate({ id: task.id, hours: 24 })}
                        >
                          Snooze
                        </Button>
                        <Button
                          variant="success"
                          icon={CheckCircle}
                          size="sm"
                          onClick={() => actionMutation.mutate({ id: task.id, action: "completed" })}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {snoozed.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Snoozed ({snoozed.length})
              </h3>
              <div className="space-y-2">
                {snoozed.map((task: any) => (
                  <Card key={task.id} className="opacity-60">
                    <div className="flex items-center gap-3">
                      <Pause className="w-4 h-4 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{task.title || task.taskType}</p>
                        {task.snoozedUntil ? (
                          <p className="text-xs text-slate-400">Until {new Date(task.snoozedUntil).toLocaleString()}</p>
                        ) : null}
                      </div>
                      <Badge status="snoozed" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : activeTab === "reviews" ? (
        <div>
          {reviewRequests.length === 0 ? (
            <Card>
              <EmptyState
                icon={Star}
                title="No review requests"
                description="Complete jobs to generate review requests for your customers."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {reviewRequests.map((req: any) => (
                <Card key={req.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar name={req.customerName || "C"} size="sm" />
                      <div>
                        <h3 className="font-semibold text-slate-900">{req.customerName || "Customer"}</h3>
                        <p className="text-sm text-slate-500">
                          {req.status === "sent" ? "Review request sent" : req.status === "completed" ? "Review received" : "Pending"}
                          {req.rating ? ` - ${req.rating} stars` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={req.reviewClicked ? "clicked" : req.status || "pending"} />
                      {req.referralSent ? <Badge status="success" label="Referral sent" /> : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "campaigns" ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Reactivation Campaigns</h3>
            <Button icon={Sparkles} size="sm" onClick={() => setCampaignModal(true)}>
              New Campaign
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Card>
              <EmptyState
                icon={Send}
                title="No campaigns yet"
                description="Create reactivation campaigns to win back dormant customers and lost leads."
                action={
                  <Button onClick={() => setCampaignModal(true)}>Create Campaign</Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign: any) => (
                <Card key={campaign.id}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                          <Badge status={campaign.status || "draft"} />
                        </div>
                        <p className="text-sm text-slate-500">
                          {campaign.segment} &middot; {campaign.channel}
                          {campaign.completedCount ? ` &middot; ${campaign.completedCount} sent` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.status !== "sent" ? (
                          <>
                            <Button
                              variant="secondary"
                              icon={Sparkles}
                              size="sm"
                              loading={generatingContent === campaign.id}
                              onClick={() => generateCampaignContent(campaign.id, campaign.name, campaign.segment)}
                            >
                              Generate
                            </Button>
                            {campaign.messageContent || generatedContent[campaign.id] ? (
                              <>
                                <Button
                                  variant="secondary"
                                  icon={Eye}
                                  size="sm"
                                  loading={loadingPreview && previewCampaignId === campaign.id}
                                  onClick={() => handlePreviewCampaign(campaign.id)}
                                >
                                  Preview
                                </Button>
                                <Button
                                  variant="primary"
                                  icon={Send}
                                  size="sm"
                                  loading={sendCampaignMutation.isPending}
                                  onClick={() => sendCampaignMutation.mutate(campaign.id)}
                                >
                                  Send
                                </Button>
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                    {generatedContent[campaign.id] ? (
                      <div className="bg-blue-50 rounded-lg p-3">
                        {generatedContent[campaign.id].subject ? (
                          <p className="text-xs font-medium text-blue-700 mb-1">Subject: {generatedContent[campaign.id].subject}</p>
                        ) : null}
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{generatedContent[campaign.id].content}</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(generatedContent[campaign.id].content)}
                          className="flex items-center gap-1 text-xs text-blue-600 font-medium mt-2 hover:text-blue-800"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                    ) : campaign.messageContent ? (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-3">{campaign.messageContent}</p>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {dormantOpps.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Dormant Customers ({dormantOpps.length})
              </h3>
              <div className="space-y-2">
                {dormantOpps.slice(0, 5).map((c: any) => (
                  <Card key={c.id}>
                    <div className="flex items-center gap-3">
                      <Avatar name={`${c.firstName || ""} ${c.lastName || ""}`} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-slate-500">
                          {c.email || c.phone || "No contact"}
                          {c.lastServiceDate ? ` | Last: ${new Date(c.lastServiceDate).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <Button variant="secondary" size="sm" icon={UserPlus} onClick={() => navigate(`/customers/${c.id}`)}>
                        Re-engage
                      </Button>
                    </div>
                  </Card>
                ))}
                {dormantOpps.length > 5 ? (
                  <p className="text-sm text-slate-500 text-center py-2">
                    +{dormantOpps.length - 5} more dormant customers
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : activeTab === "upsells" ? (
        <div>
          {upsellOpps.length === 0 && rebookCandidates.length === 0 ? (
            <Card>
              <EmptyState
                icon={TrendingUp}
                title="No upsell opportunities"
                description="Complete more jobs to unlock AI-powered upsell and rebook suggestions."
              />
            </Card>
          ) : (
            <>
              {upsellOpps.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Upsell Opportunities</h3>
                  <div className="space-y-3">
                    {upsellOpps.map((opp: any, i: number) => (
                      <Card key={opp.id || i}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900">{opp.customerName || opp.title || "Upsell"}</h3>
                            {opp.description ? (
                              <p className="text-sm text-slate-500 mt-0.5">{opp.description}</p>
                            ) : null}
                            {opp.suggestedService ? (
                              <p className="text-sm text-slate-500 mt-0.5">Suggested: {opp.suggestedService}</p>
                            ) : null}
                            {opp.estimatedValue ? (
                              <p className="text-sm font-medium text-emerald-600 mt-1">
                                +${Number(opp.estimatedValue).toLocaleString()} potential
                              </p>
                            ) : null}
                          </div>
                          {opp.customerId ? (
                            <Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => navigate(`/customers/${opp.customerId}`)}>
                              View
                            </Button>
                          ) : null}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}

              {rebookCandidates.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Rebook Candidates</h3>
                  <div className="space-y-3">
                    {rebookCandidates.map((c: any, i: number) => (
                      <Card key={c.id || i}>
                        <div className="flex items-center gap-3">
                          <Avatar name={`${c.firstName || ""} ${c.lastName || ""}`} size="sm" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-slate-500">
                              Last service: {c.lastServiceDate ? new Date(c.lastServiceDate).toLocaleDateString() : "Unknown"}
                            </p>
                          </div>
                          <Button variant="secondary" size="sm" icon={Repeat} onClick={() => navigate(`/customers/${c.id}`)}>
                            Rebook
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : activeTab === "activity" ? (
        <div>
          {recentActivity.length === 0 ? (
            <Card>
              <EmptyState
                icon={Clock}
                title="No recent activity"
                description="Complete growth tasks to build your activity history."
              />
            </Card>
          ) : (
            <Card>
              <CardHeader title="Recent Activity" icon={Clock} />
              <div className="space-y-0">
                {recentActivity.map((item: any, i: number) => {
                  const Icon = TASK_ICONS[item.taskType || item.type] || TASK_ICONS.default;
                  return (
                    <div key={item.id || i} className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                      <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.title || item.taskType || "Activity"}</p>
                        {item.customerName ? (
                          <p className="text-xs text-slate-500">{item.customerName}</p>
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {getTimeAgo(item.completedAt || item.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {completed.length > 0 ? (
            <div className="mt-4">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Tasks Completed</p>
                    <p className="text-2xl font-bold text-slate-900">{completed.length}</p>
                  </div>
                  <ProgressBar
                    value={completed.length}
                    max={completed.length + pending.length || 1}
                    color="emerald"
                    size="md"
                    showLabel
                    className="w-32"
                  />
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={campaignModal}
        onClose={() => setCampaignModal(false)}
        title="New Reactivation Campaign"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setCampaignModal(false)}>Cancel</Button>
            <Button
              onClick={() => createCampaignMutation.mutate(newCampaign)}
              loading={createCampaignMutation.isPending}
              disabled={!newCampaign.name.trim()}
            >
              Create Campaign
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Campaign Name"
            placeholder="e.g., Holiday Deep Clean, Spring Cleaning Special"
            value={newCampaign.name}
            onChange={e => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
          />
          <Select
            label="Target Segment"
            value={newCampaign.segment}
            onChange={e => setNewCampaign(prev => ({ ...prev, segment: e.target.value }))}
            options={[
              { value: "dormant", label: "Dormant Customers (90+ days)" },
              { value: "lost", label: "Lost Leads (declined quotes)" },
              { value: "all", label: "All Customers" },
            ]}
          />
          <Select
            label="Channel"
            value={newCampaign.channel}
            onChange={e => setNewCampaign(prev => ({ ...prev, channel: e.target.value }))}
            options={[
              { value: "email", label: "Email" },
              { value: "sms", label: "SMS" },
            ]}
          />
        </div>
      </Modal>

      {/* Email Preview Modal */}
      <Modal
        open={previewCampaignId !== null}
        onClose={() => { setPreviewCampaignId(null); setPreviewHtml(null); }}
        title="Email Preview"
        size="xl"
        actions={
          <>
            <Button variant="secondary" onClick={() => { setPreviewCampaignId(null); setPreviewHtml(null); }}>Close</Button>
            <Button
              variant="primary"
              icon={Send}
              loading={sendCampaignMutation.isPending}
              onClick={() => {
                if (previewCampaignId) sendCampaignMutation.mutate(previewCampaignId);
                setPreviewCampaignId(null);
                setPreviewHtml(null);
              }}
            >
              Confirm & Send
            </Button>
          </>
        }
      >
        {loadingPreview ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spinner />
          </div>
        ) : previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            style={{ width: "100%", height: 520, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}
            title="Email Preview"
            sandbox="allow-same-origin"
          />
        ) : null}
      </Modal>
    </div>
  );
}
