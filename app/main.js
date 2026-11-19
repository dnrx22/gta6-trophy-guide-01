const STORAGE_KEY = 'gta6-trophy-guide-progress-v1';
const POINTS = { platinum: 180, gold: 90, silver: 30, bronze: 15 };
const KIND_LABELS = {
  story: 'Story',
  exploration: 'Exploration',
  activity: 'Activities',
  collectible: 'Collectibles',
  combat: 'Combat',
  driving: 'Driving',
  completion: 'Completion',
};

const state = {
  trophies: [],
  earned: new Set(),
  hideSpoilers: false,
  search: '',
  kind: 'all',
  grade: 'all',
  status: 'all',
};

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const missableEl = $('missableList');
const progressFill = $('progressFill');
const progressText = $('progressText');
const saveNote = $('saveNote');

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.earned)) {
      state.earned = new Set(parsed.earned.filter((n) => Number.isInteger(n)));
    }
    if (parsed && typeof parsed.hideSpoilers === 'boolean') {
      state.hideSpoilers = parsed.hideSpoilers;
    }
  } catch {
    state.earned = new Set();
  }
}

function saveProgress(note) {
  const payload = { earned: [...state.earned].sort((a, b) => a - b), hideSpoilers: state.hideSpoilers };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  if (note) {
    saveNote.textContent = note;
    window.setTimeout(() => { saveNote.textContent = ''; }, 2500);
  }
}

function gradeLabel(t) {
  return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
}

function isHidden(t) {
  return state.hideSpoilers && t.secret && !state.earned.has(t.id);
}

function trophyMatches(t) {
  if (state.kind !== 'all' && t.kind !== state.kind) return false;
  if (state.grade !== 'all' && t.grade !== state.grade) return false;
  if (state.status === 'earned' && !state.earned.has(t.id)) return false;
  if (state.status === 'unearned' && state.earned.has(t.id)) return false;
  if (state.status === 'missable' && !t.missable) return false;
  if (state.search) {
    const hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
    if (!hay.includes(state.search.toLowerCase())) return false;
  }
  return true;
}

function trophyCard(t) {
  const li = document.createElement('li');
  li.className = 'trophy' + (state.earned.has(t.id) ? ' earned' : '');
  const head = document.createElement('div');
  head.className = 'trophy-head';
  const title = document.createElement('h3');
  title.textContent = '#' + t.id + ' ' + t.name;
  head.appendChild(title);
  const grade = document.createElement('span');
  grade.className = 'grade ' + t.grade;
  grade.textContent = gradeLabel(t);
  head.appendChild(grade);
  if (t.missable) {
    const flag = document.createElement('span');
    flag.className = 'flag';
    flag.textContent = 'MISSABLE';
    head.appendChild(flag);
  }
  if (t.secret) {
    const flag = document.createElement('span');
    flag.className = 'flag spoiler';
    flag.textContent = 'STORY SPOILER';
    head.appendChild(flag);
  }
  li.appendChild(head);

  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = isHidden(t) ? 'Hidden until earned — enable spoilers or earn this trophy to reveal it.' : t.description;
  li.appendChild(desc);

  if (!isHidden(t)) {
    const guide = document.createElement('p');
    guide.className = 'trophy-guide';
    guide.textContent = t.guide;
    li.appendChild(guide);
    const sources = document.createElement('p');
    sources.className = 'trophy-sources';
    sources.textContent = 'Sources: ' + t.sources.join('; ');
    li.appendChild(sources);
  } else {
    const hidden = document.createElement('p');
    hidden.className = 'spoiler-hidden';
    hidden.textContent = 'Guide and sources hidden with spoilers on.';
    li.appendChild(hidden);
  }

  const foot = document.createElement('div');
  foot.className = 'trophy-foot';
  const label = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.earned.has(t.id);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
  box.addEventListener('change', () => {
    if (box.checked) state.earned.add(t.id);
    else state.earned.delete(t.id);
    saveProgress('Progress saved.');
    render();
  });
  label.appendChild(box);
  label.appendChild(document.createTextNode('Earned'));
  foot.appendChild(label);
  const points = document.createElement('span');
  points.className = 'points';
  points.textContent = POINTS[t.grade] + ' points · ' + KIND_LABELS[t.kind];
  foot.appendChild(points);
  li.appendChild(foot);
  return li;
}

function render() {
  const visible = state.trophies.filter(trophyMatches);
  listEl.replaceChildren(...visible.map(trophyCard));
  $('emptyNote').hidden = visible.length > 0;
  const missable = state.trophies.filter((t) => t.missable);
  missableEl.replaceChildren(...missable.map(trophyCard));
  const earnedCount = state.earned.size;
  const total = state.trophies.length;
  const points = state.trophies
    .filter((t) => state.earned.has(t.id))
    .reduce((sum, t) => sum + POINTS[t.grade], 0);
  const pct = total ? Math.round((earnedCount / total) * 100) : 0;
  progressFill.style.width = pct + '%';
  progressText.textContent = earnedCount + ' of ' + total + ' earned · ' + points + ' points · ' + pct + '% to platinum';
}

function exportProgress() {
  const payload = {
    app: 'gta6-trophy-guide-01',
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    hideSpoilers: state.hideSpoilers,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  saveNote.textContent = 'Progress exported.';
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = Array.isArray(parsed.earned) ? parsed.earned : parsed;
      if (!Array.isArray(ids)) throw new Error('bad file');
      const valid = new Set(state.trophies.map((t) => t.id));
      state.earned = new Set(ids.filter((n) => Number.isInteger(n) && valid.has(n)));
      if (typeof parsed.hideSpoilers === 'boolean') state.hideSpoilers = parsed.hideSpoilers;
      $('spoilerToggle').checked = state.hideSpoilers;
      saveProgress('Progress imported.');
      render();
    } catch {
      saveNote.textContent = 'Import failed: that file is not a valid progress export.';
    }
  };
  reader.readAsText(file);
}

function switchView(name) {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.hidden = section.id !== 'view-' + name;
  });
}

async function init() {
  const res = await fetch('./data/trophies.json');
  if (!res.ok) throw new Error('Could not load trophy data.');
  const data = await res.json();
  state.trophies = data.trophies.slice().sort((a, b) => a.id - b.id);
  loadProgress();

  $('search').addEventListener('input', (e) => { state.search = e.target.value; render(); });
  $('filterKind').addEventListener('change', (e) => { state.kind = e.target.value; render(); });
  $('filterGrade').addEventListener('change', (e) => { state.grade = e.target.value; render(); });
  $('filterStatus').addEventListener('change', (e) => { state.status = e.target.value; render(); });
  $('spoilerToggle').checked = state.hideSpoilers;
  $('spoilerToggle').addEventListener('change', (e) => {
    state.hideSpoilers = e.target.checked;
    saveProgress('Spoiler setting saved.');
    render();
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
    e.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (window.confirm('Reset all checklist progress?')) {
      state.earned = new Set();
      saveProgress('Progress reset.');
      render();
    }
  });
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  render();
}

init().catch((err) => {
  listEl.replaceChildren();
  const li = document.createElement('li');
  li.textContent = 'Could not load the trophy data: ' + err.message;
  listEl.appendChild(li);
});
