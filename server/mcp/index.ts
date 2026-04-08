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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// ─── MCP Tool Schemas (for tools/list response) ──────────────────────────────

const TOOLS_LIST = [
  {
    name: "get_cleaning_quote",
    description:
      "Get an instant AI-powered Good/Better/Best cleaning quote for any residential property. Returns three pricing tiers with what's included at each level.",
    inputSchema: {
      type: "object",
      properties: {
        bedrooms: { type: "number", description: "Number of bedrooms (0-6)" },
        bathrooms: { type: "number", description: "Number of bathrooms (1-5)" },
        city: { type: "string", description: "City where the property is located" },
        state: { type: "string", description: "2-letter US state code (e.g. PA, TX, CA)" },
        frequency: {
          type: "string",
          enum: ["one_time", "weekly", "biweekly", "monthly"],
          description: "How often the cleaning will occur",
        },
        cleaning_type: {
          type: "string",
          enum: ["standard", "deep", "move_out", "airbnb"],
          description: "Type of cleaning service (default: standard)",
        },
      },
      required: ["bedrooms", "bathrooms", "city", "state", "frequency"],
    },
  },
  {
    name: "get_commercial_bid",
    description:
      "Calculate a monthly commercial cleaning bid for offices, medical facilities, retail spaces, schools, and warehouses. Returns a professional janitorial bid estimate.",
    inputSchema: {
      type: "object",
      properties: {
        facility_type: {
          type: "string",
          enum: ["office", "medical", "retail", "warehouse", "school", "restaurant"],
          description: "Type of commercial facility",
        },
        square_footage: { type: "number", description: "Total square footage of the facility" },
        frequency: {
          type: "string",
          enum: ["daily", "3x_week", "weekly", "biweekly"],
          description: "Cleaning frequency",
        },
        restrooms: { type: "number", description: "Number of restrooms (default: 2)" },
        city: { type: "string", description: "City where the facility is located" },
        state: { type: "string", description: "2-letter US state code" },
      },
      required: ["facility_type", "square_footage", "frequency", "city", "state"],
    },
  },
  {
    name: "get_autopilot_info",
    description:
      "Learn about QuotePro Autopilot — the AI agent that automatically quotes leads, sends follow-ups, and requests Google reviews for cleaning businesses.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Question about QuotePro Autopilot" },
      },
      required: ["question"],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

function runTool(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case "get_cleaning_quote":
      return getCleaningQuote(args as unknown as CleaningQuoteInput);
    case "get_commercial_bid":
      return getCommercialBid(args as unknown as CommercialBidInput);
    case "get_autopilot_info":
      return getAutopilotInfo(args as unknown as AutopilotStatusInput);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── GET /mcp — SSE endpoint (Streamable HTTP spec) ──────────────────────────

mcpRouter.get("/", (req: Request, res: Response) => {
  if (req.headers.accept?.includes("text/event-stream")) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const ping = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => clearInterval(ping));
    return;
  }

  res.json({
    name: "QuotePro for Cleaners MCP Server",
    version: "1.0.0",
    protocol: "MCP JSON-RPC 2.0",
    tools: TOOLS_LIST.map((t) => ({ name: t.name, description: t.description })),
    endpoint: "https://getquotepro.ai/mcp",
    manifest: "https://getquotepro.ai/mcp/manifest",
  });
});

// ─── GET /mcp/manifest ────────────────────────────────────────────────────────

mcpRouter.get("/manifest", (_req: Request, res: Response) => {
  res.json(manifest);
});

// ─── POST /mcp — MCP JSON-RPC 2.0 + legacy custom format ─────────────────────

mcpRouter.post("/", mcpLimiter, (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  // ── MCP JSON-RPC 2.0 protocol ──────────────────────────────────────────────
  if (body?.jsonrpc === "2.0") {
    const id = body.id as string | number | null;
    const method = body.method as string;
    const params = (body.params ?? {}) as Record<string, unknown>;

    try {
      switch (method) {
        case "initialize":
          res.json({
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: { tools: {} },
              serverInfo: { name: "quotepro-cleaners", version: "1.0.0" },
            },
          });
          return;

        case "notifications/initialized":
          res.status(204).end();
          return;

        case "tools/list":
          res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS_LIST } });
          return;

        case "tools/call": {
          const toolName = params.name as string;
          const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;
          try {
            const output = runTool(toolName, toolArgs);
            res.json({
              jsonrpc: "2.0",
              id,
              result: {
                content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
              },
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Tool execution failed";
            res.json({
              jsonrpc: "2.0",
              id,
              error: { code: -32603, message: msg },
            });
          }
          return;
        }

        case "resources/list":
          res.json({ jsonrpc: "2.0", id, result: { resources: [] } });
          return;

        case "prompts/list":
          res.json({ jsonrpc: "2.0", id, result: { prompts: [] } });
          return;

        default:
          res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
          });
          return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal error";
      res.json({ jsonrpc: "2.0", id, error: { code: -32603, message: msg } });
      return;
    }
  }

  // ── Legacy custom format: { tool_call_id, tool_name, input } ──────────────
  const { tool_call_id, tool_name, input } = body as {
    tool_call_id?: string;
    tool_name?: string;
    input?: Record<string, unknown>;
  };

  if (!tool_name) {
    res.status(400).json({ error: "Missing tool_name (or jsonrpc field for MCP protocol)" });
    return;
  }

  const callId = tool_call_id ?? `call_${Date.now()}`;

  try {
    const output = runTool(tool_name, input ?? {});
    res.json({ tool_call_id: callId, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[mcp] Tool call failed (${tool_name}):`, message);
    res.status(tool_name && !["get_cleaning_quote","get_commercial_bid","get_autopilot_info"].includes(tool_name) ? 404 : 500)
      .json({ error: "Tool execution failed", details: message });
  }
});
