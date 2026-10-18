# AI Job Hunter · Singapore

[![Tests](https://github.com/ganpuazai2/ai-job-hunter/actions/workflows/test.yml/badge.svg)](https://github.com/ganpuazai2/ai-job-hunter/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A Claude agent that runs in the cloud every morning, finds new AI jobs in Singapore, scores each one against my CV and sends me the best matches on Telegram, with a cover letter for the top one or two.

I built it for my own job search. My real CV and run history stay in a private copy; this repo has the same code with an example profile.

## How it works

Every day at 9:30am Singapore time, a scheduled Claude Code routine starts a fresh cloud session with this repo checked out and the instruction "follow RUN.md". From there:

1. **Collect (free).** `scripts/fetch-jobs.mjs` pulls new postings from MyCareersFuture, company job boards on Greenhouse, Ashby and Lever (OpenAI, Anthropic, ElevenLabs, MongoDB, Coinbase and others) and Remotive. It keeps roles in Singapore or APAC whose titles fit what I'm looking for, skips anything already seen, and passes at most 25 to the next step.
2. **Score (AI).** Claude reads `profile.md` and `preferences.md` and gives each job a score out of 10, with the reason, what matches and what's missing.
3. **Write (AI).** It writes a short digest of the top five, plus a cover letter for the best one or two. The letters only use facts from the profile and the posting.
4. **Send.** `scripts/send-telegram.mjs` delivers it to my phone.
5. **Remember.** `scripts/mark-seen.mjs` records which jobs were scored, and the run log is committed to `runs/` so I can look back.

A morning digest looks something like this:

```
Job matches for Monday, 19 Oct
25 new jobs scored.

8/10 · Partner Specialist · MongoDB
Singapore
Partner role at an AI-adjacent company; matches 4 years of partnership deals.
Gaps: no direct cloud or database experience.
View job
```

## Set it up for yourself

You need a Claude plan with Claude Code on the web, a GitHub account and a Telegram bot.

1. Fork this repo and make your fork **private**, since it will hold your CV.
2. Replace `profile.md` with your CV and edit `preferences.md`. Change the search words and company lists at the top of `scripts/fetch-jobs.mjs` and `scripts/lib.mjs` to fit your field.
3. Create a Telegram bot with [@BotFather](https://t.me/BotFather) and get your chat ID from [@userinfobot](https://t.me/userinfobot).
4. In Claude Code on the web, create a cloud environment with **limited network access** and allow these domains: `api.mycareersfuture.gov.sg`, `boards-api.greenhouse.io`, `api.ashbyhq.com`, `api.lever.co`, `remotive.com`, `api.telegram.org`. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as environment variables.
5. Create a routine on that environment, pointed at your fork, with the prompt: *Read RUN.md in the repository root and follow it exactly, step by step.* Don't attach any connectors.

To try the collector locally (Node 20 or later, no dependencies):

```
npm run fetch   # writes candidates.json
npm test        # filters, message splitting, seen-job tracking
```

## Project structure

```
RUN.md                  instructions the agent follows every morning
profile.md              the CV jobs are scored against (example)
preferences.md          target roles, pay floor, location, red flags (example)
scripts/
  fetch-jobs.mjs        collects and pre-filters new postings
  lib.mjs               role and location filters, message splitting (pure, tested)
  send-telegram.mjs     sends the digest
  mark-seen.mjs         remembers scored jobs for 90 days
seen-jobs.json          jobs already scored
tests/                  node:test suites
```

## Decisions

**Why a script filters the jobs before the AI sees them.** On a normal day the sources return a few hundred postings, and most are software engineering roles I wouldn't apply for. Sending all of them to Claude would cost more and bury the good ones. A plain script drops the obvious misses for free, so the AI only reads about 25 jobs a day and spends its effort on judging fit.

**Why job ads are treated as untrusted.** The agent reads text written by strangers, and someone could hide an instruction in a job description. So the cloud environment can only reach the job sites and Telegram, the routine has no access to my Google Drive or anything else, and RUN.md tells the agent to treat postings as data and to flag anything that looks like an instruction aimed at it.

**Why no LinkedIn.** Scraping LinkedIn is against its terms, and I didn't want to risk my account. I use LinkedIn's own job alerts for that, and this covers the sources with public APIs.

**Why it runs in the cloud and not on my PC.** I wanted the digest waiting for me in the morning even if my laptop was off. A scheduled cloud session needs no server of my own, and the whole setup is a few small scripts and one instruction file.

**Why the cover letters have writing rules.** Recruiters read a lot of AI cover letters, and they tend to sound the same. RUN.md bans the usual habits (em dashes, buzzwords, "I am writing to express my interest") and only allows facts from my profile, so the letters are a decent starting point I can edit in a few minutes.

## Credits

MIT licensed, see [LICENSE](LICENSE). Built with the help of [Claude](https://claude.ai). Job data from each source's public API.
