/**
 * Local Phase A schema sanity check.
 * Usage: node scripts/verify-location-seo-local.mjs
 */
import {
  buildLocationSeo,
  buildLocationJsonLdGraph,
  buildOperatorOrganizationId,
} from "../functions/_lib/location-seo.js";

const loc = {
  city: "Минск",
  address: "Инженерная, 18",
  operator_slug: "zaryadka",
  lat: 53.842938,
  lng: 27.689904,
};

const stations = [
  {
    station_type: "DC",
    dc_power: 160,
    count: 4,
    simultaneous_charge: 2,
    guns: ["CCS", "GBT"],
  },
  {
    station_type: "AC",
    ac_power: 44,
    count: 3,
    simultaneous_charge: 2,
    guns: ["Type 2"],
  },
];

const canonical = "https://evrace.by/zaryadka/minsk-inzhenernaya-18";
const seo = buildLocationSeo(loc, stations, "Zaryadka");
const graph = buildLocationJsonLdGraph(seo, loc, canonical);
const nodes = graph["@graph"];

const webPage = nodes.find((n) => n["@type"] === "WebPage");
const localBusiness = nodes.find((n) => n["@type"] === "LocalBusiness");
const organization = nodes.find((n) => n["@type"] === "Organization");
const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList");
const evcs = nodes.find(
  (n) => n["@type"] === "ElectricVehicleChargingStation",
);

console.assert(!evcs, "EVCS must be absent");
console.assert(!webPage?.mainEntity, "WebPage must not have mainEntity");
console.assert(
  localBusiness?.mainEntityOfPage?.["@id"] === canonical,
  "LocalBusiness must have mainEntityOfPage",
);
console.assert(
  organization?.["@id"] === buildOperatorOrganizationId("zaryadka"),
  "Organization @id must be /operator/{slug}",
);
console.assert(
  localBusiness?.parentOrganization?.["@id"] === organization?.["@id"],
  "LocalBusiness.parentOrganization must link Organization",
);
console.assert(
  localBusiness?.additionalProperty?.some((p) => p.name === "total_installed_kw"),
  "LocalBusiness must have total_installed_kw",
);

console.log("graph types:", nodes.map((n) => n["@type"]));
console.log("Organization:", {
  id: organization?.["@id"],
  name: organization?.name,
});
console.log("LocalBusiness:", {
  id: localBusiness?.["@id"],
  parentOrganization: localBusiness?.parentOrganization,
  additionalProperty: localBusiness?.additionalProperty?.map(
    (p) => `${p.name}=${p.value}`,
  ),
});
console.log(
  "Breadcrumb items:",
  crumbs.itemListElement.map((i) => ({
    position: i.position,
    name: i.name,
    hasItem: Boolean(i.item),
  })),
);
console.log("PASS: Phase A local schema");
