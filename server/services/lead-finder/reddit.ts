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

const DEFAULT_KEYWORDS = [
  "house cleaner",
  "cleaning service",
  "maid service",
  "deep cleaning",
  "move out cleaning",
  "move-in cleaning",
  "recurring cleaning",
  "biweekly cleaning",
  "recommend a cleaner",
  "need a cleaner",
  "cleaning quote",
  "apartment cleaning",
  "home cleaning",
];

const DEFAULT_SUBREDDITS = [
  "cleaningtips", "moving", "homeowners", "firsttimehomebuyer",
  "landlord", "airbnb", "PropertyManagement", "Tenant",
  "malelivingspace", "femalelivingspace", "personalfinance",
];

function buildSearchUrl(query: string, subreddit?: string): string {
  const encoded = encodeURIComponent(query);
  if (subreddit) {
    return `https://www.reddit.com/r/${subreddit}/search.json?q=${encoded}&restrict_sr=1&sort=new&limit=25&t=month`;
  }
  return `https://www.reddit.com/search.json?q=${encoded}&sort=new&limit=25&t=month`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchRedditSearch(url: string): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; QuoteProBot/1.0; +https://getquotepro.ai)",
        "Accept": "application/json",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.children ?? [];
  } catch {
    return [];
  }
}

export async function fetchRedditLeads(params: {
  keywords?: string[];
  subreddits?: string[];
  targetCities?: string[];
}): Promise<RedditPost[]> {
  const keywords = (params.keywords ?? []).length > 0 ? params.keywords! : DEFAULT_KEYWORDS;
  const subreddits = (params.subreddits ?? []).length > 0 ? params.subreddits! : DEFAULT_SUBREDDITS;
  const cities = params.targetCities ?? [];

  const seen = new Set<string>();
  const results: RedditPost[] = [];

  const searches: Array<{ keyword: string; subreddit?: string }> = [];

  for (const kw of keywords.slice(0, 4)) {
    searches.push({ keyword: kw });
    for (const sub of subreddits.slice(0, 2)) {
      searches.push({ keyword: kw, subreddit: sub });
    }
  }

  for (const city of cities.slice(0, 3)) {
    searches.push({ keyword: `house cleaner ${city}` });
    searches.push({ keyword: `cleaning service ${city}` });
    searches.push({ keyword: `maid service ${city}` });
  }

  const batches = searches.slice(0, 8);

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await sleep(300);
    const { keyword, subreddit } = batches[i];
    const url = buildSearchUrl(keyword, subreddit);
    const posts = await fetchRedditSearch(url);

    for (const child of posts) {
      const post = child?.data;
      if (!post?.id || !post?.title) continue;
      if (seen.has(post.id)) continue;
      seen.add(post.id);

      const postedAt = post.created_utc ? new Date(post.created_utc * 1000) : new Date();
      results.push({
        externalId: post.id,
        subreddit: post.subreddit ?? "",
        title: post.title ?? "",
        body: post.selftext ?? "",
        author: post.author ?? "[deleted]",
        postUrl: `https://reddit.com${post.permalink}`,
        permalink: post.permalink ?? "",
        matchedKeyword: keyword,
        postedAt,
        metadata: {
          score: post.score,
          numComments: post.num_comments,
          upvoteRatio: post.upvote_ratio,
          flair: post.link_flair_text,
        },
      });
    }
  }

  return results;
}

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
      subreddit: "cleaningtips",
      title: "Inherited a house that hasn't been cleaned in years — hire a pro or DIY deep clean?",
      body: "Just inherited a house from a relative. The place has not been properly cleaned in probably 3-4 years. Heavy grease in kitchen, mold in bathrooms, heavy dust everywhere. Should I hire a professional deep cleaning service first or is DIY feasible?",
      author: "estate_cleanup_help",
      postUrl: "https://reddit.com/r/cleaningtips/comments/mock011",
      permalink: "/r/cleaningtips/comments/mock011",
      matchedKeyword: "deep cleaning",
      postedAt: h(18),
      metadata: { score: 56, numComments: 47 },
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
    {
      externalId: "mock_013",
      subreddit: "femalelivingspace",
      title: "Worth splitting a cleaning service with my roommate? How do you handle the cost?",
      body: "My roommate and I have a 2BR/2BA apartment. We're both really busy and the place gets gross. Is it worth hiring a maid service together? How do you coordinate with a roommate for this? What's a reasonable monthly cost to budget?",
      author: "apartment_roommates_help",
      postUrl: "https://reddit.com/r/femalelivingspace/comments/mock014",
      permalink: "/r/femalelivingspace/comments/mock014",
      matchedKeyword: "maid service",
      postedAt: h(4),
      metadata: { score: 34, numComments: 29 },
    },
    {
      externalId: "mock_014",
      subreddit: "airbnb",
      title: "How to automate Airbnb cleaning turnover scheduling? Need reliable system",
      body: "Running 3 Airbnb units and turnover cleaning is my biggest headache. Have to manually coordinate cleaners every checkout. Is there a service that handles scheduling automatically? How do other hosts manage this?",
      author: "airbnb_multi_host",
      postUrl: "https://reddit.com/r/airbnb/comments/mock015",
      permalink: "/r/airbnb/comments/mock015",
      matchedKeyword: "cleaning service",
      postedAt: h(7),
      metadata: { score: 47, numComments: 41 },
    },
    {
      externalId: "mock_015",
      subreddit: "landlord",
      title: "Post-renovation cleaning before new tenant — worth hiring professionals?",
      body: "Just finished a kitchen and bathroom renovation. There's drywall dust, paint splatters, and construction debris throughout the 3BR house. New tenant moves in next week. Do I hire a professional post-construction cleaning crew or can I manage this myself?",
      author: "landlord_renovator",
      postUrl: "https://reddit.com/r/landlord/comments/mock016",
      permalink: "/r/landlord/comments/mock016",
      matchedKeyword: "cleaning service",
      postedAt: h(26),
      metadata: { score: 13, numComments: 10 },
    },
  ];

  if (targetCities.length > 0) {
    const cityLeads: RedditPost[] = targetCities.slice(0, 3).flatMap((city, idx) => [
      {
        externalId: `mock_city_${idx}_a`,
        subreddit: city.toLowerCase().replace(/\s+/g, ""),
        title: `Recommendations for a reliable house cleaner in ${city}?`,
        body: `Looking for a trustworthy cleaning service in ${city} for biweekly service on our 3BR/2BA home. We have 1 dog and need someone reliable. Budget around $150-200 per visit. Any local recommendations from people who have used someone they love?`,
        author: `${city.toLowerCase().replace(/\s+/g, "_")}_local`,
        postUrl: `https://reddit.com/r/${city.toLowerCase().replace(/\s+/g, "")}/comments/mock_city_${idx}_a`,
        permalink: `/r/${city.toLowerCase().replace(/\s+/g, "")}/comments/mock_city_${idx}_a`,
        matchedKeyword: `house cleaner ${city}`,
        postedAt: new Date(now - (idx * 3 + 1) * 60 * 60 * 1000),
        metadata: { score: 8 + idx * 3, numComments: 6 + idx * 2 },
      },
      {
        externalId: `mock_city_${idx}_b`,
        subreddit: city.toLowerCase().replace(/\s+/g, ""),
        title: `Move-out cleaning in ${city} — anyone have a good service to recommend?`,
        body: `Moving out of my apartment in ${city} at end of the month. Need professional cleaning that will satisfy my landlord. 2BR/1BA, about 950 sq ft. Looking for quality service that provides a receipt for my landlord.`,
        author: `renting_in_${city.toLowerCase().replace(/\s+/g, "")}_3`,
        postUrl: `https://reddit.com/r/${city.toLowerCase().replace(/\s+/g, "")}/comments/mock_city_${idx}_b`,
        permalink: `/r/${city.toLowerCase().replace(/\s+/g, "")}/comments/mock_city_${idx}_b`,
        matchedKeyword: `cleaning service ${city}`,
        postedAt: new Date(now - (idx * 4 + 2) * 60 * 60 * 1000),
        metadata: { score: 5 + idx * 2, numComments: 4 + idx },
      },
    ]);
    return [...cityLeads, ...base];
  }

  return base;
}
