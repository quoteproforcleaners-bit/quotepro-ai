import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Phone,
  Sun,
  Gift,
  Star,
  BookOpen,
  Heart,
  Plus,
  ChevronRight,
  Zap,
  Loader2,
  X,
  Edit3,
  Copy,
  Check,
  Send,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  EmptyState,
  Spinner,
  Badge,
  Textarea,
  Input,
  Modal,
  SectionLabel,
} from "../components/ui";
import { ProGate } from "../components/ProGate";
import { apiRequest } from "../lib/api";

type Segment = "dormant" | "lost" | "custom";

interface CampaignTemplate {
  name: string;
  icon: typeof Sun;
  segment: Segment;
  description: string;
  promptSuggestions: string[];
}

const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  { name: "Spring Cleaning Special", icon: Sun, segment: "dormant", description: "Reach out to past customers with a spring refresh offer", promptSuggestions: ["Mention a discount or special rate", "Focus on allergen and dust removal", "Highlight window and deep carpet cleaning"] },
  { name: "Holiday Deep Clean", icon: Gift, segment: "dormant", description: "Offer pre-holiday deep cleaning to all past customers", promptSuggestions: ["Mention getting ready for holiday guests", "Offer a pre-holiday discount", "Focus on kitchen and living area deep clean"] },
  { name: "New Year Fresh Start", icon: Star, segment: "dormant", description: "Ring in the new year with a clean home promotion", promptSuggestions: ["Tie into New Year's resolutions", "Offer a fresh-start package deal", "Mention starting the year clutter-free"] },
  { name: "Back to School Clean", icon: BookOpen, segment: "dormant", description: "Target families getting ready for the school year", promptSuggestions: ["Focus on kid-friendly cleaning", "Mention getting organized for school routines", "Offer a family home refresh package"] },
  { name: "Win Back Lost Leads", icon: RefreshCw, segment: "lost", description: "Follow up on quotes that were never accepted", promptSuggestions: ["Offer a limited-time discount on their original quote", "Mention availability opening up", "Keep it brief and no-pressure"] },
  { name: "VIP Customer Appreciation", icon: Heart, segment: "custom", description: "Send a thank-you offer to your best customers", promptSuggestions: ["Include a loyalty discount", "Thank them for referrals", "Offer priority scheduling"] },
];

type ModalStep = "templates" | "customize" | "custom";

function ReactivationContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"dormant" | "lost">("dormant");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSegment, setCustomSegment] = useState<Segment>("dormant");
  const [generatingContent, setGeneratingContent] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);
  const [editingSubject, setEditingSubject] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const dormantQuery = useQuery<any[]>({ queryKey: ["/api/opportunities/dormant"], enabled: tab === "dormant" });
  const lostQuery = useQuery<any[]>({ queryKey: ["/api/opportunities/lost"], enabled: tab === "lost" });
  const campaignsQuery = useQuery<any[]>({ queryKey: ["/api/campaigns"] });
  const customersQuery = useQuery<any[]>({ queryKey: ["/api/customers"] });

  const data = tab === "dormant" ? dormantQuery.data : lostQuery.data;
  const isLoading = tab === "dormant" ? dormantQuery.isLoading : lostQuery.isLoading;

  const filteredCustomers = useMemo(() => {
    if (!customersQuery.data) return [];
    const q = customerSearch.toLowerCase();
    return customersQuery.data.filter((c: any) =>
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }, [customersQuery.data, customerSearch]);

  const handleReachOut = async (item: any) => {
    await apiRequest("POST", "/api/growth-tasks", {
      type: "REACTIVATION",
      customerId: item.customerId ?? item.id,
      estimatedValue: item.avgTicket,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/opportunities/dormant"] });
  };

  const handleRecover = async (item: any) => {
    await apiRequest("POST", "/api/growth-tasks", {
      type: "ABANDONED_RECOVERY",
      customerId: item.customerId ?? item.id,
      quoteId: item.quoteId ?? item.id,
      estimatedValue: item.total,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/opportunities/lost"] });
  };

  const buildPrompt = () =>
    [...selectedChips, customPrompt.trim()].filter(Boolean).join(". ");

  const generateContent = async (campaign: any) => {
    try {
      setGeneratingContent(true);
      const res = await apiRequest("POST", "/api/ai/generate-campaign-content", {
        campaignName: campaign.name,
        segment: campaign.segment,
        channel: "email",
      });
      const aiData = await res.json();
      if (!aiData.content) return;
      await apiRequest("PUT", `/api/campaigns/${campaign.id}`, {
        messageContent: aiData.content,
        messageSubject: aiData.subject || "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setEditingSubject(aiData.subject || "");
      setEditingContent(aiData.content);
      setViewingCampaign({ ...campaign, messageContent: aiData.content, messageSubject: aiData.subject || "" });
    } catch {
    } finally {
      setGeneratingContent(false);
    }
  };

  const createCampaign = async (name: string, segment: Segment, customerIds?: string[]) => {
    const res = await apiRequest("POST", "/api/campaigns", {
      name,
      segment,
      channel: "email",
      customerIds: customerIds?.length ? customerIds : undefined,
      messageContent: "",
      messageSubject: "",
    });
    const campaign = await res.json();
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    return campaign;
  };

  const handleConfirmTemplate = async () => {
    if (!selectedTemplate) return;
    setGeneratingContent(true);
    try {
      const campaign = await createCampaign(selectedTemplate.name, selectedTemplate.segment);
      closeModal();
      setViewingCampaign(campaign);
      setEditingSubject("");
      setEditingContent("");
      generateContent(campaign);
    } catch {
      setGeneratingContent(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) return;
    setGeneratingContent(true);
    try {
      const ids = customSegment === "custom" ? selectedCustomerIds : undefined;
      const campaign = await createCampaign(customName.trim(), customSegment, ids);
      closeModal();
      setViewingCampaign(campaign);
      setEditingSubject("");
      setEditingContent("");
      generateContent(campaign);
    } catch {
      setGeneratingContent(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!viewingCampaign) return;
    setSavingEdits(true);
    try {
      await apiRequest("PUT", `/api/campaigns/${viewingCampaign.id}`, {
        messageSubject: editingSubject,
        messageContent: editingContent,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    } catch {
    } finally {
      setSavingEdits(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editingContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalStep("templates");
    setSelectedTemplate(null);
    setSelectedChips([]);
    setCustomPrompt("");
    setCustomName("");
    setCustomSegment("dormant");
    setSelectedCustomerIds([]);
    setCustomerSearch("");
    setGeneratingContent(false);
  };

  const toggleChip = (chip: string) =>
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );

  const toggleCustomer = (id: string) =>
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const campaigns: any[] = campaignsQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {(["dormant", "lost"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-primary-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t === "dormant" ? "Dormant Customers" : "Lost Quotes"}
                </button>
              ))}
            </div>
            <Button variant="primary" icon={Plus} size="sm" onClick={() => setModalOpen(true)}>
              New Campaign
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : !data?.length ? (
            <Card>
              <EmptyState
                icon={tab === "dormant" ? RefreshCw : Send}
                title={tab === "dormant" ? "No dormant customers" : "No lost quotes"}
                description={
                  tab === "dormant"
                    ? "All your customers are active. Great job!"
                    : "No expired or declined quotes to recover right now."
                }
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {data.map((item: any) => (
                <Card key={item.id} className="hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {item.customerName ?? item.name}
                      </p>
                      {tab === "dormant" ? (
                        <>
                          <p className="text-xs text-slate-500 mt-0.5">Last job: {item.lastJobDate ?? "N/A"}</p>
                          <p className="text-xs text-primary-600 font-medium mt-0.5">
                            Avg ticket: ${item.avgTicket?.toFixed(0) ?? "0"}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500 mt-0.5">Total: ${item.total?.toFixed(0) ?? "0"}</p>
                          <Badge status={item.status === "expired" ? "expired" : "declined"} label={item.status ?? "expired"} />
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => tab === "dormant" ? handleReachOut(item) : handleRecover(item)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                        tab === "dormant"
                          ? "bg-primary-50 text-primary-700 hover:bg-primary-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {tab === "dormant" ? <Phone className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      {tab === "dormant" ? "Reach Out" : "Recover"}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Campaigns" />
            {campaignsQuery.isLoading ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : campaigns.length === 0 ? (
              <div className="px-4 pb-4">
                <p className="text-sm text-slate-500 text-center py-4">
                  No campaigns yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {campaigns.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setViewingCampaign(c);
                      setEditingSubject(c.messageSubject || "");
                      setEditingContent(c.messageContent || "");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                      <Badge status={c.segment === "dormant" ? "lead" : c.segment === "lost" ? "declined" : "draft"} label={c.segment} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {viewingCampaign && (
        <Card>
          <CardHeader
            title={viewingCampaign.name}
            actions={
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!editingContent}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
                    copied ? "border-green-300 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => generateContent(viewingCampaign)}
                  disabled={generatingContent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {generatingContent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Regenerate
                </button>
                <button
                  onClick={() => setViewingCampaign(null)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            }
          />
          {generatingContent ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
              <p className="text-sm text-slate-500">AI is writing your campaign...</p>
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Subject Line</label>
                <Input
                  value={editingSubject}
                  onChange={(e) => setEditingSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Message Content</label>
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={10}
                  placeholder="Campaign message will appear here after generation..."
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  icon={savingEdits ? Loader2 : Edit3}
                  onClick={handleSaveEdits}
                  disabled={savingEdits}
                  size="sm"
                >
                  {savingEdits ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          modalStep === "templates"
            ? "New Campaign"
            : modalStep === "customize"
            ? selectedTemplate?.name || "Customize"
            : "Custom Campaign"
        }
      >
        {generatingContent ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="font-medium text-slate-900 text-sm">Creating your campaign...</p>
            <p className="text-xs text-slate-500 text-center">AI is writing a personalized message for your customers</p>
          </div>
        ) : modalStep === "templates" ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <p className="text-sm text-slate-500 mb-3">Choose a ready-made campaign or start from scratch.</p>
            {CAMPAIGN_TEMPLATES.map((template, idx) => {
              const Icon = template.icon;
              return (
                <button
                  key={idx}
                  onClick={() => { setSelectedTemplate(template); setModalStep("customize"); setSelectedChips([]); setCustomPrompt(""); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{template.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>
              );
            })}
            <button
              onClick={() => setModalStep("custom")}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-primary-300 bg-primary-50 hover:bg-primary-100 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                <Plus className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary-700">Custom Campaign</p>
                <p className="text-xs text-slate-500 mt-0.5">Build your own from scratch</p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary-400 flex-shrink-0" />
            </button>
          </div>
        ) : modalStep === "customize" && selectedTemplate ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 border border-primary-100">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                {(() => { const Icon = selectedTemplate.icon; return <Icon className="w-4 h-4 text-white" />; })()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{selectedTemplate.name}</p>
                <p className="text-xs text-slate-500">{selectedTemplate.description}</p>
              </div>
            </div>
            <div>
              <SectionLabel>Message suggestions (optional)</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTemplate.promptSuggestions.map((s) => {
                  const selected = selectedChips.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleChip(s)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        selected ? "border-primary-500 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <SectionLabel>Your own instructions</SectionLabel>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Offer 15% off for first-time rebookers"
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModalStep("templates")} className="flex-1">Back</Button>
              <Button variant="primary" icon={Zap} onClick={handleConfirmTemplate} className="flex-1">Generate Campaign</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            <div>
              <SectionLabel>Campaign Name</SectionLabel>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Spring Reactivation"
                className="mt-1"
              />
            </div>
            <div>
              <SectionLabel>Target Audience</SectionLabel>
              <div className="flex gap-2 mt-2">
                {(["dormant", "lost", "custom"] as Segment[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCustomSegment(s)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors capitalize ${
                      customSegment === s ? "border-primary-500 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {s === "custom" ? "Manual" : s === "dormant" ? "Dormant" : "Lost Quotes"}
                  </button>
                ))}
              </div>
            </div>
            {customSegment === "custom" && (
              <div>
                <SectionLabel>Select Customers ({selectedCustomerIds.length} selected)</SectionLabel>
                <div className="relative mt-2 mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {filteredCustomers.slice(0, 20).map((c: any) => {
                    const selected = selectedCustomerIds.includes(c.id.toString());
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCustomer(c.id.toString())}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${selected ? "bg-primary-50" : "hover:bg-slate-50"}`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-primary-600 bg-primary-600" : "border-slate-300"}`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="truncate">{c.name || `${c.firstName} ${c.lastName}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModalStep("templates")} className="flex-1">Back</Button>
              <Button variant="primary" icon={Zap} onClick={handleCreateCustom} disabled={!customName.trim()} className="flex-1">Generate Campaign</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ReactivationPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Reactivation Campaigns"
        subtitle="Win back dormant customers and recover lost quotes"
      />
      <ProGate feature="Reactivation Campaigns">
        <ReactivationContent />
      </ProGate>
    </div>
  );
}
