declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** Owner sign-in email(s) for the internal workspace, comma-separated (see lib/owner.ts). */
    OWNER_EMAIL?: string;
  }
}
