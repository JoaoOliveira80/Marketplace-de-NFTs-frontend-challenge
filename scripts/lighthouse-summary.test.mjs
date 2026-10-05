import test from "node:test";
import assert from "node:assert/strict";
import { summarizeReports } from "./summarize-lighthouse.mjs";

function makeReports() {
  return ["/", "/nft/emerald-ape-0042"].flatMap((page) => ["mobile", "desktop"].flatMap((profile) => [1, 2, 3].map((run) => ({
    page, profile, run,
    lhr: {
      categories: {
        performance: { score: 0.8 + run / 100 }, accessibility: { score: 0.95 },
        "best-practices": { score: 0.96 }, seo: { score: 0.91 },
      },
      audits: {
        "largest-contentful-paint": { numericValue: 1000 * run },
        "cumulative-layout-shift": { numericValue: 0.01 * run },
        "total-blocking-time": { numericValue: 50 * run },
      },
    },
  }))));
}

test("summarizes category scores, LCP, CLS, and TBT using medians", () => {
  const result = summarizeReports(makeReports());
  assert.equal(result.length, 4);
  assert.deepEqual(result[0].median, { performance: 82, accessibility: 95, "best-practices": 96, seo: 91, lcp: 2000, cls: 0.02, tbt: 100 });
});

test("rejects incomplete, malformed, and duplicate Lighthouse results", () => {
  assert.throws(() => summarizeReports([]), /Expected 12 Lighthouse reports/);
  const missing = makeReports();
  delete missing[0].lhr.audits["largest-contentful-paint"];
  assert.throws(() => summarizeReports(missing), /Missing or invalid LCP/);
  const duplicate = makeReports();
  duplicate[1] = { ...duplicate[0], run: 1 };
  assert.throws(() => summarizeReports(duplicate), /Duplicate run/);
});
