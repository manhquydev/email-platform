#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = {
    repo: 'email-platform',
    querySet: path.join('scripts', 'gitnexus', 'api-route-validation-queries.json'),
    outDir: path.join('plans', 'reports'),
    strict: false,
    minResponseCoveragePct: 70,
    minMiddlewareCoveragePct: 70,
    maxPollutedTest: 0,
    maxPollutedMobile: 0,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === '--repo' && next) {
      args.repo = next;
      i += 1;
    } else if (key === '--query-set' && next) {
      args.querySet = next;
      i += 1;
    } else if (key === '--out-dir' && next) {
      args.outDir = next;
      i += 1;
    } else if (key === '--strict') {
      args.strict = true;
    } else if (key === '--min-response-coverage' && next) {
      args.minResponseCoveragePct = Number(next);
      i += 1;
    } else if (key === '--min-middleware-coverage' && next) {
      args.minMiddlewareCoveragePct = Number(next);
      i += 1;
    } else if (key === '--max-polluted-test' && next) {
      args.maxPollutedTest = Number(next);
      i += 1;
    } else if (key === '--max-polluted-mobile' && next) {
      args.maxPollutedMobile = Number(next);
      i += 1;
    }
  }

  return args;
}

function runCypher({ repo, query }, cwd) {
  const safeRepoPattern = /^[A-Za-z0-9._/-]+$/;
  if (!safeRepoPattern.test(repo)) {
    throw new Error(`Invalid repo argument: ${repo}`);
  }

  let proc;
  if (process.platform === 'win32') {
    const escapedQuery = query.replace(/'/g, "''");
    const command = `npx gitnexus cypher '${escapedQuery}' --repo ${repo}`;
    proc = spawnSync('powershell', ['-NoProfile', '-Command', command], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } else {
    proc = spawnSync('npx', ['gitnexus', 'cypher', query, '--repo', repo], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  if (proc.error) {
    throw proc.error;
  }

  const stdout = (proc.stdout || '').trim();
  const stderr = (proc.stderr || '').trim();

  if (!stdout) {
    throw new Error(`Empty stdout from gitnexus cypher. stderr=${stderr}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (err) {
    throw new Error(`Failed to parse gitnexus output as JSON: ${stdout.slice(0, 500)}`);
  }

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  return parsed;
}

function parseMarkdownTable(markdown) {
  if (!markdown || typeof markdown !== 'string') return { headers: [], rows: [] };

  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line) => line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

  const headers = parseLine(lines[0]);
  const rows = lines
    .slice(2)
    .map(parseLine)
    .filter((cells) => cells.length === headers.length)
    .map((cells) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx];
      });
      return obj;
    });

  return { headers, rows };
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function timestampForFile(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function main() {
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const querySetPath = path.resolve(cwd, args.querySet);
  const outDir = path.resolve(cwd, args.outDir);

  if (!fs.existsSync(querySetPath)) {
    throw new Error(`Query set file not found: ${querySetPath}`);
  }

  const querySet = JSON.parse(fs.readFileSync(querySetPath, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });

  const kpiResults = {};
  const rawResults = [];

  for (const item of querySet.kpiQueries) {
    const output = runCypher({ repo: args.repo, query: item.query }, cwd);
    const parsedTable = parseMarkdownTable(output.markdown || '');
    const firstRow = parsedTable.rows[0] || {};
    const firstValueKey = Object.keys(firstRow)[0];
    const value = toNumber(firstRow[firstValueKey]);

    kpiResults[item.id] = value;
    rawResults.push({ ...item, output, parsedTable });
  }

  const validationResults = [];
  for (const item of querySet.validationQueries) {
    const output = runCypher({ repo: args.repo, query: item.query }, cwd);
    const parsedTable = parseMarkdownTable(output.markdown || '');
    validationResults.push({
      id: item.id,
      title: item.title,
      kind: item.kind,
      row_count: output.row_count || parsedTable.rows.length,
      markdown: output.markdown || '',
      sample_rows: parsedTable.rows.slice(0, 10),
    });
  }

  const totalRoutes = kpiResults.total_route_nodes || 0;
  const apiRoutes = kpiResults.api_route_nodes || 0;
  const pollutedTest = kpiResults.polluted_test_route_handlers || 0;
  const pollutedMobile = kpiResults.polluted_mobile_route_handlers || 0;
  const withResponseKeys = kpiResults.api_routes_with_response_keys || 0;
  const withMiddleware = kpiResults.api_routes_with_middleware || 0;

  const summary = {
    totalRoutes,
    apiRoutes,
    pollutedTest,
    pollutedMobile,
    nonApiRoutes: Math.max(0, totalRoutes - apiRoutes),
    responseKeysCoveragePct: pct(withResponseKeys, apiRoutes),
    middlewareCoveragePct: pct(withMiddleware, apiRoutes),
    pollutedTestPctOfTotal: pct(pollutedTest, totalRoutes),
    pollutedMobilePctOfTotal: pct(pollutedMobile, totalRoutes),
  };

  const thresholds = {
    minResponseCoveragePct: args.minResponseCoveragePct,
    minMiddlewareCoveragePct: args.minMiddlewareCoveragePct,
    maxPollutedTest: args.maxPollutedTest,
    maxPollutedMobile: args.maxPollutedMobile,
  };

  const failedChecks = [];
  if (summary.responseKeysCoveragePct < thresholds.minResponseCoveragePct) {
    failedChecks.push({
      key: 'responseKeysCoveragePct',
      actual: summary.responseKeysCoveragePct,
      expected: `>= ${thresholds.minResponseCoveragePct}`,
    });
  }
  if (summary.middlewareCoveragePct < thresholds.minMiddlewareCoveragePct) {
    failedChecks.push({
      key: 'middlewareCoveragePct',
      actual: summary.middlewareCoveragePct,
      expected: `>= ${thresholds.minMiddlewareCoveragePct}`,
    });
  }
  if (summary.pollutedTest > thresholds.maxPollutedTest) {
    failedChecks.push({
      key: 'pollutedTest',
      actual: summary.pollutedTest,
      expected: `<= ${thresholds.maxPollutedTest}`,
    });
  }
  if (summary.pollutedMobile > thresholds.maxPollutedMobile) {
    failedChecks.push({
      key: 'pollutedMobile',
      actual: summary.pollutedMobile,
      expected: `<= ${thresholds.maxPollutedMobile}`,
    });
  }

  const generatedAt = new Date().toISOString();
  const stamp = timestampForFile();
  const jsonPath = path.join(outDir, `gitnexus-graph-quality-baseline-${stamp}.json`);
  const mdPath = path.join(outDir, `gitnexus-graph-quality-baseline-${stamp}.md`);

  const payload = {
    generatedAt,
    repo: args.repo,
    querySetPath: path.relative(cwd, querySetPath),
    summary,
    thresholds,
    strictMode: args.strict,
    failedChecks,
    kpis: kpiResults,
    validationResults,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  const mdLines = [
    '# GitNexus Graph Quality Baseline',
    '',
    `- Generated at: ${generatedAt}`,
    `- Repo: ${args.repo}`,
    `- Query set: ${path.relative(cwd, querySetPath)}`,
    '',
    '## KPI Summary',
    '',
    '| KPI | Value |',
    '| --- | ---: |',
    `| Total Route nodes | ${summary.totalRoutes} |`,
    `| API Route nodes | ${summary.apiRoutes} |`,
    `| Polluted test route handlers | ${summary.pollutedTest} |`,
    `| Polluted mobile route handlers | ${summary.pollutedMobile} |`,
    `| API responseKeys coverage (%) | ${summary.responseKeysCoveragePct} |`,
    `| API middleware coverage (%) | ${summary.middlewareCoveragePct} |`,
    '',
    '## Thresholds',
    '',
    '| Check | Expected | Actual | Status |',
    '| --- | --- | ---: | --- |',
    `| responseKeys coverage | >= ${thresholds.minResponseCoveragePct} | ${summary.responseKeysCoveragePct} | ${summary.responseKeysCoveragePct >= thresholds.minResponseCoveragePct ? 'PASS' : 'FAIL'} |`,
    `| middleware coverage | >= ${thresholds.minMiddlewareCoveragePct} | ${summary.middlewareCoveragePct} | ${summary.middlewareCoveragePct >= thresholds.minMiddlewareCoveragePct ? 'PASS' : 'FAIL'} |`,
    `| polluted test routes | <= ${thresholds.maxPollutedTest} | ${summary.pollutedTest} | ${summary.pollutedTest <= thresholds.maxPollutedTest ? 'PASS' : 'FAIL'} |`,
    `| polluted mobile routes | <= ${thresholds.maxPollutedMobile} | ${summary.pollutedMobile} | ${summary.pollutedMobile <= thresholds.maxPollutedMobile ? 'PASS' : 'FAIL'} |`,
    '',
    '## Validation Query Snapshots',
    '',
  ];

  for (const item of validationResults) {
    mdLines.push(`### ${item.id}`);
    mdLines.push(`- ${item.title}`);
    mdLines.push(`- Rows: ${item.row_count}`);
    mdLines.push('');
    mdLines.push(item.markdown || '_No markdown output_');
    mdLines.push('');
  }

  fs.writeFileSync(mdPath, `${mdLines.join('\n')}\n`, 'utf8');

  console.log('GitNexus graph quality baseline complete.');
  console.log(`JSON: ${path.relative(cwd, jsonPath)}`);
  console.log(`Markdown: ${path.relative(cwd, mdPath)}`);
  console.log(`Summary: totalRoutes=${summary.totalRoutes}, apiRoutes=${summary.apiRoutes}, pollutedTest=${summary.pollutedTest}, pollutedMobile=${summary.pollutedMobile}, responseKeysCoveragePct=${summary.responseKeysCoveragePct}, middlewareCoveragePct=${summary.middlewareCoveragePct}`);
  if (failedChecks.length > 0) {
    console.log(`Failed checks: ${failedChecks.map((c) => `${c.key} (${c.actual} vs ${c.expected})`).join(', ')}`);
  } else {
    console.log('Failed checks: none');
  }

  if (args.strict && failedChecks.length > 0) {
    process.exitCode = 1;
  }
}

main();
