const $ = selector => document.querySelector(selector);
const grid = $('#comparison-columns');
const topicSelect = $('#topic');
const search = $('#reader-search');
const picker = $('#confession-picker');
const pager = $('#mobile-pager');
const RESULTS = $('.reader-results');
const POSITIONS = ['First confession', 'Second confession', 'Third confession', 'Fourth confession'];
const PREFS = 'kp-confessions:reading';
const LAST = 'kp-confessions:last';
let data, state, docs, topics, matches = [], cards = [], choices = [], marks = [];
let fontSize = 17, view = 'columns', activeMobile = 0, activeMatch = -1;
let searchTimer, scrollFrame, lastHash;
const normalize = text => text.toLocaleLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

$('#year').textContent = new Date().getFullYear();
function stored(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function remember(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Reading still works with storage disabled. */ } }
function plain(html) {
  const template = document.createElement('template');
  template.innerHTML = html.replace(/<\/(?:p|div|tr|h[1-6])>/gi, '$&\n');
  return template.content.textContent.trim().replace(/\n{3,}/g, '\n\n');
}
function queryTerms(value) {
  return [...value.matchAll(/"([^"]+)"|(\S+)/g)].map(match => normalize(match[1] || match[2])).filter(Boolean);
}
function findTopics() {
  const terms = queryTerms(state.query);
  return data.topics.filter(topic => terms.every(term => topic.search.includes(term)));
}
function readState() {
  const params = new URLSearchParams(location.hash.slice(1));
  const saved = stored(LAST);
  const raw = params.get('topic') || saved?.topic || 'chief-end-and-comfort';
  const id = topics.has(raw) ? raw : data.legacyTopics[raw] || 'chief-end-and-comfort';
  const selected = params.has('compare') ? params.get('compare').split(',') : params.has('topic') ? ['hc', 'wlc', 'wsc'] : saved?.cols || ['hc', 'wlc', 'wsc'];
  return { topic: id, cols: [...new Set(selected.filter(key => docs.has(key)))].slice(0, 4), query: params.get('q') || '' };
}
function comparisonUrl() {
  const url = new URL(location.href);
  const params = new URLSearchParams({ topic: state.topic, compare: state.cols.join(',') });
  if (state.query) params.set('q', state.query);
  url.hash = params.toString();
  return url;
}
function saveState(push = true) {
  const url = comparisonUrl();
  if (url.hash !== location.hash) history[push ? 'pushState' : 'replaceState'](null, '', url);
  lastHash = location.hash;
  remember(LAST, { topic: state.topic, cols: state.cols });
  $('#action-status').textContent = '';
  $('#share-fallback').hidden = true;
}
function preferences() {
  document.body.classList.toggle('is-stacked', view === 'stacked');
  document.body.style.setProperty('--reader-size', fontSize + 'px');
  $('#font-size').value = fontSize + 'px';
  $('#smaller-text').disabled = fontSize <= 15;
  $('#larger-text').disabled = fontSize >= 23;
  $('#columns-view').setAttribute('aria-pressed', String(view === 'columns'));
  $('#stacked-view').setAttribute('aria-pressed', String(view === 'stacked'));
  remember(PREFS, { fontSize, view });
  syncMobile();
}
function openPicker(event) {
  event?.stopPropagation();
  picker.open = true;
  $('#reading-options').open = false;
  choices.find(({ button }) => !button.disabled)?.button.focus();
}
function renderTopicSelect() {
  topicSelect.replaceChildren();
  for (const groupName of data.groups) {
    const list = matches.filter(topic => topic.group === groupName);
    if (!list.length) continue;
    const group = document.createElement('optgroup');
    group.label = groupName;
    for (const topic of list) group.append(new Option(topic.title, topic.id));
    topicSelect.append(group);
  }
  if (!matches.length) topicSelect.append(new Option('No matching topics', ''));
  topicSelect.disabled = !matches.length;
  topicSelect.value = matches.length ? state.topic : '';
}
function setTopic(id) {
  if (!topics.has(id)) return;
  state.topic = id;
  saveState();
  activeMobile = 0;
  render();
  RESULTS.scrollIntoView({ block: 'start', behavior: 'instant' });
}
function compareAvailable() {
  const available = Object.keys(topics.get(state.topic).cells);
  const preferred = [...state.cols, 'wcf', 'bc', 'hc', 'shc', ...available];
  state.cols = [...new Set(preferred.filter(key => available.includes(key)))].slice(0, 4);
  saveState(); render();
}
function buildChoices() {
  const group = $('#confession-choices');
  group.replaceChildren();
  choices = data.documents.map(doc => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'confession-choice';
    const name = document.createElement('span'); name.textContent = doc.shortName;
    const detail = document.createElement('small');
    button.append(name, detail);
    button.addEventListener('click', () => {
      if (state.cols.includes(doc.id)) state.cols = state.cols.filter(id => id !== doc.id);
      else if (state.cols.length < 4) state.cols.push(doc.id);
      saveState(); render();
    });
    group.append(button);
    return { button, detail, doc };
  });
}
function updateChoices(topic) {
  for (const { button, detail, doc } of choices) {
    const on = state.cols.includes(doc.id);
    const available = Object.hasOwn(topic.cells, doc.id);
    button.setAttribute('aria-pressed', String(on));
    button.disabled = !on && (!available || state.cols.length === 4);
    const year = doc.name.match(/\d{4}/)?.[0] || '';
    detail.textContent = year + (available ? ` · ${topic.cells[doc.id].length} passages` : ' · no passage on this topic');
    button.title = !available ? 'No passage is assigned to this topic' : !on && state.cols.length === 4 ? 'Remove a confession to add another' : doc.name;
  }
}
function button(label, className, action) {
  const result = document.createElement('button');
  result.type = 'button'; result.textContent = label; result.className = className;
  result.addEventListener('click', action);
  return result;
}
async function copyText(value, success, fallback = false) {
  try {
    await navigator.clipboard.writeText(value);
    $('#action-status').textContent = success;
  } catch {
    if (fallback) {
      $('#share-fallback').hidden = false;
      $('#share-url').value = value; $('#share-url').focus(); $('#share-url').select();
    } else $('#action-status').textContent = 'Select the passage text to copy it.';
  }
}
function copyExcerpt(doc, topic) {
  const list = topic.cells[doc.id] || [];
  let chapter = '';
  const text = list.map(key => {
    const p = data.passages[key];
    const label = p.chapterHeading && p.chapterHeading !== chapter ? p.chapterHeading + '\n' : '';
    chapter = p.chapterHeading;
    return label + plain(p.html) + `\n(Reader p. ${p.page})`;
  }).join('\n\n');
  copyText(`${doc.name}\n${topic.title}\n\n${text}\n\nKidderminster Press · A Topical Reader of the Reformed Confessions\n${new URL('../downloads/reformed-confessions-reader.pdf', import.meta.url).href}`, `${doc.shortName} passages copied.`);
}
const bodyObserver = new ResizeObserver(() => syncMobile());
function renderColumns(topic) {
  const activeDocument = cards[activeMobile]?.doc.id;
  bodyObserver.disconnect();
  grid.replaceChildren(); cards = [];
  grid.style.setProperty('--column-count', Math.max(1, state.cols.length));
  grid.dataset.count = state.cols.length;
  state.cols.forEach((key, slot) => {
    const doc = docs.get(key);
    const section = document.createElement('section');
    section.className = 'confession-column'; section.setAttribute('aria-label', doc.name);
    const header = document.createElement('div'); header.className = 'confession-heading';
    const position = document.createElement('div'); position.className = 'column-position';
    const label = document.createElement('label'); label.className = 'confession-label';
    label.htmlFor = `confession-${slot}`; label.textContent = POSITIONS[slot];
    const moves = document.createElement('div'); moves.className = 'move-controls';
    for (const [delta, arrow, direction] of [[-1, '←', 'left'], [1, '→', 'right']]) {
      const move = button(arrow, '', () => {
        const target = slot + delta;
        [state.cols[slot], state.cols[target]] = [state.cols[target], state.cols[slot]];
        saveState(); render();
      });
      move.setAttribute('aria-label', `Move ${doc.shortName} ${direction}`);
      move.title = `Move ${direction}`;
      move.disabled = slot + delta < 0 || slot + delta >= state.cols.length;
      moves.append(move);
    }
    position.append(label, moves);
    const select = document.createElement('select');
    select.id = label.htmlFor; select.className = 'confession-select';
    select.append(new Option('Remove this confession', ''));
    for (const optionDoc of data.documents) {
      const available = Object.hasOwn(topic.cells, optionDoc.id);
      const option = new Option(optionDoc.name + (available ? '' : ' — no passage'), optionDoc.id);
      option.disabled = (state.cols.includes(optionDoc.id) && optionDoc.id !== key) || (!available && optionDoc.id !== key);
      select.append(option);
    }
    select.value = key;
    select.addEventListener('change', () => {
      if (select.value) state.cols[slot] = select.value;
      else state.cols.splice(slot, 1);
      saveState(); render();
    });
    const name = document.createElement('h3'); name.className = 'confession-name'; name.textContent = doc.name;
    const tools = document.createElement('div'); tools.className = 'column-tools';
    const count = document.createElement('span');
    const refs = topic.cells[key] || [];
    count.textContent = `${refs.length} ${refs.length === 1 ? 'passage' : 'passages'}`;
    const copy = button('Copy text', 'text-button copy-excerpt', () => copyExcerpt(doc, topic));
    copy.setAttribute('aria-label', `Copy ${doc.shortName} passages`); copy.disabled = !refs.length;
    tools.append(count, copy); header.append(position, select, name, tools);
    const text = document.createElement('div'); text.className = 'confession-text';
    if (!refs.length) {
      const message = document.createElement('div'); message.className = 'not-covered';
      const p = document.createElement('p'); p.textContent = 'No passage from this confession is assigned to this topic.';
      message.append(p, button('Choose a confession with a passage', 'text-button', openPicker)); text.append(message);
    } else {
      let chapter = '';
      for (const ref of refs) {
        const passage = data.passages[ref];
        if (passage.chapterHeading && passage.chapterHeading !== chapter) {
          const heading = document.createElement('h3'); heading.className = 'passage-chapter';
          heading.textContent = passage.chapterHeading; text.append(heading);
        }
        chapter = passage.chapterHeading;
        const block = document.createElement('section'); block.className = 'source-passage'; block.dataset.reference = ref;
        const meta = document.createElement('div'); meta.className = 'passage-meta';
        const reference = document.createElement('span'); reference.textContent = passage.ref;
        const source = document.createElement('a');
        source.href = new URL(`../downloads/reformed-confessions-reader.pdf#page=${passage.page}`, import.meta.url).href;
        source.textContent = `Reader p. ${passage.page}`; source.target = '_blank'; source.rel = 'noopener';
        source.setAttribute('aria-label', `${doc.shortName}, ${passage.ref}, in the Reader on page ${passage.page}`);
        const body = document.createElement('div'); body.className = 'passage-body';
        // The build verifies every HTML fragment against the corrected source edition.
        body.innerHTML = passage.html;
        meta.append(reference, source); block.append(meta, body); text.append(block);
      }
    }
    section.append(header, text); grid.append(section); cards.push({ section, text, doc }); bodyObserver.observe(text);
  });
  activeMobile = Math.max(0, cards.findIndex(card => card.doc.id === activeDocument));
  if (view === 'columns' && matchMedia('(max-width:680px)').matches) {
    const activeCard = cards[activeMobile];
    requestAnimationFrame(() => {
      if (activeCard?.section.isConnected) grid.scrollLeft = activeCard.section.offsetLeft - grid.offsetLeft;
      syncMobile();
    });
  }
}
function highlight() {
  marks = []; activeMatch = -1;
  const words = [...new Set(state.query.replaceAll('"', '').split(/\s+/).filter(word => word.length >= 2))];
  if (!words.length) { $('#next-match').hidden = true; return; }
  const pattern = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|');
  const regex = new RegExp(pattern, 'giu');
  for (const body of grid.querySelectorAll('.passage-body')) {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const matches = [...node.textContent.matchAll(regex)];
      if (!matches.length) continue;
      const fragment = document.createDocumentFragment(); let end = 0;
      for (const match of matches) {
        fragment.append(node.textContent.slice(end, match.index));
        const mark = document.createElement('mark'); mark.className = 'reader-match'; mark.textContent = match[0];
        fragment.append(mark); marks.push(mark); end = match.index + match[0].length;
      }
      fragment.append(node.textContent.slice(end)); node.replaceWith(fragment);
    }
  }
  $('#next-match').hidden = !marks.length;
  $('#next-match').textContent = marks.length ? `Next match (${marks.length})` : 'Next match';
}
function renderPager() {
  pager.replaceChildren();
  state.cols.forEach((key, index) => {
    const doc = docs.get(key);
    const item = button(doc.abbreviation, 'pager-button', () => {
      activeMobile = index;
      if (view === 'stacked') cards[index].section.scrollIntoView({ block: 'start', behavior: 'instant' });
      else grid.scrollTo({ left: cards[index].section.offsetLeft - grid.offsetLeft, behavior: 'instant' });
      syncMobile();
    });
    item.setAttribute('aria-label', `Read ${doc.name}`); pager.append(item);
  });
  pager.hidden = state.cols.length < 2 || !matches.length;
  $('#swipe-note').hidden = state.cols.length < 2 || view === 'stacked' || !matches.length;
}
function syncMobile() {
  if (!cards.length) { grid.style.height = ''; return; }
  const mobile = matchMedia('(max-width: 680px)').matches;
  if (mobile && view === 'columns') {
    let nearest = 0, distance = Infinity;
    cards.forEach(({ section }, index) => {
      const value = Math.abs(section.offsetLeft - grid.offsetLeft - grid.scrollLeft);
      if (value < distance) { distance = value; nearest = index; }
    });
    activeMobile = nearest;
    grid.style.height = `${cards[nearest].section.scrollHeight + 8}px`;
  } else grid.style.height = '';
  [...pager.children].forEach((item, index) => item.setAttribute('aria-current', String(index === activeMobile)));
}
function render() {
  matches = findTopics();
  if (matches.length && !matches.some(topic => topic.id === state.topic)) state.topic = matches[0].id;
  const topic = topics.get(state.topic);
  renderTopicSelect(); search.value = state.query;
  const index = matches.findIndex(item => item.id === state.topic);
  $('#previous-topic').disabled = index <= 0;
  $('#next-topic').disabled = index < 0 || index >= matches.length - 1;
  $('#topic-group').textContent = topic.group;
  $('#topic-title').textContent = topic.title;
  const available = Object.keys(topic.cells).length;
  $('#selection-status').textContent = `${state.cols.length} selected · ${available} available`;
  $('#selection-count').textContent = `(${state.cols.length}/4)`;
  $('#search-status').textContent = state.query ? `${matches.length} ${matches.length === 1 ? 'topic found' : 'topics found'}` : `${data.topics.length} topics`;
  $('#no-results').hidden = matches.length > 0;
  grid.hidden = !matches.length || !state.cols.length;
  $('#empty-comparison').hidden = !matches.length || !!state.cols.length;
  $('#clear-confessions').disabled = !state.cols.length;
  $('#copy-comparison').disabled = !matches.length;
  $('#compare-available').disabled = !matches.length;
  updateChoices(topic);
  renderColumns(topic); highlight(); renderPager();
  requestAnimationFrame(syncMobile);
}
function locationChanged() {
  if (!data || location.hash === lastHash) return;
  lastHash = location.hash; state = readState(); activeMobile = 0; render();
}
function applySearch() {
  state.query = search.value;
  activeMobile = 0; render(); saveState(false);
}
search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applySearch, 130); });
search.addEventListener('search', () => { clearTimeout(searchTimer); applySearch(); });
$('#clear-search').addEventListener('click', () => { search.value = ''; applySearch(); search.focus(); });
topicSelect.addEventListener('change', () => setTopic(topicSelect.value));
$('#previous-topic').addEventListener('click', () => setTopic(matches[matches.findIndex(t => t.id === state.topic)-1]?.id));
$('#next-topic').addEventListener('click', () => setTopic(matches[matches.findIndex(t => t.id === state.topic)+1]?.id));
$('#compare-available').addEventListener('click', compareAvailable);
$('#fill-empty').addEventListener('click', compareAvailable);
$('#clear-confessions').addEventListener('click', () => { state.cols = []; saveState(); render(); });
$('#copy-comparison').addEventListener('click', () => copyText(comparisonUrl().href, 'Comparison link copied.', true));
$('#smaller-text').addEventListener('click', () => { fontSize = Math.max(15, fontSize-1); preferences(); });
$('#larger-text').addEventListener('click', () => { fontSize = Math.min(23, fontSize+1); preferences(); });
$('#columns-view').addEventListener('click', () => { view = 'columns'; preferences(); renderPager(); });
$('#stacked-view').addEventListener('click', () => { view = 'stacked'; preferences(); renderPager(); });
$('#print-comparison').addEventListener('click', () => { $('#reading-options').open = false; window.print(); });
$('#next-match').addEventListener('click', () => {
  if (!marks.length) return;
  marks[activeMatch]?.classList.remove('current-match'); activeMatch = (activeMatch+1) % marks.length;
  const mark = marks[activeMatch]; mark.classList.add('current-match');
  const index = cards.findIndex(card => card.section.contains(mark));
  if (index >= 0 && view === 'columns' && matchMedia('(max-width:680px)').matches) {
    grid.scrollLeft = cards[index].section.offsetLeft - grid.offsetLeft; syncMobile();
  }
  mark.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  $('#next-match').textContent = `Next match (${activeMatch+1}/${marks.length})`;
});
grid.addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = null; syncMobile(); });
}, { passive: true });
window.addEventListener('resize', syncMobile);
window.addEventListener('popstate', locationChanged);
window.addEventListener('hashchange', locationChanged);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    picker.open = false; $('#reading-options').open = false;
    if (document.activeElement === search && search.value) { search.value = ''; applySearch(); }
  }
  if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); search.focus(); }
});
document.addEventListener('click', event => {
  for (const details of [picker, $('#reading-options')]) if (!details.contains(event.target)) details.open = false;
});
new ResizeObserver(entries => {
  const height = Math.ceil(entries[0].target.getBoundingClientRect().height);
  document.body.style.setProperty('--toolbar-height', height + 'px');
}).observe($('#reader-toolbar'));

async function loadReader() {
  $('#load-error').hidden = true;
  $('#reader-loading').hidden = false;
  try {
    const response = await fetch(new URL('../data/confessions-v2.json', import.meta.url), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Reader request failed (${response.status})`);
    const result = await response.json();
    if (result.version !== 2 || result.documents?.length !== 11 || !result.topics?.length) throw new Error('Invalid Reader data');
    data = result; docs = new Map(data.documents.map(doc => [doc.id, doc]));
    for (const [key, p] of Object.entries(data.passages)) {
      const doc = docs.get(p.document);
      p.plain = plain(p.html);
      p.search = normalize(`${doc.name} ${doc.abbreviation} ${key} ${key.replace('.', '')} ${p.ref} ${p.heading} ${p.chapterHeading} ${p.plain}`);
    }
    for (const topic of data.topics) topic.search = normalize(`${topic.title} ${topic.group} ${topic.aliases.join(' ')} ${Object.values(topic.cells).flat().map(key => data.passages[key].search).join(' ')}`);
    topics = new Map(data.topics.map(topic => [topic.id, topic]));
    state = readState(); lastHash = location.hash;
    const reading = stored(PREFS);
    if (reading) { fontSize = Math.max(15, Math.min(23, Number(reading.fontSize) || 17)); view = reading.view === 'stacked' ? 'stacked' : 'columns'; }
    buildChoices(); preferences();
    $('#reader-loading').hidden = true;
    search.disabled = false; render();
  } catch (error) {
    console.error('Unable to load the comparison Reader:', error);
    $('#reader-loading').hidden = true;
    $('#load-error').hidden = false; $('#selection-status').textContent = 'The Reader could not be loaded.';
  }
}
$('#retry-reader').addEventListener('click', loadReader);
loadReader();
