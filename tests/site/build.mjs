#!/usr/bin/env node
// Build the Releases section of the documentation site from the GitHub
// releases and the stored test runs.
//
//   node tests/site/build.mjs --results <test-results checkout> --releases <releases.json> [--out docs/releases]
//
// <test-results checkout>: the test-results branch — runs/<run-id>/results.json
//   and runs/<run-id>/reports/*.xml, as tests/itb/run.mjs writes them.
// <releases.json>: `gh api repos/{owner}/{repo}/releases --paginate`.
//
// Writes, under --out (generated, not committed):
//   index.md                    every release with its test status
//   <tag>.md                    release notes + test summary of the release
//   runs/<run-id>.html          one run, drillable: suite -> case -> steps
//   runs/<run-id>/reports/      the raw ITB reports
// and, under --plans (default docs/test-plan), the test plan read from
// tests/features in git: index.md for the current commit, <tag>.md for each
// release, so a release shows the plan it was tested against.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const RESULTS = path.resolve(opt('results', 'test-results'));
const RELEASES = opt('releases', null);
const OUT = path.resolve(opt('out', 'docs/releases'));
const PLANS = path.resolve(opt('plans', 'docs/test-plan'));
const REPO = path.resolve(opt('repo', '.'));

// The European Commission's Interoperability Test Bed, which runs the tests.
const ITB = 'https://www.itb.ec.europa.eu/';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => String(s).replace(/[^\w.-]+/g, '-');
const day = iso => iso ? iso.slice(0, 10) : '';
const STATUS = {
  SUCCESS: ['passed', 'green'],
  FAILURE: ['failed', 'red'],
  INCOMPLETE: ['incomplete', 'yellow'],
  UNDEFINED: ['did not finish', 'yellow'],
};
const label = r => `<span class="label label-${(STATUS[r] ?? ['', 'grey'])[1]}">${esc((STATUS[r] ?? [r ?? 'not tested'])[0])}</span>`;
const front = o => `---\n${Object.entries(o).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`;

// ── Inputs ──
const runsDir = path.join(RESULTS, 'runs');
const runs = (fs.existsSync(runsDir) ? fs.readdirSync(runsDir) : [])
  .filter(id => fs.existsSync(path.join(runsDir, id, 'results.json')))
  .map(id => ({ id, ...JSON.parse(fs.readFileSync(path.join(runsDir, id, 'results.json'), 'utf8')) }))
  .sort((a, b) => b.date.localeCompare(a.date));
const releases = (RELEASES ? JSON.parse(fs.readFileSync(RELEASES, 'utf8')) : [])
  .filter(r => !r.draft)
  .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
const runsOf = tag => runs.filter(r => r.release === tag);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'runs'), { recursive: true });

const totalsText = t => `${t.passed} of ${t.cases} test cases passed` +
  (t.failed ? `, ${t.failed} failed` : '') + (t.undefined ? `, ${t.undefined} did not finish` : '') +
  (t.suiteErrors ? `, ${t.suiteErrors} suite(s) could not run` : '') +
  (t.untestedSources ? `, ${t.untestedSources} library source(s) without a test` : '');

// ── One run: the drill-down page ──
function runPage(run) {
  const rel = run.release ? `<a href="../${slug(run.release)}.html">${esc(run.release)}</a>` : 'no release (scheduled or manual run)';
  const suites = run.suites.map(s => {
    const passed = s.cases.filter(c => c.result === 'SUCCESS').length;
    const sResult = s.error ? 'FAILURE' : passed === s.cases.length ? 'SUCCESS' : 'FAILURE';
    const cases = s.cases.map(c => {
      const steps = c.steps.map(st => `
          <tr class="${st.result === 'SUCCESS' ? '' : 'step-failed'}"><td>${label(st.result)}</td><td>${esc(st.description)}${st.errors.map(e => `<br><code>${esc(e)}</code>`).join('')}</td></tr>`).join('');
      return `
      <details id="${esc(c.id)}"${c.result === 'SUCCESS' ? '' : ' open'}>
        <summary>${label(c.result)} ${esc(c.name)}</summary>
        <p>${esc(c.message)}${c.report ? ` · <a href="${esc(run.id)}/${esc(c.report)}">ITB report (XML)</a>` : ''}</p>
        <table><thead><tr><th>Result</th><th>Step</th></tr></thead><tbody>${steps}
        </tbody></table>
        ${c.gherkin ? `<details><summary>Scenario</summary><pre><code class="language-gherkin">${esc(c.gherkin)}</code></pre></details>` : ''}
        ${c.logs?.length ? `<details><summary>Session log</summary><pre>${esc(c.logs.join('\n'))}</pre></details>` : ''}
      </details>`;
    }).join('');
    return `
    <h2 id="${esc(slug(s.feature))}">${label(sResult)} ${esc(s.name)}</h2>
    <p><code>tests/features/${esc(s.feature)}</code> · ${passed} of ${s.cases.length} passed
      ${s.tags.filter(t => t.startsWith('library:')).map(t => `<br>library.yml: <code>${esc(t.slice(8))}</code>`).join('')}</p>
    ${s.error ? `<p class="text-red-300"><strong>The suite could not run:</strong> ${esc(s.error)}</p>` : ''}
    ${cases}`;
  }).join('\n');

  const untested = run.coverage.filter(c => !c.tested);
  const html = `---
layout: default
title: "Test run ${esc(run.id)}"
nav_exclude: true
search_exclude: true
---
<style>.step-failed td { background: rgba(220, 50, 50, .12); } details { margin: .5rem 0 .5rem 0; } details details { margin-left: 1rem; } summary { cursor: pointer; }</style>
<h1>Test run ${esc(run.id)} ${label(run.result)}</h1>
<table>
  <tr><th>Release</th><td>${rel}</td></tr>
  <tr><th>Date</th><td>${esc(run.date.replace('T', ' ').slice(0, 16))} UTC</td></tr>
  <tr><th>Server</th><td><code>${esc(run.server)}</code> · ${esc(run.software ? `${run.software.name} ${run.software.version}` : 'software not reported')}</td></tr>
  <tr><th>Test bed</th><td><a href="${ITB}">Interoperability Test Bed (ITB)</a> of the European Commission</td></tr>
  <tr><th>Result</th><td>${esc(totalsText(run.totals))}</td></tr>
  ${run.run ? `<tr><th>Workflow run</th><td><a href="${esc(run.run)}">${esc(run.run)}</a></td></tr>` : ''}
  ${run.commit ? `<tr><th>Tests at</th><td><code>${esc(run.commit.slice(0, 12))}</code></td></tr>` : ''}
</table>
${untested.length ? `<p><strong>Library sources without a test:</strong> ${untested.map(c => `<code>${esc(c.source)}</code>`).join(', ')}</p>` : ''}
${suites}
`;
  fs.writeFileSync(path.join(OUT, 'runs', `${run.id}.html`), html);
  const reports = path.join(runsDir, run.id, 'reports');
  if (fs.existsSync(reports)) fs.cpSync(reports, path.join(OUT, 'runs', run.id, 'reports'), { recursive: true });
}

// ── Summary of a run as a Markdown table (one row per suite) ──
function runSummary(run, linkBase) {
  const rows = run.suites.map(s => {
    const passed = s.cases.filter(c => c.result === 'SUCCESS').length;
    const r = s.error || passed !== s.cases.length ? 'FAILURE' : 'SUCCESS';
    return `| ${label(r)} | [${s.name}](${linkBase}runs/${run.id}.html#${slug(s.feature)}) | ${passed} / ${s.cases.length} |`;
  });
  return `| Result | Suite | Passed |\n|---|---|---|\n${rows.join('\n')}\n`;
}

for (const run of runs) runPage(run);

// ── One page per release ──
releases.forEach((r, i) => {
  const its = runsOf(r.tag_name);
  const latest = its[0];
  let md = front({ layout: 'default', title: r.tag_name, parent: 'Releases', nav_order: i + 1 });
  md += `# ${r.name && r.name !== r.tag_name ? `${r.name} (${r.tag_name})` : r.tag_name}\n\n`;
  md += `Released ${day(r.published_at)} · [on GitHub](${r.html_url}) · tests: ${latest ? label(latest.result) : label(null)}\n\n`;
  md += `## Release notes\n\n{% raw %}\n${(r.body ?? '').trim() || '_No release notes._'}\n{% endraw %}\n\n`;
  const ed = latest?.edition;
  if (ed) {
    const tree = `${r.html_url.replace(/\/releases\/tag\/.*/, '')}/blob/${r.tag_name}`;
    md += `## Edition\n\nWhat this release puts on the server, read from the repository at \`${r.tag_name}\`.\n\n| Part | Version |\n|---|---|\n` +
      `| FHIRsmith server | \`${ed.fhirsmith}\` ([compose](${tree}/server/docker-compose.yml)) |\n` +
      `| Caddy | \`${ed.caddy}\`, [Caddyfile](${tree}/server/caddy/Caddyfile) \`${ed.caddyfile}\` |\n` +
      `| Content | ${ed.library.length} sources in [library.yml](${tree}/server/config/library.yml) |\n\n`;
  }
  md += `## Test status\n\nTested in the European Commission's [Interoperability Test Bed (ITB)](${ITB}) against the [test plan of ${r.tag_name}](../test-plan/${slug(r.tag_name)}.html).\n\n`;
  if (!latest) {
    md += `No test run has been recorded for this release.\n`;
  } else {
    md += `${label(latest.result)} ${totalsText(latest.totals)}, on ${day(latest.date)} against \`${latest.server}\`` +
      `${latest.software ? ` (${latest.software.name} ${latest.software.version})` : ''}. [Full results](runs/${latest.id}.html)\n\n`;
    md += runSummary(latest, '');
    md += `\n### Library coverage\n\n| library.yml source | Tested by |\n|---|---|\n` +
      latest.coverage.map(c => `| \`${c.source}\` | ${c.tested ? c.features.map(f => `\`${f}\``).join(', ') : label('INCOMPLETE') + ' no test'} |`).join('\n') + '\n';
    if (its.length > 1) {
      md += `\n### Earlier runs of this release\n\n` + its.slice(1).map(x => `- [${x.id}](runs/${x.id}.html) ${label(x.result)} ${totalsText(x.totals)}`).join('\n') + '\n';
    }
  }
  fs.writeFileSync(path.join(OUT, `${slug(r.tag_name)}.md`), md);
});

// ── The index ──
let md = front({ layout: 'default', title: 'Releases', nav_order: 3, has_children: true });
const HOW = {
  content: '../content/adding-content.html',
  fhirsmith: '../server/updates.html#fhirsmith',
  caddy: '../server/updates.html#caddy',
  releasing: '../server/releasing.html',
};
md += `# Releases\n\nEach release is an edition of the server: its [content](${HOW.content}), the [FHIRsmith server](${HOW.fhirsmith}) ` +
  `and [Caddy](${HOW.caddy}) in front of it, with release notes that link the issues it resolves. After the release is deployed, ` +
  `the deployment tests run against the live server in the European Commission's [Interoperability Test Bed (ITB)](${ITB}); their result is recorded with the release. Open a release for its notes and ` +
  `test summary, and its test run for every test case and step.\n\n`;
// A Markdown table needs at least one row, or kramdown prints it as text.
if (!releases.length) md += `_No releases yet._\n`;
else md += `| Release | Date | Server | Tests |\n|---|---|---|---|\n` + releases.map(r => {
  const latest = runsOf(r.tag_name)[0];
  const sw = latest?.software ? `${latest.software.name} ${latest.software.version}` : '';
  return `| [${r.tag_name}](${slug(r.tag_name)}.html) | ${day(r.published_at)} | ${sw} | ${latest ? `[${label(latest.result)}](runs/${latest.id}.html) ${latest.totals.passed}/${latest.totals.cases}` : label(null)} |`;
}).join('\n') + '\n';
const loose = runs.filter(r => !r.release).slice(0, 10);
if (loose.length) {
  md += `\n## Latest checks between releases\n\nScheduled and manual runs against the live server.\n\n| Run | Date | Server | Tests |\n|---|---|---|---|\n`;
  md += loose.map(r => `| [${r.id}](runs/${r.id}.html) | ${day(r.date)} | ${r.software ? `${r.software.name} ${r.software.version}` : ''} | ${label(r.result)} ${r.totals.passed}/${r.totals.cases} |`).join('\n') + '\n';
}
md += `\n## Changing the server\n\n` +
  `- [Add or update content](${HOW.content}): a package or code system in the server's library, with the tests that prove it is served\n` +
  `- [Update FHIRsmith](${HOW.fhirsmith}): a new version of the terminology server\n` +
  `- [Update Caddy](${HOW.caddy}): the proxy's version or configuration\n` +
  `- [Release](${HOW.releasing}): put the changes in a new edition, with its release notes and tests\n`;
fs.writeFileSync(path.join(OUT, 'index.md'), md);
console.log(`releases: ${releases.length}, runs: ${runs.length} -> ${OUT}`);

// ── The test plan: the feature files as they are at a commit or tag ──
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

function featuresAt(ref) {
  let names;
  try { names = git('ls-tree', '--name-only', `${ref}:tests/features`).split('\n').filter(n => n.endsWith('.feature')); }
  catch { return null; }                                  // no tests at that ref
  return names.sort().map(file => parseFeature(file, git('show', `${ref}:tests/features/${file}`).replace(/\r\n/g, '\n')));
}

function parseFeature(file, text) {
  const lines = text.split('\n');
  const tags = [];
  let i = 0;
  for (; i < lines.length && !/^\s*Feature:/.test(lines[i]); i++) {
    if (lines[i].trim().startsWith('@')) tags.push(...lines[i].trim().split(/\s+/).filter(t => t.startsWith('@')).map(t => t.slice(1)));
  }
  const name = (lines[i] ?? '').replace(/^\s*Feature:\s*/, '').trim() || file;
  const desc = [];
  for (i++; i < lines.length && !/^\s*(Background:|Scenario|Rule:|@|#)/.test(lines[i]); i++) if (lines[i].trim()) desc.push(lines[i].trim());
  const starts = lines.flatMap((l, k) => /^\s*(Background:|Scenario( Outline)?:)/.test(l) ? [k] : []);
  const blocks = starts.map((s, k) => {
    let from = s;
    while (from > 0 && /^\s*(@|#)/.test(lines[from - 1])) from--;
    let to = k + 1 < starts.length ? starts[k + 1] : lines.length;
    while (to > s + 1 && /^\s*(@|#|$)/.test(lines[to - 1])) to--;
    return { title: lines[s].replace(/^\s*(Background:|Scenario( Outline)?:)\s*/, '').trim(), background: /^\s*Background:/.test(lines[s]),
             text: lines.slice(from, to).join('\n').replace(/^ {2}/gm, '') };
  });
  return { file, name, desc: desc.join(' '), sources: tags.filter(t => t.startsWith('library:')).map(t => t.slice(8)),
           background: blocks.find(b => b.background), scenarios: blocks.filter(b => !b.background) };
}

function planPage(features, { title, intro, front: fm }) {
  const total = features.reduce((n, f) => n + f.scenarios.length, 0);
  let p = front(fm) + `# ${title}\n\n${intro}\n\n` +
    `${features.length} features, ${total} test cases, run in the European Commission's [Interoperability Test Bed (ITB)](${ITB}). How the tests are run, and how to read their results: [Testing](../testing.html).\n\n` +
    `| Feature | What it checks | library.yml sources | Test cases |\n|---|---|---|---|\n` +
    features.map(f => `| [${f.name}](#${slug(f.file)}) | ${f.desc.replace(/\|/g, '\\|')} | ${f.sources.length ? f.sources.map(s => `\`${s}\``).join('<br>') : '—'} | ${f.scenarios.length} |`).join('\n') + '\n';
  for (const f of features) {
    p += `\n<h2 id="${esc(slug(f.file))}">${esc(f.name)}</h2>\n\n<p>${esc(f.desc)}</p>\n<p><code>tests/features/${esc(f.file)}</code></p>\n`;
    if (f.background) p += `<details><summary>Background</summary><pre><code class="language-gherkin">${esc(f.background.text)}</code></pre></details>\n`;
    p += `<ul>\n` + f.scenarios.map(s => `<li><details><summary>${esc(s.title)}</summary><pre><code class="language-gherkin">${esc(s.text)}</code></pre></details></li>`).join('\n') + `\n</ul>\n`;
  }
  return p;
}

fs.rmSync(PLANS, { recursive: true, force: true });
fs.mkdirSync(PLANS, { recursive: true });
const current = featuresAt('HEAD');
if (current) {
  fs.writeFileSync(path.join(PLANS, 'index.md'), planPage(current, {
    title: 'Test plan',
    intro: 'What the deployment tests check, as the tests stand now. Each release keeps the plan it was tested against, linked from its page.',
    front: { layout: 'default', title: 'Test plan', parent: 'Testing', nav_order: 1 },
  }));
}
let plans = 0;
for (const r of releases) {
  const fts = featuresAt(r.tag_name);
  if (!fts) continue;
  fs.writeFileSync(path.join(PLANS, `${slug(r.tag_name)}.md`), planPage(fts, {
    title: `Test plan of ${r.tag_name}`,
    intro: `What the deployment tests of release [${r.tag_name}](../releases/${slug(r.tag_name)}.html) check, as the tests were at its tag.`,
    front: { layout: 'default', title: `Test plan of ${r.tag_name}`, nav_exclude: true },
  }));
  plans++;
}
console.log(`test plans: current ${current ? current.length + ' features' : 'none'}, ${plans} release(s) -> ${PLANS}`);
