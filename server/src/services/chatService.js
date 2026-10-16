import { GoogleGenAI } from "@google/genai";

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

const FORBIDDEN_STAGES = ["$out", "$merge", "$function", "$accumulator", "$where", "$lookup"];

export class ChatService {
  constructor(apiKey, modelName = "gemini-2.5-flash") {
    this.client = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  async generatePipeline(question, schemaText) {
    const prompt = `Collection schema:\n${schemaText}\n\nQuestion: ${question}\n\nMongoDB aggregation pipeline (JSON array only):`;

    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: { systemInstruction: SYSTEM_INSTRUCTIONS },
    });

    const raw = stripCodeFences(response.text.trim());
    let pipeline;
    try {
      pipeline = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Gemini did not return valid JSON: ${raw.slice(0, 200)}`);
    }

    if (!Array.isArray(pipeline)) {
      throw new Error("Generated pipeline is not a JSON array.");
    }

    validatePipelineSafety(pipeline);
    return pipeline;
  }

  async explainResult(question, resultPreview) {
    const prompt = `Question: ${question}\nResult data:\n${JSON.stringify(resultPreview, null, 2).slice(0, 3000)}\n\nWrite a brief (1-2 sentence) plain-English answer to the question based on this result. No code, no markdown.`;

    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });

    return response.text.trim();
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

export function schemaToPromptText(dataset) {
  const lines = [`Collection: ${dataset.rowCount} documents.`, "Fields:"];
  for (const col of dataset.columns) {
    lines.push(`- ${col.name} (${col.type}), e.g. ${JSON.stringify(col.sampleValues)}`);
  }
  return lines.join("\n");
}