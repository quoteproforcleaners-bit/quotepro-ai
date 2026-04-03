import { useQuery } from"@tanstack/react-query";
import { useNavigate } from"react-router-dom";
import {
 Bell,
 Clock,
 DollarSign,
 ArrowRight,
 AlertTriangle,
 MessageSquare,
 Sparkles,
} from"lucide-react";
import { apiPost } from"../lib/api";
import { useState } from"react";
import {
 PageHeader,
 Card,
 CardHeader,
 Badge,
 Button,
 EmptyState,
 Spinner,
 Alert,
 StatCard,
} from"../components/ui";

export default function FollowUpsPage() {
 const navigate = useNavigate();
 const { data: quotes = [], isLoading } = useQuery<any[]>({
 queryKey: ["/api/quotes"],
 });
 const { data: followUps = [] } = useQuery<any[]>({
 queryKey: ["/api/follow-ups"],
 });
 const { data: automations } = useQuery<any>({
 queryKey: ["/api/automations"],
 });
 const [generatingId, setGeneratingId] = useState<string | null>(null);
 const [generatedMessages, setGeneratedMessages] = useState<
 Record<string, string>
 >({});

 // Use automation rules thresholds — fall back to sensible defaults
 const followUpAfterDays = 1; // Always wait at least 1 day before following up
 const urgentAfterDays = automations?.quoteExpirationDays
 ? Math.max(2, Math.floor(automations.quoteExpirationDays * 0.5))
 : 5;

 const needsFollowUp = quotes
 .filter((q: any) => {
 if (q.status !=="sent"&& q.status !=="viewed") return false;
 const sentDate = new Date(q.sentAt || q.createdAt);
 const daysSince =
 (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
 return daysSince > followUpAfterDays;
 })
 .sort((a: any, b: any) => {
 const daysA =
 (Date.now() - new Date(a.sentAt || a.createdAt).getTime()) /
 (1000 * 60 * 60 * 24);
 const daysB =
 (Date.now() - new Date(b.sentAt || b.createdAt).getTime()) /
 (1000 * 60 * 60 * 24);
 return daysB - daysA;
 });

 const totalAtRisk = needsFollowUp.reduce(
 (sum: number, q: any) => sum + (Number(q.total) || 0),
 0
 );

 const urgentCount = needsFollowUp.filter((q: any) => {
 const days =
 (Date.now() - new Date(q.sentAt || q.createdAt).getTime()) /
 (1000 * 60 * 60 * 24);
 return days > urgentAfterDays;
 }).length;

 const generateFollowUp = async (quote: any) => {
 setGeneratingId(quote.id);
 try {
 const res = await apiPost(`/api/ai/generate-followup`, {
 quoteId: quote.id,
 customerName: quote.customerName,
 total: quote.total,
 status: quote.status,
 });
 setGeneratedMessages((prev) => ({
 ...prev,
 [quote.id]: (res as any).message || (res as any).followUp ||"",
 }));
 } catch {
 setGeneratedMessages((prev) => ({
 ...prev,
 [quote.id]:"Unable to generate follow-up.",
 }));
 }
 setGeneratingId(null);
 };

 const getDaysSince = (date: string) => {
 return Math.floor(
 (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
 );
 };

 const getUrgency = (days: number) => {
 if (days > urgentAfterDays * 1.4) return"error";
 if (days > urgentAfterDays) return"warning";
 return"info";
 };

 if (isLoading) return <Spinner />;

 return (
 <div>
 <PageHeader
 title="Follow-up Queue"
 subtitle="Quotes that need your attention"
 />

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
 <StatCard
 label="Needs Follow-up"
 value={needsFollowUp.length}
 icon={Bell}
 color="amber"
 />
 <StatCard
 label="Revenue at Risk"
 value={`$${totalAtRisk.toLocaleString()}`}
 icon={DollarSign}
 color="red"
 />
 <StatCard
 label={`Urgent (${urgentAfterDays}+ days)`}
 value={urgentCount}
 icon={AlertTriangle}
 color="red"
 />
 </div>

 {needsFollowUp.length === 0 ? (
 <Card>
 <EmptyState
 icon={Bell}
 title="All caught up!"
 description="No quotes need follow-up right now. Keep sending quotes to fill your pipeline."
 action={
 <Button onClick={() => navigate("/quotes/new")}>
 Create Quote
 </Button>
 }
 />
 </Card>
 ) : (
 <div className="space-y-3">
 {needsFollowUp.map((q: any) => {
 const days = getDaysSince(q.sentAt || q.createdAt);
 const urgency = getUrgency(days);
 return (
 <Card key={q.id}>
 <div className="flex flex-col sm:flex-row sm:items-center gap-4">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <h3 className="font-semibold text-slate-900">
 {q.customerName ||"No customer"}
 </h3>
 <Badge status={q.status} dot />
 <Badge status={urgency} label={`${days}d ago`} />
 </div>
 <p className="text-sm text-slate-500">
 ${Number(q.total || 0).toLocaleString()} &middot;{""}
 {(q.propertyDetails as any)?.quoteType ||"residential"}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button
 variant="secondary"
 icon={Sparkles}
 size="sm"
 onClick={() => generateFollowUp(q)}
 loading={generatingId === q.id}
 >
 AI Follow-up
 </Button>
 <Button
 variant="secondary"
 icon={ArrowRight}
 size="sm"
 onClick={() => navigate(`/quotes/${q.id}`)}
 >
 View
 </Button>
 </div>
 </div>
 {generatedMessages[q.id] ? (
 <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
 <p className="text-xs font-medium text-blue-700 mb-1">
 Suggested follow-up
 </p>
 <p className="text-sm text-blue-900 whitespace-pre-wrap">
 {generatedMessages[q.id]}
 </p>
 <button
 onClick={() =>
 navigator.clipboard.writeText(generatedMessages[q.id])
 }
 className="text-xs text-blue-600 font-medium mt-2"
 >
 Copy to clipboard
 </button>
 </div>
 ) : null}
 </Card>
 );
 })}
 </div>
 )}
 </div>
 );
}
