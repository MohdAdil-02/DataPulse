// Both providers speak the OpenAI chat-completions format, so switching is just config.
const PROVIDERS = {
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", keyName: "GROQ_API_KEY", model: "llama-3.3-70b-versatile", label: "Groq" },
  xai: { url: "https://api.x.ai/v1/chat/completions", keyName: "XAI_API_KEY", model: "grok-4.3", label: "xAI Grok" },
};

export function getAiConfig() {
  const name = (process.env.AI_PROVIDER || "groq").toLowerCase();
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown AI_PROVIDER "${name}". Use "groq" or "xai".`);
  return { ...p, name, apiKey: process.env[p.keyName], model: process.env.AI_MODEL || p.model };
}

const SYSTEM_INSTRUCTIONS = `You are a data analysis assistant. You are given:
1. A schema description of a MongoDB collection.
2. A user's natural language question about that data.

Your job: return ONLY a valid JSON array representing a MongoDB aggregation
pipeline that answers the question. Rules:
- Output ONLY the JSON array. No markdown fences, no explanation, no comments.
- Use standard aggregation stages: $match, $group, $sort, $project, $limit,
  $unwind, $bucket, etc.
- Field names must exactly match the schema given.
- For date fields, assume they are stored as BSON Date objects.
- Do not use $out, $merge, $function, $accumulator, $where, or any stage that
  writes data, runs arbitrary JS, or accesses other collections.
- Keep result sets reasonably small: add a $limit stage (e.g. 100) unless the
  question clearly asks for an aggregate (sum/avg/count) which naturally
  returns few documents.
- If the question implies a trend over time, group by the relevant date part
  and sort chronologically so the result can be charted.

Example output format:
[{"$group": {"_id": "$category", "total": {"$sum": "$sales"}}}, {"$sort": {"total": -1}}]`;

const SUMMARY_INSTRUCTIONS = `You are a senior data analyst writing a briefing for someone who has just uploaded a dataset.
You are given its schema and a statistical profile. Respond with ONLY a JSON object of this shape:
{"headline": string, "findings": string[], "watchouts": string[], "questions": string[]}
Rules:
- headline: one sentence describing what the dataset is about and its size.
- findings: 3 to 5 specific, interesting observations. Use only numbers that appear in the profile. Never invent figures.
- watchouts: 0 to 3 data-quality or interpretation cautions (missing values, outliers, duplicates, weak sample). Use an empty array if there are none.
- questions: exactly 4 follow-up questions a user could ask in plain English. Each must be answerable using only the columns in the schema.
- Plain language. No markdown. Output only the JSON object.`;

const FORBIDDEN_STAGES = ["$out", "$merge", "$function", "$accumulator", "$where", "$lookup"];

export class ChatService {
  constructor(config = getAiConfig()) {
    this.config = config;
  }

  // One call to an OpenAI-compatible chat completions endpoint.
  async complete(system, user) {
    const { url, apiKey, model, label } = this.config;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (res.status === 429) {
      throw new Error(`${label} rate limit reached. Wait a minute and try again (free tiers have per-minute and daily limits).`);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${label} API error ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  }

  async generatePipeline(question, schemaText, history = "") {
    const context = history
      ? `Conversation so far (oldest first):\n${history}\n\nThe new question may refer to earlier ones (for example "break that down by region" or "now only 2025"). When it does, adapt the most recent pipeline instead of starting over.\n\n`
      : "";
    const prompt = `Collection schema:\n${schemaText}\n\n${context}Question: ${question}\n\nMongoDB aggregation pipeline (JSON array only):`;

    const raw = await this.complete(SYSTEM_INSTRUCTIONS, prompt);

    let pipeline;
    try {
      pipeline = extractJson(raw, "[", "]");
    } catch {
      throw new Error(`The model did not return valid JSON: ${raw.slice(0, 200)}`);
    }
    if (!Array.isArray(pipeline)) throw new Error("Generated pipeline is not a JSON array.");

    validatePipelineSafety(pipeline);
    return pipeline;
  }

  async explainResult(question, resultPreview) {
    const prompt = `Question: ${question}\nResult data:\n${JSON.stringify(resultPreview, null, 2).slice(0, 3000)}\n\nWrite a brief (1-2 sentence) plain-English answer to the question based on this result. No code, no markdown.`;
    return this.complete("You explain data results clearly and briefly.", prompt);
  }

  async generateSummary(schemaText, profileText) {
    const raw = await this.complete(
      SUMMARY_INSTRUCTIONS,
      `Dataset schema:\n${schemaText}\n\nStatistical profile:\n${profileText}`
    );

    let out;
    try {
      out = extractJson(raw, "{", "}");
    } catch {
      throw new Error("The model returned an unreadable summary. Please try again.");
    }
    const list = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
    return {
      headline: String(out.headline || ""),
      findings: list(out.findings),
      watchouts: list(out.watchouts),
      questions: list(out.questions).slice(0, 4),
    };
  }
}

export function validatePipelineSafety(pipeline) {
  for (const stage of pipeline) {
    const stageNames = Object.keys(stage);
    for (const name of stageNames) {
      if (FORBIDDEN_STAGES.includes(name)) {
        throw new Error(`Generated pipeline uses a disallowed stage: ${name}`);
      }
    }
  }
}

function stripCodeFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

// Parses JSON even if the model wrapped it in fences or added a sentence around it.
function extractJson(text, open, close) {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf(open);
    const end = cleaned.lastIndexOf(close);
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("No JSON found");
  }
}

export function schemaToPromptText(dataset) {
  const lines = [`Collection: ${dataset.rowCount} documents.`, "Fields:"];
  for (const col of dataset.columns) {
    lines.push(`- ${col.name} (${col.type}), e.g. ${JSON.stringify(col.sampleValues)}`);
  }
  return lines.join("\n");
}

/**
 * Turns the saved chat messages (oldest first) into a compact text block of the
 * last few successful question -> pipeline -> answer turns, so follow-up
 * questions like "now break that down by region" have context.
 */
export function buildHistory(messages, maxTurns = 3) {
  const turns = [];
  let lastQuestion = null;
  for (const m of messages) {
    if (m.role === "user") {
      lastQuestion = m.content;
    } else if (lastQuestion && m.pipeline && !m.error) {
      turns.push({ q: lastQuestion, pipeline: m.pipeline, answer: m.content });
      lastQuestion = null;
    }
  }
  return turns
    .slice(-maxTurns)
    .map((t) => `Q: ${t.q}\nPipeline: ${JSON.stringify(t.pipeline)}\nAnswer: ${String(t.answer).slice(0, 200)}`)
    .join("\n\n");
}