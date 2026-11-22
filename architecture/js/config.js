// Where the shared team records live. This is the only file that names the Supabase project.
//
// The key below is a PUBLISHABLE key. It is designed to ship in browser code: on its own it opens nothing.
// What a person can read or change is decided in the database, by row level security, after they sign in.
// Never put any other key in this file or anywhere in the site.

export const SUPABASE_URL = 'https://wurwcrgxjjwqdaxqceey.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_JyL7Ng7dbuwe2vmec7OTew_f9QVARHj';

/** the database schema every table of this page sits in */
export const SCHEMA = 'arch';
/** the private storage bucket for a practice's files */
export const BUCKET = 'arch-files';
/** Supabase's own JavaScript client, one pinned version, kept beside the page (see architecture/vendor/README.md) */
export const CLIENT_MODULE = '../vendor/supabase-js.mjs';
/** where this browser keeps the sign-in */
export const AUTH_STORAGE_KEY = 'assembl.architecture.auth';
