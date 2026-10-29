(function () {
  'use strict';

  const DATA = window.SCHEDULE;
  const contentEl = document.getElementById('content');

  if (!DATA || !Array.isArray(DATA.weeks) || DATA.weeks.length === 0) {
    contentEl.innerHTML =
      '<div class="empty"><div class="emoji">⚠️</div>' +
      '<div class="title">Нет данных</div>' +
      '<div class="hint">Проверьте файл schedule.js рядом с приложением.</div></div>';
    return;
  }

  const WEEKS = DATA.weeks;
  const N = WEEKS.length;

  const DAYS = [
    { key: 'mon', short: 'Пн', full: 'Понедельник' },
    { key: 'tue', short: 'Вт', full: 'Вторник' },
    { key: 'wed', short: 'Ср', full: 'Среда' },
    { key: 'thu', short: 'Чт', full: 'Четверг' },
    { key: 'fri', short: 'Пт', full: 'Пятница' },
    { key: 'sat', short: 'Сб', full: 'Суббота' },
    { key: 'sun', short: 'Вс', full: 'Воскресенье' },
  ];

  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  /* ---------------- даты ---------------- */

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function mondayOf(date) {
    const d = startOfDay(date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }

  function parseDate(str) {
    if (!str) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  }

  const TODAY = new Date();
  const TODAY_IDX = (TODAY.getDay() + 6) % 7;
  const BASE_MONDAY = mondayOf(TODAY);

  const semesterStart = parseDate(DATA.meta && DATA.meta.semesterStart);

  function rawCycleIndex(monday) {
    if (!semesterStart) return 0;
    const passed = Math.floor(daysBetween(mondayOf(semesterStart), monday) / 7);
    return ((passed % N) + N) % N;
  }

  function loadCalib() {
    try {
      const v = parseInt(localStorage.getItem('schedule.calib'), 10);
      return Number.isFinite(v) ? ((v % N) + N) % N : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveCalib(v) {
    try { localStorage.setItem('schedule.calib', String((v % N + N) % N)); } catch (e) { /* ignore */ }
  }

  let calib = loadCalib();

  function autoIndex() {
    return (rawCycleIndex(BASE_MONDAY) + calib) % N;
  }

  /* ---------------- состояние ---------------- */

  const state = {
    offset: 0,
    day: TODAY_IDX,
  };

  function currentWeek() {
    return WEEKS[(autoIndex() + state.offset) % N] || WEEKS[0];
  }

  function shownMonday() {
    return addDays(BASE_MONDAY, state.offset * 7);
  }

  function hasLessons(week, dayKey) {
    const list = week && week.days && week.days[dayKey];
    return Array.isArray(list) && list.length > 0;
  }

  function lessonsFor(week, dayKey) {
    const list = week && week.days && week.days[dayKey];
    return Array.isArray(list) ? list.slice() : [];
  }

  // если сегодня пар нет — открываем ближайший день с парами
  (function pickSmartDay() {
    if (hasLessons(currentWeek(), DAYS[TODAY_IDX].key)) return;
    for (let i = 0; i < 7; i++) {
      const idx = (TODAY_IDX + i) % 7;
      if (hasLessons(currentWeek(), DAYS[idx].key)) { state.day = idx; return; }
    }
    state.day = TODAY_IDX < 5 ? TODAY_IDX : 0;
  })();

  /* ---------------- время ---------------- */

  function toMinutes(hhmm) {
    const m = /^(\d{1,2})[:.\-](\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  const NOW_MIN = TODAY.getHours() * 60 + TODAY.getMinutes();

  /* ---------------- элементы ---------------- */

  const weekSwitchEl = document.getElementById('weekSwitch');
  const dayTabsEl = document.getElementById('dayTabs');
  const groupNameEl = document.getElementById('groupName');
  const footnoteEl = document.getElementById('footnote');
  const todayBtn = document.getElementById('todayBtn');
  const themeBtn = document.getElementById('themeBtn');

  if (DATA.meta && DATA.meta.group) {
    groupNameEl.textContent = DATA.meta.group;
  } else if (groupNameEl) {
    groupNameEl.hidden = true;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------------- отрисовка ---------------- */

  function renderWeekSwitch() {
    const active = (autoIndex() + state.offset) % N;
    weekSwitchEl.innerHTML = '';

    WEEKS.forEach(function (week, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.textContent = week.label || ('Неделя ' + (i + 1));
      btn.setAttribute('aria-selected', String(i === active));
      btn.addEventListener('click', function () {
        state.offset = (i - autoIndex() + N) % N;
        render();
      });
      weekSwitchEl.appendChild(btn);
    });
  }

  function renderDayTabs() {
    const monday = shownMonday();
    const week = currentWeek();
    dayTabsEl.innerHTML = '';

    DAYS.forEach(function (day, i) {
      const date = addDays(monday, i);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day-tab';
      btn.setAttribute('role', 'tab');

      const isSelected = i === state.day;
      btn.setAttribute('aria-selected', String(isSelected));

      if (i === TODAY_IDX && state.offset === 0) {
        btn.classList.add('is-today');
        btn.setAttribute('aria-current', 'true');
      }
      if (!hasLessons(week, day.key)) btn.classList.add('is-empty');

      btn.innerHTML =
        '<span class="d-name">' + day.short + '</span>' +
        '<span class="d-date">' + date.getDate() + '</span>';

      btn.addEventListener('click', function () {
        state.day = i;
        render();
      });

      dayTabsEl.appendChild(btn);

      if (isSelected) {
        requestAnimationFrame(function () {
          btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
      }
    });
  }

  function renderContent() {
    const week = currentWeek();
    const dayKey = DAYS[state.day].key;
    const lessons = lessonsFor(week, dayKey);

    lessons.sort(function (a, b) {
      const am = toMinutes(a.start);
      const bm = toMinutes(b.start);
      return (am == null ? 9999 : am) - (bm == null ? 9999 : bm);
    });

    if (lessons.length === 0) {
      const isWeekend = state.day >= 5;
      contentEl.innerHTML =
        '<div class="empty">' +
        '<div class="emoji">' + (isWeekend ? '🌿' : '☕️') + '</div>' +
        '<div class="title">' + (isWeekend ? 'Выходной' : 'Пар нет') + '</div>' +
        '<div class="hint">' + esc(DAYS[state.day].full) + ' — занятий не найдено.</div>' +
        '</div>';
      return;
    }

    const onToday = state.offset === 0 && state.day === TODAY_IDX;
    let html = '';

    lessons.forEach(function (lesson, idx) {
      const start = toMinutes(lesson.start);
      const end = toMinutes(lesson.end);
      const isNow = onToday && start != null && end != null && NOW_MIN >= start && NOW_MIN < end;
      const isPast = onToday && end != null && NOW_MIN >= end;

      const cls = ['lesson'];
      if (isNow) cls.push('now');
      else if (isPast) cls.push('past');

      html += '<article class="' + cls.join(' ') + '" style="animation-delay:' + (idx * 22) + 'ms">';

      if (isNow) html += '<span class="badge-now">сейчас</span>';

      html += '<div class="lesson-time">' +
        '<span class="t-start">' + esc(lesson.start || '') + '</span>' +
        (lesson.end ? '<span class="t-end">' + esc(lesson.end) + '</span>' : '') +
        '</div>';

      html += '<div class="lesson-body"><p class="lesson-subject">';
      if (lesson.kind) html += '<span class="kind">' + esc(lesson.kind) + '</span>';
      html += esc(lesson.subject || 'Без названия');
      html += '</p>';

      const chips = [];
      if (lesson.room) chips.push('<span class="chip room">' + esc(lesson.room) + '</span>');
      if (lesson.teacher) chips.push('<span class="chip teacher">' + esc(lesson.teacher) + '</span>');
      if (chips.length) html += '<p class="lesson-meta">' + chips.join('') + '</p>';

      if (lesson.note) html += '<p class="lesson-note">' + esc(lesson.note) + '</p>';

      html += '</div></article>';
    });

    contentEl.innerHTML = html;
  }

  function renderFootnote() {
    const monday = shownMonday();
    const sunday = addDays(monday, 6);
    const week = currentWeek();

    const range =
      monday.getDate() + ' ' + MONTHS[monday.getMonth()] + ' — ' +
      sunday.getDate() + ' ' + MONTHS[sunday.getMonth()];

    footnoteEl.innerHTML =
      '<span>' + esc(week.label || 'Неделя') + ' · ' + range + '</span>' +
      '<button type="button" class="link-btn" id="calibBtn" title="Если приложение считает неделю неверно">не та неделя?</button>';
  }

  function renderTodayBtn() {
    todayBtn.hidden = state.offset === 0 && state.day === TODAY_IDX;
  }

  function render() {
    renderWeekSwitch();
    renderDayTabs();
    renderContent();
    renderFootnote();
    renderTodayBtn();
    document.title = (currentWeek().label || 'Расписание') + ' · Расписание';
  }

  todayBtn.addEventListener('click', function () {
    state.offset = 0;
    state.day = TODAY_IDX;
    render();
  });

  footnoteEl.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('#calibBtn');
    if (!btn) return;
    calib = (calib + 1) % N;
    saveCalib(calib);
    state.offset = 0;
    render();
  });

  /* ---------------- тема ---------------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f1f4fb' : '#0d1220');
    try { localStorage.setItem('schedule.theme', theme); } catch (e) { /* ignore */ }
  }

  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('schedule.theme'); } catch (e) { saved = null; }
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
    } else {
      const light = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      applyTheme(light ? 'light' : 'dark');
    }
  })();

  themeBtn.addEventListener('click', function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  });

  render();

  /* ---------------- service worker ---------------- */

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* без офлайна */ });
    });
  }
})();
