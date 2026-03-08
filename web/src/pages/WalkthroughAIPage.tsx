import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import {
  Wand2,
  FileText,
  ArrowRight,
  Sparkles,
  Home,
  Bed,
  Bath,
  Maximize,
  PawPrint,
  CheckCircle,
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Badge, Alert } from "../components/ui";

export default function WalkthroughAIPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [extracted, setExtracted] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  const extractDetails = async () => {
    if (!notes.trim()) return;
    setExtracting(true);
    setError("");
    setExtracted(null);
    try {
      const res = await apiPost("/api/ai/walkthrough-extract", {
        notes: notes.trim(),
      });
      setExtracted(res);
    } catch (err: any) {
      setError(err.message || "Failed to extract details");
    }
    setExtracting(false);
  };

  const createQuoteMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/quotes", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      navigate(`/quotes/${data.id}`);
    },
  });

  const createQuoteFromExtracted = () => {
    if (!extracted) return;
    const details = extracted.homeDetails || extracted.propertyDetails || extracted;
    const addOns = extracted.addOns || {};

    createQuoteMutation.mutate({
      customerName: details.customerName || "",
      status: "draft",
      total: 0,
      propertyDetails: {
        quoteType: "residential",
        beds: details.bedrooms || details.beds || 3,
        baths: details.bathrooms || details.baths || 2,
        halfBaths: details.halfBaths || 0,
        sqft: details.squareFootage || details.sqft || 1500,
        homeType: details.homeType || "house",
        conditionScore: details.conditionScore || 7,
        peopleCount: details.numberOfResidents || details.peopleCount || 2,
        petType: details.petType || "none",
        petShedding: details.petShedding || false,
        condition: details.condition || "Average",
        customerName: details.customerName || "",
        customerAddress: details.address || "",
      },
      addOns: addOns,
      options: {},
    });
  };

  const detailRows = extracted
    ? [
        {
          icon: Home,
          label: "Home Type",
          value:
            extracted.homeDetails?.homeType ||
            extracted.propertyDetails?.homeType ||
            extracted.homeType,
        },
        {
          icon: Maximize,
          label: "Square Feet",
          value:
            extracted.homeDetails?.squareFootage ||
            extracted.propertyDetails?.sqft ||
            extracted.squareFootage,
        },
        {
          icon: Bed,
          label: "Bedrooms",
          value:
            extracted.homeDetails?.bedrooms ||
            extracted.propertyDetails?.beds ||
            extracted.bedrooms,
        },
        {
          icon: Bath,
          label: "Bathrooms",
          value:
            extracted.homeDetails?.bathrooms ||
            extracted.propertyDetails?.baths ||
            extracted.bathrooms,
        },
        {
          icon: PawPrint,
          label: "Pets",
          value:
            extracted.homeDetails?.petType ||
            extracted.propertyDetails?.petType ||
            extracted.petType,
        },
      ].filter((r) => r.value && r.value !== "none")
    : [];

  return (
    <div>
      <PageHeader
        title="Quote from Notes"
        subtitle="Describe a property and let AI build the quote for you"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader title="Property Notes" icon={Wand2} />
            <p className="text-sm text-slate-500 mb-4">
              Paste your walkthrough notes, text messages, or property
              description. The AI will extract the details and create a quote.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Example:\n"3 bed 2 bath house, about 2000 sqft. Has a dog that sheds a lot. Kitchen is pretty dirty, rest of the house is okay. They want inside fridge and oven cleaned too. Customer is Jane Smith, 123 Oak Ave."`}
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none transition-colors"
            />
            <div className="mt-4">
              <Button
                icon={Sparkles}
                onClick={extractDetails}
                loading={extracting}
                disabled={!notes.trim()}
              >
                Extract Details
              </Button>
            </div>
            {error ? (
              <div className="mt-4">
                <Alert variant="error" title={error} />
              </div>
            ) : null}
          </Card>

          <div className="mt-4">
            <Card>
              <CardHeader title="Tips" />
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  Include square footage, bedrooms, and bathrooms
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  Mention pets and their type (dog, cat, etc.)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  Describe cleanliness or condition of the home
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  List any special requests or add-ons
                </li>
              </ul>
            </Card>
          </div>
        </div>

        <div>
          {extracted ? (
            <Card>
              <CardHeader title="Extracted Details" icon={FileText} />
              <div className="space-y-3 mb-6">
                {detailRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <row.icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{row.label}</p>
                      <p className="text-sm font-medium text-slate-900 capitalize">
                        {String(row.value)}
                      </p>
                    </div>
                  </div>
                ))}

                {extracted.homeDetails?.customerName ||
                extracted.propertyDetails?.customerName ||
                extracted.customerName ? (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">Customer</p>
                    <p className="text-sm font-medium text-slate-900">
                      {extracted.homeDetails?.customerName ||
                        extracted.propertyDetails?.customerName ||
                        extracted.customerName}
                    </p>
                  </div>
                ) : null}
              </div>

              <Button
                icon={ArrowRight}
                onClick={createQuoteFromExtracted}
                loading={createQuoteMutation.isPending}
                className="w-full"
              >
                Create Quote from Details
              </Button>
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Wand2 className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  AI Extraction
                </p>
                <p className="text-sm text-slate-500 text-center max-w-xs">
                  Enter your notes on the left and click "Extract Details" to
                  let AI build a quote automatically
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
