import type { ChatGPTUser } from "@/app/chatgpt-auth";
// Owner-only internal workspace; public visitors use the separate demonstration.
export function isOwner(user:ChatGPTUser){return user.email.toLowerCase()==="katecoveny@gmail.com";}
