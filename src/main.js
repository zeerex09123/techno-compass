import "./styles.css";
import { signIn, signOut, getSession } from "./auth/auth.js";
import { questions, saveAnswers } from "./quiz/quiz.js";
import { syntheticStats, loadRealStats } from "./statistics/statistics.js";
import { isSupabaseConfigured, supabase } from "./database/supabase.js";

const root = document.querySelector("#app");
let session = null;
let index = 0;
let answers = [];

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const button = (label, attrs = "") => `<button ${attrs}>${label}</button>`;

function shell(content) {
  root.innerHTML = `<main class="shell"><header class="top"><a class="brand" href="#">◈ TECH<span>NO</span> COMPASS</a><span class="top-note">HARDWARE PREFERENCE SURVEY</span></header>${content}<footer>Techno Compass · Ответы используются для формирования общей статистики. Имя и почта не публикуются.</footer></main>`;
}

function renderHome(message = "") {
  shell(`<section class="hero"><div class="eyebrow">YOUR HARDWARE. YOUR CHOICE.</div><h1>Найди свой<br><span>техно-компас</span></h1><p class="lead">28 вопросов о комплектующих, технологиях и подходе к сборке ПК. В конце — краткий профиль твоих предпочтений.</p>
  <div class="notice"><strong>Прозрачно о данных</strong><p>Для прохождения потребуется вход через Google или GitHub. Ответы сохраняются в базе проекта и используются в агрегированной статистике. Имя и адрес почты не отображаются в результатах.</p></div>
  <div class="auth-row">${button("Продолжить с Google",'data-provider="google"')}${button("Продолжить с GitHub",'class="secondary" data-provider="github"')}</div>
  ${!isSupabaseConfigured ? '<p class="hint">Режим настройки: сначала подключим Supabase, затем включим авторизацию.</p>' : ''}${message ? `<p class="error">${esc(message)}</p>` : ""}</section>`);
  root.querySelectorAll("[data-provider]").forEach(b => b.addEventListener("click", async () => {
    try { await signIn(b.dataset.provider); } catch (e) { renderHome(e.message); }
  }));
}

function renderQuiz() {
  const q = questions[index];
  const pct = Math.round(index / questions.length * 100);
  shell(`<section class="quiz"><div class="quiz-meta"><span>${esc(q.category)}</span><span>${index + 1} / ${questions.length}</span></div><div class="progress"><i style="width:${pct}%"></i></div><h2>${esc(q.title)}</h2><div class="answers">${q.options.map(([value,label]) => `<button class="answer" data-answer="${esc(value)}">${esc(label)}<span>↗</span></button>`).join("")}</div><div class="quiz-bottom">${button("← Назад",'class="text-button" id="back"') }<span>Выбери наиболее близкий вариант</span></div></section>`);
  root.querySelector("#back").disabled = index === 0;
  root.querySelector("#back").addEventListener("click", () => { if (index > 0) { index--; renderQuiz(); } });
  root.querySelectorAll("[data-answer]").forEach(b => b.addEventListener("click", async () => {
    answers[index] = b.dataset.answer;
    if (index < questions.length - 1) { index++; renderQuiz(); }
    else await finishQuiz();
  }));
}

async function finishQuiz() {
  shell('<section class="hero"><div class="eyebrow">SAVING YOUR PROFILE</div><h1>Сохраняем<br><span>результат…</span></h1><p class="lead">Почти готово.</p></section>');
  try {
    await saveAnswers(session.user.id, answers);
    renderResult();
  } catch (e) {
    shell(`<section class="hero"><h1>Не удалось<br><span>сохранить ответы</span></h1><p class="lead">${esc(e.message)}</p>${button("Повторить сохранение",'id="retry"')}</section>`);
    root.querySelector("#retry").addEventListener("click", finishQuiz);
  }
}

async function handleLogout() {
  try {
    await signOut();
    session = null;
    index = 0;
    answers = [];
    renderHome();
  } catch (e) {
    renderHome(e.message);
  }
}

function renderResult() {
  shell(`<section class="hero"><div class="eyebrow">PROFILE GENERATED</div><h1>Твой техно-<br><span>профиль готов</span></h1><p class="lead">Готово: сохранено ${answers.length} ответов. Твои ответы не публикуются по отдельности — в общей статистике отображаются только суммарные значения.</p><div class="home-actions">${button("Посмотреть статистику",'id="stats"')}${button("Выйти",'class="secondary" id="logout"')}</div></section>`);
  root.querySelector("#stats").addEventListener("click", renderStats);
  root.querySelector("#logout").addEventListener("click", handleLogout);
}

function renderStatsGroup(title, description, rows) {
  const grouped = new Map();
  rows.forEach(row => {
    const questionIndex = Number(row.question_index);
    if (!Number.isInteger(questionIndex) || questionIndex < 1 || questionIndex > questions.length) return;
    if (!grouped.has(questionIndex)) grouped.set(questionIndex, []);
    grouped.get(questionIndex).push({ code: row.answer_code, count: Number(row.response_count) || 0 });
  });

  const content = questions.map((question, index) => {
    const entries = grouped.get(index + 1) ?? [];
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    if (!total) return "";
    return `<div class="stats-question"><h4>${esc(question.title)}</h4>${entries.map(entry => {
      const option = question.options.find(([code]) => code === entry.code);
      const label = option?.[1] ?? entry.code ?? "Неизвестный ответ";
      const percent = Math.round(entry.count / total * 100);
      return `<div class="stat-row"><span>${esc(label)}</span><strong>${percent}% · ${entry.count}</strong><i style="width:${percent}%"></i></div>`;
    }).join("")}<p class="stats-total">Ответов на вопрос: ${total}</p></div>`;
  }).join("");

  return `<div class="stats-block"><h3>${esc(title)}</h3><p class="hint">${esc(description)}</p>${content || '<p class="hint">Пока нет данных для отображения.</p>'}</div>`;
}

async function renderStats() {
  shell('<section class="hero"><div class="eyebrow">COMMUNITY DATA</div><h1>Статистика<br><span>предпочтений</span></h1><div class="stats-block"><h3>Смоделированная выборка</h3><p class="hint">Условные результаты 100 участников для наглядного примера. Это искусственные данные, не реальные ответы пользователей.</p><div id="synthetic-stats"></div></div><div class="stats-block"><h3>Реальные ответы участников</h3><p class="hint">Здесь отображаются только фактически сохранённые ответы пользователей.</p><div id="real-stats">Загружаем агрегированные данные…</div></div><div class="home-actions"><button class="secondary" id="back-home">На главную</button></div></section>');
  const syntheticTarget = root.querySelector("#synthetic-stats");
  syntheticTarget.innerHTML = questions.map((q, qi) => {
    const weights = q.options.map((_, oi) => 18 + ((qi * 17 + oi * 23 + 11) % 43));
    const total = weights.reduce((sum, value) => sum + value, 0);
    const counts = weights.map(weight => Math.round(weight / total * 100));
    counts[counts.length - 1] += 100 - counts.reduce((sum, value) => sum + value, 0);
    return `<div class="stats-question"><h4>${qi + 1}. ${esc(q.title)}</h4>${q.options.map(([code, label], oi) => {
      const count = counts[oi];
      return `<div class="stat-row"><span>${esc(label)}</span><strong>${count}%</strong><i style="width:${count}%"></i></div>`;
    }).join("")}</div>`;
  }).join("");
  root.querySelector("#back-home").addEventListener("click", () => start());
  try {
    const data = await loadRealStats();
    const target = root.querySelector("#real-stats");
    if (!data.length) {
      target.textContent = "Пока нет сохранённых ответов. Пройди опрос и поделись ссылкой с друзьями!";
    } else {
      const groups = new Map();
      data.forEach(item => {
        if (!groups.has(item.question_index)) groups.set(item.question_index, []);
        groups.get(item.question_index).push(item);
      });
      target.innerHTML = [...groups.entries()].map(([questionIndex, rows]) => {
        const total = rows.reduce((sum, row) => sum + row.response_count, 0);
        return `<div class="stats-question"><h4>${questionIndex}. ${esc(rows[0].question_title)}</h4>${rows.map(row => {
          const pct = total ? row.response_count / total * 100 : 0;
          return `<div class="stat-row"><span>${esc(row.answer_label)}</span><strong>${row.response_count} · ${pct.toFixed(1)}%</strong><i style="width:${pct}%"></i></div>`;
        }).join("")}</div>`;
      }).join("");
    }
  } catch (e) {
    root.querySelector("#real-stats").textContent = "Не удалось загрузить реальные ответы. Попробуй обновить страницу позже.";
  }
}
async function start() {
  if (!isSupabaseConfigured) { renderHome(); return; }
  try {
    session = await getSession();
    if (session) {
      shell(`<section class="hero"><div class="eyebrow">WELCOME BACK</div><h1>Готов пройти<br><span>опрос?</span></h1><p class="lead">Вход выполнен. Ответы сохраняются под случайным идентификатором участника.</p><div class="home-actions">${button("Начать опрос",'id="start"')}${button("Статистика",'class="secondary" id="stats"')}${button("Выйти",'class="secondary" id="logout"')}</div></section>`);
      root.querySelector("#start").addEventListener("click", () => { index = 0; answers = []; renderQuiz(); });
      root.querySelector("#stats").addEventListener("click", renderStats);
      root.querySelector("#logout").addEventListener("click", handleLogout);
      supabase.auth.onAuthStateChange((_event, s) => { session = s; });
    } else renderHome();
  } catch (e) { renderHome(e.message); }
}
start();
