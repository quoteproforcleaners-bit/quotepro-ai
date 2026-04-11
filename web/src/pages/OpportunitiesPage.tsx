import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Target,
  UserMinus,
  TrendingDown,
  DollarSign,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  EmptyState,
  Spinner,
  StatCard,
  Tabs,
} from "../components/ui";
import { useState } from "react";

export default function OpportunitiesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dormant");

  const { data: dormant = [], isLoading: loadingDormant } = useQuery<any[]>({
    queryKey: ["/api/opportunities/dormant"],
  });
  const { data: lost = [], isLoading: loadingLost } = useQuery<any[]>({
    queryKey: ["/api/opportunities/lost"],
  });
  const { data: growthTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/growth-tasks"],
  });
  const { data: forecast } = useQuery<any>({
    queryKey: ["/api/forecast"],
  });

  const isLoading = loadingDormant || loadingLost;

  const dormantRevenue = dormant.reduce(
    (sum: number, c: any) => sum + (Number(c.lastQuoteTotal || c.totalSpent) || 0),
    0
  );

  const lostRevenue = lost.reduce(
    (sum: number, q: any) => sum + (Number(q.total) || 0),
    0
  );

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Revenue recovery and growth insights"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Dormant Customers"
          value={dormant.length}
          icon={UserMinus}
          color="amber"
          subtitle="Haven't booked in 60+ days"
        />
        <StatCard
          label="Lost Revenue"
          value={`$${lostRevenue.toLocaleString()}`}
          icon={TrendingDown}
          color="red"
          subtitle={`${lost.length} declined quotes`}
        />
        <StatCard
          label="Recovery Potential"
          value={`$${(dormantRevenue + lostRevenue).toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
        />
      </div>

      <div className="mb-6">
        <Tabs
          tabs={["dormant", "lost", "growth"]}
          active={tab}
          onChange={setTab}
          counts={{
            dormant: dormant.length,
            lost: lost.length,
            growth: growthTasks.length,
          }}
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : tab === "dormant" ? (
        <div>
          {dormant.length === 0 ? (
            <Card>
              <EmptyState
                icon={UserMinus}
                title="No dormant customers yet"
                description="Customers who haven't booked in 60+ days will appear here so you can win them back."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {dormant.map((c: any) => (
                <Card key={c.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                        {(c.firstName?.[0] || "").toUpperCase()}
                        {(c.lastName?.[0] || "").toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {c.firstName} {c.lastName}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {c.email || c.phone || "No contact info"}
                          {c.lastServiceDate
                            ? ` | Last service: ${new Date(c.lastServiceDate).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        icon={Sparkles}
                        size="sm"
                        onClick={() => navigate(`/customers/${c.id}`)}
                      >
                        Re-engage
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : tab === "lost" ? (
        <div>
          {lost.length === 0 ? (
            <Card>
              <EmptyState
                icon={TrendingDown}
                title="No lost quotes"
                description="Declined or expired quotes will appear here so you can reach back out and recover the job."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {lost.map((q: any) => (
                <Card key={q.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">
                          {q.customerName || "Unknown"}
                        </h3>
                        <Badge status="declined" dot />
                      </div>
                      <p className="text-sm text-slate-500">
                        ${Number(q.total || 0).toLocaleString()} &middot;{" "}
                        {new Date(q.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      icon={RefreshCw}
                      size="sm"
                      onClick={() => navigate(`/quotes/${q.id}`)}
                    >
                      Review
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {growthTasks.length === 0 ? (
            <Card>
              <EmptyState
                icon={Target}
                title="No growth tasks right now"
                description="As your pipeline grows, AI-powered suggestions for upsells, rebooking nudges, and referral requests will appear here."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {growthTasks.map((task: any, i: number) => (
                <Card key={task.id || i}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">
                        {task.title || task.description}
                      </h3>
                      {task.description && task.title ? (
                        <p className="text-sm text-slate-500 mt-0.5">
                          {task.description}
                        </p>
                      ) : null}
                      {task.potentialRevenue ? (
                        <p className="text-sm font-medium text-emerald-600 mt-1">
                          +${Number(task.potentialRevenue).toLocaleString()} potential
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
