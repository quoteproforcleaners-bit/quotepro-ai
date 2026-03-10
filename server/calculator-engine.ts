import { renderSEOPage, type FAQItem, type SEOPageSection } from "./seo-pages";

export interface CalcField {
  id: string;
  label: string;
  type: "number" | "select";
  defaultValue: string | number;
  min?: number;
  max?: number;
  step?: number;
  fullWidth?: boolean;
  options?: { value: string; label: string; selected?: boolean }[];
}

export interface CalcDefinition {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  introParagraph: string;
  calcTitle: string;
  calcNote: string;
  fields: CalcField[];
  formula: string;
  serviceTypeExpr: string;
  frequencyExpr?: string;
  addOnsExpr?: string;
  scopeItems: string[];
  sections: SEOPageSection[];
  faq: FAQItem[];
  toolkitCTA?: string;
}

function renderField(f: CalcField): string {
  const cls = f.fullWidth ? 'calc-field full' : 'calc-field';
  if (f.type === "select" && f.options) {
    const opts = f.options.map(o =>
      `<option value="${o.value}"${o.selected ? ' selected' : ''}>${o.label}</option>`
    ).join("");
    return `<div class="${cls}"><label for="${f.id}">${f.label}</label><select id="${f.id}">${opts}</select></div>`;
  }
  const attrs = [
    `type="number"`,
    `id="${f.id}"`,
    `value="${f.defaultValue}"`,
    f.min !== undefined ? `min="${f.min}"` : '',
    f.max !== undefined ? `max="${f.max}"` : '',
    f.step !== undefined ? `step="${f.step}"` : '',
  ].filter(Boolean).join(" ");
  return `<div class="${cls}"><label for="${f.id}">${f.label}</label><input ${attrs}></div>`;
}

function buildCalculatorHTML(def: CalcDefinition): string {
  const fieldsHTML = def.fields.map(renderField).join("\n            ");

  const readVars = def.fields.map(f => {
    if (f.type === "number") {
      return `var ${f.id}=parseInt(document.getElementById('${f.id}').value)||${f.defaultValue};`;
    }
    return `var ${f.id}=document.getElementById('${f.id}').value;`;
  }).join("\n        ");

  return `
      <h2>${def.calcTitle}</h2>
      <form id="calcForm" onsubmit="return calcPrice(event)">
        <div class="calc-grid">
            ${fieldsHTML}
        </div>
        <button type="submit" class="calc-btn">Calculate Price</button>
      </form>
      <div class="calc-results" id="calcResults">
        <div class="tier-cards">
          <div class="tier-card">
            <div class="tier-name">Good</div>
            <div class="tier-price" id="priceGood">$0</div>
          </div>
          <div class="tier-card popular">
            <div class="tier-name">Better</div>
            <div class="tier-price" id="priceBetter">$0</div>
          </div>
          <div class="tier-card">
            <div class="tier-name">Best</div>
            <div class="tier-price" id="priceBest">$0</div>
          </div>
        </div>
        <p class="calc-note">${def.calcNote}</p>
      </div>
      <script>
      function calcPrice(e){
        e.preventDefault();
        ${readVars}
        ${def.formula}
        document.getElementById('priceGood').innerHTML='$'+good;
        document.getElementById('priceBetter').innerHTML='$'+better;
        document.getElementById('priceBest').innerHTML='$'+best;
        document.getElementById('calcResults').style.display='block';
        document.getElementById('calcResults').style.animation='fadeUp 0.4s ease-out';
        updateQuotePreview({service_type:${def.serviceTypeExpr},square_footage:typeof sqft!=='undefined'?sqft:(typeof squareFootage!=='undefined'?squareFootage:1500),bedrooms:typeof beds!=='undefined'?beds:3,bathrooms:typeof baths!=='undefined'?baths:2,estimated_price:better,frequency:${def.frequencyExpr || "'one-time'"},add_ons:${def.addOnsExpr || '{}'}});
        return false;
      }
      </script>
    `;
}

export function renderCalculatorPage(def: CalcDefinition): string {
  return renderSEOPage({
    slug: "calculators/" + def.slug,
    title: def.title,
    metaDescription: def.metaDescription,
    h1: def.h1,
    introParagraph: def.introParagraph,
    sections: def.sections,
    calculatorHTML: buildCalculatorHTML(def),
    faq: def.faq,
    toolkitCTA: def.toolkitCTA || "Explore More Free Cleaning Business Tools",
    scopeItems: def.scopeItems,
    serviceLabel: def.calcTitle,
  });
}

const calculators: CalcDefinition[] = [
  {
    slug: "house-cleaning-price-calculator",
    title: "House Cleaning Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate house cleaning prices instantly. Free calculator for bedrooms, bathrooms, square footage, service type, and frequency. Get accurate cleaning estimates in seconds.",
    h1: "House Cleaning Price Calculator",
    introParagraph: "Get an instant, data-driven estimate for your next house cleaning job. Adjust property size, service type, and frequency to see real-world pricing for Good, Better, and Best service tiers.",
    calcTitle: "Calculate Your Cleaning Price",
    calcNote: "Estimates based on industry averages. Actual pricing may vary by market and condition.",
    fields: [
      { id: "beds", label: "Bedrooms", type: "number", defaultValue: 3, min: 1, max: 10 },
      { id: "baths", label: "Bathrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 1500, min: 200, max: 20000, step: 100 },
      { id: "serviceType", label: "Service Type", type: "select", defaultValue: "regular", options: [
        { value: "regular", label: "Regular Cleaning" },
        { value: "deep_clean", label: "Deep Clean" },
        { value: "move_in_out", label: "Move In / Move Out" },
      ]},
      { id: "frequency", label: "Frequency", type: "select", defaultValue: "biweekly", fullWidth: true, options: [
        { value: "one-time", label: "One-Time" },
        { value: "weekly", label: "Weekly" },
        { value: "biweekly", label: "Bi-Weekly", selected: true },
        { value: "monthly", label: "Monthly" },
      ]},
    ],
    formula: `var baseRate=40;var sqftFactor=0.01;var minTicket=100;
        var baseHours=sqft*sqftFactor+beds*0.25+baths*0.5;
        var mult=1;
        if(serviceType==='deep_clean')mult=1.5;
        if(serviceType==='move_in_out')mult=2;
        var total=Math.max(baseRate*baseHours*mult,minTicket);
        var freqDisc=1;
        if(frequency==='weekly')freqDisc=0.8;
        if(frequency==='biweekly')freqDisc=0.85;
        if(frequency==='monthly')freqDisc=0.9;
        total=total*freqDisc;
        var good=Math.round(total*0.8);
        var better=Math.round(total);
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "serviceType",
    frequencyExpr: "frequency",
    scopeItems: ["Dust all surfaces and furniture", "Vacuum and mop all floors", "Clean and sanitize bathrooms", "Clean kitchen counters and appliances", "Empty trash and replace liners", "Wipe mirrors and glass surfaces"],
    sections: [
      {
        id: "how-to-price", heading: "How to Price a House Cleaning Job", level: "h2",
        content: `<p>Pricing a house cleaning job accurately is the difference between winning the job and leaving money on the table. The most reliable approach combines square footage, room count, and service complexity into a single formula.</p>
          <p>Here is a proven method used by thousands of cleaning professionals:</p>
          <ol>
            <li><strong>Start with square footage.</strong> This is your baseline. A 1,500 sq ft home takes roughly 2&ndash;3 hours for a standard clean.</li>
            <li><strong>Add room complexity.</strong> Bedrooms add roughly 15 minutes each. Bathrooms add 25&ndash;30 minutes due to fixtures, tile, and detail work.</li>
            <li><strong>Apply a service multiplier.</strong> Deep cleans take 1.5x longer than standard cleans. Move-in/move-out jobs can take 2x or more.</li>
            <li><strong>Factor in frequency.</strong> Weekly clients get the biggest discount (15&ndash;20%) because recurring homes stay cleaner between visits.</li>
            <li><strong>Set a floor price.</strong> Never go below your minimum profitable ticket, typically $100&ndash;150 depending on your market.</li>
          </ol>`,
      },
      {
        id: "pricing-mistakes", heading: "Common Pricing Mistakes", level: "h2",
        content: `<p>Most cleaning businesses undercharge early on. Here are the mistakes to avoid:</p>
          <ul>
            <li><strong>Charging by the hour.</strong> Clients want predictable pricing. Flat-rate quotes based on property specs win more jobs.</li>
            <li><strong>Not accounting for drive time.</strong> Your price should cover travel, setup, and breakdown time &mdash; not just cleaning.</li>
            <li><strong>Skipping the walkthrough.</strong> Every home is different. Pets, clutter level, and flooring types significantly impact time.</li>
            <li><strong>Offering only one price.</strong> Give three tiers (Good / Better / Best). Most clients pick the middle option, which increases your average ticket.</li>
            <li><strong>Forgetting supply costs.</strong> Factor in cleaning products, equipment wear, and replacement costs per job.</li>
          </ul>`,
      },
      {
        id: "average-rates", heading: "Average House Cleaning Rates in 2025", level: "h2",
        content: `<p>Cleaning rates vary by region, but here are typical ranges across the U.S.:</p>
          <ul>
            <li><strong>Standard Cleaning:</strong> $120 &ndash; $250 for a 3-bed, 2-bath home</li>
            <li><strong>Deep Cleaning:</strong> $200 &ndash; $400 for the same property</li>
            <li><strong>Move-In/Move-Out:</strong> $250 &ndash; $500+ depending on condition</li>
            <li><strong>Recurring (bi-weekly):</strong> $100 &ndash; $200 per visit with a 10&ndash;15% frequency discount</li>
          </ul>
          <p>Urban markets like New York, San Francisco, and Los Angeles tend to run 20&ndash;40% higher than national averages. Rural areas may be 10&ndash;20% lower.</p>`,
      },
      {
        id: "tips", heading: "Practical Tips for Pricing Your Cleaning Jobs", level: "h2",
        content: `<p>Use these actionable tips to price with confidence:</p>
          <ul>
            <li><strong>Always quote in person or via photos.</strong> Blind quotes lead to undercharging and unhappy surprises.</li>
            <li><strong>Use Good / Better / Best pricing.</strong> Anchor your preferred option as the middle tier and mark it "Most Popular."</li>
            <li><strong>Raise prices for new clients first.</strong> Test higher rates with leads before adjusting existing clients.</li>
            <li><strong>Track your actual time per job.</strong> After 20&ndash;30 jobs, you will know your real hourly output. Use it to calibrate.</li>
            <li><strong>Include add-ons.</strong> Oven cleaning, fridge interior, laundry, and window interiors are easy upsells that boost your ticket by $25&ndash;$75.</li>
            <li><strong>Communicate value, not just price.</strong> List what is included in each tier. Clients pay more when they understand what they are getting.</li>
          </ul>`,
      },
    ],
    faq: [
      { question: "How much should I charge to clean a 3 bedroom house?", answer: "A standard cleaning for a 3-bedroom, 2-bathroom home typically costs between $120 and $200 depending on square footage, condition, and your market. Deep cleans run $200 to $350 for the same property. Use the calculator above for a personalized estimate." },
      { question: "Should I charge by the hour or a flat rate?", answer: "Flat-rate pricing is strongly recommended. Clients prefer predictable pricing, and flat rates protect you from undercharging on difficult jobs. Calculate your flat rate based on estimated hours, then present it as a fixed quote." },
      { question: "How do I calculate square footage pricing?", answer: "A common formula is $0.05 to $0.15 per square foot for standard cleaning, with adjustments for room count and service type. A 2,000 sq ft home at $0.10/sqft would start at $200 before frequency discounts." },
      { question: "What is Good/Better/Best pricing?", answer: "Good/Better/Best is a tiered pricing strategy where you offer three options at different price points. The 'Good' tier is a basic clean, 'Better' includes extras like appliance exteriors and baseboards, and 'Best' is a comprehensive deep clean. Most clients choose the middle option, increasing your average revenue." },
      { question: "How much of a discount should I give for recurring cleaning?", answer: "Industry standard discounts are 15-20% for weekly, 10-15% for bi-weekly, and 5-10% for monthly clients. Recurring clients are worth more long-term because they reduce your marketing costs and provide stable income." },
      { question: "How do I price a deep cleaning vs. a regular cleaning?", answer: "Deep cleans typically cost 1.5x to 2x more than a standard cleaning. They include areas like inside ovens, behind appliances, detailed baseboard cleaning, interior windows, and thorough bathroom sanitization. The first visit for a new client should almost always be a deep clean." },
      { question: "What is a good minimum price for a cleaning job?", answer: "Most successful cleaning businesses set a minimum job price of $100 to $150. This ensures every job covers your travel time, supplies, and overhead costs even for small spaces." },
    ],
  },
  {
    slug: "deep-cleaning-price-calculator",
    title: "Deep Cleaning Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate deep cleaning prices for any home. Instant estimates based on bedrooms, bathrooms, square footage, and condition. Free tool for cleaning professionals.",
    h1: "Deep Cleaning Price Calculator",
    introParagraph: "Estimate deep cleaning prices accurately with this free calculator. Deep cleans require more time, supplies, and attention to detail than standard cleanings. Get tiered pricing instantly.",
    calcTitle: "Calculate Your Deep Cleaning Price",
    calcNote: "Deep clean estimates. Includes inside appliances, baseboards, and detail work.",
    fields: [
      { id: "beds", label: "Bedrooms", type: "number", defaultValue: 3, min: 1, max: 10 },
      { id: "baths", label: "Bathrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 1500, min: 200, max: 20000, step: 100 },
      { id: "condition", label: "Home Condition", type: "select", defaultValue: "average", fullWidth: true, options: [
        { value: "maintained", label: "Well Maintained" },
        { value: "average", label: "Average", selected: true },
        { value: "neglected", label: "Neglected (3+ months)" },
      ]},
    ],
    formula: `var baseRate=40;var sqftFactor=0.01;var minTicket=100;
        var baseHours=sqft*sqftFactor+beds*0.25+baths*0.5;
        var condMult=1.5;
        if(condition==='maintained')condMult=1.4;
        if(condition==='neglected')condMult=1.85;
        var total=Math.max(baseRate*baseHours*condMult,minTicket*1.5);
        var good=Math.round(total*0.8);
        var better=Math.round(total);
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "'deep_clean'",
    scopeItems: ["All standard cleaning tasks", "Inside oven, microwave, and refrigerator", "Baseboard and wall spot cleaning", "Interior window and track detailing", "Behind and under furniture", "Detailed grout and tile scrubbing", "Light fixtures and ceiling fans", "Cabinet fronts and door frames"],
    sections: [
      { id: "what-is-deep-clean", heading: "What Is a Deep Cleaning?", level: "h2",
        content: `<p>A deep cleaning goes beyond surface-level maintenance. It targets built-up grime, neglected areas, and details that standard cleanings skip. Most cleaning professionals charge 1.5x to 2x more for a deep clean compared to a regular cleaning.</p>
          <p>Typical deep cleaning tasks include:</p>
          <ul><li>Inside oven, microwave, and refrigerator</li><li>Baseboard cleaning and wall spot treatment</li><li>Interior window cleaning and track detailing</li><li>Shower/tub deep scrub and grout cleaning</li><li>Behind and under furniture and appliances</li><li>Light fixture and ceiling fan detailing</li><li>Cabinet fronts, door frames, and switch plates</li></ul>` },
      { id: "pricing-deep-clean", heading: "How to Price a Deep Cleaning Job", level: "h2",
        content: `<p>The best approach to pricing a deep clean is to start with your standard clean price and apply a multiplier:</p>
          <ol><li><strong>Calculate your standard clean rate</strong> using square footage, room count, and your hourly base rate.</li><li><strong>Apply a 1.5x multiplier</strong> for a standard deep clean.</li><li><strong>Adjust for condition.</strong> Homes not cleaned in months may warrant a 1.75x or 2x multiplier.</li><li><strong>Add specific extras.</strong> Charge separately for inside-fridge, inside-oven, or window cleaning if they are not standard deep clean inclusions.</li></ol>
          <p>A 3-bedroom, 2-bathroom home that costs $150 for a standard clean would price at $225&ndash;$300 for a deep clean.</p>` },
      { id: "when-to-deep-clean", heading: "When to Recommend a Deep Clean", level: "h2",
        content: `<p>Smart cleaning businesses use deep cleans strategically to maximize revenue and set client expectations:</p>
          <ul><li><strong>First visit for new clients.</strong> Always start with a deep clean to bring the home up to your standard.</li><li><strong>Seasonal transitions.</strong> Offer "spring deep cleans" or "holiday prep cleans" as upsell opportunities.</li><li><strong>Move-in / move-out.</strong> These are essentially deep cleans with higher expectations for detail.</li><li><strong>Quarterly maintenance.</strong> Recurring clients benefit from a quarterly deep clean add-on.</li></ul>` },
      { id: "tips", heading: "Tips for Quoting Deep Cleans Profitably", level: "h2",
        content: `<p>Follow these tips to price deep cleans without undercharging:</p>
          <ul><li><strong>Always do a walkthrough or request photos.</strong></li><li><strong>Itemize what is included.</strong> Clients will pay more when they see the detailed list.</li><li><strong>Use the deep clean as a gateway.</strong> Convert clients to a recurring plan at the standard rate.</li><li><strong>Set time expectations.</strong> Tell clients a deep clean takes 4&ndash;6 hours for a typical 3-bed home.</li><li><strong>Price by value, not just time.</strong> A deep clean transforms a home. Charge accordingly.</li></ul>` },
    ],
    faq: [
      { question: "How much does a deep cleaning cost?", answer: "A deep cleaning for a 3-bedroom, 2-bathroom home typically costs between $200 and $400 depending on square footage and condition. Neglected homes may cost more due to extra time and supplies required." },
      { question: "How long does a deep clean take?", answer: "A thorough deep clean takes 4 to 8 hours for a typical 3-bedroom home, depending on condition. Plan for 2 to 3 times longer than a standard cleaning." },
      { question: "What is the difference between a deep clean and regular clean?", answer: "A regular clean covers surfaces, vacuuming, mopping, and bathroom sanitizing. A deep clean adds inside appliances, baseboards, detailed grout work, interior windows, behind furniture, and other neglected areas." },
      { question: "Should I deep clean before starting a recurring schedule?", answer: "Yes. Starting with a deep clean brings the home up to a maintainable standard. Without it, your regular cleans will take longer and yield worse results." },
      { question: "How do I charge for a deep clean vs. move-in/move-out?", answer: "Move-in/move-out cleans are essentially deep cleans with additional expectations for perfection. Price them at 1.75x to 2x your standard rate, compared to 1.5x for a standard deep clean." },
    ],
  },
  {
    slug: "move-in-out-cleaning-calculator",
    title: "Move In/Move Out Cleaning Price Calculator - QuotePro",
    metaDescription: "Calculate move-in and move-out cleaning costs instantly. Free pricing tool based on property size, condition, and extras. Trusted by cleaning professionals.",
    h1: "Move In / Move Out Cleaning Price Calculator",
    introParagraph: "Get instant pricing for move-in and move-out cleaning jobs. These jobs require the highest level of detail and command premium rates. Use our calculator to quote with confidence.",
    calcTitle: "Calculate Your Move-In/Move-Out Price",
    calcNote: "Move-in/move-out estimates. Premium pricing for deposit-level results.",
    fields: [
      { id: "beds", label: "Bedrooms", type: "number", defaultValue: 3, min: 1, max: 10 },
      { id: "baths", label: "Bathrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 1500, min: 200, max: 20000, step: 100 },
      { id: "extras", label: "Extras", type: "select", defaultValue: "none", fullWidth: true, options: [
        { value: "none", label: "No Extras" },
        { value: "garage", label: "+ Garage Cleaning" },
        { value: "carpets", label: "+ Carpet Treatment" },
        { value: "both", label: "+ Garage & Carpets" },
      ]},
    ],
    formula: `var baseRate=40;var sqftFactor=0.01;var minTicket=100;
        var baseHours=sqft*sqftFactor+beds*0.25+baths*0.5;
        var total=Math.max(baseRate*baseHours*2,minTicket*2);
        if(extras==='garage')total+=75;
        if(extras==='carpets')total+=100;
        if(extras==='both')total+=150;
        var good=Math.round(total*0.85);
        var better=Math.round(total);
        var best=Math.round(total*1.25);`,
    serviceTypeExpr: "'move_in_out'",
    addOnsExpr: `(function(){var a={};if(extras==='garage'){a.garage=true}if(extras==='carpets'){a.carpets=true}if(extras==='both'){a.garage=true;a.carpets=true}return a})()`,
    scopeItems: ["Complete deep cleaning of all rooms", "Inside all cabinets, drawers, and closets", "Inside all appliances", "All light fixtures and switch plates", "Window sills, tracks, and interior glass", "Wall spot cleaning and baseboard detailing", "Garage sweeping (if applicable)", "Move-in/move-out ready guarantee"],
    sections: [
      { id: "move-clean-pricing", heading: "How to Price Move-In/Move-Out Cleaning", level: "h2",
        content: `<p>Move-in/move-out cleaning is the most profitable service type for cleaning businesses. The empty home allows you to reach every surface, and clients (or landlords) expect deposit-level perfection.</p>
          <p>Pricing formula:</p>
          <ol><li><strong>Start with your standard rate</strong> based on property square footage and room count.</li><li><strong>Apply a 2x multiplier.</strong> Move cleans take roughly twice as long as standard cleans.</li><li><strong>Adjust for extras.</strong> Garage cleaning, appliance deep-cleaning, and carpet spot treatment are common add-ons.</li><li><strong>Never discount below 1.75x.</strong> The detail work required makes these jobs significantly more labor-intensive.</li></ol>` },
      { id: "what-to-include", heading: "What to Include in a Move Clean", level: "h2",
        content: `<ul><li>All standard and deep clean tasks</li><li>Inside all cabinets, drawers, and closets</li><li>Inside oven, refrigerator, dishwasher, and microwave</li><li>All light fixtures, switch plates, and outlet covers</li><li>Window sills, tracks, and interior glass</li><li>Garage sweeping (if applicable)</li><li>Wall spot cleaning and baseboard detailing</li></ul>` },
      { id: "tips", heading: "Tips for Move-In/Move-Out Jobs", level: "h2",
        content: `<ul><li><strong>Get clear expectations in writing.</strong> Property managers often have specific checklists.</li><li><strong>Charge a premium for occupied move-outs.</strong> Cleaning around furniture adds significant time.</li><li><strong>Take before/after photos.</strong> Protect yourself and build your portfolio.</li><li><strong>Offer a guarantee.</strong> A "move-in ready" guarantee builds trust and justifies premium pricing.</li><li><strong>Build relationships with realtors and property managers.</strong> They are the highest-volume source of move clean leads.</li></ul>` },
    ],
    faq: [
      { question: "How much does a move-out cleaning cost?", answer: "Move-out cleaning for a 3-bedroom, 2-bathroom home typically costs $300 to $500. This includes inside all cabinets, appliances, and detailed baseboard work." },
      { question: "Is move-in cleaning the same as move-out cleaning?", answer: "Essentially yes. Both require deposit-level attention to detail. Move-in cleans sometimes include less appliance work if the home was recently cleaned, but the scope is generally the same." },
      { question: "How long does a move-out clean take?", answer: "Expect 5 to 10 hours for a typical 3-bedroom home. Move cleans take roughly twice as long as standard cleanings." },
      { question: "Should I charge extra for garage cleaning?", answer: "Yes. Garage cleaning is not a standard inclusion and adds 30 to 60 minutes. Charge $50 to $100 extra depending on the garage size and condition." },
      { question: "How do I get more move-in/move-out clients?", answer: "Partner with local realtors, property management companies, and apartment complexes for the highest-volume, most consistent source of move cleaning jobs." },
    ],
  },
  {
    slug: "office-cleaning-bid-calculator",
    title: "Office Cleaning Bid Calculator | Free Pricing Tool - QuotePro",
    metaDescription: "Calculate commercial office cleaning bids instantly. Free pricing tool based on office size, frequency, and cleaning scope. Win more janitorial contracts.",
    h1: "Office Cleaning Bid Calculator",
    introParagraph: "Calculate competitive office cleaning bids based on square footage, number of offices, restrooms, and cleaning frequency. Get Good/Better/Best pricing tiers to win commercial contracts.",
    calcTitle: "Calculate Your Office Cleaning Bid",
    calcNote: "Commercial cleaning estimates. Pricing based on typical U.S. janitorial rates.",
    fields: [
      { id: "sqft", label: "Office Square Footage", type: "number", defaultValue: 3000, min: 500, max: 100000, step: 500 },
      { id: "offices", label: "Number of Offices/Rooms", type: "number", defaultValue: 6, min: 1, max: 50 },
      { id: "restrooms", label: "Restrooms", type: "number", defaultValue: 2, min: 1, max: 20 },
      { id: "frequency", label: "Frequency", type: "select", defaultValue: "3x", fullWidth: true, options: [
        { value: "1x", label: "1x Per Week" },
        { value: "3x", label: "3x Per Week", selected: true },
        { value: "5x", label: "5x Per Week (Nightly)" },
      ]},
    ],
    formula: `var ratePerSqft=0.08;
        var officeRate=12;var restroomRate=25;
        var baseCost=sqft*ratePerSqft+offices*officeRate+restrooms*restroomRate;
        var freqMult=1;
        if(frequency==='3x')freqMult=2.6;
        if(frequency==='5x')freqMult=4.2;
        var monthlyTotal=Math.round(baseCost*freqMult);
        var good=Math.round(monthlyTotal*0.85);
        var better=monthlyTotal;
        var best=Math.round(monthlyTotal*1.3);`,
    serviceTypeExpr: "'regular'",
    frequencyExpr: "'monthly'",
    scopeItems: ["Empty all trash receptacles and replace liners", "Vacuum all carpeted areas", "Mop and sanitize hard floors", "Clean and sanitize all restrooms", "Wipe desks, counters, and common surfaces", "Clean break room and kitchen area", "Dust window sills and ledges", "Spot clean glass and mirrors"],
    sections: [
      { id: "how-to-bid", heading: "How to Bid on Office Cleaning Jobs", level: "h2",
        content: `<p>Bidding on commercial office cleaning contracts requires a different approach than residential pricing. You are typically quoting a monthly rate for a set frequency.</p>
          <ol><li><strong>Measure or confirm square footage.</strong> This is the primary cost driver for commercial cleaning.</li><li><strong>Count restrooms.</strong> Restrooms are the most labor-intensive area in any office and should be priced separately.</li><li><strong>Determine frequency.</strong> Most offices need 3x or 5x per week cleaning. 1x per week is common for small offices.</li><li><strong>Add specialty services.</strong> Window cleaning, carpet extraction, and floor stripping are high-margin add-ons.</li></ol>` },
      { id: "pricing-factors", heading: "Key Pricing Factors for Office Cleaning", level: "h2",
        content: `<ul><li><strong>Square footage:</strong> $0.05&ndash;$0.15 per sq ft per visit depending on market</li><li><strong>Restrooms:</strong> $20&ndash;$40 per restroom per visit for full sanitization</li><li><strong>Frequency discount:</strong> Higher frequency contracts command a lower per-visit rate but higher monthly revenue</li><li><strong>After-hours premium:</strong> Most offices require evening or weekend cleaning, which may affect staffing costs</li><li><strong>Supply costs:</strong> Commercial accounts typically expect you to provide all supplies and equipment</li></ul>` },
      { id: "tips", heading: "Tips for Winning Office Cleaning Contracts", level: "h2",
        content: `<ul><li><strong>Always do a walkthrough.</strong> Square footage alone does not tell the full story.</li><li><strong>Present a professional proposal.</strong> Office managers compare multiple bids. A polished quote wins.</li><li><strong>Include a scope of work.</strong> Detail exactly what is included at each visit.</li><li><strong>Offer a trial period.</strong> A 30-day trial lowers risk for the client and gets you in the door.</li><li><strong>Build relationships with property managers.</strong> They manage multiple buildings and can send you repeat business.</li></ul>` },
    ],
    faq: [
      { question: "How much should I charge to clean an office?", answer: "Office cleaning typically costs $0.05 to $0.15 per square foot per visit. A 5,000 sq ft office cleaned 3x per week would cost $600 to $1,800 per month depending on scope and market." },
      { question: "How do I calculate a janitorial bid?", answer: "Start with square footage times your per-sqft rate, add restroom and specialty charges, multiply by visit frequency, and present as a monthly total. Always do a walkthrough to verify conditions." },
      { question: "What is included in standard office cleaning?", answer: "Standard office cleaning includes trash removal, vacuuming, mopping, restroom sanitization, surface wiping, and break room cleaning. Deep cleaning tasks like carpet extraction and floor waxing are typically priced separately." },
      { question: "Should I charge per visit or monthly for office cleaning?", answer: "Monthly pricing is industry standard for commercial cleaning contracts. It provides predictable revenue for you and predictable costs for the client. Quote a monthly rate based on per-visit costs times frequency." },
    ],
  },
  {
    slug: "carpet-cleaning-price-calculator",
    title: "Carpet Cleaning Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate carpet cleaning prices per room or square foot. Free pricing calculator for residential and commercial carpet cleaning jobs.",
    h1: "Carpet Cleaning Price Calculator",
    introParagraph: "Get instant carpet cleaning price estimates based on the number of rooms, square footage, carpet condition, and cleaning method. Use this calculator to quote carpet cleaning jobs accurately.",
    calcTitle: "Calculate Your Carpet Cleaning Price",
    calcNote: "Carpet cleaning estimates based on industry-standard pricing per room and method.",
    fields: [
      { id: "rooms", label: "Number of Rooms", type: "number", defaultValue: 4, min: 1, max: 20 },
      { id: "sqft", label: "Total Carpet Sq Ft", type: "number", defaultValue: 800, min: 100, max: 10000, step: 50 },
      { id: "method", label: "Cleaning Method", type: "select", defaultValue: "steam", options: [
        { value: "steam", label: "Hot Water Extraction (Steam)" },
        { value: "dry", label: "Dry Cleaning / Encapsulation" },
        { value: "shampooing", label: "Shampooing" },
      ]},
      { id: "carpetCondition", label: "Carpet Condition", type: "select", defaultValue: "average", fullWidth: true, options: [
        { value: "good", label: "Good (light soiling)" },
        { value: "average", label: "Average", selected: true },
        { value: "heavy", label: "Heavy Soiling / Pet Stains" },
      ]},
    ],
    formula: `var perRoom=45;
        var perSqft=0.25;
        var methodMult=1;
        if(method==='dry')methodMult=0.85;
        if(method==='shampooing')methodMult=1.1;
        var condMult=1;
        if(carpetCondition==='good')condMult=0.85;
        if(carpetCondition==='heavy')condMult=1.4;
        var total=Math.max((rooms*perRoom+sqft*perSqft)*methodMult*condMult,75);
        var good=Math.round(total*0.8);
        var better=Math.round(total);
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "'regular'",
    scopeItems: ["Pre-treatment of stains and high-traffic areas", "Full carpet cleaning with selected method", "Spot treatment for stubborn stains", "Deodorizing treatment", "Post-cleaning grooming and speed drying", "Furniture moving (light items)"],
    sections: [
      { id: "how-to-price", heading: "How to Price Carpet Cleaning Jobs", level: "h2",
        content: `<p>Carpet cleaning is typically priced per room or per square foot. Most professionals use a per-room model for residential and per-sqft for commercial.</p>
          <ul><li><strong>Per room:</strong> $30&ndash;$75 per room depending on size and condition</li><li><strong>Per square foot:</strong> $0.20&ndash;$0.40 per sq ft for hot water extraction</li><li><strong>Minimum charge:</strong> Most carpet cleaners set a minimum of $75&ndash;$150</li><li><strong>Stain treatment:</strong> Add $15&ndash;$30 per spot for specialty stain removal</li></ul>` },
      { id: "methods", heading: "Carpet Cleaning Methods Compared", level: "h2",
        content: `<ul><li><strong>Hot Water Extraction (Steam):</strong> The most thorough method. Uses hot water and cleaning solution injected into carpet fibers. Industry standard for deep cleaning.</li><li><strong>Dry Cleaning / Encapsulation:</strong> Low-moisture method using chemical compounds. Faster drying time. Good for maintenance cleans.</li><li><strong>Shampooing:</strong> Traditional method using foaming detergent. Effective but slower drying. Best for heavily soiled carpets.</li></ul>` },
      { id: "tips", heading: "Tips for Carpet Cleaning Pricing", level: "h2",
        content: `<ul><li><strong>Always inspect the carpet first.</strong> Condition dramatically affects time and pricing.</li><li><strong>Charge extra for pet odor and stain treatment.</strong> These require specialized products and extra time.</li><li><strong>Offer maintenance plans.</strong> Quarterly carpet cleaning keeps carpets in good condition and provides recurring revenue.</li><li><strong>Upsell protective treatments.</strong> Scotchgard or similar protectants are high-margin add-ons.</li></ul>` },
    ],
    faq: [
      { question: "How much does carpet cleaning cost per room?", answer: "Carpet cleaning costs $30 to $75 per room on average, depending on room size, carpet condition, and cleaning method. Steam cleaning (hot water extraction) is typically at the higher end." },
      { question: "Is steam cleaning or dry cleaning better for carpets?", answer: "Steam cleaning (hot water extraction) provides the deepest clean and is recommended by most carpet manufacturers. Dry cleaning is faster and better for maintenance between deep cleans." },
      { question: "How often should carpets be professionally cleaned?", answer: "Every 12 to 18 months for most homes, or every 6 months for homes with pets, children, or allergies. High-traffic commercial areas may need quarterly cleaning." },
      { question: "Should I charge extra for stairs?", answer: "Yes. Stairs are labor-intensive and should be priced at $2 to $5 per step or $20 to $40 per flight. Always list stairs as a separate line item." },
    ],
  },
  {
    slug: "window-cleaning-price-calculator",
    title: "Window Cleaning Price Calculator | Free Pricing Tool - QuotePro",
    metaDescription: "Calculate window cleaning prices per pane or per window. Free pricing calculator for residential and commercial window washing services.",
    h1: "Window Cleaning Price Calculator",
    introParagraph: "Estimate window cleaning prices based on the number of windows, stories, and cleaning type. Get tiered pricing to quote window washing jobs with confidence.",
    calcTitle: "Calculate Your Window Cleaning Price",
    calcNote: "Window cleaning estimates. Pricing varies by window accessibility and size.",
    fields: [
      { id: "windows", label: "Number of Windows", type: "number", defaultValue: 15, min: 1, max: 100 },
      { id: "stories", label: "Number of Stories", type: "select", defaultValue: "1", options: [
        { value: "1", label: "1 Story" },
        { value: "2", label: "2 Stories" },
        { value: "3", label: "3+ Stories" },
      ]},
      { id: "cleanType", label: "Cleaning Type", type: "select", defaultValue: "both", options: [
        { value: "exterior", label: "Exterior Only" },
        { value: "interior", label: "Interior Only" },
        { value: "both", label: "Interior + Exterior", selected: true },
      ]},
      { id: "screenCleaning", label: "Screen Cleaning", type: "select", defaultValue: "no", fullWidth: true, options: [
        { value: "no", label: "No Screen Cleaning" },
        { value: "yes", label: "Include Screen Cleaning (+$3/window)" },
      ]},
    ],
    formula: `var perWindow=8;
        if(cleanType==='both')perWindow=12;
        if(cleanType==='interior')perWindow=6;
        var storyMult=1;
        if(stories==='2')storyMult=1.5;
        if(stories==='3')storyMult=2;
        var total=windows*perWindow*storyMult;
        if(screenCleaning==='yes')total+=windows*3;
        total=Math.max(total,75);
        var good=Math.round(total*0.85);
        var better=Math.round(total);
        var best=Math.round(total*1.25);`,
    serviceTypeExpr: "'regular'",
    scopeItems: ["Clean all window glass (interior and/or exterior)", "Wipe window frames and sills", "Clean window tracks and channels", "Screen removal and reinstallation", "Spot-free rinse and detailing", "Hard water stain treatment"],
    sections: [
      { id: "how-to-price", heading: "How to Price Window Cleaning", level: "h2",
        content: `<p>Window cleaning is typically priced per pane or per window. Understanding the difference is key to accurate quoting:</p>
          <ul><li><strong>Per window:</strong> $4&ndash;$15 per window depending on size and accessibility</li><li><strong>Per pane:</strong> $2&ndash;$8 per pane for multi-pane windows</li><li><strong>Interior + Exterior:</strong> Roughly 1.5x the price of exterior-only</li><li><strong>Multi-story premium:</strong> Add 50&ndash;100% for second-story and above</li><li><strong>Minimum charge:</strong> Most window cleaners set a minimum of $75&ndash;$150</li></ul>` },
      { id: "equipment", heading: "Equipment and Method Considerations", level: "h2",
        content: `<ul><li><strong>Water-fed pole systems:</strong> Allow ground-level cleaning of 2nd and 3rd story windows safely</li><li><strong>Squeegee method:</strong> Traditional technique, best for interior and accessible exterior windows</li><li><strong>Hard water stain removal:</strong> Requires specialty products and commands premium pricing</li><li><strong>Screen cleaning:</strong> Easy upsell at $2&ndash;$5 per screen</li></ul>` },
      { id: "tips", heading: "Tips for Window Cleaning Pricing", level: "h2",
        content: `<ul><li><strong>Count windows during the walkthrough.</strong> Never estimate window count over the phone.</li><li><strong>Offer interior + exterior as a package.</strong> Most clients prefer both and the upsell is easy.</li><li><strong>Charge extra for French windows and divided panes.</strong> They take significantly more time.</li><li><strong>Sell recurring plans.</strong> Quarterly or bi-annual window cleaning provides consistent revenue.</li></ul>` },
    ],
    faq: [
      { question: "How much does window cleaning cost per window?", answer: "Window cleaning costs $4 to $15 per window for exterior only, and $8 to $20 per window for interior and exterior combined. Multi-story windows cost more due to accessibility challenges." },
      { question: "How often should windows be professionally cleaned?", answer: "Most homes benefit from window cleaning 2 to 4 times per year. Commercial properties may need monthly service, especially storefronts." },
      { question: "Should I charge more for second-story windows?", answer: "Yes. Second-story windows should be priced 50% to 100% higher than ground-level windows due to the additional time, equipment, and safety considerations required." },
      { question: "Is window cleaning profitable?", answer: "Window cleaning has some of the highest margins in the cleaning industry at 50-70% profit margins. Low supply costs and high per-hour earnings make it an excellent add-on or standalone service." },
    ],
  },
  {
    slug: "pressure-washing-price-calculator",
    title: "Pressure Washing Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate pressure washing prices for driveways, decks, siding, and more. Free pricing tool for power washing professionals and homeowners.",
    h1: "Pressure Washing Price Calculator",
    introParagraph: "Get instant pressure washing estimates based on surface type, square footage, and condition. Use tiered pricing to quote power washing jobs accurately and win more bids.",
    calcTitle: "Calculate Your Pressure Washing Price",
    calcNote: "Pressure washing estimates based on average U.S. power washing rates.",
    fields: [
      { id: "sqft", label: "Surface Area (sq ft)", type: "number", defaultValue: 500, min: 50, max: 10000, step: 50 },
      { id: "surface", label: "Surface Type", type: "select", defaultValue: "driveway", options: [
        { value: "driveway", label: "Driveway / Concrete" },
        { value: "deck", label: "Deck / Patio" },
        { value: "siding", label: "House Siding" },
        { value: "fence", label: "Fence" },
      ]},
      { id: "surfaceCondition", label: "Condition", type: "select", defaultValue: "average", fullWidth: true, options: [
        { value: "light", label: "Light Dirt / Maintenance" },
        { value: "average", label: "Average", selected: true },
        { value: "heavy", label: "Heavy Buildup / Mold" },
      ]},
    ],
    formula: `var rate=0.15;
        if(surface==='deck')rate=0.30;
        if(surface==='siding')rate=0.35;
        if(surface==='fence')rate=0.25;
        var condMult=1;
        if(surfaceCondition==='light')condMult=0.8;
        if(surfaceCondition==='heavy')condMult=1.5;
        var total=Math.max(sqft*rate*condMult,100);
        var good=Math.round(total*0.8);
        var better=Math.round(total);
        var best=Math.round(total*1.35);`,
    serviceTypeExpr: "'regular'",
    scopeItems: ["Surface preparation and pre-treatment", "Pressure washing at appropriate PSI", "Mold and mildew treatment", "Stain spot treatment", "Rinse and debris cleanup", "Post-wash inspection"],
    sections: [
      { id: "how-to-price", heading: "How to Price Pressure Washing Jobs", level: "h2",
        content: `<p>Pressure washing is priced primarily by square footage, with adjustments for surface type and condition:</p>
          <ul><li><strong>Driveways:</strong> $0.08&ndash;$0.20 per sq ft</li><li><strong>Decks:</strong> $0.25&ndash;$0.45 per sq ft (more delicate, requires care)</li><li><strong>House siding:</strong> $0.25&ndash;$0.50 per sq ft</li><li><strong>Fences:</strong> $0.15&ndash;$0.35 per sq ft</li><li><strong>Minimum charge:</strong> $100&ndash;$200 regardless of size</li></ul>` },
      { id: "considerations", heading: "Important Pricing Considerations", level: "h2",
        content: `<ul><li><strong>Water access:</strong> If you need to bring water, add $50&ndash;$100 for water hauling</li><li><strong>Chemical treatments:</strong> Soft washing for siding and roofs requires specialty chemicals ($20&ndash;$50 extra)</li><li><strong>Sealing and staining:</strong> Offer as an upsell after pressure washing decks and concrete for $0.50&ndash;$1.50 per sq ft</li><li><strong>Time of year:</strong> Spring is peak season, allowing for premium pricing</li></ul>` },
      { id: "tips", heading: "Tips for Pressure Washing Pricing", level: "h2",
        content: `<ul><li><strong>Always visit the property first.</strong> Photos help but cannot capture the actual condition accurately.</li><li><strong>Bundle services.</strong> Offer driveway + sidewalk + patio packages for higher tickets.</li><li><strong>Upsell sealing.</strong> After pressure washing concrete or wood, sealing protects the surface and is a high-margin add-on.</li><li><strong>Account for setup time.</strong> Equipment setup and teardown can add 30&ndash;60 minutes to every job.</li></ul>` },
    ],
    faq: [
      { question: "How much does pressure washing cost?", answer: "Pressure washing costs $0.08 to $0.50 per square foot depending on the surface type. A typical driveway costs $100 to $300, while a full house exterior can cost $300 to $600." },
      { question: "Is pressure washing profitable?", answer: "Pressure washing has excellent profit margins of 50-70%. Equipment costs are moderate, and the per-hour earning potential of $75 to $200 makes it one of the most profitable cleaning services." },
      { question: "What is the difference between pressure washing and soft washing?", answer: "Pressure washing uses high-pressure water to clean hard surfaces like concrete. Soft washing uses low pressure with chemical solutions for delicate surfaces like siding and roofs. Many professionals offer both." },
      { question: "Should I charge extra for mold and mildew removal?", answer: "Yes. Heavy mold and mildew require pre-treatment chemicals and extra time. Add 30-50% to your base price for heavily affected surfaces." },
    ],
  },
  {
    slug: "airbnb-cleaning-price-calculator",
    title: "Airbnb & Vacation Rental Cleaning Price Calculator - QuotePro",
    metaDescription: "Calculate Airbnb and vacation rental cleaning prices. Free turnover cleaning pricing tool based on property size, beds, and extras.",
    h1: "Airbnb & Vacation Rental Cleaning Price Calculator",
    introParagraph: "Calculate turnover cleaning prices for Airbnb, VRBO, and vacation rental properties. Turnover cleans require speed, consistency, and attention to detail. Get instant tiered pricing.",
    calcTitle: "Calculate Your Turnover Cleaning Price",
    calcNote: "Airbnb/vacation rental turnover estimates. Pricing includes linen change and restocking.",
    fields: [
      { id: "beds", label: "Bedrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "baths", label: "Bathrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 1200, min: 200, max: 10000, step: 100 },
      { id: "linens", label: "Linen Service", type: "select", defaultValue: "change", fullWidth: true, options: [
        { value: "none", label: "No Linen Service" },
        { value: "change", label: "Strip & Re-make Beds", selected: true },
        { value: "laundry", label: "Full Laundry Service" },
      ]},
    ],
    formula: `var baseRate=45;var sqftFactor=0.012;
        var baseHours=sqft*sqftFactor+beds*0.35+baths*0.45;
        var total=Math.max(baseRate*baseHours,90);
        if(linens==='change')total+=beds*10;
        if(linens==='laundry')total+=beds*25;
        var good=Math.round(total*0.85);
        var better=Math.round(total);
        var best=Math.round(total*1.25);`,
    serviceTypeExpr: "'regular'",
    scopeItems: ["Full property cleaning and sanitization", "Strip and re-make all beds", "Restock toiletries and supplies", "Check for damages and report", "Take photos for host records", "Trash removal and recycling", "Laundry (if included)", "Welcome setup and staging"],
    sections: [
      { id: "how-to-price", heading: "How to Price Airbnb Turnover Cleans", level: "h2",
        content: `<p>Turnover cleaning is unique because speed and consistency matter as much as quality. Guests expect hotel-level cleanliness, and hosts need fast turnarounds between bookings.</p>
          <ol><li><strong>Base your price on bedroom and bathroom count.</strong> These are the most labor-intensive areas in a vacation rental.</li><li><strong>Add linen service.</strong> Bed stripping and remaking adds $8&ndash;$15 per bed. Full laundry adds $20&ndash;$30 per bed.</li><li><strong>Include restocking.</strong> Most hosts provide supplies that need replenishing between guests.</li><li><strong>Factor in inspection time.</strong> Checking for damages and reporting to the host is part of the job.</li></ol>` },
      { id: "market-rates", heading: "Vacation Rental Cleaning Rates", level: "h2",
        content: `<ul><li><strong>Studio/1-bed:</strong> $65&ndash;$100 per turnover</li><li><strong>2-bedroom:</strong> $90&ndash;$150 per turnover</li><li><strong>3-bedroom:</strong> $120&ndash;$200 per turnover</li><li><strong>4+ bedroom:</strong> $175&ndash;$300+ per turnover</li><li><strong>Premium for same-day turnover:</strong> Add 25&ndash;50% for tight scheduling windows</li></ul>` },
      { id: "tips", heading: "Tips for Vacation Rental Cleaning", level: "h2",
        content: `<ul><li><strong>Create a detailed checklist.</strong> Consistency is critical for maintaining host ratings.</li><li><strong>Offer photo documentation.</strong> Hosts love receiving photos after each clean as proof of quality.</li><li><strong>Negotiate volume pricing.</strong> Hosts with high booking rates provide steady, predictable income.</li><li><strong>Charge for same-day turnovers.</strong> When checkout is at 11am and check-in is at 3pm, your time is premium.</li></ul>` },
    ],
    faq: [
      { question: "How much should I charge for Airbnb cleaning?", answer: "Airbnb turnover cleaning typically costs $65 to $200+ depending on property size. Most hosts pass the cleaning fee to guests, so they are willing to pay competitive rates for reliable service." },
      { question: "What is included in a vacation rental turnover clean?", answer: "A turnover clean includes full cleaning of all rooms, bed stripping and remaking, bathroom sanitization, kitchen cleaning, restocking supplies, trash removal, and a damage check." },
      { question: "How long does an Airbnb turnover take?", answer: "A typical 2-bedroom vacation rental takes 1.5 to 2.5 hours for a turnover clean. Larger properties with laundry service can take 3 to 4 hours." },
      { question: "Should I charge Airbnb hosts differently than regular clients?", answer: "Yes. Turnover cleans are faster-paced and require additional tasks like linen service and restocking. Price them as a specialized service, not a discounted regular clean." },
    ],
  },
  {
    slug: "post-construction-cleaning-calculator",
    title: "Post Construction Cleaning Price Calculator - QuotePro",
    metaDescription: "Calculate post-construction cleaning prices based on square footage, construction type, and cleanup phase. Free pricing tool for builders and cleaners.",
    h1: "Post Construction Cleaning Price Calculator",
    introParagraph: "Estimate post-construction cleaning costs based on project size, construction type, and cleanup phase. These are premium jobs that command top rates. Get instant tiered pricing.",
    calcTitle: "Calculate Your Post-Construction Cleaning Price",
    calcNote: "Post-construction estimates. Pricing reflects the labor-intensive nature of construction cleanup.",
    fields: [
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 2500, min: 500, max: 50000, step: 500 },
      { id: "constructionType", label: "Construction Type", type: "select", defaultValue: "remodel", options: [
        { value: "new_build", label: "New Construction" },
        { value: "remodel", label: "Remodel / Renovation", selected: true },
        { value: "commercial", label: "Commercial Build-Out" },
      ]},
      { id: "phase", label: "Cleanup Phase", type: "select", defaultValue: "final", fullWidth: true, options: [
        { value: "rough", label: "Rough Clean (remove debris)" },
        { value: "final", label: "Final Clean (detail work)", selected: true },
        { value: "touchup", label: "Touch-Up Clean (punch list)" },
      ]},
    ],
    formula: `var rate=0.15;
        if(constructionType==='new_build')rate=0.20;
        if(constructionType==='commercial')rate=0.18;
        var phaseMult=1;
        if(phase==='rough')phaseMult=0.6;
        if(phase==='touchup')phaseMult=0.4;
        var total=Math.max(sqft*rate*phaseMult,200);
        var good=Math.round(total*0.85);
        var better=Math.round(total);
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "'deep_clean'",
    scopeItems: ["Remove construction dust from all surfaces", "Clean all windows and glass", "Vacuum and mop all floors", "Detail clean all fixtures and hardware", "Clean inside cabinets and drawers", "Remove stickers, labels, and protective film", "Sanitize bathrooms and kitchen", "Final inspection walkthrough"],
    sections: [
      { id: "how-to-price", heading: "How to Price Post-Construction Cleaning", level: "h2",
        content: `<p>Post-construction cleaning is one of the highest-paying cleaning services. It is also one of the most demanding. Pricing is based on square footage and the phase of cleanup:</p>
          <ol><li><strong>Rough Clean:</strong> $0.05&ndash;$0.15 per sq ft. Removing large debris, sweeping, and initial cleanup after framing and drywall.</li><li><strong>Final Clean:</strong> $0.15&ndash;$0.30 per sq ft. Detailed cleaning of every surface, window, fixture, and floor.</li><li><strong>Touch-Up Clean:</strong> $0.05&ndash;$0.10 per sq ft. Quick clean before final walkthrough or occupancy.</li></ol>` },
      { id: "what-to-include", heading: "What Post-Construction Cleaning Includes", level: "h2",
        content: `<ul><li>Dust removal from every surface including ceilings, walls, and floors</li><li>Window cleaning including sticker and film removal</li><li>All fixture and hardware detailing</li><li>Inside all cabinets, drawers, and closets</li><li>Floor cleaning (vacuum, mop, or buff depending on floor type)</li><li>Bathroom and kitchen deep cleaning</li><li>Removal of paint spots and adhesive residue</li></ul>` },
      { id: "tips", heading: "Tips for Post-Construction Jobs", level: "h2",
        content: `<ul><li><strong>Always quote after a walkthrough.</strong> Construction sites vary dramatically in cleanup needs.</li><li><strong>Get clear scope in writing.</strong> Define exactly what is included to avoid scope creep.</li><li><strong>Build relationships with builders.</strong> General contractors are the best source of repeat post-construction work.</li><li><strong>Require payment before or at completion.</strong> Construction cleanup is expensive to perform, so do not extend credit.</li></ul>` },
    ],
    faq: [
      { question: "How much does post-construction cleaning cost?", answer: "Post-construction cleaning costs $0.10 to $0.30 per square foot for the final clean. A 2,500 sq ft home would cost $250 to $750. Rough cleaning and touch-up cleans cost less." },
      { question: "How long does post-construction cleaning take?", answer: "Final cleaning takes 6 to 12 hours for a typical home. Larger commercial projects may take multiple days with a team. Rough cleaning is faster at 2 to 4 hours." },
      { question: "What is the difference between rough and final clean?", answer: "Rough cleaning removes debris and does initial sweeping after framing and drywall. Final cleaning is a detailed, thorough cleaning of every surface before occupancy." },
      { question: "Is post-construction cleaning profitable?", answer: "Yes. Post-construction cleaning commands premium rates of $40 to $80+ per hour. The work is physically demanding but margins are typically 40-60%." },
    ],
  },
  {
    slug: "janitorial-bidding-calculator",
    title: "Janitorial Bidding Calculator | Commercial Cleaning Bid Tool - QuotePro",
    metaDescription: "Calculate janitorial service bids for commercial buildings. Free bidding calculator based on building size, service frequency, and scope of work.",
    h1: "Janitorial Bidding Calculator",
    introParagraph: "Build competitive janitorial bids for commercial properties. Enter building details and cleaning frequency to get a monthly pricing estimate with Good/Better/Best tiers for your proposals.",
    calcTitle: "Calculate Your Janitorial Bid",
    calcNote: "Janitorial bid estimates for commercial contracts. Monthly pricing shown.",
    fields: [
      { id: "sqft", label: "Building Square Footage", type: "number", defaultValue: 10000, min: 1000, max: 500000, step: 1000 },
      { id: "restrooms", label: "Number of Restrooms", type: "number", defaultValue: 4, min: 1, max: 50 },
      { id: "frequency", label: "Cleaning Frequency", type: "select", defaultValue: "5x", options: [
        { value: "2x", label: "2x Per Week" },
        { value: "3x", label: "3x Per Week" },
        { value: "5x", label: "5x Per Week (Nightly)", selected: true },
        { value: "7x", label: "7x Per Week (Daily)" },
      ]},
      { id: "scope", label: "Service Scope", type: "select", defaultValue: "standard", fullWidth: true, options: [
        { value: "basic", label: "Basic (trash, vacuum, restrooms)" },
        { value: "standard", label: "Standard (+ mopping, dusting)", selected: true },
        { value: "full", label: "Full Service (+ windows, floors, deep clean)" },
      ]},
    ],
    formula: `var ratePerSqft=0.06;
        if(scope==='basic')ratePerSqft=0.04;
        if(scope==='full')ratePerSqft=0.10;
        var restroomCost=restrooms*30;
        var visitCost=sqft*ratePerSqft+restroomCost;
        var visitsPerMonth=8;
        if(frequency==='3x')visitsPerMonth=13;
        if(frequency==='5x')visitsPerMonth=22;
        if(frequency==='7x')visitsPerMonth=30;
        var total=Math.round(visitCost*visitsPerMonth);
        var good=Math.round(total*0.85);
        var better=total;
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "'regular'",
    frequencyExpr: "'monthly'",
    scopeItems: ["Empty all trash receptacles", "Vacuum carpeted areas and rugs", "Mop and sanitize hard floors", "Clean and restock all restrooms", "Wipe and sanitize all high-touch surfaces", "Clean break rooms and kitchen areas", "Dust surfaces, vents, and ledges", "Lock up and security check"],
    sections: [
      { id: "how-to-bid", heading: "How to Bid on Janitorial Contracts", level: "h2",
        content: `<p>Janitorial bidding requires understanding the full scope of the building and client expectations:</p>
          <ol><li><strong>Walk the building.</strong> Measure or verify square footage. Note floor types, restroom count, and special areas.</li><li><strong>Calculate per-visit cost.</strong> Use your rate per square foot plus restroom and specialty charges.</li><li><strong>Multiply by frequency.</strong> Present monthly pricing for consistency.</li><li><strong>Include supply costs.</strong> Most commercial contracts expect you to supply all cleaning products and equipment.</li><li><strong>Add margin.</strong> Target 30&ndash;50% gross margin to cover overhead and profit.</li></ol>` },
      { id: "scope-levels", heading: "Understanding Service Scope Levels", level: "h2",
        content: `<ul><li><strong>Basic:</strong> Trash removal, vacuuming, and restroom cleaning. Suitable for small offices with low traffic.</li><li><strong>Standard:</strong> Basic plus mopping, surface wiping, and dust removal. The most common scope for mid-size offices.</li><li><strong>Full Service:</strong> Standard plus window cleaning, floor care (stripping/waxing), deep cleaning, and specialty services.</li></ul>` },
      { id: "tips", heading: "Tips for Winning Janitorial Contracts", level: "h2",
        content: `<ul><li><strong>Present a professional proposal.</strong> Decision-makers compare multiple bids. Quality presentation wins.</li><li><strong>Offer a trial month.</strong> Reduce risk for the client and demonstrate your quality.</li><li><strong>Include a detailed scope of work.</strong> List every task performed at each visit.</li><li><strong>Highlight your insurance and certifications.</strong> Commercial clients require proof of liability coverage.</li><li><strong>Follow up persistently.</strong> Many contracts are awarded 30&ndash;90 days after bidding.</li></ul>` },
    ],
    faq: [
      { question: "How do I calculate a janitorial bid?", answer: "Calculate per-visit cost using square footage rate ($0.04-$0.10/sqft) plus restroom charges ($25-$40 each), multiply by monthly visits, and add your margin. A 10,000 sqft building cleaned 5x/week typically costs $2,000-$5,000 per month." },
      { question: "What profit margin should I target for janitorial contracts?", answer: "Target 30-50% gross margin on janitorial contracts. This covers labor, supplies, equipment depreciation, insurance, and overhead while leaving a healthy profit." },
      { question: "How do I price restroom cleaning separately?", answer: "Restroom cleaning should be priced at $25 to $40 per restroom per visit. Restrooms require specialized sanitization and are the most labor-intensive area in commercial cleaning." },
      { question: "What is included in a standard janitorial service?", answer: "Standard janitorial includes trash removal, vacuuming, mopping, restroom sanitization, surface wiping, dust removal, and break room cleaning. Floor care and window cleaning are typically additional services." },
    ],
  },
];

const calculatorMap = new Map<string, CalcDefinition>();
for (const calc of calculators) {
  calculatorMap.set(calc.slug, calc);
}

export function getCalculatorBySlug(slug: string): CalcDefinition | undefined {
  return calculatorMap.get(slug);
}

export function getAllCalculatorSlugs(): string[] {
  return calculators.map(c => c.slug);
}

export function getAllCalculators(): CalcDefinition[] {
  return calculators;
}

export function renderCalculatorIndex(): string {
  const baseUrl = getBaseUrl();
  const calcCards = calculators.map(c => `
    <a href="/calculators/${c.slug}" class="calc-index-card">
      <span class="card-free-badge">Free</span>
      <h3>${c.h1}</h3>
      <p>${c.metaDescription.substring(0, 120)}...</p>
      <span class="calc-index-link">Open Calculator &rarr;</span>
    </a>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Free Cleaning Business Calculators | Pricing Tools - QuotePro</title>
<meta name="description" content="Free pricing calculators for cleaning businesses. House cleaning, deep cleaning, carpet cleaning, window cleaning, pressure washing, office cleaning, and more. Get instant estimates.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${baseUrl}/calculators">
<meta property="og:title" content="Free Cleaning Business Calculators - QuotePro">
<meta property="og:description" content="The largest library of free pricing calculators for cleaning professionals. Get instant estimates for any cleaning service.">
<meta property="og:type" content="website">
<meta property="og:url" content="${baseUrl}/calculators">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:#0f172a;background:#f8fafc;-webkit-font-smoothing:antialiased;line-height:1.7}
a{color:inherit;text-decoration:none}
.idx-header{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%);color:#fff;padding:3rem 1.5rem 2.5rem;text-align:center}
.idx-header h1{font-size:2.25rem;font-weight:800;line-height:1.2;margin-bottom:0.75rem;letter-spacing:-0.02em}
.idx-header p{max-width:640px;margin:0 auto;font-size:1.05rem;color:rgba(255,255,255,0.88);line-height:1.7}
.idx-header .count{display:inline-block;background:rgba(255,255,255,0.15);padding:0.25rem 0.85rem;border-radius:20px;font-size:0.82rem;font-weight:600;margin-top:0.75rem}
.idx-body{max-width:900px;margin:0 auto;padding:2rem 1.5rem 4rem}
.idx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem}
.calc-index-card{display:block;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.5rem;transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.04);position:relative}
.calc-index-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.08);border-color:#bfdbfe;text-decoration:none}
.card-free-badge{display:inline-block;padding:0.15rem 0.55rem;background:#ecfdf5;color:#059669;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;border-radius:6px;border:1px solid #a7f3d0;margin-bottom:0.5rem}
.calc-index-card h3{font-size:1rem;font-weight:700;color:#0f172a;margin-bottom:0.5rem}
.calc-index-card p{font-size:0.85rem;color:#64748b;margin-bottom:0.75rem;line-height:1.5}
.calc-index-link{font-size:0.82rem;font-weight:600;color:#2563eb}
.toolkit-cta{background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px;padding:2.5rem 2rem;text-align:center;color:#fff;margin:2.5rem 0}
.toolkit-cta h2{font-size:1.35rem;font-weight:700;margin-bottom:0.5rem}
.toolkit-cta p{color:rgba(255,255,255,0.75);font-size:0.95rem;margin-bottom:1.25rem;max-width:480px;margin-left:auto;margin-right:auto}
.toolkit-cta a{display:inline-block;padding:0.75rem 2rem;background:#fff;color:#1e293b;font-weight:700;border-radius:10px;font-size:0.95rem;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:transform 0.15s}
.toolkit-cta a:hover{transform:translateY(-1px);text-decoration:none}
.seo-footer{background:#1e293b;color:rgba(255,255,255,0.6);text-align:center;padding:2rem 1.5rem;font-size:0.82rem}
.seo-footer a{color:rgba(255,255,255,0.75)}
@media(max-width:640px){.idx-header{padding:2rem 1.25rem}.idx-header h1{font-size:1.65rem}.idx-body{padding:1.5rem 1.25rem 3rem}.idx-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="idx-header">
  <h1>Free Cleaning Business Calculators</h1>
  <p>The largest library of free pricing calculators for cleaning professionals. Get instant estimates for any cleaning service.</p>
  <span class="count">${calculators.length} Free Calculators</span>
</header>
<div class="idx-body">
  <div class="idx-grid">
    ${calcCards}
  </div>
  <div class="toolkit-cta">
    <h2>Explore More Free Tools</h2>
    <p>Get templates, scripts, and growth tools built for cleaning business owners.</p>
    <a href="/app/toolkit">Browse the Cleaning Business Toolkit</a>
  </div>
</div>
<footer class="seo-footer">
  <p>&copy; ${new Date().getFullYear()} QuotePro &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p>
</footer>
</body>
</html>`;
}

function getBaseUrl(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + ".replit.app";
  return `https://${domain}`;
}
