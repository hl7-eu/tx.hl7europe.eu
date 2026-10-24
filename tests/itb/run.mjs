#!/usr/bin/env node
// Run the deployment tests in an ITB instance and write the results.
//
//   node tests/itb/run.mjs --itb-cli <path to OpenTestBed/itb-cli> [options]
//
//   --itb <url>        the ITB instance (default http://localhost:10003)
//   --server <url>     the terminology server to test (default: the one the
//                      features name, https://tx.hl7europe.eu/r4)
//   --features <dir>   default tests/features
//   --library <file>   default server/config/library.yml (coverage check)
//   --out <dir>        default tests/out
//   --release <tag>    the server release this run tests (recorded in results)
//
// Keys: ITB_MASTER_KEY (default master-api-key) and ITB_COMMUNITY_KEY (read
// from the database by tests/itb/bootstrap.sh on a fresh instance).
//
// Writes <out>/results.json and one ITB report per test case under
// <out>/reports/. Exits 1 when a test case fails or a library.yml source has
// no test.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const ITB_CLI = path.resolve(opt('itb-cli', process.env.ITB_CLI ?? path.join(REPO, '../itb-cli')));
const FEATURES = path.resolve(opt('features', path.join(REPO, 'tests/features')));
const LIBRARY = path.resolve(opt('library', path.join(REPO, 'server/config/library.yml')));
const OUT = path.resolve(opt('out', path.join(REPO, 'tests/out')));
const DEFAULT_SERVER = 'https://tx.hl7europe.eu/r4';
const SERVER = opt('server', DEFAULT_SERVER);
const RELEASE = opt('release', process.env.RELEASE_TAG ?? null);

const { compileFeature, writeSuite } = await import(pathToFileURL(path.join(ITB_CLI, 'src/compile.mjs')).href);
const itb = await import(pathToFileURL(path.join(ITB_CLI, 'src/itb-client.mjs')).href);

const cfg = {
  instance: {
    baseUrl: opt('itb', process.env.ITB_BASE_URL ?? 'http://localhost:10003'),
    masterApiKey: process.env.ITB_MASTER_KEY ?? 'master-api-key',
    communityApiKey: process.env.ITB_COMMUNITY_KEY,
  },
  bootstrap: { domain: 'tx-hl7europe', specification: 'deployment-tests' },
  execution: { actorId: 'TxServer' },
};

// ── Coverage: every active source in library.yml has a feature tagged with it ──
function librarySources(file) {
  const out = [];
  let inSources = false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^sources:/.test(line)) { inSources = true; continue; }
    if (/^\s*#/.test(line)) continue;                    // commented-out sources sit at column 0
    if (inSources && /^\S/.test(line)) inSources = false;
    const m = inSources && /^\s*-\s*(\S+)/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

function featureTags(text) {
  const tags = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith('@')) tags.push(...t.split(/\s+/).filter(x => x.startsWith('@')).map(x => x.slice(1)));
    else if (t.startsWith('Feature:')) break;
  }
  return tags;
}

// Each scenario's own lines (with the comments and tags just above it), so a
// result can show what was asked without opening the feature file.
function scenarioTexts(text) {
  const lines = text.split(/\r?\n/);
  const out = {};
  const starts = lines.flatMap((l, i) => /^\s*Scenario( Outline)?:/.test(l) ? [i] : []);
  starts.forEach((s, k) => {
    let from = s;
    while (from > 0 && /^\s*(@|#)/.test(lines[from - 1])) from--;
    let to = k + 1 < starts.length ? starts[k + 1] : lines.length;
    while (to > s + 1 && /^\s*(@|#|$)/.test(lines[to - 1])) to--;
    const name = lines[s].replace(/^\s*Scenario( Outline)?:\s*/, '').trim();
    out[name] = lines.slice(from, to).join('\n').replace(/^ {2}/gm, '');
  });
  return out;
}

// The edition under test, as the checkout describes it: a release is the
// content (library.yml) plus the FHIRsmith server plus Caddy in front of it.
function edition() {
  const server = path.join(REPO, 'server');
  const compose = fs.readFileSync(path.join(server, 'docker-compose.yml'), 'utf8');
  const image = svc => new RegExp(`^  ${svc}:[\\s\\S]*?^    image:\\s*(\\S+)`, 'm').exec(compose)?.[1] ?? null;
  const caddyfile = path.join(server, 'caddy/Caddyfile');
  return {
    fhirsmith: image('fhirserver'),
    caddy: image('caddy'),
    caddyfile: fs.existsSync(caddyfile) ? createHash('sha256').update(fs.readFileSync(caddyfile)).digest('hex').slice(0, 12) : null,
    library: librarySources(LIBRARY),
  };
}

const featureFiles = fs.readdirSync(FEATURES).filter(f => f.endsWith('.feature')).sort();
const features = featureFiles.map(f => {
  const text = fs.readFileSync(path.join(FEATURES, f), 'utf8');
  return { file: f, text, tags: featureTags(text), name: /^\s*Feature:\s*(.+)$/m.exec(text)?.[1].trim() ?? f, scenarios: scenarioTexts(text) };
});
const covered = new Set(features.flatMap(f => f.tags.filter(t => t.startsWith('library:')).map(t => t.slice(8))));
const sources = librarySources(LIBRARY);
const coverage = sources.map(s => ({ source: s, tested: covered.has(s), features: features.filter(f => f.tags.includes(`library:${s}`)).map(f => f.file) }));
const untested = coverage.filter(c => !c.tested);
for (const c of untested) console.error(`NOT TESTED: library.yml source ${c.source} has no feature tagged @library:${c.source}`);

// ── ITB: bootstrap, then deploy and run each feature as one suite ──
await itb.resolveOrganisation(cfg);
await itb.ensureDomainAndSpec(cfg);
await itb.ensureOrganisation(cfg);
await itb.ensureSystem(cfg, 'tx.hl7europe.eu');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'reports'), { recursive: true });
const work = path.join(OUT, 'build');

// Not itb.startTest: it sends testCase as a string, which ITB ignores — it then
// starts every test case of the actor and the first session comes back.
async function start(testCaseId) {
  const resp = await fetch(`${cfg.instance.baseUrl}/api/rest/tests/start`, {
    method: 'POST',
    headers: { ITB_API_KEY: cfg.instance.organisationApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ testCase: [testCaseId], system: cfg.execution.system, actor: cfg.execution.actor, forceSequentialExecution: true }),
  });
  const data = await resp.json();
  const created = data.createdSessions ?? [];
  if (!resp.ok || created.length !== 1) throw new Error(`tests/start ${testCaseId}: HTTP ${resp.status}, ${created.length} session(s): ${JSON.stringify(data).slice(0, 300)}`);
  return created[0].session;
}

async function status(sessionId) {
  const resp = await fetch(`${cfg.instance.baseUrl}/api/rest/tests/status`, {
    method: 'POST',
    headers: { ITB_API_KEY: cfg.instance.organisationApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: [sessionId], withLogs: true, withReports: true }),
  });
  const data = await resp.json();
  return data.sessions?.[0] ?? data;
}

async function waitFor(sessionId, timeoutMs = 300000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const s = await status(sessionId);
    if (s.result && s.result !== 'UNDEFINED') return s;
    if (Date.now() > deadline) return { ...s, result: 'UNDEFINED', message: 'Timed out waiting for the session to finish' };
    await new Promise(r => setTimeout(r, 2000));
  }
}

// The overview report lists each step with its result; a failed step carries
// the assertion's error descriptions.
function stepsOf(xml = '') {
  const steps = [];
  for (const m of xml.matchAll(/<step id="([^"]+)">([\s\S]*?)<\/step>/g)) {
    const body = m[2];
    const errors = [...body.matchAll(/<(?:\w+:)?error[^>]*>[\s\S]*?<(?:\w+:)?description>([\s\S]*?)<\/(?:\w+:)?description>/g)].map(e => unxml(e[1]));
    steps.push({
      id: m[1],
      description: unxml(/<description>([\s\S]*?)<\/description>/.exec(body)?.[1] ?? ''),
      result: /<result>(\w+)<\/result>/.exec(body)?.[1] ?? 'UNDEFINED',
      errors,
    });
  }
  return steps;
}
function unxml(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim(); }

const suites = [];
for (const f of features) {
  let src = path.join(FEATURES, f.file);
  if (SERVER !== DEFAULT_SERVER) {
    fs.mkdirSync(work, { recursive: true });
    src = path.join(work, f.file);
    fs.writeFileSync(src, f.text.split(DEFAULT_SERVER).join(SERVER));
  }
  const suite = { feature: f.file, name: f.name, tags: f.tags, cases: [] };
  suites.push(suite);
  try {
    const r = await compileFeature(src);
    const errs = (r.issues ?? []).filter(i => (i.severity ?? 'error') === 'error');
    if (errs.length) throw new Error(`compile: ${errs.map(i => i.message).join('; ')}`);
    const zip = await writeSuite(r.files, path.join(work, path.basename(f.file, '.feature')), 'suite.zip');
    suite.id = r.files.find(x => x.type === 'testsuite')?.id;
    const dep = await itb.deploySuite(cfg, zip);
    const actor = itb.actorKeyFromDeploy(dep, 'TxServer');
    if (actor) { cfg.execution.actor = actor; await itb.ensureConformance(cfg, cfg.execution.system, actor); }
    for (const tc of r.files.filter(x => x.type === 'testcase')) {
      const sessionId = await start(tc.id);
      const s = await waitFor(sessionId);
      const reportFile = `reports/${tc.id}.xml`;
      if (s.report) fs.writeFileSync(path.join(OUT, reportFile), s.report);
      const scenario = /<ns2:name>([\s\S]*?)<\/ns2:name>/.exec(s.report ?? '')?.[1];
      const name = scenario ? unxml(scenario) : tc.id;
      suite.cases.push({
        id: tc.id, name, session: sessionId,
        result: s.result, message: s.message ?? '', startTime: s.startTime, endTime: s.endTime,
        gherkin: f.scenarios[name] ?? null, steps: stepsOf(s.report), logs: s.logs ?? [],
        report: s.report ? reportFile : null,
      });
      console.log(`${s.result.padEnd(9)} ${f.file} :: ${name}`);
    }
  } catch (e) {
    suite.error = e.message;
    console.error(`ERROR     ${f.file}: ${e.message}`);
  }
}

const all = suites.flatMap(s => s.cases);
const totals = {
  cases: all.length,
  passed: all.filter(c => c.result === 'SUCCESS').length,
  failed: all.filter(c => c.result === 'FAILURE').length,
  undefined: all.filter(c => !['SUCCESS', 'FAILURE'].includes(c.result)).length,
  suiteErrors: suites.filter(s => s.error).length,
  untestedSources: untested.length,
};
const result = totals.failed || totals.undefined || totals.suiteErrors ? 'FAILURE' : (untested.length ? 'INCOMPLETE' : 'SUCCESS');
let software = null;
try {
  const caps = await (await fetch(`${SERVER}/metadata`, { headers: { Accept: 'application/fhir+json' } })).json();
  software = caps.software ?? null;
} catch { /* recorded as unknown */ }
const results = {
  release: RELEASE, server: SERVER, software, edition: edition(), date: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? null, run: process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
  result, totals, coverage, suites,
};
fs.rmSync(work, { recursive: true, force: true });
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log(`\n${result}: ${totals.passed}/${totals.cases} passed, ${totals.failed} failed, ${totals.undefined} unfinished, ${totals.untestedSources} library source(s) untested`);
process.exit(result === 'SUCCESS' ? 0 : 1);
