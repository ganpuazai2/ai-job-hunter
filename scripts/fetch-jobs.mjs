// Collects new job postings from public job APIs, pre-filters them cheaply, and writes
// candidates.json for the agent to score. Jobs already in seen-jobs.json are skipped.
// Usage: node scripts/fetch-jobs.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { relevant, inRegion, remoteOk, stripHtml } from "./lib.mjs";

const MAX_CANDIDATES = 25;        // per run; keeps scoring cost predictable
const MCF_MAX_AGE_DAYS = 3;
const MIN_SALARY = 4500;          // S$/month, MyCareersFuture only (company boards rarely list pay)
const DESCRIPTION_CHARS = 2500;

const MCF_QUERIES = [
  "AI solutions", "AI consultant", "AI partnerships", "business development AI",
  "AI product manager", "AI project manager", "AI automation", "generative AI",
];
const GREENHOUSE = ["anthropic", "databricks", "datadog", "mongodb", "gitlab", "coinbase", "okx", "ripple", "consensys"];
const ASHBY = ["openai", "elevenlabs", "cohere", "perplexity", "cursor", "langchain", "replit", "synthesia", "supabase"];
const LEVER = ["binance", "crypto", "palantir"];

async function getJson(url, init) {
  try {
    const res = await fetch(url, { ...init, headers: { "User-Agent": "job-hunter/1.0", ...init?.headers }, signal: AbortSignal.timeout(30000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const seen = JSON.parse(readFileSync("seen-jobs.json", "utf8"));
const jobs = new Map(); // id -> job
const add = job => { if (!seen[job.id] && !jobs.has(job.id)) jobs.set(job.id, job); };

// 1. MyCareersFuture (Singapore government job portal)
const cutoff = Date.now() - MCF_MAX_AGE_DAYS * 864e5;
const mcfHits = new Map();
for (const search of MCF_QUERIES) {
  const data = await getJson("https://api.mycareersfuture.gov.sg/v2/search?limit=40&page=0", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ search, sortBy: ["new_posting_date"] }),
  });
  for (const r of data?.results ?? []) {
    const posted = new Date(r.metadata?.newPostingDate ?? 0).getTime();
    if (posted >= cutoff && (r.salary?.maximum ?? 0) >= MIN_SALARY && relevant(r.title)) mcfHits.set(r.uuid, r);
  }
}
for (const [uuid, r] of mcfHits) {
  if (seen[`mcf:${uuid}`]) continue;
  const detail = await getJson(`https://api.mycareersfuture.gov.sg/v2/jobs/${uuid}`);
  add({
    id: `mcf:${uuid}`, source: "MyCareersFuture", company: r.postedCompany?.name, title: r.title,
    location: "Singapore", salary: `S$${r.salary?.minimum}-${r.salary?.maximum}/month`,
    employment: (detail?.employmentTypes ?? []).map(e => e.employmentType).join(", "),
    seniority: (detail?.positionLevels ?? []).map(p => p.position).join(", "),
    minYearsExperience: detail?.minimumYearsExperience ?? null,
    posted: r.metadata?.newPostingDate, url: r.metadata?.jobDetailsUrl,
    description: stripHtml(detail?.description).slice(0, DESCRIPTION_CHARS),
  });
}

// 2. Company job boards. Locations must mention Singapore or APAC.
for (const board of GREENHOUSE) {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
  for (const j of data?.jobs ?? []) {
    if (!inRegion(j.location?.name) || !relevant(j.title)) continue;
    add({
      id: `gh:${board}:${j.id}`, source: "Greenhouse", company: board, title: j.title, location: j.location?.name,
      posted: j.updated_at, url: j.absolute_url, description: stripHtml(j.content).slice(0, DESCRIPTION_CHARS),
    });
  }
}
for (const board of ASHBY) {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${board}?includeCompensation=true`);
  for (const j of data?.jobs ?? []) {
    const where = [j.location, ...(j.secondaryLocations ?? []).map(l => l.location)].join(", ");
    if (!inRegion(where) || !relevant(j.title)) continue;
    add({
      id: `ashby:${board}:${j.id}`, source: "Ashby", company: board, title: j.title, location: where,
      salary: j.compensation?.compensationTierSummary ?? undefined,
      posted: j.publishedAt, url: j.jobUrl, description: String(j.descriptionPlain ?? "").slice(0, DESCRIPTION_CHARS),
    });
  }
}
for (const board of LEVER) {
  const data = await getJson(`https://api.lever.co/v0/postings/${board}?mode=json`);
  for (const j of Array.isArray(data) ? data : []) {
    const where = [j.categories?.location, ...(j.categories?.allLocations ?? [])].join(", ");
    if (!inRegion(where) || !relevant(j.text)) continue;
    add({
      id: `lever:${board}:${j.id}`, source: "Lever", company: board, title: j.text, location: where,
      posted: new Date(j.createdAt).toISOString(), url: j.hostedUrl,
      description: String(j.descriptionPlain ?? "").slice(0, DESCRIPTION_CHARS),
    });
  }
}

// 3. Remote roles open to Asia
const remotive = await getJson("https://remotive.com/api/remote-jobs?limit=150");
for (const j of remotive?.jobs ?? []) {
  if (!remoteOk(j.candidate_required_location) || !relevant(j.title)) continue;
  add({
    id: `remotive:${j.id}`, source: "Remotive", company: j.company_name, title: j.title,
    location: `Remote (${j.candidate_required_location})`, salary: j.salary || undefined,
    posted: j.publication_date, url: j.url, description: stripHtml(j.description).slice(0, DESCRIPTION_CHARS),
  });
}

// Newest first, capped. Anything over the cap stays unseen and is picked up on a later run.
const candidates = [...jobs.values()]
  .sort((a, b) => new Date(b.posted ?? 0) - new Date(a.posted ?? 0))
  .slice(0, MAX_CANDIDATES);
writeFileSync("candidates.json", JSON.stringify(candidates, null, 2));
const bySource = candidates.reduce((m, c) => ({ ...m, [c.source]: (m[c.source] ?? 0) + 1 }), {});
console.log(`${jobs.size} new matching jobs found, ${candidates.length} written to candidates.json`, bySource);
