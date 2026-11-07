import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
// Owner-only internal workspace; public visitors use the separate demonstration.
// The owner's sign-in email comes from the OWNER_EMAIL environment variable (comma-separated for more than one), so no
// personal address lives in this public repository. Without it, only the assembl business address is treated as the owner.
const DEFAULT_OWNER_EMAIL = "assembl@assembl.co.nz";
function ownerEmails(): string[] {
  const raw = env.OWNER_EMAIL || DEFAULT_OWNER_EMAIL;
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}
export function isOwner(user: ChatGPTUser) { return ownerEmails().includes(user.email.toLowerCase()); }
