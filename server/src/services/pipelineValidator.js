// Strict safety checks for AI-generated MongoDB aggregation pipelines.
// It uses an ALLOW-LIST of stages and scans the whole pipeline (including nested
// sub-pipelines and expressions) for operators that could run code or read other collections.

const ALLOWED_STAGES = new Set([
  "$match", "$group", "$sort", "$project", "$addFields", "$set", "$unset",
  "$limit", "$skip", "$count", "$unwind", "$bucket", "$bucketAuto",
  "$sortByCount", "$replaceRoot", "$replaceWith", "$facet",
]);

const DENIED_ANYWHERE = new Set([
  "$function", "$accumulator", "$where", "$lookup", "$unionWith", "$graphLookup",
  "$merge", "$out", "$search", "$searchMeta", "$vectorSearch", "$collStats", "$indexStats",
  "$planCacheStats", "$currentOp", "$listSessions", "$listLocalSessions", "$changeStream", "$documents",
]);

const MAX_STAGES = 12;
const MAX_JSON_CHARS = 8000;
const RESULT_LIMIT = 1000;

export function validatePipelineSafety(pipeline) {
  if (!Array.isArray(pipeline) || pipeline.length === 0) {
    throw new Error("The pipeline must be a non-empty array.");
  }
  if (pipeline.length > MAX_STAGES) {
    throw new Error(`The pipeline has too many stages (max ${MAX_STAGES}).`);
  }
  if (JSON.stringify(pipeline).length > MAX_JSON_CHARS) {
    throw new Error("The pipeline is too large.");
  }
  checkStages(pipeline);
  scanForDenied(pipeline);
}

function checkStages(stages) {
  for (const stage of stages) {
    if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
      throw new Error("Each pipeline stage must be an object.");
    }
    const names = Object.keys(stage);
    if (names.length !== 1) {
      throw new Error("Each pipeline stage must contain exactly one operator.");
    }
    const name = names[0];
    if (!ALLOWED_STAGES.has(name)) {
      throw new Error(`Generated pipeline uses a disallowed stage: ${name}`);
    }
    if (name === "$facet") {
      for (const sub of Object.values(stage.$facet)) {
        if (!Array.isArray(sub)) throw new Error("Invalid $facet definition.");
        checkStages(sub);
      }
    }
  }
}

function scanForDenied(node) {
  if (Array.isArray(node)) {
    node.forEach(scanForDenied);
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (DENIED_ANYWHERE.has(key)) {
        throw new Error(`Generated pipeline uses a disallowed operator: ${key}`);
      }
      scanForDenied(value);
    }
  }
}

// Makes sure a query can never return an enormous result.
export function withResultLimit(pipeline) {
  const last = pipeline[pipeline.length - 1];
  if (last && Object.keys(last)[0] === "$limit") return pipeline;
  return [...pipeline, { $limit: RESULT_LIMIT }];
}