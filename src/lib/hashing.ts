import crypto from "node:crypto";

export function hashCode(raw: string, pepper: string): string {
  return crypto.createHash("sha256").update(`${raw}:${pepper}`, "utf8").digest("hex");
}
