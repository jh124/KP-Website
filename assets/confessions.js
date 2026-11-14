const POSITIONS = ["First confession", "Second confession", "Third confession", "Fourth confession"];
const KEYS = ["ac", "fc", "sc", "bc", "hc", "shc", "39a", "dort", "wcf", "wlc", "wsc"];
const ABBREVIATIONS = ["AC", "French", "Scots", "BC", "HC", "2HC", "39A", "Dort", "WCF", "WLC", "WSC"];
const topicSelect = document.querySelector("#topic");
const grid = document.querySelector("#comparison-columns");
const previous = document.querySelector("#previous-topic");
const next = document.querySelector("#next-topic");
const clear = document.querySelector("#clear-confessions");
const copy = document.querySelector("#copy-comparison");
const pager = document.querySelector("#mobile-pager");
let data;
let state;
let columns = [];
let choices = [];
let scrollFrame;

document.querySelector("#year").textContent = String(new Date().getFullYear());

function topicId(topic) {
  return topic.topic.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function topicLabel(topic) {
  if (!topic.sub) return topic.topic;
  if (topic.sub.startsWith("(")) return `${topic.parent.split(/[;:(—]/)[0].trim()} ${topic.sub}`;
  return topic.sub;
}

function readState() {
  const params = new URLSearchParams(location.hash.slice(1));
  const topic = data.topics.findIndex(item => topicId(item) === params.get("topic"));
  const result = { topic: topic < 0 ? 1 : topic, cols: [4, 9, 10, null] };
  if (params.has("compare")) {
    const used = new Set();
    result.cols = Array.from({ length: 4 }, (_, i) => {
      const key = (params.get("compare") || "").split(",")[i];
      const index = KEYS.indexOf(key);
      if (index < 0 || used.has(index)) return null;
      used.add(index);
      return index;
    });
  }
  return result;
}

function comparisonUrl() {
  const url = new URL(location.href);
  url.hash = new URLSearchParams({
    topic: topicId(data.topics[state.topic]),
    compare: state.cols.map(index => index === null ? "" : KEYS[index]).join(","),
  }).toString();
  return url;
}

function saveState() {
  history.replaceState(null, "", comparisonUrl());
  document.querySelector("#action-status").textContent = "";
  document.querySelector("#share-fallback").hidden = true;
}

function buildControls() {
  topicSelect.replaceChildren();
  grid.replaceChildren();
  let group;
  let lastParent;
  for (const [index, topic] of data.topics.entries()) {
    if (topic.parent !== lastParent) {
      group = document.createElement("optgroup");
      group.label = topic.parent;
      topicSelect.append(group);
      lastParent = topic.parent;
    }
    group.append(new Option(topicLabel(topic), String(index)));
  }
  columns = POSITIONS.map((position, index) => {
    const section = document.createElement("section");
    section.className = "confession-column";
    const heading = document.createElement("div");
    heading.className = "confession-heading";
    const label = document.createElement("label");
    label.className = "confession-label";
    label.htmlFor = `confession-${index}`;
    label.textContent = position;
    const select = document.createElement("select");
    select.id = label.htmlFor;
    select.className = "confession-select";
    select.append(new Option("Choose a confession…", ""));
    data.confessions.forEach((name, i) => select.append(new Option(name, String(i))));
    const name = document.createElement("h2");
    name.className = "confession-name";
    const text = document.createElement("div");
    text.className = "confession-text";
    heading.append(label, select, name);
    section.append(heading, text);
    grid.append(section);
    select.addEventListener("change", () => {
      state.cols[index] = select.value === "" ? null : Number(select.value);
      saveState();
      render();
    });
    return { section, select, name, text };
  });
  const choiceGroup = document.querySelector("#confession-choices");
  choiceGroup.replaceChildren();
  choices = data.confessions.map((name, index) => {
    const button = document.createElement("button");
    button.className = "confession-choice";
    button.type = "button";
    button.textContent = name.replace(/ \(\d+\)$/, "");
    button.addEventListener("click", () => {
      const slot = state.cols.indexOf(index);
      if (slot !== -1) state.cols[slot] = null;
      else {
        const free = state.cols.indexOf(null);
        if (free === -1) return;
        state.cols[free] = index;
      }
      saveState();
      render();
    });
    choiceGroup.append(button);
    return button;
  });
}

function setTopic(index) {
  if (index < 0 || index >= data.topics.length) return;
  state.topic = index;
  saveState();
  render();
  grid.scrollLeft = 0;
  syncPager();
}

function render() {
  const topic = data.topics[state.topic];
  const selectedCount = state.cols.filter(index => index !== null).length;
  topicSelect.value = String(state.topic);
  previous.disabled = state.topic === 0;
  next.disabled = state.topic === data.topics.length - 1;
  clear.disabled = selectedCount === 0;
  document.querySelector("#topic-parent").textContent = topic.sub ? topic.parent : topic.topic;
  document.querySelector("#selection-status").textContent = `${selectedCount} of 4 confessions selected`;
  document.querySelector("#mobile-count").textContent = `(${selectedCount}/4)`;
  document.querySelector("#mobile-empty").hidden = selectedCount > 0;
  document.querySelector("#swipe-note").hidden = selectedCount < 2;

  columns.forEach(({ section, select, name, text }, slot) => {
    const chosen = state.cols[slot];
    const confession = chosen === null ? null : data.confessions[chosen];
    section.classList.toggle("filled", chosen !== null);
    section.setAttribute("aria-label", confession || POSITIONS[slot]);
    select.value = chosen === null ? "" : String(chosen);
    for (const [index, option] of Array.from(select.options).slice(1).entries()) {
      const available = Object.hasOwn(topic.cells, data.confessions[index]);
      const usedElsewhere = state.cols.some((value, i) => i !== slot && value === index);
      option.disabled = usedElsewhere || (!available && index !== chosen);
      option.textContent = data.confessions[index] + (available ? "" : " — no excerpt");
    }
    name.textContent = confession || "";
    if (confession && Object.hasOwn(topic.cells, confession)) {
      // Only the checked, repository-owned Reader HTML is rendered here.
      text.innerHTML = topic.cells[confession];
    } else {
      const message = document.createElement("p");
      message.className = confession ? "not-covered" : "placeholder";
      message.textContent = confession
        ? "No excerpt from this confession is assigned to this topic in the Reader."
        : "Choose a confession above to read its treatment of this topic.";
      text.replaceChildren(message);
    }
  });

  choices.forEach((button, index) => {
    const on = state.cols.includes(index);
    const available = Object.hasOwn(topic.cells, data.confessions[index]);
    button.setAttribute("aria-pressed", String(on));
    button.disabled = !on && (!available || selectedCount >= 4);
    button.title = !available ? "No excerpt is assigned to this topic" : !on && selectedCount >= 4 ? "Remove a confession to add another" : "";
  });

  pager.replaceChildren();
  state.cols.forEach((chosen, slot) => {
    if (chosen === null) return;
    const button = document.createElement("button");
    button.className = "pager-button";
    button.type = "button";
    button.textContent = ABBREVIATIONS[chosen];
    button.setAttribute("aria-label", `Read ${data.confessions[chosen]}`);
    button.addEventListener("click", () => {
      const left = columns[slot].section.offsetLeft - grid.offsetLeft;
      grid.scrollTo({ left, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
    pager.append(button);
  });
  pager.hidden = selectedCount < 2;
  syncPager();
}

function syncPager() {
  const filled = columns.filter(({ section }) => section.classList.contains("filled"));
  if (!filled.length) return;
  let active = 0;
  let closest = Infinity;
  filled.forEach(({ section }, index) => {
    const distance = Math.abs(section.offsetLeft - grid.offsetLeft - grid.scrollLeft);
    if (distance < closest) { closest = distance; active = index; }
  });
  Array.from(pager.children).forEach((button, index) => button.setAttribute("aria-current", String(index === active)));
}

topicSelect.addEventListener("change", () => setTopic(Number(topicSelect.value)));
previous.addEventListener("click", () => setTopic(state.topic - 1));
next.addEventListener("click", () => setTopic(state.topic + 1));
clear.addEventListener("click", () => {
  state.cols = [null, null, null, null];
  saveState();
  render();
});
copy.addEventListener("click", async () => {
  const url = comparisonUrl().href;
  try {
    await navigator.clipboard.writeText(url);
    document.querySelector("#action-status").textContent = "Comparison link copied.";
  } catch {
    document.querySelector("#share-fallback").hidden = false;
    const input = document.querySelector("#share-url");
    input.value = url;
    input.focus();
    input.select();
  }
});
grid.addEventListener("scroll", () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => { scrollFrame = null; syncPager(); });
}, { passive: true });
window.addEventListener("resize", syncPager);
window.addEventListener("hashchange", () => {
  if (!data) return;
  state = readState();
  render();
});

async function loadReader() {
  document.querySelector("#load-error").hidden = true;
  document.querySelector("#selection-status").textContent = "Loading the corrected Reader…";
  try {
    const response = await fetch(new URL("../data/confessions.json", import.meta.url), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Reader request failed (${response.status})`);
    const result = await response.json();
    if (result.confessions?.length !== KEYS.length || !result.topics?.length) throw new Error("Invalid Reader data");
    data = result;
    state = readState();
    buildControls();
    topicSelect.disabled = false;
    copy.disabled = false;
    document.querySelector("#mobile-choices").hidden = false;
    render();
  } catch (error) {
    console.error("Unable to load the comparison Reader:", error);
    document.querySelector("#load-error").hidden = false;
    document.querySelector("#selection-status").textContent = "The Reader could not be loaded.";
  }
}
document.querySelector("#retry-reader").addEventListener("click", loadReader);
loadReader();
