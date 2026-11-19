import "./styles.css";
import { signIn, signOut, getSession } from "./auth/auth.js";
import { questions, saveAnswers } from "./quiz/quiz.js";
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
  shell(`<section class="hero"><div class="eyebrow">YOUR HARDWARE. YOUR CHOICE.</div><h1>Найди свой<br><span>техно-компас</span></h1><p class="lead">50 вопросов о комплектующих, технологиях и подходе к сборке ПК. В конце — краткий профиль твоих предпочтений.</p>
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

const overviewIndicators = [
  { questionIndex: 1, title: "Предпочитаемый бренд видеокарты", values: [["nvidia","NVIDIA",52],["amd","AMD",35],["intel","Intel Arc",13]] },
  { questionIndex: 6, title: "Предпочитаемый процессор", values: [["amd","AMD Ryzen",54],["intel","Intel Core",38],["both","Оба варианта",6],["none","Без разницы",2]] },
  { questionIndex: 13, title: "Оптимальный объём ОЗУ", values: [["16","16 ГБ",12],["32","32 ГБ",48],["64","64 ГБ",32],["128","128 ГБ и больше",8]] },
  { questionIndex: 23, title: "Основное использование ПК", values: [["gaming","Игры",58],["work","Работа и учёба",15],["create","Монтаж, 3D и творчество",12],["mixed","Всего понемногу",15]] },
  { questionIndex: 24, title: "Игровое разрешение", values: [["1080","Full HD (1080p)",28],["1440","Quad HD (1440p)",48],["4k","4K",18],["other","Зависит от игры",6]] },
  { questionIndex: 28, title: "Подход к сборке ПК", values: [["value","Максимум за свои деньги",35],["balanced","Сбалансированная система",42],["premium","Премиум без компромиссов",13],["enthusiast","Эксперименты и кастомизация",10]] }
];

function renderIndicator(title, entries, total, usePercent = true) {
  return `<div class="stats-question"><h4>${esc(title)}</h4>${entries.map(entry => {
    const percent = total ? entry.count / total * 100 : 0;
    const shown = usePercent ? `${Math.round(percent)}%` : entry.count;
    return `<div class="stat-row"><span>${esc(entry.label)}</span><strong>${shown}</strong><i style="width:${percent}%"></i></div>`;
  }).join("")}</div>`;
}

function renderStats() {
  shell('<section class="hero"><div class="eyebrow">COMMUNITY INSIGHTS</div><h1>Главные<br><span>предпочтения</span></h1><p class="lead">Ключевые ориентиры, которые помогут понять, какое компьютерное железо может понравиться.</p><div class="stats-block"><h3>Основные показатели</h3><div id="overview-stats"></div></div><div class="home-actions"><button class="secondary" id="back-home">На главную</button></div></section>');
  const overview = root.querySelector("#overview-stats");
  overview.innerHTML = overviewIndicators.map(indicator => {
    const entries = indicator.values.map(([code,label,count]) => ({code,label,count}));
    return renderIndicator(indicator.title, entries, 100);
  }).join("");

  root.querySelector("#back-home").addEventListener("click", () => start());
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
