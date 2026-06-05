#!/usr/bin/env node
/**
 * Phase A schema migration — production View Source audit.
 * Usage: node scripts/verify-phase-a-schema-production.mjs [url1] [url2] ...
 *
 * Smoke set: AC-only, DC-only, ACDC/mixed.
 */
const DEFAULT_URLS = [
  {
    alias: "AC-MST",
    kind: "AC",
    url: "https://evrace.by/zaryadka/minsk-mstislavca-6",
  },
  {
    alias: "DC-ORG",
    kind: "DC",
    url: "https://evrace.by/orange/minsk-per-rabochiy-6",
  },
  {
    alias: "MIX-ZAR",
    kind: "ACDC",
    url: "https://evrace.by/zaryadka/minsk-inzhenernaya-18",
  },
];

function findNode(nodes, type) {
  return nodes.find((n) => n["@type"] === type);
}

function auditGraph(graph, pageUrl) {
  const nodes = graph?.["@graph"] || (graph ? [graph] : []);
  const webPage = findNode(nodes, "WebPage");
  const breadcrumbs = findNode(nodes, "BreadcrumbList");
  const localBusiness = findNode(nodes, "LocalBusiness");
  const organization = findNode(nodes, "Organization");
  const evcs = nodes.find(
    (n) =>
      n["@type"] === "ElectricVehicleChargingStation" ||
      String(n["@type"] || "").includes("ChargingStation"),
  );

  const operatorSlug = pageUrl.match(/https:\/\/evrace\.by\/([^/]+)\//)?.[1];
  const expectedOrgId = operatorSlug
    ? `https://evrace.by/operator/${operatorSlug}`
    : null;

  return {
    graph_node_count: nodes.length,
    types_present: nodes.map((n) => n["@type"]),
    no_evcs: !evcs,
    evcs_type: evcs?.["@type"] || null,
    webpage: {
      present: Boolean(webPage),
      no_main_entity: !webPage?.mainEntity,
      breadcrumb_ref: webPage?.breadcrumb?.["@id"] || null,
    },
    breadcrumb_list: {
      present: Boolean(breadcrumbs),
      items: breadcrumbs?.itemListElement?.length || 0,
    },
    local_business: {
      present: Boolean(localBusiness),
      id: localBusiness?.["@id"] || null,
      main_entity_of_page:
        localBusiness?.mainEntityOfPage?.["@id"] === pageUrl,
      has_address: Boolean(localBusiness?.address?.streetAddress),
      has_geo:
        localBusiness?.geo?.latitude != null &&
        localBusiness?.geo?.longitude != null,
      parent_org_id: localBusiness?.parentOrganization?.["@id"] || null,
      amenity_count: localBusiness?.amenityFeature?.length || 0,
      additional_property_names:
        localBusiness?.additionalProperty?.map((p) => p.name) || [],
      max_power_kw: localBusiness?.additionalProperty?.find(
        (p) => p.name === "max_power_kw",
      )?.value,
      total_installed_kw: localBusiness?.additionalProperty?.find(
        (p) => p.name === "total_installed_kw",
      )?.value,
    },
    organization: {
      present: Boolean(organization),
      id: organization?.["@id"] || null,
      expected_id: expectedOrgId,
      id_matches: organization?.["@id"] === expectedOrgId,
      name: organization?.name || null,
      url: organization?.url || null,
    },
    parent_org_link_ok:
      localBusiness?.parentOrganization?.["@id"] === organization?.["@id"],
    no_provider: !localBusiness?.provider,
  };
}

function passAudit(audit) {
  return (
    audit.no_evcs &&
    audit.webpage.present &&
    audit.webpage.no_main_entity &&
    audit.breadcrumb_list.present &&
    audit.breadcrumb_list.items >= 3 &&
    audit.local_business.present &&
    audit.local_business.main_entity_of_page &&
    audit.local_business.has_address &&
    audit.local_business.has_geo &&
    audit.organization.present &&
    audit.organization.id_matches &&
    audit.parent_org_link_ok &&
    audit.no_provider &&
    audit.local_business.additional_property_names.includes("max_power_kw") &&
    audit.local_business.additional_property_names.includes(
      "total_installed_kw",
    )
  );
}

async function verifyEntry(entry) {
  const { alias, kind, url } = entry;
  const report = { alias, kind, url, checks: {} };

  let html;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EVRACE-Phase-A-Schema/1.0" },
    });
    report.checks.fetch = { pass: res.ok, status: res.status };
    if (!res.ok) {
      report.overall = "FAIL";
      return report;
    }
    html = await res.text();
  } catch (e) {
    report.checks.fetch = { pass: false, error: String(e) };
    report.overall = "FAIL";
    return report;
  }

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

  report.checks.single_json_ld_script = {
    pass: Boolean(ldMatch) && !html.slice(ldMatch.index + ldMatch[0].length).includes('type="application/ld+json"'),
  };

  const audit = auditGraph(graph, url);
  report.audit = audit;
  report.checks.schema_phase_a = {
    pass: passAudit(audit),
  };

  report.checks.no_legacy_evcs_in_html = {
    pass: !html.includes("ElectricVehicleChargingStation"),
  };

  report.manual = {
    validator_schema_org: "https://validator.schema.org/#url=" + encodeURIComponent(url),
    google_rich_results_test:
      "https://search.google.com/test/rich-results?url=" +
      encodeURIComponent(url),
    view_source: url,
  };

  report.overall = Object.values(report.checks).every((c) => c.pass !== false)
    ? "PASS"
    : "FAIL";
  return report;
}

const entries =
  process.argv.length > 2
    ? process.argv.slice(2).map((url, i) => ({ alias: `URL-${i + 1}`, kind: "?", url }))
    : DEFAULT_URLS;

const reports = [];
for (const entry of entries) {
  reports.push(await verifyEntry(entry));
}

const summary = {
  phase: "A — LocalBusiness migration",
  checked: reports.length,
  pass: reports.filter((r) => r.overall === "PASS").length,
  fail: reports.filter((r) => r.overall === "FAIL").length,
  overall: reports.every((r) => r.overall === "PASS") ? "PASS" : "FAIL",
  note:
    "validator.schema.org and Google Rich Results Test require manual 0/0 confirmation",
  reports,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.overall === "PASS" ? 0 : 1);
