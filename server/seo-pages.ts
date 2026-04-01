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
  scopeItems?: string[];
  serviceLabel?: string;
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

.free-badge-row{display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.35rem}
.free-badge{display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.75rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;border-radius:20px;box-shadow:0 2px 8px rgba(5,150,105,0.25)}
.free-badge svg{width:12px;height:12px}
.free-subtext{text-align:center;font-size:0.82rem;color:#64748b;margin-bottom:1.25rem}
.calc-wrapper{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:2rem;margin:2rem 0;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
.calc-wrapper h2{font-size:1.35rem;font-weight:700;color:#0f172a;margin-bottom:0.35rem;text-align:center}
.quote-upsell-text{text-align:center;font-size:0.88rem;color:#475569;font-weight:500;margin-bottom:0.75rem;margin-top:0.25rem}
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

.quote-preview{display:none;margin-top:2rem;animation:fadeUp 0.5s ease-out}
.quote-card{background:#fff;border:2px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)}
.quote-card-header{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:1.25rem 1.5rem;display:flex;align-items:center;gap:0.75rem}
.quote-card-header svg{width:24px;height:24px;color:#fff;flex-shrink:0}
.quote-card-header h3{color:#fff;font-size:1.1rem;font-weight:700;margin:0}
.quote-card-header span{color:rgba(255,255,255,0.7);font-size:0.8rem;font-weight:500}
.quote-card-body{padding:1.5rem}
.quote-row{display:flex;justify-content:space-between;align-items:center;padding:0.65rem 0;border-bottom:1px solid #f1f5f9}
.quote-row:last-child{border-bottom:none}
.quote-row-label{font-size:0.85rem;color:#64748b;font-weight:500}
.quote-row-value{font-size:0.9rem;color:#0f172a;font-weight:600}
.quote-row-value.price{font-size:1.15rem;color:#2563eb;font-weight:800}
.quote-card-footer{padding:1.25rem 1.5rem;background:#f8fafc;border-top:1px solid #e2e8f0}
.generate-quote-btn{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.85rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;font-size:0.95rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(5,150,105,0.3)}
.generate-quote-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(5,150,105,0.35)}
.generate-quote-btn svg{width:18px;height:18px}

.proposal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);overflow-y:auto;padding:2rem 1rem}
.proposal-container{max-width:680px;margin:0 auto;animation:fadeUp 0.4s ease-out}
.proposal-close{display:flex;align-items:center;gap:0.5rem;color:rgba(255,255,255,0.8);font-size:0.85rem;font-weight:500;background:none;border:none;cursor:pointer;margin-bottom:1rem;padding:0.5rem 0}
.proposal-close:hover{color:#fff}
.proposal-doc{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.2)}
.proposal-doc-header{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%);padding:2.5rem 2rem;text-align:center;color:#fff}
.proposal-doc-header h2{font-size:1.5rem;font-weight:800;margin-bottom:0.25rem;letter-spacing:-0.02em}
.proposal-doc-header p{color:rgba(255,255,255,0.75);font-size:0.88rem;font-weight:400}
.proposal-section{padding:1.5rem 2rem;border-bottom:1px solid #f1f5f9}
.proposal-section:last-child{border-bottom:none}
.proposal-section-title{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#2563eb;margin-bottom:1rem}
.proposal-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem}
.proposal-detail{background:#f8fafc;border-radius:10px;padding:0.85rem 1rem}
.proposal-detail-label{font-size:0.72rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.2rem}
.proposal-detail-value{font-size:0.95rem;color:#0f172a;font-weight:600}
.scope-list{list-style:none;padding:0}
.scope-list li{display:flex;align-items:flex-start;gap:0.6rem;padding:0.5rem 0;font-size:0.9rem;color:#334155}
.scope-list li svg{width:18px;height:18px;color:#059669;flex-shrink:0;margin-top:1px}
.proposal-price-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #bfdbfe;border-radius:14px;padding:1.5rem;text-align:center}
.proposal-price-label{font-size:0.78rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.35rem}
.proposal-price-amount{font-size:2.5rem;font-weight:800;color:#1e3a8a;letter-spacing:-0.02em}
.proposal-price-note{font-size:0.78rem;color:#64748b;margin-top:0.35rem}
.proposal-addons{margin-top:1rem}
.proposal-addon-item{display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.85rem;background:#fefce8;border-radius:8px;margin-bottom:0.5rem;font-size:0.85rem}
.proposal-addon-name{color:#854d0e;font-weight:500}
.proposal-addon-price{color:#a16207;font-weight:700}
.proposal-cta-section{padding:1.5rem 2rem 2rem;text-align:center}
.send-quote-btn{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:1rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1.05rem;font-weight:700;border:none;border-radius:14px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(37,99,235,0.35)}
.send-quote-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,99,235,0.4)}
.send-quote-btn svg{width:20px;height:20px}
.proposal-cta-note{font-size:0.78rem;color:#94a3b8;margin-top:0.75rem}

.signup-modal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:2000;background:rgba(15,23,42,0.7);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:1rem}
.signup-modal{background:#fff;border-radius:20px;max-width:420px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.25);animation:fadeUp 0.35s ease-out;overflow:hidden}
.signup-modal-header{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:2rem 2rem 1.5rem;text-align:center;color:#fff}
.signup-modal-header h3{font-size:1.25rem;font-weight:700;margin-bottom:0.35rem}
.signup-modal-header p{color:rgba(255,255,255,0.75);font-size:0.85rem}
.signup-modal-body{padding:1.5rem 2rem 2rem}
.signup-field{margin-bottom:1rem}
.signup-field label{display:block;font-size:0.8rem;font-weight:600;color:#475569;margin-bottom:0.35rem;text-transform:uppercase;letter-spacing:0.04em}
.signup-field input{width:100%;padding:0.7rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;font-family:inherit;color:#0f172a;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s}
.signup-field input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
.signup-submit{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.85rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(37,99,235,0.3);margin-top:0.5rem}
.signup-submit:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,0.35)}
.signup-submit:disabled{opacity:0.6;cursor:not-allowed;transform:none}
.signup-error{background:#fef2f2;color:#dc2626;border-radius:8px;padding:0.65rem 0.85rem;font-size:0.82rem;font-weight:500;margin-bottom:1rem;display:none}
.signup-modal-footer{text-align:center;padding:0 2rem 1.5rem;font-size:0.78rem;color:#94a3b8}
.signup-modal-close{position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:background 0.2s}
.signup-modal-close:hover{background:rgba(255,255,255,0.25)}

@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

@media(max-width:640px){
  .seo-header{padding:2rem 1.25rem 2rem}
  .seo-header h1{font-size:1.65rem}
  .page-body{padding:1.5rem 1.25rem 3rem}
  .calc-grid{grid-template-columns:1fr}
  .tier-cards{grid-template-columns:1fr}
  .tier-card{padding:1rem}
  .toolkit-cta{padding:2rem 1.5rem}
  .proposal-detail-grid{grid-template-columns:1fr}
  .proposal-doc-header{padding:2rem 1.5rem}
  .proposal-section{padding:1.25rem 1.5rem}
  .proposal-cta-section{padding:1.25rem 1.5rem 1.5rem}
  .proposal-price-amount{font-size:2rem}
  .signup-modal-header{padding:1.5rem 1.5rem 1.25rem}
  .signup-modal-body{padding:1.25rem 1.5rem 1.5rem}
}
</style>
</head>
<body>

<header class="seo-header">
  <nav class="breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/calculators">Calculators</a> &rsaquo; ${config.h1}</nav>
  <h1>${config.h1}</h1>
  <p class="intro">${config.introParagraph}</p>
</header>

<div class="page-body">
  ${sectionsHTML}

  <div class="calc-wrapper" id="calculator">
    <div class="free-badge-row">
      <span class="free-badge"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> Free Tool</span>
    </div>
    ${config.calculatorHTML}
    <p class="free-subtext">This calculator is completely free to use. No signup required.</p>

    <div class="quote-preview" id="quotePreview">
      <p class="quote-upsell-text">Want to send this as a professional quote to your customer?</p>
      <div class="quote-card">
        <div class="quote-card-header">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
          <div>
            <h3>Your Estimate Preview</h3>
            <span>Based on your inputs</span>
          </div>
        </div>
        <div class="quote-card-body">
          <div class="quote-row"><span class="quote-row-label">Service Type</span><span class="quote-row-value" id="qpServiceType">--</span></div>
          <div class="quote-row"><span class="quote-row-label">Home Size</span><span class="quote-row-value" id="qpSqft">--</span></div>
          <div class="quote-row"><span class="quote-row-label">Bedrooms</span><span class="quote-row-value" id="qpBeds">--</span></div>
          <div class="quote-row"><span class="quote-row-label">Bathrooms</span><span class="quote-row-value" id="qpBaths">--</span></div>
          <div class="quote-row"><span class="quote-row-label">Estimated Price</span><span class="quote-row-value price" id="qpPrice">--</span></div>
        </div>
        <div class="quote-card-footer">
          <button class="generate-quote-btn" onclick="showProposal()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
            Generate Professional Quote
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="proposal-overlay" id="proposalOverlay">
    <div class="proposal-container">
      <button class="proposal-close" onclick="hideProposal()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
        Back to Calculator
      </button>
      <div class="proposal-doc">
        <div class="proposal-doc-header">
          <h2>Cleaning Service Proposal</h2>
          <p>Professional Estimate</p>
        </div>
        <div class="proposal-section">
          <div class="proposal-section-title">Service Details</div>
          <div class="proposal-detail-grid">
            <div class="proposal-detail"><div class="proposal-detail-label">Service</div><div class="proposal-detail-value" id="prServiceType">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Frequency</div><div class="proposal-detail-value" id="prFrequency">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Bedrooms</div><div class="proposal-detail-value" id="prBeds">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Bathrooms</div><div class="proposal-detail-value" id="prBaths">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Square Footage</div><div class="proposal-detail-value" id="prSqft">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Date</div><div class="proposal-detail-value" id="prDate">--</div></div>
          </div>
        </div>
        <div class="proposal-section">
          <div class="proposal-section-title">Scope of Work</div>
          <ul class="scope-list" id="prScopeList"></ul>
        </div>
        <div class="proposal-section">
          <div class="proposal-section-title">Estimated Investment</div>
          <div class="proposal-price-box">
            <div class="proposal-price-label">Recommended Price</div>
            <div class="proposal-price-amount" id="prPriceAmount">$0</div>
            <div class="proposal-price-note">Based on "Better" tier pricing</div>
          </div>
          <div class="proposal-addons" id="prAddons"></div>
        </div>
        <div class="proposal-cta-section">
          <button class="send-quote-btn" onclick="handleSendQuote()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
            Send This Quote to Your Customer
          </button>
          <p class="proposal-cta-note">Create your free QuotePro account to send, track, and manage professional quotes</p>
        </div>
      </div>
    </div>
  </div>

  <div class="signup-modal-overlay" id="signupOverlay">
    <div class="signup-modal" style="position:relative">
      <button class="signup-modal-close" onclick="hideSignup()">&times;</button>
      <div class="signup-modal-header">
        <h3>Create Your Free Account</h3>
        <p>Send this quote and manage all your estimates in one place</p>
      </div>
      <div class="signup-modal-body">
        <div class="signup-error" id="signupError"></div>
        <div class="signup-field">
          <label for="signupEmail">Email</label>
          <input type="email" id="signupEmail" placeholder="you@company.com">
        </div>
        <div class="signup-field">
          <label for="signupPassword">Password</label>
          <input type="password" id="signupPassword" placeholder="Create a password (min. 6 characters)">
        </div>
        <button class="signup-submit" id="signupSubmitBtn" onclick="submitSignup()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
          Create Account &amp; Send Quote
        </button>
      </div>
      <div class="signup-modal-footer">By signing up you agree to our Terms of Service</div>
    </div>
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

var _quoteData = {};
var _serviceLabels = {regular:'Regular Cleaning',deep_clean:'Deep Cleaning',move_in_out:'Move In / Move Out'};
var _freqLabels = {'one-time':'One-Time',weekly:'Weekly',biweekly:'Bi-Weekly',monthly:'Monthly'};
var _defaultScopeItems = {
  regular: ['Dust all surfaces and furniture','Vacuum and mop all floors','Clean and sanitize bathrooms','Clean kitchen counters and appliances','Empty trash and replace liners','Wipe mirrors and glass surfaces'],
  deep_clean: ['All standard cleaning tasks','Inside oven, microwave, and refrigerator','Baseboard and wall spot cleaning','Interior window and track detailing','Behind and under furniture','Detailed grout and tile scrubbing','Light fixtures and ceiling fans','Cabinet fronts and door frames'],
  move_in_out: ['Complete deep cleaning of all rooms','Inside all cabinets, drawers, and closets','Inside all appliances','All light fixtures and switch plates','Window sills, tracks, and interior glass','Wall spot cleaning and baseboard detailing','Garage sweeping (if applicable)','Move-in/move-out ready guarantee']
};
var _customScopeItems = ${config.scopeItems ? JSON.stringify(config.scopeItems) : 'null'};
var _customServiceLabel = ${config.serviceLabel ? JSON.stringify(config.serviceLabel) : 'null'};
var _checkSvg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>';

function updateQuotePreview(data) {
  _quoteData = data;
  var st = data.service_type || 'regular';
  document.getElementById('qpServiceType').textContent = _customServiceLabel || _serviceLabels[st] || st;
  document.getElementById('qpSqft').textContent = (data.square_footage || 0).toLocaleString() + ' sq ft';
  document.getElementById('qpBeds').textContent = data.bedrooms || 0;
  document.getElementById('qpBaths').textContent = data.bathrooms || 0;
  document.getElementById('qpPrice').textContent = '$' + (data.estimated_price || 0);
  document.getElementById('quotePreview').style.display = 'block';
  document.getElementById('quotePreview').style.animation = 'fadeUp 0.5s ease-out';
}

function showProposal() {
  var d = _quoteData;
  var st = d.service_type || 'regular';
  var serviceLabel = _customServiceLabel || _serviceLabels[st] || st;
  document.getElementById('prServiceType').textContent = serviceLabel;
  document.getElementById('prFrequency').textContent = _freqLabels[d.frequency] || d.frequency || 'One-Time';
  document.getElementById('prBeds').textContent = d.bedrooms || 0;
  document.getElementById('prBaths').textContent = d.bathrooms || 0;
  document.getElementById('prSqft').textContent = (d.square_footage || 0).toLocaleString() + ' sq ft';
  document.getElementById('prDate').textContent = new Date().toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'});
  document.getElementById('prPriceAmount').textContent = '$' + (d.estimated_price || 0);

  var items = _customScopeItems || _defaultScopeItems[st] || _defaultScopeItems.regular;
  document.getElementById('prScopeList').innerHTML = items.map(function(t){return '<li>'+_checkSvg+' '+t+'</li>';}).join('');

  var addonsHtml = '';
  if (d.add_ons) {
    var addons = d.add_ons;
    if (addons.garage) addonsHtml += '<div class="proposal-addon-item"><span class="proposal-addon-name">Garage Cleaning</span><span class="proposal-addon-price">+$75</span></div>';
    if (addons.carpets) addonsHtml += '<div class="proposal-addon-item"><span class="proposal-addon-name">Carpet Treatment</span><span class="proposal-addon-price">+$100</span></div>';
  }
  document.getElementById('prAddons').innerHTML = addonsHtml;

  document.getElementById('proposalOverlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
  window.scrollTo(0,0);
}

function hideProposal() {
  document.getElementById('proposalOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function handleSendQuote() {
  document.getElementById('signupOverlay').style.display = 'flex';
}

function hideSignup() {
  document.getElementById('signupOverlay').style.display = 'none';
  document.getElementById('signupError').style.display = 'none';
}

function submitSignup() {
  var email = document.getElementById('signupEmail').value.trim();
  var password = document.getElementById('signupPassword').value;
  var errEl = document.getElementById('signupError');
  var btn = document.getElementById('signupSubmitBtn');

  if (!email || !password) { errEl.textContent = 'Please enter both email and password.'; errEl.style.display = 'block'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display = 'block'; return; }

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = 'Creating account...';

  fetch('/api/public/calculator-signup', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    credentials: 'include',
    body: JSON.stringify({ email: email, password: password, quoteData: _quoteData })
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,data:d}; }); })
  .then(function(res){
    if (!res.ok) { throw new Error(res.data.message || 'Signup failed'); }
    window.location.href = res.data.redirectUrl || '/app/dashboard';
  })
  .catch(function(err){
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Create Account & Send Quote';
  });
}

document.getElementById('proposalOverlay').addEventListener('click', function(e){
  if (e.target === this) hideProposal();
});
document.getElementById('signupOverlay').addEventListener('click', function(e){
  if (e.target === this) hideSignup();
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
        updateQuotePreview({service_type:serviceType,square_footage:sqft,bedrooms:beds,bathrooms:baths,estimated_price:better,frequency:frequency,add_ons:{}});
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
        updateQuotePreview({service_type:'deep_clean',square_footage:sqft,bedrooms:beds,bathrooms:baths,estimated_price:better,frequency:'one-time',add_ons:{}});
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
        var addOns={};if(extras==='garage'){addOns.garage=true}if(extras==='carpets'){addOns.carpets=true}if(extras==='both'){addOns.garage=true;addOns.carpets=true}
        updateQuotePreview({service_type:'move_in_out',square_footage:sqft,bedrooms:beds,bathrooms:baths,estimated_price:better,frequency:'one-time',add_ons:addOns});
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

export function getCleaningQuoteGeneratorPage(): string {
  const baseUrl = getBaseUrl();
  const canonicalUrl = `${baseUrl}/cleaning-quote-generator`;
  const faq: FAQItem[] = [
    { question: "How much should I charge for a house cleaning?", answer: "House cleaning prices typically range from $120 to $350+ depending on the home size, condition, and service type. Standard cleaning for a 3-bedroom, 2-bathroom home averages $180 to $240. Deep cleaning costs 40-60% more. Use our free quote generator above to get an instant estimate." },
    { question: "What should a professional cleaning quote include?", answer: "A professional cleaning quote should include the service type, property details (bedrooms, bathrooms, square footage), scope of work, any add-on services, pricing tiers, frequency discounts, and an expiration date. QuotePro generates all of this automatically." },
    { question: "How do I send a cleaning estimate to a customer?", answer: "With QuotePro, generate your estimate using the calculator above, then click 'Send This Quote to Your Customer.' Create a free account and your quote is instantly saved. From your dashboard, you can email a professional PDF proposal directly to your customer." },
    { question: "Should I offer Good/Better/Best pricing?", answer: "Yes. Tiered pricing (Good/Better/Best) is proven to increase average ticket size by 15-25%. Most customers choose the middle option. QuotePro automatically generates three pricing tiers for every quote." },
    { question: "How do I price recurring cleaning services?", answer: "Recurring services are typically discounted: weekly (15-20% off), biweekly (10-15% off), monthly (5-10% off). The recurring discount is offset by guaranteed revenue and reduced customer acquisition costs." },
    { question: "What add-ons increase my cleaning revenue?", answer: "The highest-value add-ons are inside oven cleaning ($35-50), inside refrigerator cleaning ($30-45), interior window cleaning ($40-75), carpet cleaning, and garage cleaning. Offering add-ons can increase your average ticket by 20-35%." },
    { question: "Is this quote generator free?", answer: "Yes. The quote generator is completely free to use with no signup required. If you want to save and send professional proposals to customers, you can create a free QuotePro account." },
  ];
  const faqSchemaJSON = faqSchema(faq);
  const faqHTML = faq.map(f => `<div class="faq-item"><h3 class="faq-q">${f.question}</h3><p class="faq-a">${f.answer}</p></div>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Cleaning Quote Generator | Create Cleaning Estimates Online</title>
<meta name="description" content="Generate professional cleaning quotes in seconds. Create residential or commercial cleaning estimates and send proposals to customers.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:title" content="Cleaning Quote Generator | Create Cleaning Estimates Online">
<meta property="og:description" content="Generate professional cleaning quotes in seconds. Create residential or commercial cleaning estimates and send proposals to customers.">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonicalUrl}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Cleaning Quote Generator | Create Cleaning Estimates Online">
<meta name="twitter:description" content="Generate professional cleaning quotes in seconds. Create residential or commercial cleaning estimates and send proposals to customers.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script type="application/ld+json">${faqSchemaJSON}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:#0f172a;background:#f8fafc;-webkit-font-smoothing:antialiased;line-height:1.7}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}

.hero{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 40%,#3b82f6 100%);color:#fff;padding:4rem 1.5rem 3.5rem;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 50%,rgba(255,255,255,0.04) 0%,transparent 50%);pointer-events:none}
.hero h1{font-size:2.5rem;font-weight:800;line-height:1.15;margin-bottom:0.75rem;letter-spacing:-0.03em;max-width:700px;margin-left:auto;margin-right:auto;position:relative}
.hero .sub{max-width:540px;margin:0 auto 2rem;font-size:1.1rem;color:rgba(255,255,255,0.85);line-height:1.6;position:relative}
.hero-btns{display:flex;align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;position:relative}
.hero-btn-primary{display:inline-flex;align-items:center;gap:0.5rem;padding:0.85rem 2rem;background:#fff;color:#1e3a8a;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(0,0,0,0.15)}
.hero-btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.2);text-decoration:none}
.hero-btn-secondary{display:inline-flex;align-items:center;gap:0.5rem;padding:0.85rem 2rem;background:rgba(255,255,255,0.12);color:#fff;font-size:1rem;font-weight:600;border:1.5px solid rgba(255,255,255,0.3);border-radius:12px;cursor:pointer;transition:all 0.2s;backdrop-filter:blur(4px)}
.hero-btn-secondary:hover{background:rgba(255,255,255,0.2);border-color:rgba(255,255,255,0.5);text-decoration:none}
.hero-trust{margin-top:2rem;display:flex;align-items:center;justify-content:center;gap:1.5rem;flex-wrap:wrap;position:relative}
.hero-trust span{font-size:0.8rem;color:rgba(255,255,255,0.6);display:flex;align-items:center;gap:0.35rem}
.hero-trust svg{width:14px;height:14px}

.page-body{max-width:800px;margin:0 auto;padding:2.5rem 1.5rem 4rem}

.free-badge-row{display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.5rem}
.free-badge{display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.75rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;border-radius:20px;box-shadow:0 2px 8px rgba(5,150,105,0.25)}
.free-badge svg{width:12px;height:12px}
.free-subtext{text-align:center;font-size:0.82rem;color:#64748b;margin-bottom:1.25rem}

.gen-wrapper{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:2rem;margin-bottom:2.5rem;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
.gen-wrapper h2{font-size:1.35rem;font-weight:700;color:#0f172a;margin-bottom:0.35rem;text-align:center}

.calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.calc-field{display:flex;flex-direction:column;gap:0.35rem}
.calc-field.full{grid-column:1/-1}
.calc-field label{font-size:0.82rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em}
.calc-field input,.calc-field select{padding:0.65rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;font-family:inherit;color:#0f172a;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s}
.calc-field input:focus,.calc-field select:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}

.addons-section{margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9}
.addons-title{font-size:0.82rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.75rem}
.addons-grid{display:flex;flex-wrap:wrap;gap:0.5rem}
.addon-chip{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.85rem;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all 0.2s;font-size:0.85rem;color:#475569;user-select:none}
.addon-chip:hover{border-color:#93c5fd;background:#eff6ff}
.addon-chip.active{background:#eff6ff;border-color:#3b82f6;color:#1e40af}
.addon-chip input{display:none}
.addon-check{width:16px;height:16px;border:1.5px solid #cbd5e1;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0}
.addon-chip.active .addon-check{background:#2563eb;border-color:#2563eb}
.addon-chip.active .addon-check svg{display:block}
.addon-check svg{display:none;width:10px;height:10px;color:#fff}
.addon-price{font-size:0.75rem;color:#94a3b8;font-weight:500}

.calc-btn{display:block;width:100%;padding:0.85rem;margin-top:1.25rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;box-shadow:0 4px 14px rgba(37,99,235,0.3)}
.calc-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,0.35)}
.calc-btn:active{transform:translateY(0)}

.quote-result{display:none;margin-top:2rem;animation:fadeUp 0.5s ease-out}
.proposal-card{background:#fff;border:2px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)}
.proposal-header{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:1.5rem;text-align:center;color:#fff}
.proposal-header h3{font-size:1.2rem;font-weight:700;margin-bottom:0.15rem}
.proposal-header span{font-size:0.8rem;color:rgba(255,255,255,0.7)}
.proposal-body{padding:1.5rem}
.proposal-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem}
.proposal-item{background:#f8fafc;border-radius:10px;padding:0.75rem 1rem}
.proposal-item-label{font-size:0.72rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.15rem}
.proposal-item-value{font-size:0.95rem;color:#0f172a;font-weight:600}
.scope-title{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#2563eb;margin-bottom:0.75rem}
.scope-list{list-style:none;padding:0;margin-bottom:1.25rem}
.scope-list li{display:flex;align-items:flex-start;gap:0.5rem;padding:0.4rem 0;font-size:0.88rem;color:#334155}
.scope-list li svg{width:16px;height:16px;color:#059669;flex-shrink:0;margin-top:2px}
.addons-summary{margin-bottom:1.25rem}
.addon-line{display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.75rem;background:#fefce8;border-radius:8px;margin-bottom:0.35rem;font-size:0.85rem}
.addon-line-name{color:#854d0e;font-weight:500}
.addon-line-price{color:#a16207;font-weight:700}
.price-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #bfdbfe;border-radius:14px;padding:1.25rem;text-align:center;margin-bottom:1rem}
.price-label{font-size:0.78rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem}
.price-amount{font-size:2.25rem;font-weight:800;color:#1e3a8a;letter-spacing:-0.02em}
.price-note{font-size:0.75rem;color:#64748b;margin-top:0.25rem}

.conversion-cta{text-align:center;padding:1.25rem 1.5rem;background:#f8fafc;border-top:1px solid #e2e8f0}
.upsell-text{font-size:0.9rem;color:#475569;font-weight:500;margin-bottom:0.75rem}
.send-btn{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.9rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(5,150,105,0.3)}
.send-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(5,150,105,0.35)}
.send-btn svg{width:18px;height:18px}

.signup-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:2000;background:rgba(15,23,42,0.7);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:1rem}
.signup-modal{background:#fff;border-radius:20px;max-width:420px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.25);animation:fadeUp 0.35s ease-out;overflow:hidden;position:relative}
.signup-modal-header{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:2rem 2rem 1.5rem;text-align:center;color:#fff}
.signup-modal-header h3{font-size:1.2rem;font-weight:700;margin-bottom:0.35rem}
.signup-modal-header p{color:rgba(255,255,255,0.75);font-size:0.85rem}
.signup-modal-body{padding:1.5rem 2rem 2rem}
.signup-field{margin-bottom:1rem}
.signup-field label{display:block;font-size:0.8rem;font-weight:600;color:#475569;margin-bottom:0.35rem;text-transform:uppercase;letter-spacing:0.04em}
.signup-field input{width:100%;padding:0.7rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;font-family:inherit;color:#0f172a;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s}
.signup-field input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
.signup-submit{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.85rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(37,99,235,0.3);margin-top:0.5rem}
.signup-submit:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,0.35)}
.signup-submit:disabled{opacity:0.6;cursor:not-allowed;transform:none}
.signup-error{background:#fef2f2;color:#dc2626;border-radius:8px;padding:0.65rem 0.85rem;font-size:0.82rem;font-weight:500;margin-bottom:1rem;display:none}
.signup-close{position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:background 0.2s}
.signup-close:hover{background:rgba(255,255,255,0.25)}

.benefits{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:2.5rem 2rem;margin-bottom:2.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.04)}
.benefits h2{font-size:1.4rem;font-weight:700;color:#0f172a;text-align:center;margin-bottom:0.35rem;letter-spacing:-0.01em}
.benefits .benefits-sub{text-align:center;font-size:0.9rem;color:#64748b;margin-bottom:2rem;max-width:500px;margin-left:auto;margin-right:auto}
.benefits-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
.benefit-card{display:flex;gap:0.85rem;align-items:flex-start}
.benefit-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.benefit-icon svg{width:20px;height:20px;color:#fff}
.benefit-text h3{font-size:0.95rem;font-weight:700;color:#0f172a;margin-bottom:0.2rem}
.benefit-text p{font-size:0.82rem;color:#64748b;line-height:1.5}

.faq-section{margin-bottom:2.5rem}
.faq-section h2{font-size:1.4rem;font-weight:700;color:#0f172a;margin-bottom:1.25rem}
.faq-item{border-bottom:1px solid #e2e8f0;padding:1rem 0}
.faq-item:last-child{border-bottom:none}
.faq-q{font-size:1rem;font-weight:600;color:#1e293b;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:0.5rem}
.faq-q::after{content:'+';font-size:1.25rem;color:#94a3b8;transition:transform 0.2s;flex-shrink:0}
.faq-item.open .faq-q::after{transform:rotate(45deg)}
.faq-a{color:#475569;font-size:0.92rem;line-height:1.7;max-height:0;overflow:hidden;transition:max-height 0.3s ease,padding 0.3s ease;padding-top:0}
.faq-item.open .faq-a{max-height:500px;padding-top:0.75rem}

.final-cta{background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px;padding:2.5rem 2rem;text-align:center;color:#fff;margin-bottom:2.5rem}
.final-cta h2{font-size:1.35rem;font-weight:700;margin-bottom:0.5rem}
.final-cta p{color:rgba(255,255,255,0.75);font-size:0.95rem;margin-bottom:1.25rem;max-width:480px;margin-left:auto;margin-right:auto}
.final-cta a{display:inline-block;padding:0.75rem 2rem;background:#fff;color:#1e293b;font-weight:700;border-radius:10px;font-size:0.95rem;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:transform 0.15s}
.final-cta a:hover{transform:translateY(-1px);text-decoration:none}

.seo-footer{background:#1e293b;color:rgba(255,255,255,0.6);text-align:center;padding:2rem 1.5rem;font-size:0.82rem}
.seo-footer a{color:rgba(255,255,255,0.75)}

@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

@media(max-width:640px){
  .hero{padding:3rem 1.25rem 2.5rem}
  .hero h1{font-size:1.75rem}
  .page-body{padding:1.5rem 1.25rem 3rem}
  .calc-grid{grid-template-columns:1fr}
  .proposal-grid{grid-template-columns:1fr}
  .benefits-grid{grid-template-columns:1fr}
  .benefits{padding:2rem 1.5rem}
}
</style>
</head>
<body>

<header class="hero">
  <h1>Generate a Professional Cleaning Quote in 30 Seconds</h1>
  <p class="sub">Create polished cleaning quotes for residential or commercial jobs. Free to use, no signup required.</p>
  <div class="hero-btns">
    <a href="#generator" class="hero-btn-primary" onclick="document.getElementById('generator').scrollIntoView({behavior:'smooth'});return false">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
      Generate Quote
    </a>
    <a href="#example" class="hero-btn-secondary" onclick="showExample();return false">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
      View Example
    </a>
  </div>
  <div class="hero-trust">
    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> Free to use</span>
    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> No signup required</span>
    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> Instant results</span>
  </div>
</header>

<div class="page-body">
  <div class="gen-wrapper" id="generator">
    <div class="free-badge-row">
      <span class="free-badge"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> Free Tool</span>
    </div>
    <h2>Create Your Cleaning Quote</h2>
    <p class="free-subtext">This tool is completely free. No signup required.</p>

    <form id="quoteForm" onsubmit="return generateQuote(event)">
      <div class="calc-grid">
        <div class="calc-field">
          <label for="serviceType">Service Type</label>
          <select id="serviceType">
            <option value="regular" selected>Regular Cleaning</option>
            <option value="deep_clean">Deep Cleaning</option>
            <option value="move_in_out">Move In / Move Out</option>
          </select>
        </div>
        <div class="calc-field">
          <label for="sqft">Square Footage</label>
          <input type="number" id="sqft" value="1500" min="200" max="20000" step="100">
        </div>
        <div class="calc-field">
          <label for="beds">Bedrooms</label>
          <input type="number" id="beds" value="3" min="1" max="10">
        </div>
        <div class="calc-field">
          <label for="baths">Bathrooms</label>
          <input type="number" id="baths" value="2" min="1" max="10">
        </div>
      </div>

      <div class="addons-section">
        <div class="addons-title">Optional Add-ons</div>
        <div class="addons-grid">
          <label class="addon-chip" id="chip-oven" onclick="toggleAddon('oven')">
            <input type="checkbox" id="addon-oven">
            <span class="addon-check"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
            Inside Oven <span class="addon-price">+$45</span>
          </label>
          <label class="addon-chip" id="chip-fridge" onclick="toggleAddon('fridge')">
            <input type="checkbox" id="addon-fridge">
            <span class="addon-check"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
            Inside Fridge <span class="addon-price">+$40</span>
          </label>
          <label class="addon-chip" id="chip-windows" onclick="toggleAddon('windows')">
            <input type="checkbox" id="addon-windows">
            <span class="addon-check"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
            Interior Windows <span class="addon-price">+$60</span>
          </label>
        </div>
      </div>

      <button type="submit" class="calc-btn">Generate Quote</button>
    </form>

    <div class="quote-result" id="quoteResult">
      <div class="proposal-card">
        <div class="proposal-header">
          <h3>Cleaning Service Proposal</h3>
          <span id="proposalDate"></span>
        </div>
        <div class="proposal-body">
          <div class="proposal-grid">
            <div class="proposal-item"><div class="proposal-item-label">Service Type</div><div class="proposal-item-value" id="rServiceType">--</div></div>
            <div class="proposal-item"><div class="proposal-item-label">Home Size</div><div class="proposal-item-value" id="rSqft">--</div></div>
            <div class="proposal-item"><div class="proposal-item-label">Bedrooms</div><div class="proposal-item-value" id="rBeds">--</div></div>
            <div class="proposal-item"><div class="proposal-item-label">Bathrooms</div><div class="proposal-item-value" id="rBaths">--</div></div>
          </div>
          <div class="scope-title">Scope of Work</div>
          <ul class="scope-list" id="rScope"></ul>
          <div class="addons-summary" id="rAddons"></div>
          <div class="price-box">
            <div class="price-label">Estimated Investment</div>
            <div class="price-amount" id="rPrice">$0</div>
            <div class="price-note">Based on Better tier pricing</div>
          </div>
        </div>
        <div class="conversion-cta">
          <p class="upsell-text">Want to send this as a professional quote to your customer?</p>
          <button class="send-btn" onclick="showSignup()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
            Send This Quote to Your Customer
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="benefits" id="benefits">
    <h2>Why Cleaning Pros Use QuotePro</h2>
    <p class="benefits-sub">Everything you need to quote faster, close more jobs, and grow your cleaning business.</p>
    <div class="benefits-grid">
      <div class="benefit-card">
        <div class="benefit-icon" style="background:linear-gradient(135deg,#2563eb,#1d4ed8)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
        </div>
        <div class="benefit-text">
          <h3>Create Quotes Faster</h3>
          <p>Generate professional cleaning quotes in under 30 seconds. No spreadsheets, no guesswork.</p>
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon" style="background:linear-gradient(135deg,#059669,#047857)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
        </div>
        <div class="benefit-text">
          <h3>Send Professional Proposals</h3>
          <p>Impress customers with polished, branded proposals that build trust and win more jobs.</p>
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon" style="background:linear-gradient(135deg,#7c3aed,#6d28d9)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
        </div>
        <div class="benefit-text">
          <h3>Manage Your Leads</h3>
          <p>Track every lead, follow up automatically, and never lose a potential customer again.</p>
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon" style="background:linear-gradient(135deg,#ea580c,#c2410c)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>
        </div>
        <div class="benefit-text">
          <h3>Increase Close Rates</h3>
          <p>Businesses using QuotePro close 35% more jobs with professional proposals and automated follow-ups.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="faq-section">
    <h2>Frequently Asked Questions</h2>
    ${faqHTML}
  </div>

  <div class="final-cta">
    <h2>Ready to Send Professional Quotes?</h2>
    <p>Join thousands of cleaning professionals who quote faster and close more jobs with QuotePro.</p>
    <a href="#generator" onclick="document.getElementById('generator').scrollIntoView({behavior:'smooth'});return false">Generate Your First Quote</a>
  </div>
</div>

<footer class="seo-footer">
  <p>&copy; ${new Date().getFullYear()} QuotePro &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p>
</footer>

<div class="signup-overlay" id="signupOverlay">
  <div class="signup-modal">
    <button class="signup-close" onclick="hideSignup()">&times;</button>
    <div class="signup-modal-header">
      <h3>Save & Send Your Quote</h3>
      <p>Create a free QuotePro account to send this proposal to your customer.</p>
    </div>
    <div class="signup-modal-body">
      <div class="signup-error" id="signupError"></div>
      <div class="signup-field">
        <label for="signupEmail">Email Address</label>
        <input type="email" id="signupEmail" placeholder="you@company.com" required>
      </div>
      <div class="signup-field">
        <label for="signupPassword">Password</label>
        <input type="password" id="signupPassword" placeholder="At least 6 characters" minlength="6" required>
      </div>
      <button class="signup-submit" id="signupBtn" onclick="submitSignup()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
        Create Account & Send Quote
      </button>
    </div>
    <div style="text-align:center;padding:0 2rem 1.5rem;font-size:0.78rem;color:#94a3b8">
      Already have an account? Your quote will be added to your dashboard.
    </div>
  </div>
</div>

<script>
document.querySelectorAll('.faq-item').forEach(function(item){
  item.querySelector('.faq-q').addEventListener('click',function(){
    item.classList.toggle('open');
  });
});

var _quoteData = {};
var _checkSvg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>';
var _serviceLabels = {regular:'Regular Cleaning',deep_clean:'Deep Cleaning',move_in_out:'Move In / Move Out'};
var _scopeItems = {
  regular: ['Dust all surfaces and furniture','Vacuum and mop all floors','Clean and sanitize bathrooms','Clean kitchen counters and appliances','Empty trash and replace liners','Wipe mirrors and glass surfaces'],
  deep_clean: ['All standard cleaning tasks','Inside oven, microwave, and refrigerator','Baseboard and wall spot cleaning','Interior window and track detailing','Behind and under furniture','Detailed grout and tile scrubbing','Light fixtures and ceiling fans','Cabinet fronts and door frames'],
  move_in_out: ['Complete deep cleaning of all rooms','Inside all cabinets, drawers, and closets','Inside all appliances','All light fixtures and switch plates','Window sills, tracks, and interior glass','Wall spot cleaning and baseboard detailing','Garage sweeping (if applicable)','Move-in/move-out ready guarantee']
};
var _addonLabels = {oven:'Inside Oven Cleaning',fridge:'Inside Fridge Cleaning',windows:'Interior Window Cleaning'};
var _addonPrices = {oven:45,fridge:40,windows:60};

function toggleAddon(name) {
  var cb = document.getElementById('addon-'+name);
  cb.checked = !cb.checked;
  document.getElementById('chip-'+name).classList.toggle('active', cb.checked);
}

function generateQuote(e) {
  e.preventDefault();
  var st = document.getElementById('serviceType').value;
  var sqft = parseInt(document.getElementById('sqft').value) || 1500;
  var beds = parseInt(document.getElementById('beds').value) || 3;
  var baths = parseInt(document.getElementById('baths').value) || 2;

  var baseRate = 40;
  var baseHours = sqft * 0.01 + beds * 0.25 + baths * 0.5;
  var mult = 1;
  if (st === 'deep_clean') mult = 1.5;
  if (st === 'move_in_out') mult = 2;
  var total = Math.max(baseRate * baseHours * mult, 100 * mult);

  var addOns = {};
  var addonsHtml = '';
  ['oven','fridge','windows'].forEach(function(a){
    if (document.getElementById('addon-'+a).checked) {
      addOns[a] = true;
      total += _addonPrices[a];
      addonsHtml += '<div class="addon-line"><span class="addon-line-name">'+_addonLabels[a]+'</span><span class="addon-line-price">+$'+_addonPrices[a]+'</span></div>';
    }
  });

  var estimated = Math.round(total);

  document.getElementById('rServiceType').textContent = _serviceLabels[st] || st;
  document.getElementById('rSqft').textContent = sqft.toLocaleString() + ' sq ft';
  document.getElementById('rBeds').textContent = beds;
  document.getElementById('rBaths').textContent = baths;
  document.getElementById('proposalDate').textContent = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  document.getElementById('rPrice').textContent = '$' + estimated;

  var items = _scopeItems[st] || _scopeItems.regular;
  document.getElementById('rScope').innerHTML = items.map(function(t){return '<li>'+_checkSvg+' '+t+'</li>';}).join('');
  document.getElementById('rAddons').innerHTML = addonsHtml;

  _quoteData = {service_type:st, square_footage:sqft, bedrooms:beds, bathrooms:baths, estimated_price:estimated, frequency:'one-time', add_ons:addOns};

  var el = document.getElementById('quoteResult');
  el.style.display = 'block';
  el.style.animation = 'fadeUp 0.5s ease-out';
  el.scrollIntoView({behavior:'smooth',block:'start'});
  return false;
}

function showExample() {
  document.getElementById('serviceType').value = 'deep_clean';
  document.getElementById('sqft').value = '2200';
  document.getElementById('beds').value = '4';
  document.getElementById('baths').value = '3';
  document.getElementById('addon-oven').checked = true;
  document.getElementById('chip-oven').classList.add('active');
  document.getElementById('addon-fridge').checked = true;
  document.getElementById('chip-fridge').classList.add('active');
  generateQuote({preventDefault:function(){}});
}

function showSignup() {
  var ov = document.getElementById('signupOverlay');
  ov.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideSignup() {
  document.getElementById('signupOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('signupOverlay').addEventListener('click', function(e){
  if (e.target === this) hideSignup();
});

function submitSignup() {
  var email = document.getElementById('signupEmail').value.trim();
  var pw = document.getElementById('signupPassword').value;
  var errEl = document.getElementById('signupError');
  var btn = document.getElementById('signupBtn');

  errEl.style.display = 'none';

  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    errEl.textContent = 'Please enter a valid email address.';
    errEl.style.display = 'block';
    return;
  }
  if (!pw || pw.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';

  fetch('/api/public/calculator-signup', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email:email, password:pw, quoteData:_quoteData})
  })
  .then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d}})})
  .then(function(res){
    if (!res.ok) {
      errEl.textContent = res.data.message || 'Something went wrong.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg> Create Account & Send Quote';
      return;
    }
    window.location.href = res.data.redirectUrl || '/app/dashboard';
  })
  .catch(function(){
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg> Create Account & Send Quote';
  });
}
<\/script>

</body>
</html>`;
}

export function getUltimateCleaningPricingGuidePage(): string {
  return renderSEOPage({
    slug: "guides/cleaning-business-pricing-guide",
    title: "Ultimate Cleaning Business Pricing & Quoting Guide 2026 | QuotePro AI",
    metaDescription: "The complete 2026 guide to pricing cleaning services: residential rates, commercial formulas, Good/Better/Best quoting, add-on pricing, follow-up scripts, and tools to close more jobs.",
    h1: "The Ultimate Cleaning Business Pricing & Quoting Guide 2026",
    introParagraph: "Pricing is the single biggest lever in your cleaning business. Charge too little and you burn out; charge too much and phones go quiet. This guide covers everything — residential and commercial rate-setting, the Good/Better/Best quoting framework, add-on pricing, industry benchmarks, and the follow-up cadence that closes 40% more jobs.",
    sections: [
      {
        id: "pricing-fundamentals",
        heading: "Pricing Fundamentals: Know Your Numbers First",
        level: "h2",
        content: `
          <p>Before you quote a single job, you need to understand your true cost of service. Most cleaning businesses undercharge because they only account for product cost and labor — missing overhead, insurance, marketing, and their own unpaid time.</p>
          <h3>Calculate Your Fully-Loaded Hourly Cost</h3>
          <ul>
            <li><strong>Direct labor:</strong> Hourly wage + payroll taxes + benefits (multiply wages by 1.25–1.35 to get true labor cost)</li>
            <li><strong>Supplies:</strong> $0.03–0.07 per square foot depending on service type</li>
            <li><strong>Equipment:</strong> Amortize vacuums, steamers, and other tools over their useful life</li>
            <li><strong>Insurance:</strong> General liability + bonding + workers' comp (typically $150–400/month for a small operation)</li>
            <li><strong>Transportation:</strong> Fuel, vehicle wear, and time between jobs</li>
            <li><strong>Overhead:</strong> Software, phone, website, marketing — roughly 12–18% of revenue</li>
          </ul>
          <p>Add all of these up, divide by your productive hours per month, and you have your true minimum hourly rate. Most solo cleaners find this is $28–38/hour — significantly higher than they expected.</p>
          <h3>Your Minimum Profitable Ticket</h3>
          <p>Set a floor price below which you will not go, regardless of pressure. For most residential markets in 2026, this is $110–150 for a standard clean. Anything below this and you are likely losing money once you account for drive time and setup.</p>
        `,
      },
      {
        id: "residential-pricing",
        heading: "Residential Cleaning Rates: 2026 Market Data",
        level: "h2",
        content: `
          <p>Residential cleaning rates vary significantly by market, but 2026 national data from HomeAdvisor and Angi shows the following ranges:</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
            <thead>
              <tr style="background:#f1f5f9">
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Service Type</th>
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">National Low</th>
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">National High</th>
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Avg. Per Visit</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Standard Clean (1,200 sq ft)</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$120</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$175</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$148</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0">Standard Clean (2,000 sq ft)</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$165</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$240</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$199</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Deep Clean</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$200</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$400</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$285</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0">Move-In / Move-Out</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$250</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$500</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$340</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Post-Construction</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$300</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$700</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$450</td></tr>
            </tbody>
          </table>
          <h3>Frequency Discounts That Maximize Lifetime Value</h3>
          <p>Recurring clients are the foundation of a profitable cleaning business. Use these standard frequency discounts to convert one-time clients into recurring accounts:</p>
          <ul>
            <li><strong>Weekly:</strong> 15–20% discount — homes stay cleaner, jobs take less time, route efficiency improves</li>
            <li><strong>Bi-weekly:</strong> 10–12% discount — the most popular frequency for residential clients</li>
            <li><strong>Monthly:</strong> 5% discount — minimal; homes require a near-deep clean each visit</li>
            <li><strong>One-time:</strong> No discount — price at full rate or slight premium</li>
          </ul>
          <p>Frame the discount as a savings amount, not a percentage: "Save $24 per visit with weekly service" lands better than "20% off."</p>
        `,
      },
      {
        id: "good-better-best",
        heading: "The Good / Better / Best Quoting Framework",
        level: "h2",
        content: `
          <p>The single biggest upgrade most cleaning businesses can make to their quoting process is switching from a single flat price to a tiered Good/Better/Best offer. This approach consistently increases average ticket by 22–35%.</p>
          <h3>Why Tiered Quoting Works</h3>
          <p>When you give a prospect one price, they make a yes/no decision. When you give three options, they choose between your packages — a fundamentally different psychological frame. Most clients will choose the middle option, which should be your target service level.</p>
          <h3>How to Structure Your Three Tiers</h3>
          <ul>
            <li><strong>Good (Standard):</strong> Core service only — surfaces, floors, bathrooms, kitchen. Your standard recurring rate.</li>
            <li><strong>Better (Enhanced):</strong> Everything in Good plus 3–4 add-ons: inside microwave, inside oven, baseboards, ceiling fans. Price 25–35% above Good.</li>
            <li><strong>Best (Premium):</strong> Everything in Better plus premium add-ons: inside fridge, window sills, cabinet fronts, organizing, laundry fold. Price 50–70% above Good.</li>
          </ul>
          <h3>Real-World Example</h3>
          <p>For a 2,000 sq ft, 3-bed/2-bath home, a strong three-tier offer looks like:</p>
          <ul>
            <li><strong>Essential ($165):</strong> Standard clean — all rooms, kitchen, bathrooms, floors vacuumed and mopped</li>
            <li><strong>Signature ($215):</strong> Everything + inside microwave + inside oven + baseboards + ceiling fans</li>
            <li><strong>Premier ($265):</strong> Everything + inside fridge + window sills + cabinet fronts + 1 load of laundry</li>
          </ul>
          <p>When presented this way, roughly 55% of prospects choose Signature, 25% choose Premier, and only 20% choose Essential.</p>
        `,
      },
      {
        id: "add-on-pricing",
        heading: "Add-On Pricing: Where the Margin Lives",
        level: "h2",
        content: `
          <p>Add-ons are the highest-margin services in your business. They take marginal extra time but command disproportionate revenue.</p>
          <h3>Recommended Add-On Prices (2026 National Averages)</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
            <thead>
              <tr style="background:#f1f5f9">
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Add-On</th>
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Suggested Price</th>
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Typical Time</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Inside Oven</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$30–50</td><td style="padding:8px 12px;border:1px solid #e2e8f0">20–30 min</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0">Inside Refrigerator</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$35–55</td><td style="padding:8px 12px;border:1px solid #e2e8f0">20–35 min</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Inside Microwave</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$15–25</td><td style="padding:8px 12px;border:1px solid #e2e8f0">10 min</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0">Baseboards</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$25–40</td><td style="padding:8px 12px;border:1px solid #e2e8f0">20–40 min</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Window Sills / Tracks</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$20–35</td><td style="padding:8px 12px;border:1px solid #e2e8f0">15–25 min</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0">Ceiling Fans</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$10–20/fan</td><td style="padding:8px 12px;border:1px solid #e2e8f0">5–8 min/fan</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Laundry (wash + fold)</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$30–50/load</td><td style="padding:8px 12px;border:1px solid #e2e8f0">Passive time</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0">Pet Hair Treatment</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$25–40</td><td style="padding:8px 12px;border:1px solid #e2e8f0">15–30 min</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Sanitizing / Disinfecting</td><td style="padding:8px 12px;border:1px solid #e2e8f0">$30–60</td><td style="padding:8px 12px;border:1px solid #e2e8f0">20–40 min</td></tr>
            </tbody>
          </table>
          <p>Pre-package 2–3 add-ons into your Better and Best tiers. Attachment rates for pre-packaged add-ons run 3–4x higher than verbally offered ones.</p>
        `,
      },
      {
        id: "commercial-pricing",
        heading: "Commercial Cleaning: A Different Pricing Model",
        level: "h2",
        content: `
          <p>Commercial cleaning requires a fundamentally different approach than residential. You are quoting square footage, frequency, and scope — not rooms. Your labor planning must be precise because commercial contracts have thin margins and high volume.</p>
          <h3>Commercial Pricing Methods</h3>
          <ul>
            <li><strong>Square footage rate:</strong> Most common. Typical ranges: $0.07–0.15/sq ft for nightly standard office cleaning; $0.12–0.25/sq ft for medical or specialty facilities.</li>
            <li><strong>Per-room or per-station:</strong> Used for restrooms and break rooms. Typical: $18–35 per restroom per service.</li>
            <li><strong>Hourly:</strong> Used for janitorial contracts. Typical: $22–38/hour per worker depending on market.</li>
          </ul>
          <h3>Building Type Multipliers (ISSA / BSCAI Benchmarks)</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
            <thead>
              <tr style="background:#f1f5f9">
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Building Type</th>
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Cleanable Area Factor</th>
                <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Standard Office</td><td style="padding:8px 12px;border:1px solid #e2e8f0">85%</td><td style="padding:8px 12px;border:1px solid #e2e8f0">Corridors, storage areas reduce cleanable %</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0">Medical / Healthcare</td><td style="padding:8px 12px;border:1px solid #e2e8f0">90%</td><td style="padding:8px 12px;border:1px solid #e2e8f0">High-touch + infection control adds time</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Retail</td><td style="padding:8px 12px;border:1px solid #e2e8f0">80%</td><td style="padding:8px 12px;border:1px solid #e2e8f0">Display fixtures increase complexity</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0">Warehouse / Industrial</td><td style="padding:8px 12px;border:1px solid #e2e8f0">65%</td><td style="padding:8px 12px;border:1px solid #e2e8f0">Large open areas offset by equipment</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">Educational</td><td style="padding:8px 12px;border:1px solid #e2e8f0">88%</td><td style="padding:8px 12px;border:1px solid #e2e8f0">Seasonal fluctuation; summer deep cleans</td></tr>
            </tbody>
          </table>
        `,
      },
      {
        id: "follow-up-system",
        heading: "The Quote Follow-Up System That Closes 40% More Jobs",
        level: "h2",
        content: `
          <p>Most cleaning businesses send a quote and wait. Research from cleaning industry CRMs shows that 60–70% of booked jobs required at least one follow-up.</p>
          <h3>The 3-Touch Follow-Up Sequence</h3>
          <ul>
            <li><strong>Day 1 (quote sent):</strong> Text message — "Hi [Name], I just sent your cleaning quote to [email]. Let me know if you have any questions — I'm happy to walk you through the options."</li>
            <li><strong>Day 3:</strong> Email — Reference a specific detail from the intake: "I noticed you have pets — our Enhanced Clean includes a pet hair treatment that makes a huge difference." Personalization triples response rates.</li>
            <li><strong>Day 7:</strong> Final text — "Hi [Name], just wanted to check in on your quote. No pressure at all — if the timing isn't right, I'd love to schedule something for next month." This low-pressure close converts 15–20% of previously unresponsive leads.</li>
          </ul>
          <h3>Expiration Dates Drive Action</h3>
          <p>Quotes with a 14-day expiration date close 28% faster than open-ended quotes. Add "This quote is valid through [date]" to every proposal.</p>
        `,
      },
      {
        id: "industry-benchmarks",
        heading: "Industry Benchmarks Every Cleaning Business Should Know",
        level: "h2",
        content: `
          <p>These benchmarks, drawn from ISSA, BSCAI, and HomeAdvisor data, give you a calibration point for your own business performance.</p>
          <h3>Residential Benchmarks</h3>
          <ul>
            <li><strong>Average revenue per cleaner per day:</strong> $350–550 (2 crew) or $250–350 (solo)</li>
            <li><strong>Client retention rate (annual):</strong> Top-quartile businesses retain 85%+ of recurring clients</li>
            <li><strong>Quote close rate:</strong> Industry average 35–45%; top performers close 55–65% with tiered quoting</li>
            <li><strong>Average lifetime value of a recurring client:</strong> $2,200–4,800 depending on frequency and tenure</li>
          </ul>
          <h3>Commercial Benchmarks (ISSA Standards)</h3>
          <ul>
            <li><strong>Cleanable sq ft per worker per hour:</strong> 2,500–3,500 (general office); 1,500–2,000 (medical)</li>
            <li><strong>Contract renewal rate:</strong> 80%+ for businesses delivering consistent QC audits</li>
            <li><strong>Gross margin target:</strong> 45–55% for well-run commercial operations</li>
          </ul>
          <h3>Pricing Health Check</h3>
          <p>Calculate: (Revenue − Direct Labor − Supplies) / Revenue. Target 45–55%. If you are below 35%, a 10% price increase across all accounts is almost always the right move — you will lose fewer clients than you expect and recover significant margin.</p>
        `,
      },
    ],
    calculatorHTML: `
      <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:16px;padding:32px;text-align:center;color:white;margin:32px 0">
        <div style="font-size:28px;font-weight:800;margin-bottom:8px">Build Your First Quote in 3 Minutes</div>
        <p style="opacity:0.9;margin-bottom:24px;font-size:16px">Good/Better/Best quoting, AI pricing suggestions, automatic follow-ups — free to try.</p>
        <a href="/register" style="display:inline-flex;align-items:center;gap:8px;background:white;color:#6366f1;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;box-shadow:0 4px 16px rgba(0,0,0,0.2)">
          Try QuotePro AI Free
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
        <p style="opacity:0.7;font-size:13px;margin-top:16px">No credit card required. 14-day free trial.</p>
      </div>
    `,
    faq: [
      {
        question: "What is the average price for house cleaning in 2026?",
        answer: "The national average for a standard house cleaning in 2026 is $148 for a home under 1,500 sq ft and $199 for a 2,000 sq ft home. Deep cleans average $285 and move-in/move-out cleans average $340 nationally. Prices vary significantly by market — major metro areas can run 20–40% higher.",
      },
      {
        question: "Should I charge by the hour or by the job?",
        answer: "Charge by the job, not by the hour. Hourly pricing creates a perverse incentive where being faster costs you money. Per-job pricing rewards your efficiency and makes budgeting easier for clients. Quote by the job, track your time internally to verify profitability.",
      },
      {
        question: "How do I price a deep cleaning?",
        answer: "Price deep cleans at 1.4–1.6x your standard rate. A home that you clean regularly for $175 should be quoted at $245–280 for a deep clean. For new clients, always start with a deep clean — it sets the baseline and gives you margin to work with.",
      },
      {
        question: "What is Good/Better/Best quoting?",
        answer: "Good/Better/Best (also called tiered quoting) means presenting three service options at different price points in every quote. The Good tier covers core services, Better adds popular add-ons, and Best includes premium extras. This approach consistently increases average ticket by 22–35% compared to single-price quoting.",
      },
      {
        question: "How should I handle clients who ask for a discount?",
        answer: "Never discount without getting something in return. Offer a discount only if the client upgrades frequency, prepays for 3+ months, or refers a friend. Unconditional discounts train clients to expect them and devalue your work.",
      },
      {
        question: "What is a good quote close rate for a cleaning business?",
        answer: "The industry average close rate is 35–45%. Top-performing cleaning businesses using tiered quoting and systematic follow-ups close 55–65% of quotes. If you are closing below 30%, the issue is usually pricing perception or a weak follow-up process, not price level.",
      },
      {
        question: "How do I price commercial cleaning?",
        answer: "Commercial cleaning is typically priced by square footage ($0.07–0.15/sq ft for offices), by restroom ($18–35 per service), or hourly ($22–38/hour). Start by calculating your labor time using ISSA production rate benchmarks (2,500–3,500 cleanable sq ft per worker per hour for standard offices), then build in your overhead and target margin.",
      },
      {
        question: "When should I raise my prices?",
        answer: "Raise prices annually at a minimum — cleaning costs inflate every year. If you are booked more than 85% of your available slots, raise prices immediately. A 10–15% increase typically causes 5–8% client attrition, which usually results in higher net revenue per hour worked.",
      },
    ],
    toolkitCTA: "Start sending professional Good/Better/Best quotes today — QuotePro AI handles the pricing math, the follow-ups, and the CRM so you can focus on cleaning.",
  });
}
