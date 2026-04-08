import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import manifest from "./manifest.json";
import { getCleaningQuote, type CleaningQuoteInput } from "./tools/getCleaningQuote";
import { getCommercialBid, type CommercialBidInput } from "./tools/getCommercialBid";
import { getAutopilotInfo, type AutopilotStatusInput } from "./tools/getAutopilotStatus";

const MCP_ORIGINS = [
  "https://claude.ai",
  "https://chat.openai.com",
  "https://perplexity.ai",
];

const mcpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. Max 100 requests per hour." },
});

export const mcpRouter = Router();

mcpRouter.use((req, res, next) => {
  const origin = req.headers.origin ?? "";
  if (MCP_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

mcpRouter.get("/manifest", (_req: Request, res: Response) => {
  res.json(manifest);
});

mcpRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "QuotePro for Cleaners MCP Server",
    version: "1.0.0",
    tools: [
      {
        name: "get_cleaning_quote",
        description:
          "Get an instant AI-powered Good/Better/Best cleaning quote for any residential property.",
      },
      {
        name: "get_commercial_bid",
        description:
          "Calculate a monthly commercial cleaning bid for offices, medical facilities, retail spaces, schools, and warehouses.",
      },
      {
        name: "get_autopilot_info",
        description:
          "Learn about QuotePro Autopilot — the AI agent that automatically quotes leads, sends follow-ups, and requests Google reviews.",
      },
    ],
    endpoint: "https://getquotepro.ai/mcp",
    manifest: "https://getquotepro.ai/mcp/manifest",
  });
});

mcpRouter.post("/", mcpLimiter, (req: Request, res: Response) => {
  const { tool_call_id, tool_name, input } = req.body as {
    tool_call_id?: string;
    tool_name?: string;
    input?: Record<string, unknown>;
  };

  if (!tool_name) {
    res.status(400).json({ error: "Missing tool_name" });
    return;
  }

  const callId = tool_call_id ?? `call_${Date.now()}`;

  try {
    let output: unknown;

    switch (tool_name) {
      case "get_cleaning_quote": {
        const params = input as unknown as CleaningQuoteInput;
        if (!params?.bedrooms || !params?.bathrooms || !params?.city || !params?.state || !params?.frequency) {
          res.status(400).json({
            error: "get_cleaning_quote requires: bedrooms, bathrooms, city, state, frequency",
          });
          return;
        }
        output = getCleaningQuote(params);
        break;
      }

      case "get_commercial_bid": {
        const params = input as unknown as CommercialBidInput;
        if (!params?.facility_type || !params?.square_footage || !params?.frequency || !params?.city || !params?.state) {
          res.status(400).json({
            error: "get_commercial_bid requires: facility_type, square_footage, frequency, city, state",
          });
          return;
        }
        output = getCommercialBid(params);
        break;
      }

      case "get_autopilot_info": {
        const params = input as unknown as AutopilotStatusInput;
        if (!params?.question) {
          res.status(400).json({ error: "get_autopilot_info requires: question" });
          return;
        }
        output = getAutopilotInfo(params);
        break;
      }

      default:
        res.status(404).json({
          error: `Unknown tool: ${tool_name}. Available tools: get_cleaning_quote, get_commercial_bid, get_autopilot_info`,
        });
        return;
    }

    res.json({ tool_call_id: callId, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[mcp] Tool call failed (${tool_name}):`, message);
    res.status(500).json({ error: "Tool execution failed", details: message });
  }
});
