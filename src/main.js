import "./styles.css";
import { signIn, signOut, getSession } from "./auth/auth.js";
import { questions, saveAnswers } from "./quiz/quiz.js";
import { demoStats, loadRealStats } from "./statistics/statistics.js";
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
  shell(`<section class="hero"><div class="eyebrow">PROFILE GENERATED</div><h1>Твой техно-<br><span>профиль готов</span></h1><p class="lead">Готово: сохранено ${answers.length} ответов. Твои ответы не публикуются по отдельности — в общей статистике отображаются только суммарные значения.</p>${button("Посмотреть статистику",'id="stats"')}${button("Выйти",'class="secondary" id="logout"')}</section>`);
  root.querySelector("#stats").addEventListener("click", renderStats);
  root.querySelector("#logout").addEventListener("click", handleLogout);
}

async function renderStats() {
  shell('<section class="hero"><div class="eyebrow">COMMUNITY DATA</div><h1>Статистика<br><span>предпочтений</span></h1><div class="stats-block"><h3>Демо-данные</h3><p class="hint">Искусственный пример для демонстрации интерфейса. Не является ответами участников.</p>' +
    demoStats.map(x => `<div class="stat-row"><span>${x.label}</span><strong>${x.value}%</strong><i style="width:${x.value}%"></i></div>`).join("") +
    '</div><div class="stats-block"><h3>Реальные ответы участников</h3><p class="hint" id="real-stats">Загружаем агрегированные данные…</p></div></section>');
  try {
    const data = await loadRealStats();
    const target = root.querySelector("#real-stats");
    target.innerHTML = data.length ? data.map(x => {
      const q = questions[Number(x.question_index) - 1];
      const option = q?.options.find(([code]) => code === x.answer_code);
      const label = option?.[1] ?? x.answer_code;
      return `<div class="stat-row"><span>Вопрос ${Number(x.question_index)}: ${esc(label)}</span><strong>${Number(x.response_count)}</strong></div>`;
    }).join("") : "Пока нет ответов для отображения.";
  } catch (e) { root.querySelector("#real-stats").textContent = "Реальная статистика появится после настройки базы данных."; }
}

async function start() {
  if (!isSupabaseConfigured) { renderHome(); return; }
  try {
    session = await getSession();
    if (session) {
      shell(`<section class="hero"><div class="eyebrow">WELCOME BACK</div><h1>Готов пройти<br><span>опрос?</span></h1><p class="lead">Вход выполнен. Ответы сохраняются под случайным идентификатором участника.</p>${button("Начать опрос",'id="start"')}${button("Статистика",'class="secondary" id="stats"')}${button("Выйти",'class="secondary" id="logout"')}</section>`);
      root.querySelector("#start").addEventListener("click", () => { index = 0; answers = []; renderQuiz(); });
      root.querySelector("#stats").addEventListener("click", renderStats);
      root.querySelector("#logout").addEventListener("click", handleLogout);
      supabase.auth.onAuthStateChange((_event, s) => { session = s; });
    } else renderHome();
  } catch (e) { renderHome(e.message); }
}
start();
