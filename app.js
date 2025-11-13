const state = {
  dataset: null,
  currentDate: null,
  showChinese: true,
  searchText: '',
};

const elements = {
  dateSelect: document.querySelector('#date-select'),
  dateList: document.querySelector('#date-list'),
  searchInput: document.querySelector('#search-input'),
  toggleLanguage: document.querySelector('#toggle-language'),
  paperList: document.querySelector('#paper-list'),
  paperCount: document.querySelector('#paper-count'),
};

async function fetchDataset() {
  const response = await fetch('data/index.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error('无法加载数据');
  }
  const json = await response.json();
  return json;
}

function initDateSelectors(dates) {
  elements.dateSelect.innerHTML = '';
  elements.dateList.innerHTML = '';

  dates.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = item.date;
    option.textContent = `${item.date}（${item.count} 篇）`;
    elements.dateSelect.appendChild(option);

    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${item.date}（${item.count}）`;
    button.dataset.date = item.date;
    if (index === 0) {
      button.classList.add('active');
    }
    button.addEventListener('click', () => {
      state.currentDate = item.date;
      updateActiveDateButton();
      renderPapers();
    });
    li.appendChild(button);
    elements.dateList.appendChild(li);
  });

  elements.dateSelect.addEventListener('change', (event) => {
    state.currentDate = event.target.value;
    updateActiveDateButton();
    renderPapers();
  });
}

function updateActiveDateButton() {
  elements.dateList.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.date === state.currentDate);
  });
  elements.dateSelect.value = state.currentDate;
}

function getCurrentDateData() {
  if (!state.dataset) return null;
  return state.dataset.dates.find((item) => item.date === state.currentDate) || null;
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

function renderPapers() {
  const dateData = getCurrentDateData();
  elements.paperList.innerHTML = '';

  if (!dateData) {
    elements.paperCount.textContent = '0';
    return;
  }

  const filtered = filterPapers(dateData.papers);
  elements.paperCount.textContent = filtered.length.toString();

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
}

async function bootstrap() {
  try {
    const dataset = await fetchDataset();
    state.dataset = dataset;
    if (dataset.dates.length === 0) {
      elements.paperList.textContent = '暂无数据，请先运行爬取脚本。';
      return;
    }
    initDateSelectors(dataset.dates);
    state.currentDate = dataset.dates[0].date;
    bindInteractions();
    renderPapers();
  } catch (error) {
    console.error(error);
    elements.paperList.textContent = '加载数据失败，请检查浏览器控制台日志。';
  }
}

bootstrap();
