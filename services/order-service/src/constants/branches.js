// Duplicated from the Reservation Service's branch list rather than fetched
// over the network on every order. Branches change extremely rarely, so a
// synchronous cross-service call here to validate one string field isn't
// worth the added coupling/latency -- a small, deliberately accepted
// tradeoff. See the Notion doc's "why database-per-service" FAQ entry for
// the same reasoning applied more broadly.
export const KNOWN_BRANCHES = [
  "HSR Layout",
  "Bannerghatta",
  "Koramangala",
  "White Field",
  "Majestic",
  "ITPL",
];
