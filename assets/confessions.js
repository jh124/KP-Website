const $ = selector => document.querySelector(selector);
const grid = $('#comparison-columns');
const topicTrigger = $('#topic');
const topicBrowser = $('#topic-browser');
const topicList = $('#topic-list');
const search = $('#reader-search');
const picker = $('#confession-picker');
const pager = $('#mobile-pager');
const RESULTS = $('.reader-results');
const PREFS = 'kp-confessions:reading';
const LAST = 'kp-confessions:last';
let data, state, docs, topics, matches = [], cards = [], choices = [], marks = [];
let fontSize = 17, view = 'columns', activeMobile = 0, activeMatch = -1;
let searchTimer, scrollFrame, stickyFrame, lastHash;
let resultsOpen = false;
let topicButtons = [];
const normalize = text => text.toLocaleLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function stored(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function remember(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Reading still works with storage disabled. */ } }
function plain(html) {
  const template = document.createElement('template');
  template.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(?:td|th)>/gi, '$&\t').replace(/<\/(?:p|div|tr|h[1-6])>/gi, '$&\n');
  return template.content.textContent.trim().replace(/\n{3,}/g, '\n\n');
}
function queryTerms(value) {
  return [...value.matchAll(/"([^"]+)"|(\S+)/g)].map(match => normalize(match[1] || match[2])).filter(Boolean);
}
function findTopics() {
  const terms = queryTerms(state.query);
  const found = data.topics.filter(topic => terms.every(term => topic.search.includes(term)));
  if (!terms.length) return found;
  const phrase = normalize(state.query.replaceAll('"', ''));
  const rank = topic => {
    const title = normalize(topic.title);
    if (title === phrase) return 3;
    if (terms.every(term => title.includes(term))) return 2;
    const labels = normalize(`${topic.title} ${topic.aliases.join(' ')}`);
    return terms.every(term => labels.includes(term)) ? 1 : 0;
  };
  return found.sort((a, b) => rank(b) - rank(a));
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
  closeDisclosures(picker); closeTopicBrowser(); picker.open = true;
}
function closeDisclosure(menu, returnFocus = false) {
  menu.open = false;
  menu.closest('.confession-heading')?.classList.remove('has-open-menu');
  if (returnFocus) menu.querySelector('summary').focus({ preventScroll: true });
}
function closeDisclosures(except = null) {
  for (const menu of document.querySelectorAll('.reader-dropdown[open]')) if (menu !== except) closeDisclosure(menu);
}
function sizeDisclosure(menu) {
  if (!menu.open) return;
  const panel = menu.querySelector('.dropdown-panel');
  const body = menu.querySelector('.dropdown-list, .dropdown-content');
  menu.classList.remove('opens-up');
  const below = window.innerHeight - panel.getBoundingClientRect().top - 20;
  const above = menu.getBoundingClientRect().top - 20;
  const upwards = below < 220 && above > below;
  menu.classList.toggle('opens-up', upwards);
  const room = upwards ? above : below;
  const chrome = panel.offsetHeight - body.offsetHeight;
  body.style.maxHeight = `${Math.max(100, Math.min(430, room - chrome))}px`;
}
function setupDisclosure(menu) {
  menu.querySelector('.close-dropdown').addEventListener('click', () => closeDisclosure(menu, true));
  const list = menu.querySelector('.dropdown-list');
  list?.addEventListener('keydown', event => listKeys(event, list));
  menu.querySelector('summary').addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!menu.open) menu.open = true;
      else menu.querySelector('.dropdown-list button:not(:disabled), .dropdown-content button:not(:disabled)')?.focus({ preventScroll: true });
    }
  });
  menu.addEventListener('toggle', () => {
    menu.closest('.confession-heading')?.classList.toggle('has-open-menu', menu.open);
    if (!menu.open) return;
    closeDisclosures(menu); closeTopicBrowser(); sizeDisclosure(menu);
    const current = menu.querySelector('[aria-current="true"], [aria-pressed="true"]') || menu.querySelector('.dropdown-list button:not(:disabled), .dropdown-content button:not(:disabled)');
    if (list && current) list.scrollTop = Math.max(0, current.offsetTop - 12);
    current?.focus({ preventScroll: true });
  });
}
function closeTopicBrowser(returnFocus = false) {
  topicBrowser.hidden = true;
  topicTrigger.setAttribute('aria-expanded', 'false');
  if (returnFocus) topicTrigger.focus({ preventScroll: true });
}
function sizeTopicBrowser() {
  if (topicBrowser.hidden) return;
  const room = window.innerHeight - topicBrowser.getBoundingClientRect().top - 20;
  topicList.style.maxHeight = `${Math.max(120, Math.min(430, room - 50))}px`;
}
function openTopicBrowser() {
  if (!data) return;
  closeDisclosures();
  topicBrowser.hidden = false;
  topicTrigger.setAttribute('aria-expanded', 'true');
  if (window.innerHeight - topicBrowser.getBoundingClientRect().top < 220) {
    $('#reader-toolbar').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  sizeTopicBrowser();
  const current = topicButtons.find(item => item.id === state.topic)?.button;
  if (current) {
    topicList.scrollTop = current.offsetTop - 12;
    current.focus({ preventScroll: true });
  }
}
function buildTopicBrowser() {
  topicList.replaceChildren(); topicButtons = [];
  for (const groupName of data.groups) {
    const section = document.createElement('section');
    const heading = document.createElement('h3'); heading.textContent = groupName;
    const list = document.createElement('ul');
    for (const topic of data.topics.filter(item => item.group === groupName)) {
      const row = document.createElement('li');
      const item = button(topic.title, 'dropdown-option topic-option', () => setTopic(topic.id));
      item.dataset.topic = topic.id;
      row.append(item); list.append(row); topicButtons.push({ id: topic.id, button: item });
    }
    section.append(heading, list); topicList.append(section);
  }
}
function updateTopicBrowser() {
  $('#topic-name').textContent = topics.get(state.topic).title;
  topicTrigger.disabled = false;
  for (const item of topicButtons) item.button.setAttribute('aria-current', String(item.id === state.topic));
}
function resultHit(topic) {
  const terms = queryTerms(state.query);
  const refs = Object.values(topic.cells).flat();
  const exact = refs.filter(key => terms.every(term => data.passages[key].search.includes(term)));
  return exact.find(key => state.cols.includes(data.passages[key].document)) || exact[0] ||
    refs.find(key => terms.some(term => normalize(data.passages[key].plain).includes(term))) || null;
}
function excerptPreview(passage) {
  const text = passage.plain.replace(/\s+/g, ' ');
  const terms = state.query.replaceAll('"', '').split(/\s+/).filter(term => term.length > 1);
  const positions = terms.map(term => text.toLowerCase().indexOf(term.toLowerCase())).filter(index => index >= 0);
  let start = positions.length ? Math.max(0, Math.min(...positions) - 65) : 0;
  if (start) { const space = text.indexOf(' ', start); if (space >= 0) start = space + 1; }
  const end = Math.min(text.length, start + 220);
  return (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
function scrollToResults() {
  $('#search-results').scrollIntoView({ block: 'start', behavior: 'instant' });
}
function openSearchResult(topic, ref) {
  closeTopicBrowser();
  state.topic = topic.id;
  const doc = ref ? data.passages[ref].document : null;
  if (doc && !state.cols.includes(doc)) {
    if (state.cols.length < 4) state.cols.push(doc);
    else state.cols[state.cols.length-1] = doc;
  }
  resultsOpen = false; saveState(); render();
  requestAnimationFrame(() => {
    const target = ref ? [...grid.querySelectorAll('.source-passage')].find(node => node.dataset.reference === ref) : null;
    if (target) {
      const index = cards.findIndex(card => card.section.contains(target));
      if (index >= 0 && view === 'columns' && matchMedia('(max-width:680px)').matches) {
        grid.scrollLeft = cards[index].section.offsetLeft - grid.offsetLeft; syncMobile();
      }
      target.tabIndex = -1; target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else RESULTS.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
}
function renderSearchResults() {
  const active = !!state.query.trim();
  $('#search-results').hidden = !active || !resultsOpen;
  $('#show-search-results').hidden = !active;
  $('#show-search-results').textContent = `${resultsOpen ? 'Hide' : 'Show'} ${matches.length} results`;
  $('#show-search-results').setAttribute('aria-expanded', String(active && resultsOpen));
  $('#search-results-heading').textContent = `Search results · ${matches.length} ${matches.length === 1 ? 'topic' : 'topics'}`;
  const container = $('#search-results-list'); container.replaceChildren();
  $('#no-results').hidden = matches.length > 0;
  container.hidden = !matches.length;
  if (!active) return;
  const list = document.createElement('ul');
  for (const topic of matches) {
    const ref = resultHit(topic);
    const passage = ref ? data.passages[ref] : null;
    const row = document.createElement('li');
    const item = button('', 'search-result', () => openSearchResult(topic, ref));
    const group = document.createElement('span'); group.className = 'search-result-group'; group.textContent = topic.group;
    const title = document.createElement('span'); title.className = 'search-result-title'; title.textContent = topic.title;
    item.append(group, title);
    if (passage) {
      const source = document.createElement('span'); source.className = 'search-result-source';
      source.textContent = `${docs.get(passage.document).shortName} · ${passage.ref} · Reader p. ${passage.page}`;
      const snippet = document.createElement('span'); snippet.className = 'search-result-preview'; snippet.textContent = excerptPreview(passage);
      item.append(source, snippet);
    } else {
      const detail = document.createElement('span'); detail.className = 'search-result-source';
      detail.textContent = `Topic match · ${Object.keys(topic.cells).length} confessions available`; item.append(detail);
    }
    item.dataset.topic = topic.id; if (ref) item.dataset.reference = ref;
    row.append(item); list.append(row);
  }
  container.append(list);
}
function listKeys(event, container) {
  const buttons = [...container.querySelectorAll('button:not(:disabled)')];
  let index = buttons.indexOf(document.activeElement);
  if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = buttons.length-1;
  else if (event.key === 'ArrowDown') index = Math.min(buttons.length-1, index+1);
  else if (event.key === 'ArrowUp') index = Math.max(0, index-1);
  else return;
  if (!buttons[index]) return;
  event.preventDefault(); buttons[index].focus({ preventScroll: true });
  const item = buttons[index];
  if (item.offsetTop < container.scrollTop) container.scrollTop = item.offsetTop;
  else if (item.offsetTop + item.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = item.offsetTop + item.offsetHeight - container.clientHeight;
}
function setTopic(id) {
  if (!topics.has(id)) return;
  closeTopicBrowser(!topicBrowser.hidden); resultsOpen = false;
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
    button.type = 'button'; button.className = 'dropdown-option confession-choice';
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
    detail.textContent = year + (available ? ` · ${topic.cells[doc.id].length} ${topic.cells[doc.id].length === 1 ? 'passage' : 'passages'}` : ' · no passage on this topic');
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
function citationReferences(passages) {
  const refs = [...new Set(passages.map(passage => passage.ref))];
  const ranges = [];
  for (let i = 0; i < refs.length; i++) {
    const start = refs[i].match(/^(.*?)(\d+)$/);
    if (!start) { ranges.push(refs[i]); continue; }
    let end = Number(start[2]);
    while (i + 1 < refs.length) {
      const next = refs[i + 1].match(/^(.*?)(\d+)$/);
      if (!next || next[1] !== start[1] || Number(next[2]) !== end + 1) break;
      end++; i++;
    }
    ranges.push(`${start[1]}${start[2]}${end > Number(start[2]) ? '–' + end : ''}`);
  }
  return ranges.join('; ');
}
function copyExcerpt(doc, topic) {
  const passages = (topic.cells[doc.id] || []).map(key => data.passages[key]);
  const text = passages.map(passage => plain(passage.html)).join('\n\n');
  const name = doc.name.replace(/\s*\(\d{4}\)$/, '');
  copyText(`${text}\n\n— ${name}, ${citationReferences(passages)}`, `${doc.shortName} passages copied.`);
}
function confessionDropdown(doc, topic, slot) {
  const menu = document.createElement('details'); menu.className = 'reader-dropdown confession-dropdown';
  const trigger = document.createElement('summary'); trigger.id = `confession-${slot}`; trigger.className = 'dropdown-trigger';
  trigger.setAttribute('aria-label', `Change ${doc.shortName}`);
  const selected = document.createElement('span'); selected.id = `${trigger.id}-name`; selected.textContent = doc.name;
  trigger.append(selected);
  const panel = document.createElement('div'); panel.className = 'dropdown-panel confession-menu';
  const heading = document.createElement('div'); heading.className = 'dropdown-heading';
  const title = document.createElement('span'); title.textContent = 'Choose a confession';
  const close = document.createElement('button'); close.type = 'button'; close.className = 'text-button close-dropdown'; close.textContent = 'Close'; close.setAttribute('aria-label', `Close ${doc.shortName} menu`);
  heading.append(title, close);
  const list = document.createElement('div'); list.className = 'dropdown-list'; list.setAttribute('role', 'group'); list.setAttribute('aria-label', `Replace ${doc.shortName}`);
  const choose = id => {
    if (id) state.cols[slot] = id;
    else state.cols.splice(slot, 1);
    saveState(); render();
    ($(`#confession-${slot}`) || $('#confession-picker summary')).focus({ preventScroll: true });
  };
  for (const optionDoc of data.documents) {
    const available = Object.hasOwn(topic.cells, optionDoc.id);
    const item = button('', 'dropdown-option confession-option', () => choose(optionDoc.id));
    const name = document.createElement('span'); name.textContent = optionDoc.name;
    item.append(name); item.dataset.confession = optionDoc.id;
    item.setAttribute('aria-current', String(optionDoc.id === doc.id));
    item.disabled = (state.cols.includes(optionDoc.id) && optionDoc.id !== doc.id) || (!available && optionDoc.id !== doc.id);
    if (!available || (state.cols.includes(optionDoc.id) && optionDoc.id !== doc.id)) {
      const detail = document.createElement('small'); detail.textContent = !available ? 'No passage on this topic' : 'Already selected'; item.append(detail);
    }
    list.append(item);
  }
  const footer = document.createElement('div'); footer.className = 'dropdown-footer';
  footer.append(button('Remove this confession', 'dropdown-option remove-confession', () => choose('')));
  panel.append(heading, list, footer); menu.append(trigger, panel); setupDisclosure(menu);
  return menu;
}
const bodyObserver = new ResizeObserver(() => syncMobile());
const headerObserver = new ResizeObserver(entries => {
  for (const { target } of entries) target.parentElement.style.setProperty('--confession-header-height', `${Math.ceil(target.getBoundingClientRect().height)}px`);
  syncMobile();
});
function renderColumns(topic) {
  const activeDocument = cards[activeMobile]?.doc.id;
  bodyObserver.disconnect(); headerObserver.disconnect();
  grid.replaceChildren(); cards = [];
  grid.style.setProperty('--column-count', Math.max(1, state.cols.length));
  grid.dataset.count = state.cols.length;
  state.cols.forEach((key, slot) => {
    const doc = docs.get(key);
    const section = document.createElement('section');
    section.className = 'confession-column'; section.setAttribute('aria-label', doc.name);
    const header = document.createElement('div'); header.className = 'confession-heading';
    const position = document.createElement('div'); position.className = 'column-position';
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
    position.append(moves);
    const select = confessionDropdown(doc, topic, slot);
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
        source.href = new URL(`../downloads/reformed-confessions-reader.pdf?v=${data.source.pdfSha256.slice(0,12)}#page=${passage.page}`, import.meta.url).href;
        source.textContent = `Reader p. ${passage.page}`; source.target = '_blank'; source.rel = 'noopener';
        source.setAttribute('aria-label', `${doc.shortName}, ${passage.ref}, in the Reader on page ${passage.page}`);
        const body = document.createElement('div'); body.className = 'passage-body';
        // The build verifies every HTML fragment against the corrected source edition.
        body.innerHTML = passage.html;
        meta.append(reference, source); block.append(meta, body); text.append(block);
      }
    }
    section.append(header, text); grid.append(section); cards.push({ section, text, header, doc }); bodyObserver.observe(text); headerObserver.observe(header);
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
  pager.hidden = state.cols.length < 2;
  $('#swipe-note').hidden = state.cols.length < 2 || view === 'stacked';
}
// Horizontal overflow contains CSS sticky positioning on phones, so pin the active header in the viewport.
function syncPinnedHeader() {
  const mobile = view === 'columns' && matchMedia('(max-width: 680px)').matches;
  const rect = grid.getBoundingClientRect();
  const current = cards[activeMobile];
  const pinned = mobile && current && rect.top < 0 && rect.bottom > 0;
  for (const card of cards) card.section.classList.toggle('has-pinned-heading', !!pinned && card === current);
  if (pinned) {
    grid.style.setProperty('--mobile-heading-left', rect.left + 'px');
    grid.style.setProperty('--mobile-heading-width', grid.clientWidth + 'px');
    grid.style.setProperty('--mobile-heading-top', Math.min(0, rect.bottom - current.header.offsetHeight) + 'px');
  }
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
  syncPinnedHeader();
}
function render() {
  matches = findTopics();
  const topic = topics.get(state.topic);
  updateTopicBrowser(); search.value = state.query;
  const index = data.topics.findIndex(item => item.id === state.topic);
  $('#previous-topic').disabled = index <= 0;
  $('#next-topic').disabled = index < 0 || index >= data.topics.length - 1;
  $('#topic-group').textContent = topic.group;
  $('#topic-title').textContent = topic.title;
  const available = Object.keys(topic.cells).length;
  $('#selection-status').textContent = `${state.cols.length} selected · ${available} available`;
  $('#selection-count').textContent = `(${state.cols.length}/4)`;
  $('#search-status').textContent = state.query.trim() ? `${matches.length} ${matches.length === 1 ? 'topic found' : 'topics found'}` : `${data.topics.length} topics`;
  renderSearchResults();
  grid.hidden = !state.cols.length;
  $('#empty-comparison').hidden = !!state.cols.length;
  $('#clear-confessions').disabled = !state.cols.length;
  $('#copy-comparison').disabled = false;
  $('#compare-available').disabled = false;
  updateChoices(topic);
  renderColumns(topic); highlight(); renderPager();
  requestAnimationFrame(syncMobile);
}
function locationChanged() {
  if (!data || location.hash === lastHash) return;
  lastHash = location.hash; state = readState(); resultsOpen = !!state.query.trim(); activeMobile = 0; closeTopicBrowser(); render();
}
function applySearch() {
  state.query = search.value;
  resultsOpen = !!state.query.trim();
  closeTopicBrowser(); render(); saveState(false);
}
search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applySearch, 130); });
search.addEventListener('search', () => { clearTimeout(searchTimer); applySearch(); });
$('#clear-search').addEventListener('click', () => { search.value = ''; applySearch(); search.focus(); });
topicTrigger.addEventListener('click', () => topicBrowser.hidden ? openTopicBrowser() : closeTopicBrowser(true));
$('#close-topic-browser').addEventListener('click', () => closeTopicBrowser(true));
topicTrigger.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openTopicBrowser(); }
});
topicList.addEventListener('keydown', event => listKeys(event, topicList));
$('#search-results-list').addEventListener('keydown', event => listKeys(event, $('#search-results-list')));
$('#show-search-results').addEventListener('click', () => {
  resultsOpen = !resultsOpen; renderSearchResults(); if (resultsOpen) scrollToResults();
});
$('#hide-search-results').addEventListener('click', () => { resultsOpen = false; renderSearchResults(); search.focus({ preventScroll: true }); });
search.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault(); clearTimeout(searchTimer); applySearch();
    if (resultsOpen) scrollToResults();
    $('#search-results-list button')?.focus({ preventScroll: true });
  } else if (event.key === 'ArrowDown' && search.value.trim()) {
    event.preventDefault(); clearTimeout(searchTimer); applySearch();
    if (resultsOpen) scrollToResults();
    $('#search-results-list button')?.focus({ preventScroll: true });
  }
});
$('#previous-topic').addEventListener('click', () => setTopic(data.topics[data.topics.findIndex(t => t.id === state.topic)-1]?.id));
$('#next-topic').addEventListener('click', () => setTopic(data.topics[data.topics.findIndex(t => t.id === state.topic)+1]?.id));
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
window.addEventListener('scroll', () => {
  if (!stickyFrame) stickyFrame = requestAnimationFrame(() => { stickyFrame = null; syncPinnedHeader(); });
}, { passive: true });
window.addEventListener('resize', () => {
  syncMobile(); sizeTopicBrowser();
  for (const menu of document.querySelectorAll('.reader-dropdown[open]')) sizeDisclosure(menu);
});
window.addEventListener('popstate', locationChanged);
window.addEventListener('hashchange', locationChanged);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const open = document.querySelector('.reader-dropdown[open]');
    if (open) { closeDisclosure(open, true); event.preventDefault(); return; }
    if (!topicBrowser.hidden) { closeTopicBrowser(true); event.preventDefault(); return; }
    if (document.activeElement === search && search.value) { search.value = ''; applySearch(); }
  }
  if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); search.focus(); }
});
document.addEventListener('click', event => {
  for (const menu of document.querySelectorAll('.reader-dropdown[open]')) if (!menu.contains(event.target)) closeDisclosure(menu);
  if (!topicBrowser.contains(event.target) && !topicTrigger.contains(event.target)) closeTopicBrowser();
});

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
    state = readState(); lastHash = location.hash; resultsOpen = !!state.query.trim();
    const reading = stored(PREFS);
    if (reading) { fontSize = Math.max(15, Math.min(23, Number(reading.fontSize) || 17)); view = reading.view === 'stacked' ? 'stacked' : 'columns'; }
    buildChoices(); buildTopicBrowser(); preferences();
    $('#reader-loading').hidden = true;
    search.disabled = false; render();
  } catch (error) {
    console.error('Unable to load the comparison Reader:', error);
    $('#reader-loading').hidden = true;
    $('#load-error').hidden = false; $('#selection-status').textContent = 'The Reader could not be loaded.';
  }
}
for (const menu of document.querySelectorAll('.reader-dropdown')) setupDisclosure(menu);
$('#retry-reader').addEventListener('click', loadReader);
loadReader();
