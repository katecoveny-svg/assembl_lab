import { App, type Project } from './app';

// Which twin this page shows comes from <body data-project>; each project module is loaded on demand.
const loaders: Record<string, () => Promise<Project>> = {
  '16a': async () => (await import('./project16a')).project16a,
  cafe: async () => (await import('./projectCafe')).projectCafe,
  plan: async () => (await import('./projectPlan')).projectPlan,
};

async function boot() {
  const key = new URLSearchParams(location.search).get('project') ?? document.body.dataset.project ?? '16a';
  const status = document.getElementById('status')!;
  if (!('gpu' in navigator)) status.textContent = 'No WebGPU in this browser: starting the WebGL 2 fallback…';
  try {
    const project = await loaders[key]();
    const app = new App(project, document.getElementById('c') as HTMLCanvasElement);
    (window as unknown as { __twin?: App }).__twin = app;
    if (new URLSearchParams(location.search).has('photoreal')) app.paused = true; // agent/film-1122: ?photoreal starts in the baked look (no frames until it is ready)
    await app.start();
    void import('./photoreal/index.ts').then((m) => m.registerPhotoreal(app)); // "Photoreal" baked look (agent/film-1122): this line and the ?photoreal line above
  } catch (err) {
    console.error(err);
    status.textContent = `The twin could not start: ${(err as Error).message}`;
  }
}
void boot();
