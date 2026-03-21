export interface RedditPost {
  externalId: string;
  subreddit: string;
  title: string;
  body: string;
  author: string;
  postUrl: string;
  permalink: string;
  matchedKeyword: string;
  postedAt: Date;
  metadata: Record<string, any>;
}

// ─── Keyword Packs ────────────────────────────────────────────────────────────

export const KEYWORD_PACKS: Record<string, string[]> = {
  recommendation: [
    "house cleaner recommendation",
    "cleaning service recommendation",
    "maid service recommendation",
    "recommend a cleaner",
    "cleaning lady recommendation",
    "good house cleaner",
    "reliable house cleaner",
    "who do you use for cleaning",
    "anyone know a good cleaner",
    "cleaner near me",
    "looking for a house cleaner",
    "looking for cleaning service",
  ],
  intent: [
    "need a cleaner",
    "need cleaning service",
    "need a maid",
    "looking for maid",
    "hire a cleaner",
    "hire cleaning service",
    "cleaning quote",
    "house cleaner",
    "maid service",
    "cleaning service",
    "home cleaning",
    "residential cleaning",
  ],
  service_type: [
    "deep cleaning",
    "deep clean",
    "move out cleaning",
    "move-out cleaning",
    "move in cleaning",
    "move-in cleaning",
    "recurring cleaning",
    "biweekly cleaning",
    "weekly cleaning",
    "bi-weekly cleaning",
    "apartment cleaning",
    "cleaning company",
    "one time cleaning",
  ],
  high_value: [
    "airbnb cleaning",
    "airbnb cleaner",
    "vacation rental cleaning",
    "post construction cleaning",
    "post-construction cleaning",
    "estate cleaning",
    "hoarder cleaning",
    "commercial cleaning service",
  ],
};

export const ALL_KEYWORDS = Object.values(KEYWORD_PACKS).flat();

// ─── City → Subreddit mapping ─────────────────────────────────────────────────

const CITY_SUBREDDIT_MAP: Record<string, string> = {
  "austin": "Austin",
  "chicago": "chicago",
  "los angeles": "LosAngeles",
  "la": "LosAngeles",
  "new york": "nyc",
  "nyc": "nyc",
  "dallas": "Dallas",
  "houston": "houston",
  "phoenix": "phoenix",
  "seattle": "Seattle",
  "denver": "Denver",
  "atlanta": "Atlanta",
  "miami": "miami",
  "boston": "boston",
  "portland": "Portland",
  "san francisco": "sanfrancisco",
  "sf": "sanfrancisco",
  "san antonio": "sanantonio",
  "san diego": "sandiego",
  "minneapolis": "Minneapolis",
  "charlotte": "Charlotte",
  "nashville": "nashville",
  "las vegas": "vegaslocals",
  "dc": "washingtondc",
  "washington": "washingtondc",
  "washington dc": "washingtondc",
  "philadelphia": "philadelphia",
  "philly": "philadelphia",
  "tampa": "tampa",
  "orlando": "orlando",
  "cleveland": "Cleveland",
  "columbus": "Columbus",
  "indianapolis": "indianapolis",
  "sacramento": "Sacramento",
  "raleigh": "raleigh",
  "richmond": "rva",
  "jacksonville": "jacksonville",
  "oklahoma city": "okc",
  "louisville": "louisville",
  "baltimore": "baltimore",
  "milwaukee": "milwaukee",
  "fort worth": "FortWorth",
  "colorado springs": "ColoradoSprings",
  "pittsburgh": "pittsburgh",
  "salt lake city": "SaltLakeCity",
  "kansas city": "kansascity",
  "detroit": "Detroit",
  "memphis": "memphis",
  "omaha": "Omaha",
  "tucson": "Tucson",
};

function getCitySubreddits(cities: string[]): string[] {
  const found: string[] = [];
  for (const city of cities) {
    const key = city.toLowerCase().trim().replace(/,.*$/, "").trim();
    const sub = CITY_SUBREDDIT_MAP[key];
    if (sub && !found.includes(sub)) found.push(sub);
  }
  return found;
}

// ─── Base subreddits (topic-based) ───────────────────────────────────────────

const BASE_SUBREDDITS = [
  "homeowners",
  "moving",
  "firsttimehomebuyer",
  "airbnb",
  "landlord",
  "PropertyManagement",
  "Tenant",
  "malelivingspace",
  "femalelivingspace",
  "personalfinance",
  "ApartmentHacks",
  "maid",
  "domesticworkers",
];

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const UA_LIST = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

function getUA() {
  return UA_LIST[Math.floor(Math.random() * UA_LIST.length)];
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": getUA(),
        "Accept": "application/json, text/html, application/rss+xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ─── Reddit JSON API ──────────────────────────────────────────────────────────

function buildJsonUrl(query: string, subreddit?: string): string {
  const encoded = encodeURIComponent(query);
  if (subreddit) {
    return `https://www.reddit.com/r/${subreddit}/search.json?q=${encoded}&restrict_sr=1&sort=new&limit=25&t=month`;
  }
  return `https://www.reddit.com/search.json?q=${encoded}&sort=new&limit=25&t=month`;
}

async function fetchRedditJson(url: string): Promise<any[]> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res || !res.ok) return [];
    const json = await res.json();
    return json?.data?.children ?? [];
  } catch {
    return [];
  }
}

// ─── Reddit RSS API ───────────────────────────────────────────────────────────

function buildRssUrl(query: string, subreddit?: string): string {
  const encoded = encodeURIComponent(query);
  if (subreddit) {
    return `https://www.reddit.com/r/${subreddit}/search.rss?q=${encoded}&restrict_sr=1&sort=new&t=month&limit=25`;
  }
  return `https://www.reddit.com/search.rss?q=${encoded}&sort=new&t=month&limit=25`;
}

function parseRssItem(item: string): { id: string; title: string; body: string; author: string; link: string; subreddit: string; postedAt: Date } | null {
  const extract = (tag: string) => {
    const match = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"))
      ?? item.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
    return match ? match[1].trim() : "";
  };

  const link = extract("link") || (item.match(/href="([^"]+reddit\.com[^"]+)"/)?.[1] ?? "");
  const title = extract("title");
  const body = extract("description").replace(/<[^>]+>/g, "").slice(0, 2000);
  const author = extract("author");
  const pubDate = extract("pubDate");
  const postedAt = pubDate ? new Date(pubDate) : new Date();

  // Extract subreddit from link
  const subMatch = link.match(/reddit\.com\/r\/([^/]+)\//);
  const subreddit = subMatch ? subMatch[1] : "";

  // Extract post ID from link
  const idMatch = link.match(/\/comments\/([a-z0-9]+)/);
  const id = idMatch ? idMatch[1] : "";

  if (!id || !title || title.length < 5) return null;

  return { id, title, body, author, link, subreddit, postedAt };
}

async function fetchRedditRss(url: string): Promise<Array<{ id: string; title: string; body: string; author: string; link: string; subreddit: string; postedAt: Date }>> {
  try {
    const res = await fetchWithTimeout(url, 12000);
    if (!res || !res.ok) return [];
    const text = await res.text();
    if (!text.includes("<item>")) return [];

    const items = text.split("<item>").slice(1);
    const results: Array<any> = [];
    for (const item of items) {
      const parsed = parseRssItem(item);
      if (parsed) results.push(parsed);
    }
    return results;
  } catch {
    return [];
  }
}

// ─── Main fetch function ──────────────────────────────────────────────────────

export async function fetchRedditLeads(params: {
  keywords?: string[];
  subreddits?: string[];
  targetCities?: string[];
}): Promise<RedditPost[]> {
  const userKeywords = (params.keywords ?? []).length > 0 ? params.keywords! : [];
  const cities = params.targetCities ?? [];
  const citySubreddits = getCitySubreddits(cities);

  // Build keyword list: user keywords + a rotating subset of defaults
  const allKws = userKeywords.length > 0
    ? [...new Set([...userKeywords, ...KEYWORD_PACKS.recommendation.slice(0, 4)])]
    : ALL_KEYWORDS;

  // Prioritize high-value keywords for city subreddit searches
  const priorityKeywords = [
    "house cleaner", "cleaning service", "maid service",
    "need a cleaner", "cleaner recommendation", "deep cleaning",
    "move out cleaning", "recurring cleaning", "looking for a cleaner",
  ];

  // Pick a good rotating subset to avoid hammering too many requests
  const hour = new Date().getHours();
  const kwOffset = (hour % 3) * 4;
  const kwsToSearch = [
    ...priorityKeywords.slice(0, 5),
    ...allKws.filter((k) => !priorityKeywords.includes(k)).slice(kwOffset, kwOffset + 5),
  ].slice(0, 10);

  // Build user-configured or default subreddits (topic-based)
  const userSubs = (params.subreddits ?? []).length > 0 ? params.subreddits! : BASE_SUBREDDITS;
  const topicSubs = userSubs.slice(0, 6);

  // Build search plan
  const searches: Array<{ keyword: string; subreddit?: string; method: "json" | "rss" }> = [];

  // 1. City subreddit searches (highest value — most specific)
  if (citySubreddits.length > 0) {
    for (const city of citySubreddits.slice(0, 3)) {
      for (const kw of ["house cleaner", "cleaning service", "maid service", "cleaner recommendation"].slice(0, 3)) {
        searches.push({ keyword: kw, subreddit: city, method: "rss" });
      }
    }
    // Also add city name to global keyword search
    for (const city of citySubreddits.slice(0, 2)) {
      searches.push({ keyword: `cleaning service ${city}`, method: "rss" });
    }
  }

  // 2. Topic subreddit + keyword combos (via RSS — more reliable)
  for (const kw of kwsToSearch.slice(0, 4)) {
    for (const sub of topicSubs.slice(0, 3)) {
      searches.push({ keyword: kw, subreddit: sub, method: "rss" });
    }
  }

  // 3. Global Reddit keyword searches (RSS)
  for (const kw of kwsToSearch.slice(0, 6)) {
    searches.push({ keyword: kw, method: "rss" });
  }

  // 4. JSON API as backup for first few keywords
  for (const kw of kwsToSearch.slice(0, 3)) {
    searches.push({ keyword: kw, method: "json" });
  }

  // Deduplicate and cap
  const seen = new Set<string>();
  const results: RedditPost[] = [];
  const batchSize = Math.min(searches.length, 20);

  for (let i = 0; i < batchSize; i++) {
    if (i > 0) await sleep(200 + Math.random() * 150);

    const { keyword, subreddit, method } = searches[i];

    let posts: Array<{ id: string; title: string; body: string; author: string; link: string; subreddit: string; postedAt: Date }> = [];

    if (method === "rss") {
      const url = buildRssUrl(keyword, subreddit);
      const rssItems = await fetchRedditRss(url);
      posts = rssItems;
    } else {
      const url = buildJsonUrl(keyword, subreddit);
      const children = await fetchRedditJson(url);
      posts = children
        .map((child: any) => {
          const d = child?.data;
          if (!d?.id || !d?.title) return null;
          return {
            id: d.id,
            title: d.title ?? "",
            body: d.selftext ?? "",
            author: d.author ?? "[deleted]",
            link: `https://reddit.com${d.permalink}`,
            subreddit: d.subreddit ?? (subreddit ?? ""),
            postedAt: d.created_utc ? new Date(d.created_utc * 1000) : new Date(),
          };
        })
        .filter(Boolean) as any[];
    }

    for (const p of posts) {
      if (!p.id || seen.has(p.id)) continue;
      seen.add(p.id);

      // Recency filter — only last 45 days
      const ageMs = Date.now() - p.postedAt.getTime();
      if (ageMs > 45 * 24 * 60 * 60 * 1000) continue;

      results.push({
        externalId: p.id,
        subreddit: p.subreddit || subreddit || "",
        title: p.title,
        body: p.body,
        author: p.author,
        postUrl: p.link,
        permalink: p.link,
        matchedKeyword: keyword,
        postedAt: p.postedAt,
        metadata: { source: "reddit" },
      });
    }

    if (results.length >= 60) break;
  }

  return results;
}

// ─── Mock / Demo Leads ────────────────────────────────────────────────────────

export function getMockLeads(targetCities: string[] = []): RedditPost[] {
  const now = Date.now();
  const h = (n: number) => new Date(now - n * 60 * 60 * 1000);

  const base: RedditPost[] = [
    {
      externalId: "mock_001",
      subreddit: "moving",
      title: "Need move-out cleaning service for end of month — recommendations?",
      body: "Moving out of my apartment on the 30th and my lease requires professional cleaning. 3 bed 2 bath, about 1,400 sq ft. Looking for something reasonably priced that will pass the landlord inspection.",
      author: "movingmonth_throwaway",
      postUrl: "https://reddit.com/r/moving/comments/mock002",
      permalink: "/r/moving/comments/mock002",
      matchedKeyword: "move out cleaning",
      postedAt: h(2),
      metadata: { score: 5, numComments: 3 },
    },
    {
      externalId: "mock_002",
      subreddit: "homeowners",
      title: "Deep cleaning before listing house for sale — worth it?",
      body: "Getting ready to sell our home. Agent recommended a professional deep clean before photos. Is it worth hiring a cleaning service? What should I expect to pay for a 4BR/3BA? Anyone have good experiences?",
      author: "firsttimeseller_help",
      postUrl: "https://reddit.com/r/homeowners/comments/mock003",
      permalink: "/r/homeowners/comments/mock003",
      matchedKeyword: "deep cleaning",
      postedAt: h(8),
      metadata: { score: 18, numComments: 14 },
    },
    {
      externalId: "mock_003",
      subreddit: "airbnb",
      title: "Looking for reliable cleaning crew for Airbnb turnover — how do you find them?",
      body: "I have a 2BR Airbnb and need reliable same-day turnover cleaning. My current cleaner is inconsistent. How do you find trustworthy cleaners for short-term rentals?",
      author: "airbnb_host_99",
      postUrl: "https://reddit.com/r/airbnb/comments/mock004",
      permalink: "/r/airbnb/comments/mock004",
      matchedKeyword: "cleaning service",
      postedAt: h(5),
      metadata: { score: 22, numComments: 19 },
    },
    {
      externalId: "mock_004",
      subreddit: "firsttimehomebuyer",
      title: "Do I need a professional cleaner before moving in? Previous owners left it messy",
      body: "Closing on my first home next week. The previous owners left it pretty dirty — greasy kitchen, filthy bathrooms. Is it worth hiring a professional cleaning service or just DIY? How much do move-in cleans typically cost for a 3/2 house?",
      author: "newhomeowner2024",
      postUrl: "https://reddit.com/r/firsttimehomebuyer/comments/mock005",
      permalink: "/r/firsttimehomebuyer/comments/mock005",
      matchedKeyword: "cleaning service",
      postedAt: h(14),
      metadata: { score: 31, numComments: 27 },
    },
    {
      externalId: "mock_005",
      subreddit: "landlord",
      title: "How do you handle tenant move-out cleaning? Use a pro service or charge tenant?",
      body: "My tenant just moved out and the place needs serious cleaning. Is it worth hiring a professional cleaning company and billing the tenant, or just doing it yourself? Looking for a cost-effective approach for future properties too.",
      author: "landlord_ohio",
      postUrl: "https://reddit.com/r/landlord/comments/mock006",
      permalink: "/r/landlord/comments/mock006",
      matchedKeyword: "cleaning service",
      postedAt: h(20),
      metadata: { score: 9, numComments: 11 },
    },
    {
      externalId: "mock_006",
      subreddit: "personalfinance",
      title: "Is hiring a biweekly house cleaner worth it? How much do you pay?",
      body: "Considering hiring a cleaning service for biweekly visits. We're a family of 4 with 2 dogs in a 2,200 sq ft house. Currently spending most of Sunday cleaning. Is it worth the cost? What's a fair price to expect?",
      author: "busyparent_finances",
      postUrl: "https://reddit.com/r/personalfinance/comments/mock007",
      permalink: "/r/personalfinance/comments/mock007",
      matchedKeyword: "biweekly cleaning",
      postedAt: h(3),
      metadata: { score: 87, numComments: 62 },
    },
    {
      externalId: "mock_007",
      subreddit: "PropertyManagement",
      title: "Best cleaning company for multi-unit turnover? Need reliable recurring service",
      body: "Managing 12 units and our current cleaning company keeps dropping the ball on move-out turnovers. Looking for a reliable service that can handle multiple units per month with consistent quality.",
      author: "propertymanager_pro",
      postUrl: "https://reddit.com/r/PropertyManagement/comments/mock008",
      permalink: "/r/PropertyManagement/comments/mock008",
      matchedKeyword: "recurring cleaning",
      postedAt: h(11),
      metadata: { score: 14, numComments: 9 },
    },
    {
      externalId: "mock_008",
      subreddit: "Tenant",
      title: "My landlord wants professional cleaning receipt at move-out — what service do you recommend?",
      body: "Lease says I need to provide proof of professional cleaning at move-out. 1BR apartment in good shape. Just need it documented. Does any cleaning service provide receipts that satisfy landlords?",
      author: "tenant_nyc_throwaway",
      postUrl: "https://reddit.com/r/Tenant/comments/mock009",
      permalink: "/r/Tenant/comments/mock009",
      matchedKeyword: "cleaning service",
      postedAt: h(6),
      metadata: { score: 7, numComments: 5 },
    },
    {
      externalId: "mock_009",
      subreddit: "malelivingspace",
      title: "Finally admitted I need to hire a house cleaner — what should I look for?",
      body: "Work 60+ hours a week, 3BR house is a disaster. Ready to hire a cleaning service for the first time. How do I find a good one? What's the difference between deep clean and regular service? Any red flags to avoid?",
      author: "overworked_engineer_23",
      postUrl: "https://reddit.com/r/malelivingspace/comments/mock010",
      permalink: "/r/malelivingspace/comments/mock010",
      matchedKeyword: "house cleaner",
      postedAt: h(1),
      metadata: { score: 43, numComments: 38 },
    },
    {
      externalId: "mock_010",
      subreddit: "ApartmentHacks",
      title: "Worth splitting a cleaning service with my roommate? How do you handle the cost?",
      body: "My roommate and I have a 2BR/2BA apartment. We're both really busy and the place gets gross. Is it worth hiring a maid service together? How do you coordinate? What's a reasonable monthly cost to budget?",
      author: "apartment_roommates_help",
      postUrl: "https://reddit.com/r/ApartmentHacks/comments/mock011",
      permalink: "/r/ApartmentHacks/comments/mock011",
      matchedKeyword: "maid service",
      postedAt: h(4),
      metadata: { score: 34, numComments: 29 },
    },
    {
      externalId: "mock_011",
      subreddit: "homeowners",
      title: "Recurring cleaning service recommendations — how do you manage vetting?",
      body: "We've had bad experiences with independent cleaners no-showing or doing poor work. Thinking about using a cleaning company for recurring monthly service on our 4/3 house. How do you vet them? What companies are worth it?",
      author: "suburban_homeowner_44",
      postUrl: "https://reddit.com/r/homeowners/comments/mock012",
      permalink: "/r/homeowners/comments/mock012",
      matchedKeyword: "recurring cleaning",
      postedAt: h(32),
      metadata: { score: 28, numComments: 24 },
    },
    {
      externalId: "mock_012",
      subreddit: "moving",
      title: "Moving cross-country — need move-in clean at destination before truck arrives",
      body: "Closing on our new house in 3 weeks and flying out 2 days before the moving truck arrives. Want to have the house professionally cleaned before our stuff arrives. Previous owners left carpets dirty. How do I find a reliable cleaning service remotely?",
      author: "crosscountry_move2024",
      postUrl: "https://reddit.com/r/moving/comments/mock013",
      permalink: "/r/moving/comments/mock013",
      matchedKeyword: "move-in cleaning",
      postedAt: h(9),
      metadata: { score: 19, numComments: 15 },
    },
  ];

  if (targetCities.length > 0) {
    const cityLeads: RedditPost[] = targetCities.slice(0, 3).flatMap((city, idx) => [
      {
        externalId: `mock_city_${idx}_a`,
        subreddit: city.toLowerCase().replace(/[\s,]+/g, ""),
        title: `Recommendations for a reliable house cleaner in ${city}?`,
        body: `Looking for a trustworthy cleaning service in ${city} for biweekly service on our 3BR/2BA home. We have 1 dog and need someone reliable. Budget around $150-200 per visit. Any local recommendations from people who have used someone they love?`,
        author: `${city.toLowerCase().replace(/[\s,]+/g, "_")}_local`,
        postUrl: `https://reddit.com/r/${city.toLowerCase().replace(/[\s,]+/g, "")}/comments/mock_city_${idx}_a`,
        permalink: `/r/${city.toLowerCase().replace(/[\s,]+/g, "")}/comments/mock_city_${idx}_a`,
        matchedKeyword: `house cleaner ${city}`,
        postedAt: new Date(now - (idx * 3 + 1) * 60 * 60 * 1000),
        metadata: { score: 8 + idx * 3, numComments: 6 + idx * 2 },
      },
      {
        externalId: `mock_city_${idx}_b`,
        subreddit: city.toLowerCase().replace(/[\s,]+/g, ""),
        title: `Move-out cleaning in ${city} — anyone have a good service to recommend?`,
        body: `Moving out of my apartment in ${city} at end of the month. Need professional cleaning that will satisfy my landlord. 2BR/1BA, about 950 sq ft. Looking for quality service that provides a receipt for my landlord.`,
        author: `renting_in_${city.toLowerCase().replace(/[\s,]+/g, "")}_3`,
        postUrl: `https://reddit.com/r/${city.toLowerCase().replace(/[\s,]+/g, "")}/comments/mock_city_${idx}_b`,
        permalink: `/r/${city.toLowerCase().replace(/[\s,]+/g, "")}/comments/mock_city_${idx}_b`,
        matchedKeyword: `cleaning service ${city}`,
        postedAt: new Date(now - (idx * 4 + 2) * 60 * 60 * 1000),
        metadata: { score: 5 + idx * 2, numComments: 4 + idx },
      },
    ]);
    return [...cityLeads, ...base];
  }

  return base;
}
