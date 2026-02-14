export type AiIntent =
  | "CREATE_QUOTE"
  | "METRICS_THIS_MONTH"
  | "FOLLOW_UP_QUOTES"
  | "DRAFT_REPLY"
  | "OPEN_CUSTOMER"
  | "OPEN_QUOTE"
  | "SCHEDULE_JOB"
  | "UNKNOWN";

export interface AiCommandResult {
  intent: AiIntent;
  responseText: string;
  navigation?: {
    tab?: string;
    screen?: string;
    params?: Record<string, any>;
  };
  suggestedActions?: string[];
  metricValue?: string;
}

interface AppData {
  stats?: {
    totalQuotes?: number;
    sentQuotes?: number;
    acceptedQuotes?: number;
    declinedQuotes?: number;
    totalRevenue?: number;
    closeRate?: number;
  };
  quotes?: any[];
  customers?: any[];
  jobs?: any[];
}

function extractName(text: string): string | undefined {
  const forPatterns = [
    /(?:for|customer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:quote|clean|cleaning)\s+(?:for\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:open|show)\s+(?:customer|client)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  ];
  for (const p of forPatterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return undefined;
}

function extractServiceType(text: string): string | undefined {
  const types: Record<string, string[]> = {
    "deep clean": ["deep clean", "deep cleaning"],
    "move out": ["move out", "move-out", "moveout", "move in", "move-in"],
    "recurring": ["recurring", "biweekly", "bi-weekly", "weekly", "monthly", "quarterly"],
    "standard": ["standard", "regular", "basic"],
  };
  const lower = text.toLowerCase();
  for (const [key, keywords] of Object.entries(types)) {
    if (keywords.some((k) => lower.includes(k))) return key;
  }
  return undefined;
}

function extractBedBath(text: string): { beds?: number; baths?: number } {
  const bedMatch = text.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  const bathMatch = text.match(/(\d+)\s*(?:bath|ba|bathroom)/i);
  return {
    beds: bedMatch ? parseInt(bedMatch[1]) : undefined,
    baths: bathMatch ? parseInt(bathMatch[1]) : undefined,
  };
}

export function runAiCommand(commandText: string, appData: AppData): AiCommandResult {
  const text = commandText.trim();
  const lower = text.toLowerCase();

  if (/(?:create|new|make|start)\s*(?:a\s+)?(?:quote|cleaning quote|estimate)/i.test(lower) ||
      /(?:deep clean|move out|move-out|standard clean|recurring)\s*(?:quote|clean)?/i.test(lower)) {
    const name = extractName(text);
    const serviceType = extractServiceType(text);
    const { beds, baths } = extractBedBath(text);
    const parts: string[] = [];
    if (name) parts.push(`for ${name}`);
    if (serviceType) parts.push(`(${serviceType})`);

    return {
      intent: "CREATE_QUOTE",
      responseText: `Opening quote builder${parts.length > 0 ? " " + parts.join(" ") : ""}...`,
      navigation: {
        screen: "QuoteCalculator",
        params: {
          ...(name ? { prefillCustomer: { name, phone: "", email: "", address: "", customerId: "" } } : {}),
        },
      },
      suggestedActions: ["Add property details", "Choose service type"],
    };
  }

  if (/(?:how many|revenue|booked|close rate|conversion|earnings|income|sales)/i.test(lower) &&
      /(?:this month|month|weekly|this week|today)/i.test(lower)) {
    const revenue = appData.stats?.totalRevenue || 0;
    const closeRate = appData.stats?.closeRate || 0;
    const accepted = appData.stats?.acceptedQuotes || 0;
    const total = appData.stats?.totalQuotes || 0;

    let metric = "";
    let metricValue = "";
    if (/revenue|earnings|income|sales/i.test(lower)) {
      metric = `Revenue this month: $${revenue.toLocaleString()}`;
      metricValue = `$${revenue.toLocaleString()}`;
    } else if (/close rate|conversion/i.test(lower)) {
      metric = `Close rate: ${closeRate}% (${accepted} of ${total} quotes accepted)`;
      metricValue = `${closeRate}%`;
    } else if (/booked|cleans/i.test(lower)) {
      metric = `${accepted} cleans booked this month out of ${total} quotes sent`;
      metricValue = `${accepted}`;
    } else {
      metric = `This month: $${revenue.toLocaleString()} revenue, ${closeRate}% close rate, ${accepted} booked`;
      metricValue = `$${revenue.toLocaleString()}`;
    }

    return {
      intent: "METRICS_THIS_MONTH",
      responseText: metric,
      metricValue,
      suggestedActions: ["View full revenue report", "Create a new quote"],
    };
  }

  if (/(?:follow up|follow-up|unclosed|unfollowed|haven't followed|missed revenue|pending quotes|need to follow)/i.test(lower)) {
    const sentQuotes = (appData.quotes || []).filter((q: any) => q.status === "sent" || q.status === "draft");
    return {
      intent: "FOLLOW_UP_QUOTES",
      responseText: `You have ${sentQuotes.length} quote${sentQuotes.length !== 1 ? "s" : ""} that may need follow-up.`,
      navigation: { tab: "QuotesTab" },
      suggestedActions: ["Draft a follow-up message", "View all quotes"],
    };
  }

  if (/(?:draft|write|compose|respond|reply|text|message|objection|too expensive|handle)/i.test(lower) &&
      /(?:text|sms|email|reply|response|message|customer|client|objection|expensive)/i.test(lower)) {
    return {
      intent: "DRAFT_REPLY",
      responseText: "Opening AI Assistant to draft your message...",
      navigation: { screen: "AIAssistant" },
      suggestedActions: ["Draft a follow-up", "Handle pricing objection"],
    };
  }

  if (/(?:open|show|find|view|look up)\s+(?:customer|client)/i.test(lower)) {
    const name = extractName(text);
    if (name && appData.customers) {
      const match = appData.customers.find((c: any) =>
        c.name?.toLowerCase().includes(name.toLowerCase())
      );
      if (match) {
        return {
          intent: "OPEN_CUSTOMER",
          responseText: `Opening ${match.name}...`,
          navigation: { screen: "CustomerDetail", params: { customerId: match.id } },
        };
      }
    }
    return {
      intent: "OPEN_CUSTOMER",
      responseText: name ? `Couldn't find a customer named "${name}". Opening customers list.` : "Opening customers...",
      navigation: { tab: "CustomersTab" },
      suggestedActions: ["Add a new customer", "Search customers"],
    };
  }

  if (/(?:open|show|find|view|latest)\s*quote/i.test(lower)) {
    const name = extractName(text);
    if (name && appData.quotes) {
      const match = appData.quotes.find((q: any) =>
        q.customerName?.toLowerCase().includes(name.toLowerCase())
      );
      if (match) {
        return {
          intent: "OPEN_QUOTE",
          responseText: `Opening quote for ${match.customerName}...`,
          navigation: { screen: "QuoteDetail", params: { quoteId: match.id } },
        };
      }
    }
    if (/latest/i.test(lower) && appData.quotes && appData.quotes.length > 0) {
      const latest = appData.quotes[0];
      return {
        intent: "OPEN_QUOTE",
        responseText: `Opening your latest quote${latest.customerName ? ` for ${latest.customerName}` : ""}...`,
        navigation: { screen: "QuoteDetail", params: { quoteId: latest.id } },
      };
    }
    return {
      intent: "OPEN_QUOTE",
      responseText: "Opening quotes list...",
      navigation: { tab: "QuotesTab" },
    };
  }

  if (/(?:schedule|book|add)\s*(?:a\s+)?(?:job|appointment|cleaning)/i.test(lower)) {
    return {
      intent: "SCHEDULE_JOB",
      responseText: "Opening the Jobs tab to schedule...",
      navigation: { tab: "JobsTab" },
      suggestedActions: ["Create a quote first", "View scheduled jobs"],
    };
  }

  return {
    intent: "UNKNOWN",
    responseText: "I can help with: creating quotes, follow-ups, metrics, drafting replies, and finding customers. Try one of the examples below!",
    suggestedActions: ["Create a quote", "View metrics", "Follow up on quotes", "Draft a message"],
  };
}

export const EXAMPLE_PROMPTS = [
  "Create a deep clean quote for John Q Public",
  "How many cleans have I booked this month?",
  "Show quotes I haven't followed up on",
  "Draft a text: 'Thanks for reaching out \u2014 here's your quote'",
  "What's my close rate this month?",
  "Create a biweekly quote for a 3 bed 2 bath",
  "Customer says I'm too expensive \u2014 draft a reply",
  "Who are my top customers by revenue?",
  "Schedule a job for tomorrow at 10am",
  "Show me jobs scheduled this week",
  "How much revenue did I do this week?",
  "Open my latest quote",
];
