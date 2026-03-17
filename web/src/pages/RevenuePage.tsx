import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  DollarSign,
  FileText,
  Clock,
  Zap,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  StatCard,
  EmptyState,
  Spinner,
  Badge,
} from "../components/ui";
import { ProGate } from "../components/ProGate";

interface PipelineData {
  totalPipeline: number;
  expectedValue: number;
  openQuotes: number;
  avgAgeDays: number;
  quotes: any[];
}

interface UnfollowedQuote {
  id: number;
  total: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
  } | null;
}

function getDaysAgo(sentAt: string | null, createdAt: string): number {
  const date = new Date(sentAt || createdAt).getTime();
  return Math.round((Date.now() - date) / (1000 * 60 * 60 * 24));
}

function getStatusColor(status: string): string {
  switch (status) {
    case "accepted": return "green";
    case "sent": return "blue";
    case "draft": return "gray";
    case "declined": return "red";
    case "expired": return "yellow";
    default: return "gray";
  }
}

function RevenueContent() {
  const navigate = useNavigate();

  const { data: pipeline, isLoading: pipelineLoading } = useQuery<PipelineData>({
    queryKey: ["/api/revenue/pipeline"],
  });

  const { data: unfollowed = [], isLoading: unfollowedLoading } = useQuery<UnfollowedQuote[]>({
    queryKey: ["/api/revenue/unfollowed"],
  });

  if (pipelineLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/ai-assistant")}
        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm">AI Sales Assistant</p>
          <p className="text-xs text-slate-500 mt-0.5">Get personalized insights and close more deals</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pipeline Value"
          value={`$${(pipeline?.totalPipeline || 0).toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          label="Open Quotes"
          value={(pipeline?.openQuotes || 0).toString()}
          icon={FileText}
        />
        <StatCard
          label="Expected Revenue"
          value={`$${(pipeline?.expectedValue || 0).toLocaleString()}`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          label="Avg Quote Age"
          value={`${pipeline?.avgAgeDays || 0} days`}
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader
          title="Needs Follow-up"
          actions={
            unfollowed.length > 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {unfollowed.length}
              </span>
            ) : undefined
          }
        />
        {unfollowedLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : unfollowed.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All caught up"
            description="No quotes need follow-up right now. Great work!"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {unfollowed.map((quote) => {
              const daysAgo = getDaysAgo(quote.sentAt, quote.createdAt);
              const customerName = quote.customer
                ? `${quote.customer.firstName} ${quote.customer.lastName}`
                : "No customer";
              const color = getStatusColor(quote.status);

              return (
                <button
                  key={quote.id}
                  onClick={() => navigate(`/quotes/${quote.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{customerName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sent {daysAgo} {daysAgo === 1 ? "day" : "days"} ago
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="font-semibold text-slate-900 text-sm">
                      ${quote.total.toLocaleString()}
                    </span>
                    <Badge status={quote.status} />
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function RevenuePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Revenue Intelligence"
        subtitle="Track your pipeline and close more deals"
      />
      <ProGate feature="Revenue Intelligence">
        <RevenueContent />
      </ProGate>
    </div>
  );
}
