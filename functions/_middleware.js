// Host-based redirects carried over from vercel.json (Cloudflare's _redirects file cannot match on host).
const STUDY = [[/^\/m\/(.*)$/, '/study/m/$1'], [/^\/year9\/(.*)$/, '/study/year9/$1'], [/^\/lessons\/(.*)$/, '/study/lessons/$1'], [/^\/patterns\/(.*)$/, '/study/patterns/$1'], [/^\/teacher\.html$/, '/study/teacher.html']];
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === 'auto.assembl.co.nz' && url.pathname === '/') return Response.redirect(new URL('/cars/', url), 302);
  if (host === 'study.assembl.co.nz') {
    if (url.pathname === '/') return Response.redirect(new URL('/study/', url), 302);
    for (const [re, to] of STUDY) if (re.test(url.pathname)) return Response.redirect(new URL(url.pathname.replace(re, to) + url.search, url), 302);
  }
  return next();
}
