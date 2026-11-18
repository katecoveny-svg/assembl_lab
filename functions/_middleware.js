// Host-based redirects carried over from vercel.json (Cloudflare's _redirects file cannot match on host).
const STUDY = [[/^\/m\/(.*)$/, '/study/m/$1'], [/^\/year9\/(.*)$/, '/study/year9/$1'], [/^\/lessons\/(.*)$/, '/study/lessons/$1'], [/^\/patterns\/(.*)$/, '/study/patterns/$1'], [/^\/teacher\.html$/, '/study/teacher.html']];
export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const host = url.hostname;
  // lab.assembl.co.nz/six/: the ArchiPro concept on a short address of its own (Six places AI pays at ArchiPro)
  if (url.pathname === '/six') return Response.redirect(new URL('/six/' + url.search, url), 301);
  if (url.pathname.startsWith('/six/') && env?.ASSETS) {
    const res = await env.ASSETS.fetch(new Request(new URL('/concepts/archipro/' + url.pathname.slice(5) + url.search, url), request));
    // the page changes often while it's being shown around: make phones check for a newer copy every time
    const out = new Response(res.body, res); out.headers.set('cache-control', 'public, max-age=0, must-revalidate'); return out;
  }
  if (host === 'auto.assembl.co.nz' && url.pathname === '/') return Response.redirect(new URL('/cars/', url), 302);
  if (host === 'study.assembl.co.nz') {
    if (url.pathname === '/') return Response.redirect(new URL('/study/', url), 302);
    for (const [re, to] of STUDY) if (re.test(url.pathname)) return Response.redirect(new URL(url.pathname.replace(re, to) + url.search, url), 302);
  }
  return next();
}
