import { env } from "cloudflare:workers";
export function creativeDb(){if(!env.DB)throw new Error("Creative storage unavailable");return env.DB;}
