const categories = ["performance", "accessibility", "best-practices", "seo"];
const metricAudits = {
  lcp: "largest-contentful-paint",
  cls: "cumulative-layout-shift",
  tbt: "total-blocking-time",
};

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeReports(reports) {
  if (!Array.isArray(reports) || reports.length !== 12) {
    throw new Error(`Expected 12 Lighthouse reports (2 pages × 2 profiles × 3 runs); received ${reports?.length ?? 0}.`);
  }
  const grouped = new Map();
  for (const entry of reports) {
    const { page, profile, run, lhr } = entry ?? {};
    if (!page || !["mobile", "desktop"].includes(profile) || ![1, 2, 3].includes(run)) {
      throw new Error("Each report must include a page, mobile/desktop profile, and run number 1–3.");
    }
    if (!lhr?.categories || !lhr?.audits) throw new Error(`Malformed Lighthouse result for ${page} (${profile}, run ${run}).`);
    const scores = Object.fromEntries(categories.map((category) => {
      const score = lhr.categories[category]?.score;
      if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) {
        throw new Error(`Missing or invalid ${category} score for ${page} (${profile}, run ${run}).`);
      }
      return [category, Math.round(score * 100)];
    }));
    const metrics = Object.fromEntries(Object.entries(metricAudits).map(([metric, auditId]) => {
      const value = lhr.audits[auditId]?.numericValue;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`Missing or invalid ${metric.toUpperCase()} value (${auditId}) for ${page} (${profile}, run ${run}).`);
      }
      return [metric, value];
    }));
    const key = `${page}|${profile}`;
    const runs = grouped.get(key) ?? [];
    if (runs.some((item) => item.run === run)) throw new Error(`Duplicate run ${run} for ${page} (${profile}).`);
    runs.push({ run, scores, metrics });
    grouped.set(key, runs);
  }

  const summary = [];
  for (const [key, runs] of grouped) {
    if (runs.length !== 3 || new Set(runs.map((item) => item.run)).size !== 3) {
      throw new Error(`Expected exactly runs 1, 2, and 3 for ${key}; received ${runs.length}.`);
    }
    const [page, profile] = key.split("|");
    const result = { page, profile, runs: runs.sort((a, b) => a.run - b.run).map((item) => item.run), median: {} };
    for (const category of categories) result.median[category] = median(runs.map((item) => item.scores[category]));
    for (const metric of Object.keys(metricAudits)) result.median[metric] = median(runs.map((item) => item.metrics[metric]));
    summary.push(result);
  }
  if (summary.length !== 4) throw new Error(`Expected four page/profile groups, received ${summary.length}.`);
  return summary.sort((a, b) => a.page.localeCompare(b.page) || a.profile.localeCompare(b.profile));
}
