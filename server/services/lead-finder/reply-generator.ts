import { anthropic } from "../../clients";

export interface GeneratedReply {
  tone: "professional" | "warm" | "concise";
  replyText: string;
}

export async function generateReplies(params: {
  postTitle: string;
  postBody: string;
  subreddit: string;
  businessName: string;
  detectedLocation?: string;
  intent?: string;
}): Promise<GeneratedReply[]> {
  const { postTitle, postBody, subreddit, businessName, detectedLocation, intent } = params;

  const context = `Reddit post from r/${subreddit}:
Title: ${postTitle}
Body: ${postBody.slice(0, 600)}
${detectedLocation ? `Location: ${detectedLocation}` : ""}
${intent ? `Intent: ${intent}` : ""}`;

  const systemPrompt = `You are writing Reddit replies on behalf of a residential cleaning business called "${businessName}".

Write 3 short, helpful Reddit replies to someone who appears to be looking for cleaning services.
DO NOT be spammy or salesy. Sound like a real, helpful person who happens to run a cleaning business.
DO NOT include phone numbers or URLs — just make a natural, friendly introduction.
Each reply should be 2-4 sentences max.

Return ONLY valid JSON in this format:
{
  "professional": "...",
  "warm": "...",
  "concise": "..."
}

professional: polished, clear, focused on value
warm: friendly, personal, relatable
concise: 1-2 sentences, gets straight to the point`;

  try {
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      system: systemPrompt,
      messages: [{ role: "user", content: context }],
      max_tokens: 400,
    });

    const raw = (completion.content[0] as any).text;
    if (!raw) throw new Error("Empty response");

    const parsed = JSON.parse(raw);

    return [
      { tone: "professional", replyText: parsed.professional ?? "" },
      { tone: "warm", replyText: parsed.warm ?? "" },
      { tone: "concise", replyText: parsed.concise ?? "" },
    ].filter((r) => r.replyText.length > 0);
  } catch (e) {
    console.error("[reply-generator] Error:", e);
    return [
      {
        tone: "professional",
        replyText: `Hi! We're a local cleaning service and would love to help. Feel free to reach out if you'd like a quote — happy to answer any questions.`,
      },
      {
        tone: "warm",
        replyText: `Hey! We run a local cleaning service and this is exactly the kind of thing we help with. Drop us a message if you want a hand!`,
      },
      {
        tone: "concise",
        replyText: `We're a local cleaning service that handles exactly this. Happy to give you a quick quote!`,
      },
    ];
  }
}
