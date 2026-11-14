import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const plain = html => html.replace(/<[^>]*>/g, "").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

export async function checkConfessions() {
  const reader = JSON.parse(await readFile(new URL("data/confessions.json", root), "utf8"));
  assert.equal(reader.confessions.length, 11);
  assert.equal(reader.topics.length, 82);
  assert.equal(reader.topics.reduce((sum, topic) => sum + Object.keys(topic.cells).length, 0), 390);
  for (const [extension, expected] of [["pdf", reader.source.pdfSha256], ["epub", reader.source.epubSha256]]) {
    const bytes = await readFile(new URL(`downloads/reformed-confessions-reader.${extension}`, root));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected, `Comparison source must match the current ${extension.toUpperCase()} edition`);
  }
  for (const topic of reader.topics) {
    assert.ok(topic.topic && topic.parent);
    assert.ok(Object.keys(topic.cells).length);
    for (const [confession, html] of Object.entries(topic.cells)) {
      assert.ok(reader.confessions.includes(confession), `Unknown confession in ${topic.topic}`);
      assert.ok(plain(html).trim(), `Empty excerpt in ${topic.topic}`);
      assert.doesNotMatch(html, /[\u0000\ufffd]|on\w+\s*=|(?:href|src|style)\s*=/i);
      for (const tag of html.matchAll(/<\/?([a-z][a-z0-9]*)\b/gi)) {
        assert.ok(["p", "strong", "b", "em", "i", "table", "tr", "td", "div"].includes(tag[1]), `Unexpected HTML tag: ${tag[1]}`);
      }
      assert.doesNotMatch(plain(html), /\b(?:kindne–ss|cosubstantial|Phillippi|Teatament|Godman|ofmurder|excercise|Fatehr|aqcuit|JUSFIFIED|vivfying|perservering|ordainances|caetchize|selfassurance|maidservent)\b|\[(?:801a|882a)\]/);
      for (const answer of html.matchAll(/<p class="a">([\s\S]*?)<\/p>/g)) {
        assert.doesNotMatch(plain(answer[1]), /\sQ\.$/, "A question label must not leak into an answer");
      }
    }
  }
  for (const [confession, total] of [["Heidelberg Catechism (1563)", 129], ["Westminster Larger Catechism (1647)", 196], ["Westminster Shorter Catechism (1647)", 107]]) {
    const questions = new Set();
    for (const topic of reader.topics) {
      for (const match of plain(topic.cells[confession] || "").matchAll(/Q\.\s*(\d+)\./g)) questions.add(Number(match[1]));
    }
    assert.deepEqual([...questions].sort((a, b) => a - b), Array.from({ length: total }, (_, i) => i + 1), `${confession}: every question must be accounted for`);
  }
  const excerpt = (topic, confession) => plain(reader.topics[topic].cells[confession]);
  assert.match(excerpt(7, "Heidelberg Catechism (1563)"), /Q\.22\.[\s\S]*Everything God promises[\s\S]*Q\.23\./);
  assert.match(excerpt(8, "Second Helvetic Confession (1566)"), /consubstantial, coeternal, and coequal/);
  assert.match(excerpt(3, "Belgic Confession (1561)"), /Chronicles \[commonly called Paralipomenon\], the first of Ezra/);
  assert.match(excerpt(34, "Heidelberg Catechism (1563)"), /God spoke all these words/);
  assert.match(excerpt(72, "Augsburg Confession (1530)"), /great and evil vices and much iniquity\.\]/);
  assert.match(excerpt(30, "Second Helvetic Confession (1566)"), /CHRIST IS TRULY RISEN FROM THE DEAD/);
  assert.match(excerpt(68, "Westminster Confession (1646)"), /IV\. Prayer is to be made for things lawful/);
  console.log("Checked 82 topics, 390 excerpts, complete catechism coverage, corrected readings, and both source editions.");
}
