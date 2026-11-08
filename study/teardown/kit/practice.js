/* Original Assembl practice controls. No network calls, storage, grading or student tracking. */
export function checkNumericAnswer(raw, expected, tolerance = 0.01) {
  if (!Number.isFinite(expected) || !Number.isFinite(tolerance) || tolerance < 0) {
    throw new TypeError('A finite expected answer and non-negative absolute tolerance are required.');
  }
  const value = String(raw ?? '').trim();
  if (!value) return {kind: 'empty', message: 'Enter a number first. Zero is a valid answer.'};
  // Full-string parsing: do not silently accept units, commas or a numeric prefix.
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
    return {kind: 'invalid', message: 'Use a number only, in the units shown. For example, 1.25 or 1.25e3.'};
  }
  const number = Number(value);
  if (!Number.isFinite(number)) return {kind: 'invalid', message: 'Enter a finite number, in the units shown.'};
  const slack = Number.EPSILON * Math.max(1, Math.abs(number), Math.abs(expected)) * 4;
  return Math.abs(number - expected) <= tolerance + slack
    ? {kind: 'match', message: 'That agrees with the model within the stated rounding tolerance. Check your units and reasoning against the worked answer.'}
    : {kind: 'retry', message: 'Not within the rounding tolerance yet. Check the units, try the hint, or compare your method with the worked answer.'};
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function disclosure(label, text, className) {
  const details = node('details', className);
  details.append(node('summary', '', label), node('div', 'practice-copy', text));
  return details;
}

/** Mount after #app. Content is plain text, never HTML. Returns the mounted section. */
export function mountPractice(config) {
  if (!config || !/^[a-z][a-z0-9-]*$/.test(config.id) || !Array.isArray(config.questions)) {
    throw new TypeError('Practice requires a safe id and questions array.');
  }
  const id = `practice-${config.id}`;
  const previous = document.getElementById(id);
  if (previous?.classList.contains('assembl-practice')) return previous;
  if (previous) throw new Error('Practice id already belongs to another element.');
  if (!document.querySelector('link[data-assembl-practice]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = new URL('./practice.css', import.meta.url).href;
    css.dataset.assemblPractice = ''; document.head.append(css);
  }
  const section = node('section', 'assembl-practice'); section.id = id;
  const heading = node('h2', '', config.title || 'Try it for yourself'); heading.id = `${id}-title`;
  section.setAttribute('aria-labelledby', heading.id);
  const header = node('header', 'practice-header');
  header.append(node('p', 'practice-kicker', 'Explore · predict · explain'), heading,
    node('p', '', config.intro || config.introduction || 'Original practice questions. Try your own method before opening the worked answer. These are learning checks, not an assessment or a predicted NCEA grade.'));
  if (config.scope) header.append(node('p', 'practice-scope', config.scope));
  const print = node('button', 'practice-print', 'Print practice and answers'); print.type = 'button';
  print.addEventListener('click', () => window.print()); header.append(print); section.append(header);
  const list = node('ol', 'practice-list');
  config.questions.forEach((question, index) => {
    const qid = `${id}-q${index + 1}`;
    const card = node('li', 'practice-question');
    const title = node('h3', '', question.title || `Question ${index + 1}`); title.id = `${qid}-title`;
    card.append(title, node('p', 'practice-prompt', question.prompt));
    if (question.expected !== undefined) {
      const tolerance = question.tolerance ?? 0.01;
      checkNumericAnswer('', question.expected, tolerance); // Validate authored data before rendering controls.
      const form = node('form', 'practice-form'); form.setAttribute('aria-labelledby', title.id); form.noValidate = true;
      const label = node('label', '', `Your answer${question.unit ? ` (${question.unit})` : ''}`); label.htmlFor = `${qid}-input`;
      const input = node('input', ''); input.id = label.htmlFor; input.type = 'text'; input.inputMode = 'decimal';
      input.autocomplete = 'off'; input.spellcheck = false;
      const note = node('p', 'practice-tolerance', `Accepts answers within ±${tolerance}${question.unit ? ` ${question.unit}` : ''} of the worked value.`); note.id = `${qid}-tolerance`;
      const feedback = node('p', 'practice-feedback'); feedback.id = `${qid}-feedback`; feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-atomic', 'true');
      input.setAttribute('aria-describedby', `${note.id} ${feedback.id}`);
      const submit = node('button', '', 'Check number'); submit.type = 'submit';
      const row = node('div', 'practice-input-row'); row.append(input, submit);
      form.append(label, row, note, feedback);
      form.addEventListener('submit', event => {
        event.preventDefault();
        const result = checkNumericAnswer(input.value, question.expected, tolerance);
        feedback.textContent = result.message; feedback.dataset.kind = result.kind;
        input.setAttribute('aria-invalid', String(result.kind === 'empty' || result.kind === 'invalid'));
      });
      input.addEventListener('input', () => { feedback.textContent = ''; delete feedback.dataset.kind; input.removeAttribute('aria-invalid'); });
      card.append(form);
    }
    if (question.hint) card.append(disclosure('Show a hint', question.hint, 'practice-hint'));
    card.append(disclosure('Worked answer and reasoning', question.answer, 'practice-answer'));
    if (question.misconception) card.append(node('p', 'practice-misconception', `Watch out: ${question.misconception}`));
    list.append(card);
  });
  section.append(list);
  if (config.sources?.length) {
    const footer = node('footer', 'practice-sources');
    footer.append(node('h3', '', 'Scope and sources'));
    const sources = node('ul', '');
    for (const source of config.sources) {
      const url = new URL(source.href);
      if (url.protocol !== 'https:') throw new TypeError('Practice sources must use HTTPS.');
      const li = node('li', ''), link = node('a', '', source.label);
      link.href = url.href; li.append(link); sources.append(li);
    }
    footer.append(sources); section.append(footer);
  }
  // The machine owns document-level shortcuts; native controls below it must keep their keys.
  section.addEventListener('keydown', event => {
    if (event.target.closest('button,summary,input,select,textarea,a')) event.stopPropagation();
  });
  // Native closed details are not reliably printable across engines; open temporarily.
  let printStates = null;
  window.addEventListener('beforeprint', () => {
    printStates = [...section.querySelectorAll('.practice-answer')].map(details => [details, details.open]);
    for (const [details] of printStates) details.open = true;
  });
  window.addEventListener('afterprint', () => {
    for (const [details, open] of printStates || []) details.open = open;
    printStates = null;
  });
  const app = document.getElementById('app');
  if (app) app.insertAdjacentElement('afterend', section); else document.body.append(section);
  return section;
}
