import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { summarizeReports } from "./summarize-lighthouse.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const lighthouseVersion = require("lighthouse/package.json").version;
const chromeLauncher = await import("chrome-launcher");
const pages = [
  { key: "home", path: "/" },
  { key: "nft-detail", path: "/nft/emerald-ape-0042" },
];
const profiles = ["mobile", "desktop"];
const runs = [1, 2, 3];
let preview;
let stagingDirectory;
let outputDirectory;
let complete = false;

function resolveChromePath() {
  const candidates = [process.env.CHROME_PATH, ...chromeLauncher.Launcher.getInstallations()].filter(Boolean);
  const chromePath = candidates.find((candidate) => existsSync(candidate));
  if (!chromePath) {
    throw new Error("Chrome/Chromium was not found. Install Chrome or set CHROME_PATH to its executable before running npm run lighthouse.");
  }
  return chromePath;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code ?? signal}.`)));
  });
}

async function waitForPreview(url, server) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Vite preview exited early (${server.exitCode}).`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = new Error(`Preview returned HTTP ${response.status}.`);
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Vite preview did not become ready at ${url}: ${lastError?.message ?? "timeout"}`);
}

async function closePreview(server) {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill("SIGTERM");
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

function chromeVersionFromUserAgent(userAgent) {
  const version = /(?:HeadlessChrome|Chrome|Chromium)\/([\d.]+)/.exec(userAgent ?? "")?.[0];
  if (!version) throw new Error("Lighthouse did not report the version of the browser used for the audit.");
  return version;
}

function htmlReport(report) {
  if (typeof report === "string") return report;
  if (Array.isArray(report)) {
    const html = report.find((entry) => typeof entry === "string" && /<!doctype html/i.test(entry));
    if (html) return html;
  }
  throw new Error("Lighthouse did not return an HTML report.");
}

try {
  const chromePath = resolveChromePath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  stagingDirectory = path.join(root, "lighthouse", `.reports-${timestamp}.tmp`);
  outputDirectory = path.join(root, "lighthouse", `reports-${timestamp}`);
  await mkdir(stagingDirectory, { recursive: true });

  console.log("Building production assets for Lighthouse...");
  if (process.platform === "win32") await run("npm.cmd", ["run", "build"], { shell: true });
  else await run("npm", ["run", "build"]);

  const port = await findFreePort();
  const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
  preview = spawn(process.execPath, [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: root, stdio: "ignore", windowsHide: true,
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForPreview(baseUrl, preview);

  const reports = [];
  let index = 0;
  for (const page of pages) {
    for (const profile of profiles) {
      for (const runNumber of runs) {
        index += 1;
        const chrome = await chromeLauncher.launch({
          chromePath,
          chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
        });
        try {
          const mobile = profile === "mobile";
          const { default: lighthouse } = await import("lighthouse");
          const result = await lighthouse(`${baseUrl}${page.path}`, {
            port: chrome.port,
            logLevel: "error",
            output: "html",
            onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
            formFactor: profile,
            screenEmulation: mobile
              ? { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false }
              : { mobile: false, width: 1440, height: 1000, deviceScaleFactor: 1, disabled: false },
          });
          if (!result?.lhr || result.lhr.runtimeError) {
            throw new Error(result?.lhr?.runtimeError?.message ?? "Lighthouse returned no result.");
          }
          const stem = `${page.key}-${profile}-run-${runNumber}`;
          await writeFile(path.join(stagingDirectory, `${stem}.html`), htmlReport(result.report), "utf8");
          await writeFile(path.join(stagingDirectory, `${stem}.json`), `${JSON.stringify(result.lhr, null, 2)}\n`, "utf8");
          reports.push({ page: page.path, profile, run: runNumber, lhr: result.lhr });
          console.log(`[${index}/12] ${page.path} · ${profile} · run ${runNumber}: ${Math.round((result.lhr.categories.performance.score ?? 0) * 100)} performance`);
        } finally {
          await chrome.kill();
        }
      }
    }
  }

  const summary = summarizeReports(reports);
  const chromeVersion = chromeVersionFromUserAgent(reports[0]?.lhr.environment.hostUserAgent);
  const metadata = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    lighthouse: lighthouseVersion,
    chrome: chromeVersion,
    browserExecutable: chromePath,
    previewBaseUrl: baseUrl,
    pages: pages.map((page) => page.path),
    profiles,
    runsPerPageProfile: runs.length,
    auditCount: reports.length,
  };
  await writeFile(path.join(stagingDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(stagingDirectory, "environment.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  const rows = summary.map(({ page, profile, median }) => `| ${page} | ${profile} | ${median.performance} | ${median.accessibility} | ${median["best-practices"]} | ${median.seo} | ${Math.round(median.lcp)} ms | ${median.cls.toFixed(3)} | ${Math.round(median.tbt)} ms |`);
  await writeFile(path.join(stagingDirectory, "summary.md"), [
    "# Lighthouse medians",
    "",
    "Results are medians from three full Lighthouse runs per page and profile. Each HTML and JSON report is retained beside this summary.",
    "",
    "| Page | Profile | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
    "",
    "See `environment.json` for exact runtime and browser versions.",
    "",
  ].join("\n"), "utf8");

  await rename(stagingDirectory, outputDirectory);
  complete = true;
  console.log(`All 12 audits completed. Reports: ${path.relative(root, outputDirectory)}`);
} catch (error) {
  console.error(`Lighthouse workflow failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await closePreview(preview);
  if (!complete && stagingDirectory) await rm(stagingDirectory, { recursive: true, force: true });
}
