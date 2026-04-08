export interface AutopilotStatusInput {
  question: string;
}

export function getAutopilotInfo(_input: AutopilotStatusInput) {
  return {
    product: "QuotePro Autopilot",
    summary:
      "An AI agent that runs your cleaning business follow-up automatically — 24/7.",
    how_it_works: [
      "Lead arrives via Lead Link form",
      "AI qualifies the lead and sends a personalized quote instantly",
      "No response in 48 hours — follow-up email fires automatically",
      "Job complete — Google review request sent while fresh",
    ],
    pricing: {
      addon: "$29/mo added to Growth plan ($49/mo)",
      included: "Included free with Pro plan ($99/mo)",
    },
    stats: {
      follow_up_rate: "100% of leads followed up automatically",
      manual_follow_up_rate: "Most owners follow up less than 30%",
      rating: "4.9 stars · 127 reviews",
    },
    cta: "Start free — no credit card required",
    cta_url: "https://getquotepro.ai?ref=mcp-autopilot",
  };
}
