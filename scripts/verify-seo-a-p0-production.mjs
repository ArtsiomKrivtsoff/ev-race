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

function parseUiInfraTotalKw(html) {
  const grid = html.match(/loc-infra-grid[\s\S]*?<\/div>\s*<\/div>/i)?.[0];
  if (!grid) return null;
  const m = grid.match(
    /loc-infra-val--edge">([\d\s]+)\s*КВТ/i,
  );
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
    const localBusiness = nodes.find((n) => n["@type"] === "LocalBusiness");
    const organization = nodes.find((n) => n["@type"] === "Organization");
    const evcs = nodes.find(
      (n) => n["@type"] === "ElectricVehicleChargingStation",
    );

    report.checks.no_evcs = {
      pass: !evcs,
      legacy_type: evcs?.["@type"] || null,
    };

    report.checks.schema_no_webpage_main_entity = {
      pass: !webPage?.mainEntity,
      has_mainEntity: Boolean(webPage?.mainEntity),
    };

    report.checks.schema_main_entity_of_page = {
      pass: localBusiness?.mainEntityOfPage?.["@id"] === url,
      mainEntityOfPage: localBusiness?.mainEntityOfPage,
    };

    report.checks.schema_graph_types = {
      pass:
        Boolean(webPage) &&
        Boolean(localBusiness) &&
        Boolean(organization) &&
        nodes.some((n) => n["@type"] === "BreadcrumbList"),
      types: nodes.map((n) => n["@type"]),
    };

    const operatorSlug = url.match(/https:\/\/evrace\.by\/([^/]+)\//)?.[1];
    const expectedOrgId = operatorSlug
      ? `https://evrace.by/operator/${operatorSlug}`
      : null;
    report.checks.organization_id = {
      pass:
        organization?.["@id"] === expectedOrgId &&
        localBusiness?.parentOrganization?.["@id"] === expectedOrgId,
      expected: expectedOrgId,
      actual: organization?.["@id"],
    };

    const maxPowerKw = localBusiness?.additionalProperty?.find(
      (p) => p.name === "max_power_kw",
    )?.value;
    const totalInstalledKw = localBusiness?.additionalProperty?.find(
      (p) => p.name === "total_installed_kw",
    )?.value;

    report.checks.json_ld_power = {
      pass: maxPowerKw != null && totalInstalledKw != null,
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
  const uiTotalKw = parseUiInfraTotalKw(html);

  report.checks.power_semantics = {
    pass:
      seoMaxKw != null &&
      uiTotalKw != null &&
      report.checks.json_ld_power?.max_power_kw === seoMaxKw &&
      report.checks.json_ld_power?.total_installed_kw === uiTotalKw &&
      !html.includes("КВТ СУММАРНО") &&
      !/loc-infra[^>]*>[\s\S]*?ДО\s+[\d\s]+\s*КВТ/i.test(html),
    seo_max_kw: seoMaxKw,
    ui_total_kw: uiTotalKw,
    json_ld_max_kw: report.checks.json_ld_power?.max_power_kw,
    json_ld_total_kw: report.checks.json_ld_power?.total_installed_kw,
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
