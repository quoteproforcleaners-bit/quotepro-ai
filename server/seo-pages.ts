export interface FAQItem {
  question: string;
  answer: string;
}

export interface SEOPageSection {
  id: string;
  heading: string;
  level: "h2" | "h3";
  content: string;
}

export interface CalculatorPageConfig {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  introParagraph: string;
  sections: SEOPageSection[];
  calculatorHTML: string;
  faq: FAQItem[];
  toolkitCTA?: string;
}

function faqSchema(faq: FAQItem[]): string {
  const items = faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  }));
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items,
  });
}

function renderSection(s: SEOPageSection): string {
  const tag = s.level;
  return `<section id="${s.id}" class="content-section"><${tag}>${s.heading}</${tag}>${s.content}</section>`;
}

function getBaseUrl(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + ".replit.app";
  return `https://${domain}`;
}

export function renderSEOPage(config: CalculatorPageConfig): string {
  const baseUrl = getBaseUrl();
  const canonicalUrl = `${baseUrl}/${config.slug}`;
  const sectionsHTML = config.sections.map(renderSection).join("\n");
  const faqHTML = config.faq
    .map(
      (f) =>
        `<div class="faq-item"><h3 class="faq-q">${f.question}</h3><p class="faq-a">${f.answer}</p></div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${config.title}</title>
<meta name="description" content="${config.metaDescription}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:title" content="${config.title}">
<meta property="og:description" content="${config.metaDescription}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonicalUrl}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${config.title}">
<meta name="twitter:description" content="${config.metaDescription}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script type="application/ld+json">${faqSchema(config.faq)}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:#0f172a;background:#f8fafc;-webkit-font-smoothing:antialiased;line-height:1.7}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}

.seo-header{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%);color:#fff;padding:3rem 1.5rem 2.5rem;text-align:center}
.seo-header h1{font-size:2.25rem;font-weight:800;line-height:1.2;margin-bottom:0.75rem;letter-spacing:-0.02em}
.seo-header .intro{max-width:640px;margin:0 auto;font-size:1.05rem;color:rgba(255,255,255,0.88);line-height:1.7}
.breadcrumb{max-width:800px;margin:1rem auto 0;font-size:0.8rem;color:rgba(255,255,255,0.6)}
.breadcrumb a{color:rgba(255,255,255,0.75)}
.breadcrumb a:hover{color:#fff}

.page-body{max-width:800px;margin:0 auto;padding:2rem 1.5rem 4rem}

.content-section{margin-bottom:2.5rem}
.content-section h2{font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:1rem;letter-spacing:-0.01em}
.content-section h3{font-size:1.2rem;font-weight:600;color:#1e293b;margin-bottom:0.75rem}
.content-section p{color:#475569;margin-bottom:1rem;font-size:0.95rem}
.content-section ul,.content-section ol{color:#475569;margin-bottom:1rem;padding-left:1.5rem;font-size:0.95rem}
.content-section li{margin-bottom:0.4rem}

.calc-wrapper{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:2rem;margin:2rem 0;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
.calc-wrapper h2{font-size:1.35rem;font-weight:700;color:#0f172a;margin-bottom:1.25rem;text-align:center}
.calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.calc-field{display:flex;flex-direction:column;gap:0.35rem}
.calc-field.full{grid-column:1/-1}
.calc-field label{font-size:0.82rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em}
.calc-field input,.calc-field select{padding:0.65rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;font-family:inherit;color:#0f172a;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s}
.calc-field input:focus,.calc-field select:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
.calc-btn{display:block;width:100%;padding:0.85rem;margin-top:1.25rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;box-shadow:0 4px 14px rgba(37,99,235,0.3)}
.calc-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,0.35)}
.calc-btn:active{transform:translateY(0)}

.calc-results{display:none;margin-top:1.5rem;animation:fadeUp 0.4s ease-out}
.tier-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem}
.tier-card{background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:1.25rem 1rem;text-align:center;transition:border-color 0.2s,transform 0.2s}
.tier-card.popular{border-color:#2563eb;background:#eff6ff;position:relative}
.tier-card.popular::before{content:'Most Popular';position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#2563eb;color:#fff;font-size:0.65rem;font-weight:700;padding:2px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap}
.tier-card:hover{transform:translateY(-2px)}
.tier-name{font-size:0.8rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem}
.tier-price{font-size:1.75rem;font-weight:800;color:#0f172a}
.tier-price span{font-size:0.85rem;font-weight:500;color:#94a3b8}
.calc-note{text-align:center;color:#94a3b8;font-size:0.78rem;margin-top:0.75rem}

.faq-section{margin-bottom:2.5rem}
.faq-section h2{font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:1.25rem}
.faq-item{border-bottom:1px solid #e2e8f0;padding:1rem 0}
.faq-item:last-child{border-bottom:none}
.faq-q{font-size:1rem;font-weight:600;color:#1e293b;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:0.5rem}
.faq-q::after{content:'+';font-size:1.25rem;color:#94a3b8;transition:transform 0.2s;flex-shrink:0}
.faq-item.open .faq-q::after{transform:rotate(45deg)}
.faq-a{color:#475569;font-size:0.92rem;line-height:1.7;max-height:0;overflow:hidden;transition:max-height 0.3s ease,padding 0.3s ease;padding-top:0}
.faq-item.open .faq-a{max-height:500px;padding-top:0.75rem}

.toolkit-cta{background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px;padding:2.5rem 2rem;text-align:center;color:#fff;margin:2rem 0}
.toolkit-cta h2{font-size:1.35rem;font-weight:700;margin-bottom:0.5rem}
.toolkit-cta p{color:rgba(255,255,255,0.75);font-size:0.95rem;margin-bottom:1.25rem;max-width:480px;margin-left:auto;margin-right:auto}
.toolkit-cta a{display:inline-block;padding:0.75rem 2rem;background:#fff;color:#1e293b;font-weight:700;border-radius:10px;font-size:0.95rem;transition:transform 0.15s,box-shadow 0.15s;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
.toolkit-cta a:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,0.2);text-decoration:none}

.seo-footer{background:#1e293b;color:rgba(255,255,255,0.6);text-align:center;padding:2rem 1.5rem;font-size:0.82rem}
.seo-footer a{color:rgba(255,255,255,0.75)}

@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

@media(max-width:640px){
  .seo-header{padding:2rem 1.25rem 2rem}
  .seo-header h1{font-size:1.65rem}
  .page-body{padding:1.5rem 1.25rem 3rem}
  .calc-grid{grid-template-columns:1fr}
  .tier-cards{grid-template-columns:1fr}
  .tier-card{padding:1rem}
  .toolkit-cta{padding:2rem 1.5rem}
}
</style>
</head>
<body>

<header class="seo-header">
  <nav class="breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/app/toolkit">Toolkit</a> &rsaquo; ${config.h1}</nav>
  <h1>${config.h1}</h1>
  <p class="intro">${config.introParagraph}</p>
</header>

<div class="page-body">
  ${sectionsHTML}

  <div class="calc-wrapper" id="calculator">
    ${config.calculatorHTML}
  </div>

  <section class="faq-section" id="faq">
    <h2>Frequently Asked Questions</h2>
    ${faqHTML}
  </section>

  <div class="toolkit-cta">
    <h2>${config.toolkitCTA || "Explore More Free Tools"}</h2>
    <p>Get calculators, pricing templates, scripts, and growth tools built for cleaning business owners.</p>
    <a href="/app/toolkit">Browse the Cleaning Business Toolkit</a>
  </div>
</div>

<footer class="seo-footer">
  <p>&copy; ${new Date().getFullYear()} QuotePro &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p>
</footer>

<script>
document.querySelectorAll('.faq-item').forEach(function(item){
  item.querySelector('.faq-q').addEventListener('click',function(){
    item.classList.toggle('open');
  });
});
</script>
</body>
</html>`;
}

export function getHouseCleaningPriceCalculatorPage(): string {
  return renderSEOPage({
    slug: "house-cleaning-price-calculator",
    title: "House Cleaning Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate house cleaning prices instantly. Free calculator for bedrooms, bathrooms, square footage, service type, and frequency. Get accurate cleaning estimates in seconds.",
    h1: "House Cleaning Price Calculator",
    introParagraph: "Get an instant, data-driven estimate for your next house cleaning job. Adjust property size, service type, and frequency to see real-world pricing for Good, Better, and Best service tiers.",
    sections: [
      {
        id: "how-to-price",
        heading: "How to Price a House Cleaning Job",
        level: "h2",
        content: `
          <p>Pricing a house cleaning job accurately is the difference between winning the job and leaving money on the table. The most reliable approach combines square footage, room count, and service complexity into a single formula.</p>
          <p>Here is a proven method used by thousands of cleaning professionals:</p>
          <ol>
            <li><strong>Start with square footage.</strong> This is your baseline. A 1,500 sq ft home takes roughly 2&ndash;3 hours for a standard clean.</li>
            <li><strong>Add room complexity.</strong> Bedrooms add roughly 15 minutes each. Bathrooms add 25&ndash;30 minutes due to fixtures, tile, and detail work.</li>
            <li><strong>Apply a service multiplier.</strong> Deep cleans take 1.5x longer than standard cleans. Move-in/move-out jobs can take 2x or more.</li>
            <li><strong>Factor in frequency.</strong> Weekly clients get the biggest discount (15&ndash;20%) because recurring homes stay cleaner between visits.</li>
            <li><strong>Set a floor price.</strong> Never go below your minimum profitable ticket, typically $100&ndash;150 depending on your market.</li>
          </ol>
        `,
      },
      {
        id: "pricing-mistakes",
        heading: "Common Pricing Mistakes",
        level: "h2",
        content: `
          <p>Most cleaning businesses undercharge early on. Here are the mistakes to avoid:</p>
          <ul>
            <li><strong>Charging by the hour.</strong> Clients want predictable pricing. Flat-rate quotes based on property specs win more jobs.</li>
            <li><strong>Not accounting for drive time.</strong> Your price should cover travel, setup, and breakdown time &mdash; not just cleaning.</li>
            <li><strong>Skipping the walkthrough.</strong> Every home is different. Pets, clutter level, and flooring types significantly impact time.</li>
            <li><strong>Offering only one price.</strong> Give three tiers (Good / Better / Best). Most clients pick the middle option, which increases your average ticket.</li>
            <li><strong>Forgetting supply costs.</strong> Factor in cleaning products, equipment wear, and replacement costs per job.</li>
          </ul>
        `,
      },
      {
        id: "average-rates",
        heading: "Average House Cleaning Rates in 2025",
        level: "h2",
        content: `
          <p>Cleaning rates vary by region, but here are typical ranges across the U.S.:</p>
          <ul>
            <li><strong>Standard Cleaning:</strong> $120 &ndash; $250 for a 3-bed, 2-bath home</li>
            <li><strong>Deep Cleaning:</strong> $200 &ndash; $400 for the same property</li>
            <li><strong>Move-In/Move-Out:</strong> $250 &ndash; $500+ depending on condition</li>
            <li><strong>Recurring (bi-weekly):</strong> $100 &ndash; $200 per visit with a 10&ndash;15% frequency discount</li>
          </ul>
          <p>Urban markets like New York, San Francisco, and Los Angeles tend to run 20&ndash;40% higher than national averages. Rural areas may be 10&ndash;20% lower.</p>
        `,
      },
      {
        id: "tips",
        heading: "Practical Tips for Pricing Your Cleaning Jobs",
        level: "h2",
        content: `
          <p>Use these actionable tips to price with confidence:</p>
          <ul>
            <li><strong>Always quote in person or via photos.</strong> Blind quotes lead to undercharging and unhappy surprises.</li>
            <li><strong>Use Good / Better / Best pricing.</strong> Anchor your preferred option as the middle tier and mark it "Most Popular."</li>
            <li><strong>Raise prices for new clients first.</strong> Test higher rates with leads before adjusting existing clients.</li>
            <li><strong>Track your actual time per job.</strong> After 20&ndash;30 jobs, you will know your real hourly output. Use it to calibrate.</li>
            <li><strong>Include add-ons.</strong> Oven cleaning, fridge interior, laundry, and window interiors are easy upsells that boost your ticket by $25&ndash;$75.</li>
            <li><strong>Communicate value, not just price.</strong> List what is included in each tier. Clients pay more when they understand what they are getting.</li>
          </ul>
        `,
      },
    ],
    calculatorHTML: `
      <h2>Calculate Your Cleaning Price</h2>
      <form id="calcForm" onsubmit="return calcPrice(event)">
        <div class="calc-grid">
          <div class="calc-field">
            <label for="beds">Bedrooms</label>
            <input type="number" id="beds" value="3" min="1" max="10">
          </div>
          <div class="calc-field">
            <label for="baths">Bathrooms</label>
            <input type="number" id="baths" value="2" min="1" max="10">
          </div>
          <div class="calc-field">
            <label for="sqft">Square Footage</label>
            <input type="number" id="sqft" value="1500" min="200" max="20000" step="100">
          </div>
          <div class="calc-field">
            <label for="serviceType">Service Type</label>
            <select id="serviceType">
              <option value="regular">Regular Cleaning</option>
              <option value="deep_clean">Deep Clean</option>
              <option value="move_in_out">Move In / Move Out</option>
            </select>
          </div>
          <div class="calc-field full">
            <label for="frequency">Frequency</label>
            <select id="frequency">
              <option value="one-time">One-Time</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly" selected>Bi-Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
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
        <p class="calc-note">Estimates based on industry averages. Actual pricing may vary by market and condition.</p>
      </div>
      <script>
      function calcPrice(e){
        e.preventDefault();
        var beds=parseInt(document.getElementById('beds').value)||3;
        var baths=parseInt(document.getElementById('baths').value)||2;
        var sqft=parseInt(document.getElementById('sqft').value)||1500;
        var serviceType=document.getElementById('serviceType').value;
        var frequency=document.getElementById('frequency').value;
        var baseRate=40;var sqftFactor=0.01;var minTicket=100;
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
        var best=Math.round(total*1.3);
        document.getElementById('priceGood').innerHTML='$'+good;
        document.getElementById('priceBetter').innerHTML='$'+better;
        document.getElementById('priceBest').innerHTML='$'+best;
        document.getElementById('calcResults').style.display='block';
        document.getElementById('calcResults').style.animation='fadeUp 0.4s ease-out';
        return false;
      }
      </script>
    `,
    faq: [
      {
        question: "How much should I charge to clean a 3 bedroom house?",
        answer: "A standard cleaning for a 3-bedroom, 2-bathroom home typically costs between $120 and $200 depending on square footage, condition, and your market. Deep cleans run $200 to $350 for the same property. Use the calculator above for a personalized estimate.",
      },
      {
        question: "Should I charge by the hour or a flat rate?",
        answer: "Flat-rate pricing is strongly recommended. Clients prefer predictable pricing, and flat rates protect you from undercharging on difficult jobs. Calculate your flat rate based on estimated hours, then present it as a fixed quote.",
      },
      {
        question: "How do I calculate square footage pricing?",
        answer: "A common formula is $0.05 to $0.15 per square foot for standard cleaning, with adjustments for room count and service type. A 2,000 sq ft home at $0.10/sqft would start at $200 before frequency discounts.",
      },
      {
        question: "What is Good/Better/Best pricing?",
        answer: "Good/Better/Best is a tiered pricing strategy where you offer three options at different price points. The 'Good' tier is a basic clean, 'Better' includes extras like appliance exteriors and baseboards, and 'Best' is a comprehensive deep clean. Most clients choose the middle option, increasing your average revenue.",
      },
      {
        question: "How much of a discount should I give for recurring cleaning?",
        answer: "Industry standard discounts are 15-20% for weekly, 10-15% for bi-weekly, and 5-10% for monthly clients. Recurring clients are worth more long-term because they reduce your marketing costs and provide stable income.",
      },
      {
        question: "How do I price a deep cleaning vs. a regular cleaning?",
        answer: "Deep cleans typically cost 1.5x to 2x more than a standard cleaning. They include areas like inside ovens, behind appliances, detailed baseboard cleaning, interior windows, and thorough bathroom sanitization. The first visit for a new client should almost always be a deep clean.",
      },
      {
        question: "What is a good minimum price for a cleaning job?",
        answer: "Most successful cleaning businesses set a minimum job price of $100 to $150. This ensures every job covers your travel time, supplies, and overhead costs even for small spaces.",
      },
    ],
    toolkitCTA: "Explore More Free Cleaning Business Tools",
  });
}

export function getDeepCleaningPriceCalculatorPage(): string {
  return renderSEOPage({
    slug: "deep-cleaning-price-calculator",
    title: "Deep Cleaning Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate deep cleaning prices for any home. Instant estimates based on bedrooms, bathrooms, square footage, and condition. Free tool for cleaning professionals.",
    h1: "Deep Cleaning Price Calculator",
    introParagraph: "Estimate deep cleaning prices accurately with this free calculator. Deep cleans require more time, supplies, and attention to detail than standard cleanings. Get tiered pricing instantly.",
    sections: [
      {
        id: "what-is-deep-clean",
        heading: "What Is a Deep Cleaning?",
        level: "h2",
        content: `
          <p>A deep cleaning goes beyond surface-level maintenance. It targets built-up grime, neglected areas, and details that standard cleanings skip. Most cleaning professionals charge 1.5x to 2x more for a deep clean compared to a regular cleaning.</p>
          <p>Typical deep cleaning tasks include:</p>
          <ul>
            <li>Inside oven, microwave, and refrigerator</li>
            <li>Baseboard cleaning and wall spot treatment</li>
            <li>Interior window cleaning and track detailing</li>
            <li>Shower/tub deep scrub and grout cleaning</li>
            <li>Behind and under furniture and appliances</li>
            <li>Light fixture and ceiling fan detailing</li>
            <li>Cabinet fronts, door frames, and switch plates</li>
          </ul>
        `,
      },
      {
        id: "pricing-deep-clean",
        heading: "How to Price a Deep Cleaning Job",
        level: "h2",
        content: `
          <p>The best approach to pricing a deep clean is to start with your standard clean price and apply a multiplier:</p>
          <ol>
            <li><strong>Calculate your standard clean rate</strong> using square footage, room count, and your hourly base rate.</li>
            <li><strong>Apply a 1.5x multiplier</strong> for a standard deep clean. This accounts for the extra time spent on detailed areas.</li>
            <li><strong>Adjust for condition.</strong> Homes that have not been cleaned in months may warrant a 1.75x or 2x multiplier.</li>
            <li><strong>Add specific extras.</strong> Charge separately for inside-fridge, inside-oven, or window cleaning if they are not standard deep clean inclusions.</li>
          </ol>
          <p>A 3-bedroom, 2-bathroom home that costs $150 for a standard clean would price at $225&ndash;$300 for a deep clean.</p>
        `,
      },
      {
        id: "when-to-deep-clean",
        heading: "When to Recommend a Deep Clean",
        level: "h2",
        content: `
          <p>Smart cleaning businesses use deep cleans strategically to maximize revenue and set client expectations:</p>
          <ul>
            <li><strong>First visit for new clients.</strong> Always start with a deep clean to bring the home up to your standard.</li>
            <li><strong>Seasonal transitions.</strong> Offer "spring deep cleans" or "holiday prep cleans" as upsell opportunities.</li>
            <li><strong>Move-in / move-out.</strong> These are essentially deep cleans with higher expectations for detail.</li>
            <li><strong>Quarterly maintenance.</strong> Recurring clients benefit from a quarterly deep clean add-on to their regular schedule.</li>
          </ul>
        `,
      },
      {
        id: "tips",
        heading: "Tips for Quoting Deep Cleans Profitably",
        level: "h2",
        content: `
          <p>Follow these tips to price deep cleans without undercharging:</p>
          <ul>
            <li><strong>Always do a walkthrough or request photos.</strong> Deep cleans vary dramatically based on the home's condition.</li>
            <li><strong>Itemize what is included.</strong> Clients will pay more when they see the detailed list of tasks covered.</li>
            <li><strong>Use the deep clean as a gateway.</strong> After the initial deep clean, convert clients to a recurring plan at the standard rate.</li>
            <li><strong>Set time expectations.</strong> Tell clients a deep clean takes 4&ndash;6 hours for a typical 3-bed home so they understand the price difference.</li>
            <li><strong>Price by value, not just time.</strong> A deep clean transforms a home. Charge accordingly.</li>
          </ul>
        `,
      },
    ],
    calculatorHTML: `
      <h2>Calculate Your Deep Cleaning Price</h2>
      <form id="calcForm" onsubmit="return calcPrice(event)">
        <div class="calc-grid">
          <div class="calc-field">
            <label for="beds">Bedrooms</label>
            <input type="number" id="beds" value="3" min="1" max="10">
          </div>
          <div class="calc-field">
            <label for="baths">Bathrooms</label>
            <input type="number" id="baths" value="2" min="1" max="10">
          </div>
          <div class="calc-field">
            <label for="sqft">Square Footage</label>
            <input type="number" id="sqft" value="1500" min="200" max="20000" step="100">
          </div>
          <div class="calc-field full">
            <label for="condition">Home Condition</label>
            <select id="condition">
              <option value="maintained">Well Maintained</option>
              <option value="average" selected>Average</option>
              <option value="neglected">Neglected (3+ months)</option>
            </select>
          </div>
        </div>
        <button type="submit" class="calc-btn">Calculate Deep Clean Price</button>
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
        <p class="calc-note">Deep clean estimates. Includes inside appliances, baseboards, and detail work.</p>
      </div>
      <script>
      function calcPrice(e){
        e.preventDefault();
        var beds=parseInt(document.getElementById('beds').value)||3;
        var baths=parseInt(document.getElementById('baths').value)||2;
        var sqft=parseInt(document.getElementById('sqft').value)||1500;
        var condition=document.getElementById('condition').value;
        var baseRate=40;var sqftFactor=0.01;var minTicket=100;
        var baseHours=sqft*sqftFactor+beds*0.25+baths*0.5;
        var condMult=1.5;
        if(condition==='maintained')condMult=1.4;
        if(condition==='neglected')condMult=1.85;
        var total=Math.max(baseRate*baseHours*condMult,minTicket*1.5);
        var good=Math.round(total*0.8);
        var better=Math.round(total);
        var best=Math.round(total*1.3);
        document.getElementById('priceGood').innerHTML='$'+good;
        document.getElementById('priceBetter').innerHTML='$'+better;
        document.getElementById('priceBest').innerHTML='$'+best;
        document.getElementById('calcResults').style.display='block';
        document.getElementById('calcResults').style.animation='fadeUp 0.4s ease-out';
        return false;
      }
      </script>
    `,
    faq: [
      {
        question: "How much does a deep cleaning cost?",
        answer: "A deep cleaning for a 3-bedroom, 2-bathroom home typically costs between $200 and $400 depending on square footage and condition. Neglected homes may cost more due to extra time and supplies required.",
      },
      {
        question: "How long does a deep clean take?",
        answer: "A thorough deep clean takes 4 to 8 hours for a typical 3-bedroom home, depending on condition. Plan for 2 to 3 times longer than a standard cleaning.",
      },
      {
        question: "What is the difference between a deep clean and regular clean?",
        answer: "A regular clean covers surfaces, vacuuming, mopping, and bathroom sanitizing. A deep clean adds inside appliances, baseboards, detailed grout work, interior windows, behind furniture, and other neglected areas.",
      },
      {
        question: "Should I deep clean before starting a recurring schedule?",
        answer: "Yes. Starting with a deep clean brings the home up to a maintainable standard. Without it, your regular cleans will take longer and yield worse results, leading to client dissatisfaction.",
      },
      {
        question: "How do I charge for a deep clean vs. move-in/move-out?",
        answer: "Move-in/move-out cleans are essentially deep cleans with additional expectations for perfection (empty home, deposit-related standards). Price them at 1.75x to 2x your standard rate, compared to 1.5x for a standard deep clean.",
      },
    ],
    toolkitCTA: "Explore More Free Cleaning Business Tools",
  });
}

export function getMoveInOutCleaningCalculatorPage(): string {
  return renderSEOPage({
    slug: "move-in-out-cleaning-calculator",
    title: "Move In/Move Out Cleaning Price Calculator - QuotePro",
    metaDescription: "Calculate move-in and move-out cleaning costs instantly. Free pricing tool based on property size, condition, and extras. Trusted by cleaning professionals.",
    h1: "Move In / Move Out Cleaning Price Calculator",
    introParagraph: "Get instant pricing for move-in and move-out cleaning jobs. These jobs require the highest level of detail and command premium rates. Use our calculator to quote with confidence.",
    sections: [
      {
        id: "move-clean-pricing",
        heading: "How to Price Move-In/Move-Out Cleaning",
        level: "h2",
        content: `
          <p>Move-in/move-out cleaning is the most profitable service type for cleaning businesses. The empty home allows you to reach every surface, and clients (or landlords) expect deposit-level perfection.</p>
          <p>Pricing formula:</p>
          <ol>
            <li><strong>Start with your standard rate</strong> based on property square footage and room count.</li>
            <li><strong>Apply a 2x multiplier.</strong> Move cleans take roughly twice as long as standard cleans.</li>
            <li><strong>Adjust for extras.</strong> Garage cleaning, appliance deep-cleaning, and carpet spot treatment are common add-ons.</li>
            <li><strong>Never discount below 1.75x.</strong> The detail work required makes these jobs significantly more labor-intensive.</li>
          </ol>
        `,
      },
      {
        id: "what-to-include",
        heading: "What to Include in a Move Clean",
        level: "h2",
        content: `
          <ul>
            <li>All standard and deep clean tasks</li>
            <li>Inside all cabinets, drawers, and closets</li>
            <li>Inside oven, refrigerator, dishwasher, and microwave</li>
            <li>All light fixtures, switch plates, and outlet covers</li>
            <li>Window sills, tracks, and interior glass</li>
            <li>Garage sweeping (if applicable)</li>
            <li>Wall spot cleaning and baseboard detailing</li>
          </ul>
        `,
      },
      {
        id: "tips",
        heading: "Tips for Move-In/Move-Out Jobs",
        level: "h2",
        content: `
          <ul>
            <li><strong>Get clear expectations in writing.</strong> Property managers often have specific checklists. Ask for them upfront.</li>
            <li><strong>Charge a premium for occupied move-outs.</strong> Cleaning around furniture and belongings adds significant time.</li>
            <li><strong>Take before/after photos.</strong> Protect yourself and build your portfolio at the same time.</li>
            <li><strong>Offer a guarantee.</strong> A "move-in ready" guarantee builds trust and justifies premium pricing.</li>
            <li><strong>Build relationships with realtors and property managers.</strong> They are the highest-volume source of move clean leads.</li>
          </ul>
        `,
      },
    ],
    calculatorHTML: `
      <h2>Calculate Your Move-In/Move-Out Price</h2>
      <form id="calcForm" onsubmit="return calcPrice(event)">
        <div class="calc-grid">
          <div class="calc-field">
            <label for="beds">Bedrooms</label>
            <input type="number" id="beds" value="3" min="1" max="10">
          </div>
          <div class="calc-field">
            <label for="baths">Bathrooms</label>
            <input type="number" id="baths" value="2" min="1" max="10">
          </div>
          <div class="calc-field">
            <label for="sqft">Square Footage</label>
            <input type="number" id="sqft" value="1500" min="200" max="20000" step="100">
          </div>
          <div class="calc-field full">
            <label for="extras">Extras</label>
            <select id="extras">
              <option value="none">No Extras</option>
              <option value="garage">+ Garage Cleaning</option>
              <option value="carpets">+ Carpet Treatment</option>
              <option value="both">+ Garage & Carpets</option>
            </select>
          </div>
        </div>
        <button type="submit" class="calc-btn">Calculate Move Clean Price</button>
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
        <p class="calc-note">Move-in/move-out estimates. Premium pricing for deposit-level results.</p>
      </div>
      <script>
      function calcPrice(e){
        e.preventDefault();
        var beds=parseInt(document.getElementById('beds').value)||3;
        var baths=parseInt(document.getElementById('baths').value)||2;
        var sqft=parseInt(document.getElementById('sqft').value)||1500;
        var extras=document.getElementById('extras').value;
        var baseRate=40;var sqftFactor=0.01;var minTicket=100;
        var baseHours=sqft*sqftFactor+beds*0.25+baths*0.5;
        var total=Math.max(baseRate*baseHours*2,minTicket*2);
        if(extras==='garage')total+=75;
        if(extras==='carpets')total+=100;
        if(extras==='both')total+=150;
        var good=Math.round(total*0.85);
        var better=Math.round(total);
        var best=Math.round(total*1.25);
        document.getElementById('priceGood').innerHTML='$'+good;
        document.getElementById('priceBetter').innerHTML='$'+better;
        document.getElementById('priceBest').innerHTML='$'+best;
        document.getElementById('calcResults').style.display='block';
        document.getElementById('calcResults').style.animation='fadeUp 0.4s ease-out';
        return false;
      }
      </script>
    `,
    faq: [
      {
        question: "How much does a move-out cleaning cost?",
        answer: "Move-out cleaning for a 3-bedroom, 2-bathroom home typically costs $300 to $500. This includes inside all cabinets, appliances, and detailed baseboard work. Larger homes and those in poor condition cost more.",
      },
      {
        question: "Is move-in cleaning the same as move-out cleaning?",
        answer: "Essentially yes. Both require deposit-level attention to detail. Move-in cleans sometimes include less appliance work if the home was recently cleaned, but the scope is generally the same.",
      },
      {
        question: "How long does a move-out clean take?",
        answer: "Expect 5 to 10 hours for a typical 3-bedroom home. Move cleans take roughly twice as long as standard cleanings because every surface, cabinet interior, and fixture must be detailed.",
      },
      {
        question: "Should I charge extra for garage cleaning?",
        answer: "Yes. Garage cleaning is not a standard inclusion and adds 30 to 60 minutes. Charge $50 to $100 extra depending on the garage size and condition.",
      },
      {
        question: "How do I get more move-in/move-out clients?",
        answer: "Partner with local realtors, property management companies, and apartment complexes. These relationships provide the highest-volume, most consistent source of move cleaning jobs.",
      },
    ],
    toolkitCTA: "Explore More Free Cleaning Business Tools",
  });
}
