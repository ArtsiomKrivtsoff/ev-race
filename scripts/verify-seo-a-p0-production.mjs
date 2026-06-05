#!/usr/bin/env node
/**
 * SEO-A P0 production verification (Schema + AC + Power).
 * Usage: node scripts/verify-seo-a-p0-production.mjs [url1] [url2] ...
 */

const DEFAULT_URLS = [
  "https://evrace.by/zaryadka/minsk-mstislavca-6",
  "https://evrace.by/zaryadka/minsk-inzhenernaya-18",
  "https://evrace.by/orange/minsk-per-rabochiy-6",
];

const FORBIDDEN = String.fromCharCode(
  0x041c, 0x0415, 0x0414, 0x041b, 0x0415, 0x041d, 0x041d,
);
const FORBIDDEN_RE = new RegExp(FORBIDDEN, "i");

const urls = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_URLS;

function parseMaxKwFromDescription(description) {
  const m = description.match(/до\s+(\d+)\s*кВт/i);
  return m ? Number(m[1]) : null;
}

function parseUiMaxKw(html) {
  const m = html.match(/ДО\s+([\d\s]+)\s*КВТ/i);
  if (!m) return null;
  return Number(m[1].replace(/\s/g, ""));
}

async function verifyUrl(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "EVRACE-SEO-A-P0/1.0" },
  });
  const report = { url, checks: {} };

  if (!res.ok) {
    report.checks.fetch = { pass: false, status: res.status };
    report.overall = "FAIL";
    return report;
  }

  const html = await res.text();
  report.checks.fetch = { pass: true, status: res.status };

  const ldMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
  );
  let graph = null;
  if (ldMatch) {
    try {
      graph = JSON.parse(ldMatch[1]);
    } catch (e) {
      report.checks.json_ld_parse = { pass: false, error: String(e) };
    }
  }

  if (graph) {
    const nodes = graph["@graph"] || [graph];
    const webPage = nodes.find((n) => n["@type"] === "WebPage");
    const evcs = nodes.find(
      (n) => n["@type"] === "ElectricVehicleChargingStation",
    );

    report.checks.schema_no_webpage_main_entity = {
      pass: !webPage?.mainEntity,
      has_mainEntity: Boolean(webPage?.mainEntity),
    };

    report.checks.schema_main_entity_of_page = {
      pass:
        evcs?.mainEntityOfPage?.["@id"] === url ||
        evcs?.mainEntityOfPage?.["@id"] === webPage?.["@id"],
      mainEntityOfPage: evcs?.mainEntityOfPage,
    };

    const maxPowerKw = evcs?.additionalProperty?.find(
      (p) => p.name === "max_power_kw",
    )?.value;
    const totalInstalledKw = evcs?.additionalProperty?.find(
      (p) => p.name === "total_installed_kw",
    )?.value;

    report.checks.json_ld_power = {
      pass: maxPowerKw != null,
      max_power_kw: maxPowerKw,
      total_installed_kw: totalInstalledKw,
    };
  }

  const forbiddenHits = FORBIDDEN_RE.test(html);
  report.checks.ac_terminology = {
    pass: !forbiddenHits,
    forbidden_in_html: forbiddenHits,
  };

  const descMatch = html.match(
    /<meta name="description" content="([^"]*)"/i,
  );
  const description = descMatch?.[1] || "";
  const seoMaxKw = parseMaxKwFromDescription(description);
  const uiMaxKw = parseUiMaxKw(html);

  report.checks.power_alignment = {
    pass:
      seoMaxKw != null &&
      uiMaxKw != null &&
      seoMaxKw === uiMaxKw &&
      report.checks.json_ld_power?.max_power_kw === seoMaxKw,
    seo_max_kw: seoMaxKw,
    ui_max_kw: uiMaxKw,
    json_ld_max_kw: report.checks.json_ld_power?.max_power_kw,
  };

  report.checks.ac_legend = {
    pass: html.includes("AC — ЗАРЯДКА ПЕРЕМЕННЫМ ТОКОМ"),
  };

  const allPass = Object.values(report.checks).every((c) => c.pass !== false);
  report.overall = allPass ? "PASS" : "FAIL";
  return report;
}

const reports = [];
for (const url of urls) {
  reports.push(await verifyUrl(url));
}

const summary = {
  checked: urls.length,
  pass: reports.filter((r) => r.overall === "PASS").length,
  fail: reports.filter((r) => r.overall === "FAIL").length,
  overall: reports.every((r) => r.overall === "PASS") ? "PASS" : "FAIL",
  reports,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.overall === "PASS" ? 0 : 1);
