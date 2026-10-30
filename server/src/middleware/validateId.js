const OBJECT_ID = /^[a-f\d]{24}$/i;

export const isObjectId = (value) => typeof value === "string" && OBJECT_ID.test(value);

// Used with router.param(): rejects malformed IDs before they reach the database.
export function validateObjectId(req, res, next, value) {
  if (!isObjectId(value)) {
    return res.status(400).json({ error: "Invalid ID." });
  }
  next();
}