const state = {
  dataset: null,
  currentDate: 'ALL',
  showChinese: true,
  searchText: '',
  startDate: null,
  endDate: null,
};

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

async function fetchDataset() {
  const response = await fetch('data/index.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error('无法加载数据');
  }
  const json = await response.json();
  return json;
}

function getAllDates() {
  return state.dataset ? state.dataset.dates : [];
}

function getTotalPaperCount(dates) {
  return dates.reduce((acc, item) => acc + item.count, 0);
}

function initDateSelectors(dates) {
  elements.dateSelect.innerHTML = '';
  elements.dateList.innerHTML = '';

  const totalCount = getTotalPaperCount(dates);
  const allOption = document.createElement('option');
  allOption.value = 'ALL';
  allOption.textContent = `全部日期（${totalCount} 篇）`;
  elements.dateSelect.appendChild(allOption);

  const allLi = document.createElement('li');
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.dataset.date = 'ALL';
  allBtn.textContent = `全部日期（${totalCount}）`;
  allLi.appendChild(allBtn);
  elements.dateList.appendChild(allLi);

  dates.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.date;
    option.textContent = `${item.date}（${item.count} 篇）`;
    elements.dateSelect.appendChild(option);

    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${item.date}（${item.count}）`;
    button.dataset.date = item.date;
    li.appendChild(button);
    elements.dateList.appendChild(li);
  });

  elements.dateSelect.addEventListener('change', (event) => {
    state.currentDate = event.target.value;
    syncRangeWithSelection();
    updateActiveDateButton();
    renderPapers();
  });

  elements.dateList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.currentDate = button.dataset.date;
      syncRangeWithSelection();
      updateActiveDateButton();
      renderPapers();
    });
  });
}

function syncRangeWithSelection() {
  if (state.currentDate !== 'ALL') {
    state.startDate = state.currentDate;
    state.endDate = state.currentDate;
    elements.startDate.value = state.currentDate;
    elements.endDate.value = state.currentDate;
  }
}

function updateActiveDateButton() {
  elements.dateList.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.date === state.currentDate);
  });
  elements.dateSelect.value = state.currentDate;
}

function isWithinRange(dateStr) {
  const dateValue = new Date(dateStr);
  if (Number.isNaN(dateValue.valueOf())) return true;
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
  if (state.currentDate === 'ALL') {
    return dates.filter((item) => isWithinRange(item.date));
  }
  return dates.filter((item) => item.date === state.currentDate);
}

function getCurrentPapers() {
  const selectedDates = getSelectedDates();
  const papers = selectedDates.flatMap((item) => item.papers);
  return { dates: selectedDates, papers };
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
  if (state.currentDate !== 'ALL' && !state.startDate && !state.endDate) {
    elements.rangeSummary.textContent = '';
    return;
  }

  const parts = [];
  if (state.currentDate === 'ALL') {
    parts.push('模式：全部日期');
  } else {
    parts.push(`模式：${state.currentDate}`);
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

function renderPapers() {
  const { dates, papers } = getCurrentPapers();
  const filtered = filterPapers(papers);

  elements.paperList.innerHTML = '';
  elements.paperCount.textContent = filtered.length.toString();
  updateRangeSummary(dates);

  if (filtered.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = '没有匹配的论文。';
    elements.paperList.appendChild(empty);
    return;
  }

  filtered.forEach((paper) => {
    elements.paperList.appendChild(createPaperCard(paper));
  });
}

function bindInteractions() {
  elements.searchInput.addEventListener('input', (event) => {
    state.searchText = event.target.value.trim();
    renderPapers();
  });

  elements.toggleLanguage.addEventListener('click', () => {
    state.showChinese = !state.showChinese;
    elements.toggleLanguage.textContent = state.showChinese ? '显示英文标题' : '显示中文标题';
    renderPapers();
  });

  elements.startDate.addEventListener('change', (event) => {
    state.startDate = event.target.value || null;
    if (state.startDate || state.endDate) {
      if (state.currentDate !== 'ALL') {
        state.currentDate = 'ALL';
        updateActiveDateButton();
      }
    }
    renderPapers();
  });

  elements.endDate.addEventListener('change', (event) => {
    state.endDate = event.target.value || null;
    if (state.startDate || state.endDate) {
      if (state.currentDate !== 'ALL') {
        state.currentDate = 'ALL';
        updateActiveDateButton();
      }
    }
    renderPapers();
  });

  elements.clearRange.addEventListener('click', () => {
    state.startDate = null;
    state.endDate = null;
    elements.startDate.value = '';
    elements.endDate.value = '';
    if (state.currentDate !== 'ALL') {
      state.currentDate = 'ALL';
      updateActiveDateButton();
    }
    renderPapers();
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
  try {
    const dataset = await fetchDataset();
    state.dataset = dataset;
    const dates = getAllDates();
    if (dates.length === 0) {
      elements.paperList.textContent = '暂无数据，请先运行爬取脚本。';
      return;
    }
    initDateSelectors(dates);
    initDateRange(dates);
    syncRangeWithSelection();
    updateActiveDateButton();
    bindInteractions();
    renderPapers();
  } catch (error) {
    console.error(error);
    elements.paperList.textContent = '加载数据失败，请检查浏览器控制台日志。';
  }
}

bootstrap();
