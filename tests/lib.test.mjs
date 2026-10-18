import { test } from "node:test";
import assert from "node:assert/strict";
import { relevant, inRegion, remoteOk, stripHtml, splitMessages, markSeen } from "../scripts/lib.mjs";

test("keeps solutions, partnerships, product and automation roles", () => {
  for (const title of [
    "Enterprise AI Solutions Consultant (HK/SG)",
    "Partner Specialist",
    "Strategy & Operations Lead - SEA & ANZ",
    "Senior Product Manager, Payments",
    "AI Automation Specialist",
    "Business Development Manager",
  ]) assert.ok(relevant(title), title);
});

test("drops engineering, recruiting and junior roles", () => {
  for (const title of [
    "Senior Software Engineer",
    "ML Engineer, Inference",
    "Solutions Engineer Intern",
    "Technical Recruiter, APAC",
    "Data Scientist",
    "Graduate Programme 2027",
  ]) assert.ok(!relevant(title), title);
});

test("drops titles with no target role word", () => {
  assert.ok(!relevant("Office Manager"));
  assert.ok(!relevant(undefined));
});

test("matches Singapore and APAC locations, not others", () => {
  assert.ok(inRegion("Singapore"));
  assert.ok(inRegion("Remote - APAC"));
  assert.ok(inRegion("Asia-Pacific"));
  assert.ok(!inRegion("San Francisco, CA"));
  assert.ok(!inRegion("Seattle")); // "sea" must be a whole word
  assert.ok(!inRegion(undefined));
});

test("accepts remote roles open to Asia or worldwide", () => {
  assert.ok(remoteOk("Worldwide"));
  assert.ok(remoteOk("Asia, Europe"));
  assert.ok(!remoteOk("USA only"));
});

test("turns job description HTML into plain text", () => {
  assert.equal(stripHtml("<p>Work with <b>partners</b>&nbsp;&amp; teams</p>\n<ul><li>APAC</li></ul>"),
    "Work with partners & teams APAC");
  assert.equal(stripHtml(null), "");
});

test("splits a digest on --- lines", () => {
  assert.deepEqual(splitMessages("one\n---\ntwo\n---\n"), ["one", "two"]);
});

test("splits long messages at a line break under the limit", () => {
  const text = ["a".repeat(30), "b".repeat(30), "c".repeat(30)].join("\n");
  const parts = splitMessages(text, 70);
  assert.deepEqual(parts, ["a".repeat(30) + "\n" + "b".repeat(30), "c".repeat(30)]);
  assert.ok(parts.every(p => p.length <= 70));
});

test("hard-splits a single line longer than the limit", () => {
  assert.deepEqual(splitMessages("x".repeat(25), 10), ["x".repeat(10), "x".repeat(10), "x".repeat(5)]);
});

test("marks candidates as seen and forgets old entries", () => {
  const seen = { "mcf:old": "2026-06-01", "mcf:recent": "2026-10-01" };
  const next = markSeen(seen, [{ id: "gh:openai:1" }], "2026-10-19");
  assert.deepEqual(next, { "mcf:recent": "2026-10-01", "gh:openai:1": "2026-10-19" });
  assert.equal(seen["mcf:old"], "2026-06-01"); // input isn't changed
});
