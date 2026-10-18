// Pure helpers shared by the scripts, kept separate so they can be tested without network access.

// Role words that fit the target directions: AI solutions, partnerships/BD, product/project, automation.
export const ROLE = /solution|consultant|partner|alliance|adoption|transformation|business development|\bbd\b|go-to-market|\bgtm\b|account (manager|executive)|customer success|implementation|deployment|forward deployed|product (manager|owner|lead|operations)|program manager|project manager|automation|operations|strategy|growth/i;
// Hands-on engineering roles need a coding background this profile doesn't have yet.
export const EXCLUDE = /intern|graduate|software engineer|developer|full[- ]stack|(ai|ml|data|platform|cloud|devops|backend|frontend|security|machine learning) engineer|research (scientist|engineer)|data scientist|solutions? (engineer|architect)|designer|recruit|talent acquisition|legal|counsel|accountant|payroll|site reliability/i;
const SEA = /singapore|\bapac\b|asia[- ]pacific|southeast asia|\bsea\b|\basia\b/i;
const REMOTE_OK = /asia|singapore|worldwide|anywhere|apac/i;

export const relevant = title => ROLE.test(title ?? "") && !EXCLUDE.test(title ?? "");
export const inRegion = location => SEA.test(location ?? "");
export const remoteOk = location => REMOTE_OK.test(location ?? "");

// Greenhouse sends descriptions as escaped HTML (&lt;p&gt;), so entities are decoded before tags are removed.
export const stripHtml = html => String(html ?? "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'")
  .replace(/&quot;/g, '"').replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

// Splits a digest into Telegram messages: on lines that are just "---", then at line breaks
// so no message goes over Telegram's 4096-character cap.
export function splitMessages(text, limit = 4000) {
  const parts = text.split(/^---$/m).map(s => s.trim()).filter(Boolean);
  return parts.flatMap(part => {
    const out = [];
    let rest = part;
    while (rest.length > limit) {
      const newline = rest.lastIndexOf("\n", limit);
      const cut = newline > 0 ? newline : limit;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut).trim();
    }
    return [...out, rest];
  });
}

// Records candidates as seen today and forgets anything older than keepDays.
export function markSeen(seen, candidates, today, keepDays = 90) {
  const next = { ...seen };
  for (const c of candidates) next[c.id] = today;
  const cutoff = new Date(new Date(today).getTime() - keepDays * 864e5).toISOString().slice(0, 10);
  for (const [id, date] of Object.entries(next)) if (date < cutoff) delete next[id];
  return next;
}
