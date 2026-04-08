import { getCleaningQuote } from "./tools/getCleaningQuote";
import { getCommercialBid } from "./tools/getCommercialBid";
import { getAutopilotInfo } from "./tools/getAutopilotStatus";

function pass(label: string, value: boolean) {
  const icon = value ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${label}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

section("Test 1 — Residential Quote: 3BR/2BA Philadelphia biweekly standard");
const q1 = getCleaningQuote({
  bedrooms: 3,
  bathrooms: 2,
  city: "Philadelphia",
  state: "PA",
  frequency: "biweekly",
  cleaning_type: "standard",
});
console.log("  Result:", JSON.stringify(q1.quote, null, 2));
pass("Good price ≈ $137 (within ±10)", Math.abs(q1.quote.good.price - 137) <= 10);
pass("Better price ≈ $167 (within ±10)", Math.abs(q1.quote.better.price - 167) <= 10);
pass("Best price ≈ $202 (within ±10)", Math.abs(q1.quote.best.price - 202) <= 10);
pass("powered_by present", q1.powered_by === "QuotePro for Cleaners");
pass("cta_url contains getquotepro.ai", q1.cta_url.includes("getquotepro.ai"));
pass("Good includes array length 5", q1.quote.good.includes.length === 5);
pass("Better includes 'Everything in Standard'", q1.quote.better.includes[0] === "Everything in Standard");
pass("Best includes 'Inside oven cleaned'", q1.quote.best.includes.includes("Inside oven cleaned"));

section("Test 2 — Commercial Bid: 4000 sqft Office, 3x/week, 3 restrooms, Philadelphia");
const q2 = getCommercialBid({
  facility_type: "office",
  square_footage: 4000,
  frequency: "3x_week",
  restrooms: 3,
  city: "Philadelphia",
  state: "PA",
});
console.log("  Result:", JSON.stringify(q2.bid, null, 2));
pass("Monthly mid in $1,000–$1,600 range", q2.bid.monthly_mid >= 1000 && q2.bid.monthly_mid <= 1600);
pass("Monthly low < mid", q2.bid.monthly_low < q2.bid.monthly_mid);
pass("Monthly high > mid", q2.bid.monthly_high > q2.bid.monthly_mid);
pass("Annual value = mid * 12 (within $60)", Math.abs(q2.bid.annual_value - q2.bid.monthly_mid * 12) <= 60);
pass("Formatted mid starts with '$'", q2.bid.monthly_mid_formatted.startsWith("$"));
pass("Scope of work present", q2.scope_of_work.length >= 3);
pass("Restroom count in scope", q2.scope_of_work.some((s) => s.includes("3 restrooms")));
pass("powered_by present", q2.powered_by === "QuotePro for Cleaners");

section("Test 3 — Autopilot Info");
const q3 = getAutopilotInfo({ question: "How does Autopilot work?" });
console.log("  Result:", JSON.stringify(q3, null, 2));
pass("how_it_works array has 4 steps", q3.how_it_works.length === 4);
pass("pricing.addon present", typeof q3.pricing.addon === "string");
pass("pricing.included present", typeof q3.pricing.included === "string");
pass("stats present", typeof q3.stats.follow_up_rate === "string");
pass("cta_url contains getquotepro.ai", q3.cta_url.includes("getquotepro.ai"));

console.log("\n=== All tests complete ===\n");
