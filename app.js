const CUSTOM_VALUE = 'CUSTOM';

const state = {
  summary: null,
  mode: 'single', // 'single' | 'range'
  currentDate: null,
  showChinese: true,
  searchText: '',
  startDate: null,
  endDate: null,
};

const dateCache = new Map();
let customButtonRef = null;

function trackEvent(action, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  }
}

const elements = {
  dateSelect: document.querySelector('#date-select'),
  dateList: document.querySelector('#date-list'),
  searchInput: document.querySelector('#search-input'),
  toggleLanguage: document.querySelector('#toggle-language'),
  paperList: document.querySelector('#paper-list'),
  paperCount: document.querySelector('#paper-count'),
  rangeSummary: document.querySelector('#range-summary'),
  startDate: document.querySelector('#start-date'),
  endDate: document.querySelector('#end-date'),
  clearRange: document.querySelector('#clear-range'),
};

async function fetchSummary() {
  const response = await fetch('data/index.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error('无法加载 summary 数据');
  }
  return response.json();
}

async function fetchDateData(dateStr) {
  if (dateCache.has(dateStr)) {
    return dateCache.get(dateStr);
  }
  const response = await fetch(`data/dates/${dateStr}.json`, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`无法加载 ${dateStr} 的数据`);
  }
  const data = await response.json();
  dateCache.set(dateStr, data);
  return data;
}

function getAllDates() {
  return state.summary ? state.summary.dates : [];
}

function getTotalPaperCount(dates) {
  return dates.reduce((acc, item) => acc + item.count, 0);
}

function initDateSelectors(dates) {
  elements.dateSelect.innerHTML = '';
  elements.dateList.innerHTML = '';

  const customOption = document.createElement('option');
  customOption.value = CUSTOM_VALUE;
  customOption.textContent = '自定义时间';
  elements.dateSelect.appendChild(customOption);

  dates.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.date;
    option.textContent = `${item.date}（${item.count} 篇）`;
    elements.dateSelect.appendChild(option);
  });

  const customLi = document.createElement('li');
  customButtonRef = document.createElement('button');
  customButtonRef.type = 'button';
  customButtonRef.textContent = '自定义时间';
  customButtonRef.dataset.mode = 'range';
  customLi.appendChild(customButtonRef);
  elements.dateList.appendChild(customLi);

  dates.forEach((item) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${item.date}（${item.count}）`;
    button.dataset.date = item.date;
    li.appendChild(button);
    elements.dateList.appendChild(li);
  });

  elements.dateSelect.addEventListener('change', (event) => {
    const value = event.target.value;
    if (value === CUSTOM_VALUE) {
      enterRangeMode();
    } else {
      enterSingleMode(value);
    }
  });

  elements.dateList.querySelectorAll('button').forEach((button) => {
    if (button.dataset.mode === 'range') {
      button.addEventListener('click', () => {
        enterRangeMode();
      });
    } else {
      button.addEventListener('click', () => {
        enterSingleMode(button.dataset.date);
      });
    }
  });
}

function ensureRangeInitialized() {
  const dates = getAllDates();
  if (dates.length === 0) return;
  const latest = dates[0].date;
  if (!state.startDate) {
    state.startDate = latest;
    elements.startDate.value = latest;
  }
  if (!state.endDate) {
    state.endDate = latest;
    elements.endDate.value = latest;
  }
}

function enterSingleMode(dateStr) {
  state.mode = 'single';
  state.currentDate = dateStr;
  state.startDate = dateStr;
  state.endDate = dateStr;
  elements.startDate.value = dateStr;
  elements.endDate.value = dateStr;
  updateActiveDateButton();
  trackEvent('select_date', { date: dateStr });
  safeRender();
}

function enterRangeMode() {
  state.mode = 'range';
  state.currentDate = null;
  ensureRangeInitialized();
  updateActiveDateButton();
  trackEvent('enter_custom_range', {
    start_date: state.startDate,
    end_date: state.endDate,
  });
  safeRender();
}

function updateActiveDateButton() {
  elements.dateList.querySelectorAll('button').forEach((button) => {
    if (button.dataset.mode === 'range') {
      button.classList.toggle('active', state.mode === 'range');
    } else {
      button.classList.toggle('active', state.mode === 'single' && button.dataset.date === state.currentDate);
    }
  });
  elements.dateSelect.value = state.mode === 'range' ? CUSTOM_VALUE : state.currentDate;
}

function isWithinRange(dateStr) {
  const dateValue = new Date(dateStr);
  if (Number.isNaN(dateValue.valueOf())) return false;
  if (state.startDate) {
    const start = new Date(state.startDate);
    if (dateValue < start) return false;
  }
  if (state.endDate) {
    const end = new Date(state.endDate);
    if (dateValue > end) return false;
  }
  return true;
}

function getSelectedDates() {
  const dates = getAllDates();
  if (state.mode === 'single') {
    return dates.filter((item) => item.date === state.currentDate);
  }
  ensureRangeInitialized();
  return dates.filter((item) => isWithinRange(item.date));
}

function filterPapers(papers) {
  if (!state.searchText) return papers;
  const keyword = state.searchText.toLowerCase();
  return papers.filter((paper) => {
    const base = [paper.title, paper.title_zh, paper.authors, paper.subjects, paper.subject_split]
      .join(' ')
      .toLowerCase();
    return base.includes(keyword);
  });
}

function createPaperCard(paper) {
  const article = document.createElement('article');
  article.className = 'paper-card';

  const title = document.createElement('h3');
  const displayTitle = state.showChinese && paper.title_zh ? paper.title_zh : paper.title;
  title.textContent = displayTitle;

  const originalTitle = document.createElement('p');
  originalTitle.className = 'original-title';
  originalTitle.textContent = `原标题：${paper.title}`;

  const link = document.createElement('a');
  link.href = paper.url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = paper.id;
  link.addEventListener('click', () => {
    trackEvent('open_paper', {
      paper_id: paper.id,
      date: paper.__date || null,
    });
  });

  const meta = document.createElement('p');
  meta.className = 'paper-meta';
  meta.textContent = paper.authors || '未知作者';

  const tags = document.createElement('div');
  tags.className = 'paper-tags';
  (paper.subject_split || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const span = document.createElement('span');
      span.textContent = tag;
      tags.appendChild(span);
    });

  const subjects = document.createElement('p');
  subjects.textContent = paper.subjects;

  article.appendChild(title);
  article.appendChild(originalTitle);
  article.appendChild(link);
  article.appendChild(meta);
  if (tags.children.length > 0) {
    article.appendChild(tags);
  }
  if (paper.subjects) {
    article.appendChild(subjects);
  }
  return article;
}

function updateRangeSummary(selectedDates) {
  const parts = [];
  if (state.mode === 'single') {
    parts.push(`模式：${state.currentDate}`);
  } else {
    parts.push('模式：自定义时间');
  }
  if (state.startDate) {
    parts.push(`开始 ≥ ${state.startDate}`);
  }
  if (state.endDate) {
    parts.push(`结束 ≤ ${state.endDate}`);
  }
  if (selectedDates.length > 0) {
    parts.push(`覆盖 ${selectedDates.length} 个日期`);
  }
  elements.rangeSummary.textContent = parts.join(' ｜ ');
}

async function renderPapers() {
  const placeholder = document.createElement('p');
  placeholder.className = 'loading';
  placeholder.textContent = '加载中...';
  elements.paperList.innerHTML = '';
  elements.paperList.appendChild(placeholder);

  const selectedDates = getSelectedDates();
  if (selectedDates.length === 0) {
    elements.paperList.innerHTML = '<p>所选范围内没有数据。</p>';
    elements.paperCount.textContent = '0';
    elements.rangeSummary.textContent = '';
    return;
  }

  try {
    const datasets = [];
    for (const item of selectedDates) {
      const data = await fetchDateData(item.date);
      datasets.push(data);
    }
    const papers = datasets.flatMap((data) => (data.papers || []).map((paper) => ({ ...paper, __date: data.date })));
    const filtered = filterPapers(papers);

    elements.paperList.innerHTML = '';
    elements.paperCount.textContent = filtered.length.toString();
    updateRangeSummary(selectedDates);

    trackEvent('render_results', {
      mode: state.mode,
      start_date: state.startDate,
      end_date: state.endDate,
      count: filtered.length,
    });

    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = '没有匹配的论文。';
      elements.paperList.appendChild(empty);
      return;
    }

    filtered.forEach((paper) => {
      elements.paperList.appendChild(createPaperCard(paper));
    });
  } catch (error) {
    console.error(error);
    elements.paperList.innerHTML = '<p>加载数据失败，请稍后重试。</p>';
    elements.paperCount.textContent = '0';
  }
}

function safeRender() {
  renderPapers().catch((error) => {
    console.error(error);
    elements.paperList.innerHTML = '<p>加载数据失败，请稍后重试。</p>';
    elements.paperCount.textContent = '0';
  });
}

function bindInteractions() {
  elements.searchInput.addEventListener('input', (event) => {
    state.searchText = event.target.value.trim();
    safeRender();
  });

  elements.searchInput.addEventListener('change', (event) => {
    trackEvent('search', {
      keyword: event.target.value.trim(),
      mode: state.mode,
    });
  });

  elements.toggleLanguage.addEventListener('click', () => {
    state.showChinese = !state.showChinese;
    elements.toggleLanguage.textContent = state.showChinese ? '显示英文标题' : '显示中文标题';
    trackEvent('toggle_language', { show_chinese: state.showChinese });
    safeRender();
  });

  elements.startDate.addEventListener('change', (event) => {
    state.startDate = event.target.value || null;
    if (state.endDate && state.startDate && state.startDate > state.endDate) {
      state.endDate = state.startDate;
      elements.endDate.value = state.startDate;
    }
    state.mode = 'range';
    state.currentDate = null;
    updateActiveDateButton();
    trackEvent('update_range_start', {
      start_date: state.startDate,
      end_date: state.endDate,
    });
    safeRender();
  });

  elements.endDate.addEventListener('change', (event) => {
    state.endDate = event.target.value || null;
    if (state.endDate && state.startDate && state.endDate < state.startDate) {
      state.startDate = state.endDate;
      elements.startDate.value = state.endDate;
    }
    state.mode = 'range';
    state.currentDate = null;
    updateActiveDateButton();
    trackEvent('update_range_end', {
      start_date: state.startDate,
      end_date: state.endDate,
    });
    safeRender();
  });

  elements.clearRange.addEventListener('click', () => {
    state.startDate = null;
    state.endDate = null;
    elements.startDate.value = '';
    elements.endDate.value = '';
    state.mode = 'range';
    state.currentDate = null;
    updateActiveDateButton();
    trackEvent('clear_range');
    safeRender();
  });
}

function initDateRange(dates) {
  if (dates.length === 0) return;
  const sortedDates = [...dates].sort((a, b) => (a.date < b.date ? -1 : 1));
  elements.startDate.min = sortedDates[0].date;
  elements.startDate.max = sortedDates[sortedDates.length - 1].date;
  elements.endDate.min = sortedDates[0].date;
  elements.endDate.max = sortedDates[sortedDates.length - 1].date;
}

async function bootstrap() {
  if (window.location.protocol === 'file:') {
    elements.paperList.innerHTML = '<p>请通过本地 HTTP 服务访问（例如运行 <code>python3 -m http.server</code>），否则浏览器会阻止读取 data/*.json 文件。</p>';
    return;
  }
  try {
    const summary = await fetchSummary();
    state.summary = summary;
    const dates = getAllDates();
    if (dates.length === 0) {
      elements.paperList.textContent = '暂无数据，请先运行爬取脚本。';
      return;
    }
    state.currentDate = dates[0].date;
    state.startDate = dates[0].date;
    state.endDate = dates[0].date;
    initDateSelectors(dates);
    initDateRange(dates);
    updateActiveDateButton();
    bindInteractions();
    safeRender();
  } catch (error) {
    console.error(error);
    elements.paperList.textContent = '加载数据失败，请检查浏览器控制台日志。';
  }
}

bootstrap();
