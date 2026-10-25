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
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const RESULTS = path.resolve(opt('results', 'test-results'));
const RELEASES = opt('releases', null);
const OUT = path.resolve(opt('out', 'docs/releases'));

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
  md += `## Test status\n\n`;
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
md += `# Releases\n\nEach release of the server is a change to its code (the FHIRsmith image) or to its content (\`server/config/library.yml\`), ` +
  `with release notes that link the issues it resolves. After the release is deployed, the deployment tests run against the live server; ` +
  `their result is recorded with the release. Open a release for its notes and test summary, and its test run for every test case and step.\n\n`;
md += `| Release | Date | Server | Tests |\n|---|---|---|---|\n`;
md += releases.map(r => {
  const latest = runsOf(r.tag_name)[0];
  const sw = latest?.software ? `${latest.software.name} ${latest.software.version}` : '';
  return `| [${r.tag_name}](${slug(r.tag_name)}.html) | ${day(r.published_at)} | ${sw} | ${latest ? `[${label(latest.result)}](runs/${latest.id}.html) ${latest.totals.passed}/${latest.totals.cases}` : label(null)} |`;
}).join('\n') + '\n';
const loose = runs.filter(r => !r.release).slice(0, 10);
if (loose.length) {
  md += `\n## Latest checks between releases\n\nScheduled and manual runs against the live server.\n\n| Run | Date | Server | Tests |\n|---|---|---|---|\n`;
  md += loose.map(r => `| [${r.id}](runs/${r.id}.html) | ${day(r.date)} | ${r.software ? `${r.software.name} ${r.software.version}` : ''} | ${label(r.result)} ${r.totals.passed}/${r.totals.cases} |`).join('\n') + '\n';
}
if (!releases.length && !runs.length) md += `\n_No releases yet._\n`;
fs.writeFileSync(path.join(OUT, 'index.md'), md);
console.log(`releases: ${releases.length}, runs: ${runs.length} -> ${OUT}`);
