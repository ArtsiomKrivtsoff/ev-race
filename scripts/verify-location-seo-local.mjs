/**
 * Local SEO-A sanity check (expected output after deploy).
 * Usage: node scripts/verify-location-seo-local.mjs
 */
import {
  buildLocationSeo,
  buildLocationJsonLdGraph,
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

const evcs = nodes.find((n) => n["@type"] === "ElectricVehicleChargingStation");
const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList");

console.log("metaDescription:", seo.metaDescription);
console.log("ogImage:", seo.ogImage);
console.log("EVCS fields:", {
  name: evcs.name,
  address: evcs.address,
  geo: evcs.geo,
  url: evcs.url,
  operator: evcs.operator?.name,
  additionalProperty: evcs.additionalProperty?.map((p) => `${p.name}=${p.value}`),
});
console.log(
  "Breadcrumb items:",
  crumbs.itemListElement.map((i) => ({
    position: i.position,
    name: i.name,
    hasItem: Boolean(i.item),
  })),
);
