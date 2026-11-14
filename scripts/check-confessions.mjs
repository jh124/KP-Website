import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const plain = html => html.replace(/<[^>]*>/g, '').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

export async function checkConfessions() {
  const data = JSON.parse(await readFile(new URL('data/confessions-v2.json', root), 'utf8'));
  assert.equal(data.version, 2);
  assert.equal(data.documents.length, 11);
  assert.equal(new Set(data.documents.map(d => d.id)).size, 11);
  assert.equal(data.topics.length, 99);
  assert.equal(Object.keys(data.passages).length, 1146);
  const topics = new Map(data.topics.map(t => [t.id, t]));
  assert.equal(topics.size, 99);
  const used = new Set();
  for (const topic of data.topics) {
    assert.ok(topic.title && data.groups.includes(topic.group));
    assert.ok(Object.keys(topic.cells).length);
    for (const [doc, refs] of Object.entries(topic.cells)) {
      assert.ok(data.documents.some(d => d.id === doc));
      assert.equal(new Set(refs).size, refs.length);
      for (const key of refs) { assert.equal(data.passages[key].document, doc); used.add(key); }
    }
  }
  assert.deepEqual([...used].sort(), Object.keys(data.passages).sort(), 'Every source passage must be assigned');
  assert.equal(Object.keys(data.legacyTopics).length, 82);
  for (const target of Object.values(data.legacyTopics)) assert.ok(topics.has(target));
  for (const [extension, expected] of [['pdf', data.source.pdfSha256], ['epub', data.source.epubSha256]]) {
    const bytes = await readFile(new URL(`downloads/reformed-confessions-reader.${extension}`, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `The comparison must use the current ${extension.toUpperCase()} edition`);
  }
  for (const [key, passage] of Object.entries(data.passages)) {
    assert.ok(plain(passage.html).trim(), `Empty passage: ${key}`);
    assert.ok(Number.isInteger(passage.page) && passage.page >= 4 && passage.page <= 308, `Invalid page: ${key}`);
    assert.doesNotMatch(passage.html, /[\u0000\ufffd]|on\w+\s*=|(?:href|src|style)\s*=/i);
    for (const tag of passage.html.matchAll(/<\/?([a-z][a-z0-9]*)\b/gi)) assert.ok(['p','strong','b','em','i','table','tr','td','div'].includes(tag[1]));
    assert.doesNotMatch(plain(passage.html), /\b(?:kindne–ss|cosubstantial|Phillippi|Teatament|Godman|ofmurder|excercise|Fatehr|aqcuit|JUSFIFIED|vivfying|perservering|ordainances|caetchize|selfassurance|maidservent)\b|\[(?:801a|882a)\]/);
    assert.doesNotMatch(plain(passage.html), /\sQ\.$/, `Stray question label: ${key}`);
  }
  for (const [doc, total] of [['hc',129],['wlc',196],['wsc',107],['bc',37],['sc',25],['39a',39]]) {
    for (let n=1; n<=total; n++) assert.ok(used.has(`${doc}.${n}`), `${doc}: missing ${n}`);
  }
  for (const [doc,total] of [['ac',28],['fc',40]]) for (let n=1;n<=total;n++) assert.ok(used.has(`${doc}.${n}`));
  const wcf = [10,3,8,2,7,6,6,8,5,4,6,1,3,3,6,7,3,4,7,4,8,7,4,6,6,3,5,7,8,4,5,3,3];
  wcf.forEach((total,i) => { for(let n=1;n<=total;n++) assert.ok(used.has(`wcf.${i+1}.${n}`)); });
  for (let ch=1;ch<=30;ch++) assert.ok([...used].some(key=>key.startsWith(`shc.${ch}.`)));
  for (const [head, articles, errors] of [[1,18,9],[2,9,7],[3,17,9],[5,15,9]]) {
    for(let n=1;n<=articles;n++) assert.ok(used.has(`dort.${head}.a${n}`));
    for(let n=1;n<=errors;n++) assert.ok(used.has(`dort.${head}.r${n}`));
  }
  const has = (topic, ref) => Object.values(topics.get(topic).cells).flat().includes(ref);
  for (const ref of ['ac.1','shc.3.2','wcf.2.3','wlc.9','wsc.6']) assert.ok(has('trinity',ref));
  assert.ok(!has('god-being-and-attributes','wcf.2.3'));
  assert.ok(has('communion-saints','hc.55') && !has('church-nature','hc.55'));
  assert.ok(has('singing-language','shc.23.5') && !has('prayer','shc.23.5'));
  assert.ok(has('prayer','wcf.21.3') && !has('singing-language','wcf.21.3'));
  assert.ok(has('oaths-vows','39a.39') && !has('celibacy-monasticism','39a.39'));
  assert.ok(has('lords-supper','wsc.96') && !has('sacraments','wsc.96'));
  assert.ok(has('death','wcf.32.1') && !has('resurrection','wcf.32.1') && !has('last-judgment','wcf.32.1'));
  assert.deepEqual(topics.get('death').cells.wlc, ['wlc.84','wlc.85','wlc.86']);
  assert.deepEqual(topics.get('resurrection').cells.wlc, ['wlc.87']);
  assert.ok(has('lords-prayer-fifth','hc.126') && has('lords-prayer-fifth','wlc.194') && has('lords-prayer-fifth','wsc.105'));
  assert.match(plain(data.passages['shc.3.2'].html), /consubstantial, coeternal, and coequal/);
  assert.match(plain(data.passages['bc.4'].html), /Chronicles \[commonly called Paralipomenon\], the first of Ezra/);
  assert.match(plain(data.passages['hc.92'].html), /God spoke all these words/);
  assert.match(plain(data.passages['ac.23'].html), /great and evil vices and much iniquity\.\]/);
  assert.doesNotMatch(plain(data.passages['ac.21'].html), /This is about the Sum/);
  assert.ok(has('conclusions','ac.transition'));
  assert.ok(has('creeds','hc.22') && has('creeds','hc.23'));
  assert.match(data.passages['wcf.1.2'].html, /<table/);
  const page = await readFile(new URL('confessions/index.html', root), 'utf8');
  assert.doesNotMatch(page, /About the text|reader-source/);
  const css = await readFile(new URL('assets/confessions.css', root), 'utf8');
  assert.match(css, /--accent:\s*#6b1f2a/);
  console.log('Checked 99 topics, all 1,146 source passages, complete reference coverage, corrected readings, 82 legacy links, and mapping regressions.');
}
