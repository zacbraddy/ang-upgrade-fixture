// One-off seed for the Ang upgrade fixture (Ang story 12, k17 seed checklist).
// Run from the clean `install:` commit: `node seed/seed.mjs`. Re-running resets everything this script owns first,
// so a bad seed is fixed by editing this file and running it again. All prose comes from faker with a fixed seed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { faker } from '@faker-js/faker';

faker.seed(17);

const ROOT = path.resolve(import.meta.dirname, '..');
const CLI = path.join(ROOT, '.claude/scripts/ang-context-manager.mjs');
const CONFIRMED = '2026-11-20';

const SHIPPED_EDITS = [
  '.claude/skills/review-story/SKILL.md',
  '.claude/agents/context-scout.md',
  '.claude/rules/engineering-defaults.md',
  '.claude/output-styles/partner-in-crime.md',
  '.claude/scripts/ang/library/validate.mjs',
  '.claude/ang/features/streams/conventions.md',
  '.claude/settings.json',
  'project-context/README.md',
];
const GENERATED = [
  'ang.json',
  'project-context',
  'workflow-improvements',
  '.claude/rules/fixture-house-style.md',
  '.claude/skills/fixture-notes',
  '.claude/agents/fixture-auditor.md',
];

function die(message) {
  console.error(`✖ seed: ${message}`);
  process.exit(1);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) die(`${cmd} ${args.join(' ')} failed:\n${result.stdout}${result.stderr}`);
  return result.stdout;
}

const ang = (...args) => process.stdout.write(run('node', [CLI, ...args]));
const abs = (file) => path.join(ROOT, file);
const read = (file) => fs.readFileSync(abs(file), 'utf8');

function write(file, text) {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), text);
}

// --- reset: makes a re-run from the same commit produce the same tree ---

function reset() {
  const seededAtHead = spawnSync('git', ['cat-file', '-e', 'HEAD:ang.json'], { cwd: ROOT }).status === 0;
  if (seededAtHead) die('HEAD already has ang.json, so it is seeded. Run this from the install: commit.');
  run('git', ['restore', '--source=HEAD', '--worktree', '--', ...SHIPPED_EDITS]);
  run('git', ['clean', '-fdq', '--', ...GENERATED]);
}

// --- faker helpers ---

const sentence = () => faker.lorem.sentence();
const paragraph = () => faker.lorem.paragraph();
const title = () => faker.lorem.sentence({ min: 3, max: 5 }).replace(/\.$/, '');
const usedSlugs = new Set();

function slug(words = 2) {
  for (;;) {
    const candidate = faker.lorem.words(words).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!usedSlugs.has(candidate)) {
      usedSlugs.add(candidate);
      return candidate;
    }
  }
}

// --- shipped-file edits by exact anchor ---

function insertAfter(file, anchor, insertion) {
  const text = read(file);
  const count = text.split(anchor).length - 1;
  if (count !== 1) die(`${file}: anchor found ${count} times, expected once:\n${anchor}`);
  write(file, text.replace(anchor, anchor + insertion));
}

function appendAfterEnding(file, ending, addition) {
  const text = read(file);
  if (!text.endsWith(ending)) die(`${file}: expected the file to end with:\n${ending}`);
  write(file, text + addition);
}

function editShippedFiles() {
  insertAfter(
    '.claude/skills/review-story/SKILL.md',
    '6. Set `status: done` and run `ang-context-manager.mjs library validate`. If every story in the epic is done, say so: next is `/retro` in a fresh session.\n',
    `\n${sentence()}\n`,
  );
  appendAfterEnding(
    '.claude/agents/context-scout.md',
    '- "Not in the library" stated plainly when it isn\'t. Never fill gaps with guesses.\n',
    `\n${sentence()}\n`,
  );
  insertAfter(
    '.claude/rules/engineering-defaults.md',
    '- Architecture follows the domain. DDD/Onion is the default starting shape, not a mandate.\n',
    `- ${sentence()}\n`,
  );
  insertAfter(
    '.claude/output-styles/partner-in-crime.md',
    '- Serious mode: when things are on fire (prod down, data at risk, broken deploy) or I say anything like "we need to be serious now", drop jokes and emoji until I lighten things up again.\n',
    `- ${sentence()}\n`,
  );
  appendAfterEnding(
    '.claude/scripts/ang/library/validate.mjs',
    '  return errors.length === 0;\n}\n',
    `\nexport function fixtureNote() {\n  return '${sentence()}';\n}\n`,
  );
  appendAfterEnding(
    '.claude/ang/features/streams/conventions.md',
    '- **Validate** (streams on) warns when a registered stream\'s branch or worktree is gone, or when mail is addressed to an unregistered stream.\n',
    `\n${sentence()}\n`,
  );
  insertAfter(
    'project-context/README.md',
    'Missing files mean everything is off. `validate` rejects unknown keys and values in either file. Flipping a key is the whole change; it takes effect next session.',
    ` ${sentence()}`,
  );
  editSettings();
}

function editSettings() {
  const file = '.claude/settings.json';
  const original = read(file);
  const settings = JSON.parse(original);
  if (JSON.stringify(settings, null, 2) + '\n' !== original) die(`${file}: not in JSON.stringify(_, null, 2) layout; edit would reformat it`);
  if (settings.env) die(`${file}: already has env`);
  if (!Array.isArray(settings.permissions?.allow)) die(`${file}: permissions.allow missing`);
  if (!Array.isArray(settings.hooks?.PostToolUse)) die(`${file}: hooks.PostToolUse missing`);
  settings.env = { FIXTURE_FLAVOUR: faker.lorem.word() };
  settings.permissions.allow.push('Bash(echo:*)');
  settings.hooks.PostToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo fixture' }] });
  write(file, JSON.stringify(settings, null, 2) + '\n');
}

// --- local-only files and config ---

function writeLocalFiles() {
  write('.claude/rules/fixture-house-style.md', `# ${title()}\n\n- ${sentence()}\n- ${sentence()}\n- ${sentence()}\n`);
  write(
    '.claude/skills/fixture-notes/SKILL.md',
    `---\nname: fixture-notes\ndescription: ${sentence()}\n---\n\n# ${title()}\n\n${paragraph()}\n`,
  );
  write(
    '.claude/agents/fixture-auditor.md',
    `---\nname: fixture-auditor\ndescription: ${sentence()}\ntools: Read\n---\n\n${paragraph()}\n`,
  );
  write('ang.json', JSON.stringify({ intent: true, streams: true }, null, 2) + '\n');
}

function ensureGitignore() {
  const file = '.gitignore';
  const text = fs.existsSync(abs(file)) ? read(file) : '';
  if (text.split('\n').includes('node_modules/')) return;
  write(file, `${text}${text && !text.endsWith('\n') ? '\n' : ''}node_modules/\n`);
}

// --- library docs ---

function doc({ heading, tags, extra = {}, sections, related }) {
  const fm = [
    '---',
    `title: ${heading}`,
    `shortDescription: ${sentence()}`,
    `tags: [${tags.join(', ')}]`,
    ...Object.entries(extra).map(([k, v]) => `${k}: ${v}`),
    '---',
  ];
  const body = sections.map(([h, text]) => `## ${h}\n${text}`);
  const rows = related.map(([label, link]) => `| [${label}](${link}) | ${sentence()} |`);
  return [...fm, `# ${heading}`, '', ...body.flatMap((s) => [s, '']), '## Related', '| Doc | Why |', '|---|---|', ...rows, ''].join('\n');
}

const bullets = (n) => Array.from({ length: n }, () => `- ${sentence()}`).join('\n');
const TENK_PRODUCT = '/project-context/10k/product.md';

function writeTenK(tags) {
  write('project-context/10k/product.md', doc({
    heading: title(),
    tags: [tags.product],
    sections: [['Summary', paragraph()], [title(), paragraph()]],
    related: [[title(), '/project-context/10k/intent.md']],
  }));
  write('project-context/10k/intent.md', doc({
    heading: title(),
    tags: [tags.product],
    extra: { confirmed: CONFIRMED },
    sections: [
      ['Summary', paragraph()],
      ['The goal, and what reaching it looks like', paragraph()],
      ['Why we work this way', paragraph()],
      ['The stance', bullets(3)],
      ['What it means for agents', bullets(3)],
      ['Holds until', sentence()],
    ],
    related: [[title(), TENK_PRODUCT]],
  }));
}

function hub(dir, tags, whatsHere) {
  write(`${dir}/README.md`, doc({
    heading: title(),
    tags,
    sections: [
      ['Summary', paragraph()],
      ['Why it matters', paragraph()],
      ["What's here", whatsHere.map(([label, link]) => `- [${label}](${link}) — ${sentence()}`).join('\n') || sentence()],
    ],
    related: [[title(), TENK_PRODUCT]],
  }));
}

function plan(dir, tags) {
  write(`${dir}/plan.md`, doc({
    heading: title(),
    tags,
    sections: [['Summary', paragraph()], ['Scope', bullets(2)], ['Out of scope', bullets(2)], ['Approach', paragraph()], ['Success measures', bullets(2)]],
    related: [[title(), 'README.md']],
  }));
}

function story(dir, num, status, dependsOn, tags) {
  const file = `stories/${num}-${slug()}.md`;
  write(`${dir}/${file}`, doc({
    heading: title(),
    tags,
    extra: { status, owner: 'agent', dependsOn: `[${dependsOn.join(', ')}]` },
    sections: [
      ['Summary', paragraph()],
      ['Outcome', paragraph()],
      ['Done when', bullets(2)],
      ['Acceptance criteria', bullets(2)],
      ['Implementation notes', paragraph()],
    ],
    related: [[title(), '../plan.md']],
  }));
  return file;
}

function seedState(dir, type) {
  ang('state', 'init', dir, ...(type ? ['--type', type] : []));
  ang('state', 'add', dir, 'unknown', sentence(), sentence());
  ang('state', 'add', dir, 'known', sentence(), 'README.md');
  ang('state', 'add', dir, 'decision', sentence(), 'README.md');
}

function buildLibrary() {
  ang('library', 'init');
  const tags = { technical: slug(1), product: slug(1) };
  ang('tag', 'add', tags.technical, sentence(), 'technical');
  ang('tag', 'add', tags.product, sentence(), 'product');
  const both = [tags.technical, tags.product];

  writeTenK(tags);

  const items = {};
  for (const stage of ['ideas', 'shaping']) {
    items[stage] = slug();
    const dir = `project-context/${stage}/${items[stage]}`;
    hub(dir, both, []);
    seedState(dir);
  }

  items.planning = slug();
  const planningDir = `project-context/planning/${items.planning}`;
  hub(planningDir, both, [[title(), 'plan.md']]);
  plan(planningDir, both);
  seedState(planningDir, 'business');

  items.execution = slug();
  const execDir = `project-context/execution/${items.execution}`;
  plan(execDir, both);
  const execStories = [
    story(execDir, '01', 'done', [], both),
    story(execDir, '02', 'ready', ['01'], both),
    story(execDir, '03', 'draft', ['02'], both),
  ];
  hub(execDir, both, [[title(), 'plan.md'], ...execStories.map((s) => [title(), s])]);
  seedState(execDir, 'business');

  items.retro = slug();
  const retroDir = `project-context/retro/${items.retro}`;
  plan(retroDir, both);
  const retroStory = story(retroDir, '01', 'done', [], both);
  hub(retroDir, both, [[title(), 'plan.md'], [title(), retroStory]]);
  seedState(retroDir, 'business');

  const triggerSlug = slug();
  write(`project-context/triggers/${triggerSlug}.md`, doc({
    heading: title(),
    tags: [tags.technical],
    sections: [['Summary', paragraph()], ['What', paragraph()], ['Why', paragraph()], ['How', bullets(3)]],
    related: [[title(), `/project-context/execution/${items.execution}/${execStories[2]}`]],
  }));
  ang('trigger', 'add', triggerSlug, sentence(), `story:${items.execution}/03=done`);

  write('project-context/ideas/parked.md', doc({
    heading: title(),
    tags: [tags.product],
    sections: [
      ['Summary', paragraph()],
      ['Parked', `### ${title()}\n- What:${sentence()}\n- Wake condition: ${sentence()}\n- Source: [${title()}](/project-context/ideas/${items.ideas}/README.md)`],
    ],
    related: [[title(), `/project-context/ideas/${items.ideas}/README.md`]],
  }));

  ang('library', 'index');
  ang('library', 'validate');
}

reset();
editShippedFiles();
writeLocalFiles();
ensureGitignore();
buildLibrary();
console.log('✔ seed applied');
