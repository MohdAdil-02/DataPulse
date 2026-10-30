import { validatePipelineSafety } from "./src/services/pipelineValidator.js";

const tests = [
  ["normal query", [{ $group: { _id: "$a", n: { $sum: 1 } } }], true],
  ["$lookup hidden in $facet", [{ $facet: { x: [{ $lookup: { from: "datasets", pipeline: [], as: "d" } }] } }], false],
  ["$unionWith", [{ $unionWith: { coll: "datasets" } }], false],
];
for (const [name, p, shouldPass] of tests) {
  let passed = true;
  try { validatePipelineSafety(p); } catch { passed = false; }
  console.log(passed === shouldPass ? "OK  " : "FAIL", name);
}