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
];

const DEFAULT_SUBREDDITS = ["cleaningtips", "moving", "homeowners"];

function buildSearchUrl(query: string, subreddit?: string): string {
  const encoded = encodeURIComponent(query);
  if (subreddit) {
    return `https://www.reddit.com/r/${subreddit}/search.json?q=${encoded}&restrict_sr=1&sort=new&limit=25&t=week`;
  }
  return `https://www.reddit.com/search.json?q=${encoded}&sort=new&limit=25&t=week`;
}

async function fetchRedditSearch(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "QuotePro/1.0 (beta lead-finder)",
        "Accept": "application/json",
      },
    });
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

  for (const kw of keywords.slice(0, 5)) {
    searches.push({ keyword: kw });
    for (const sub of subreddits.slice(0, 3)) {
      searches.push({ keyword: kw, subreddit: sub });
    }
  }

  for (const city of cities.slice(0, 3)) {
    searches.push({ keyword: `house cleaner ${city}` });
    searches.push({ keyword: `cleaning service ${city}` });
  }

  const batches = searches.slice(0, 12);
  const fetchPromises = batches.map(({ keyword, subreddit }) =>
    fetchRedditSearch(buildSearchUrl(keyword, subreddit)).then((posts) => ({ posts, keyword, subreddit }))
  );

  const settled = await Promise.allSettled(fetchPromises);

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    const { posts, keyword } = result.value;

    for (const child of posts) {
      const post = child?.data;
      if (!post?.id || !post?.title) continue;
      if (post.is_self === false && !post.selftext) continue;
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

export function getMockLeads(): RedditPost[] {
  return [
    {
      externalId: "mock_001",
      subreddit: "chicago",
      title: "Looking for a reliable house cleaner in Lincoln Park - recommendations?",
      body: "Hi neighbors! I'm looking for a trustworthy house cleaner for bi-weekly service. 2BR/2BA condo, ~1100sqft. Any recommendations from people who have used someone and love them? Budget around $150-180 per session. Thanks!",
      author: "chicago_renter22",
      postUrl: "https://reddit.com/r/chicago/comments/mock001",
      permalink: "/r/chicago/comments/mock001",
      matchedKeyword: "house cleaner",
      postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      metadata: { score: 12, numComments: 8 },
    },
    {
      externalId: "mock_002",
      subreddit: "moving",
      title: "Need move-out cleaning service for end of month - anyone used a good one recently?",
      body: "Moving out of my apartment on the 30th and my lease requires professional cleaning. 3 bed 2 bath, about 1400sqft. Looking for something reasonably priced that will pass the landlord inspection. Any services you can vouch for?",
      author: "movingmonth_throwaway",
      postUrl: "https://reddit.com/r/moving/comments/mock002",
      permalink: "/r/moving/comments/mock002",
      matchedKeyword: "move out cleaning",
      postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      metadata: { score: 5, numComments: 3 },
    },
    {
      externalId: "mock_003",
      subreddit: "homeowners",
      title: "Deep cleaning before listing house for sale - worth it?",
      body: "Getting ready to sell our home. Agent recommended a professional deep clean before photos. Is it worth hiring a cleaning service? What should I expect to pay for a 4BR/3BA? Anyone have good experiences with this?",
      author: "firsttimeseller_help",
      postUrl: "https://reddit.com/r/homeowners/comments/mock003",
      permalink: "/r/homeowners/comments/mock003",
      matchedKeyword: "deep cleaning",
      postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      metadata: { score: 18, numComments: 14 },
    },
  ];
}
