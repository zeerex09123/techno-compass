# Techno Compass

**Учебный проект по сбору и агрегированию предпочтений пользователей в области компьютерного оборудования.**

Techno Compass — веб-опрос из 28 вопросов о комплектующих, сценариях использования и подходе к сборке ПК. Участник проходит авторизацию, заполняет анкету, а ответы сохраняются в Supabase для дальнейшего анализа в обобщённом виде.

<p align="center">
  <a href="https://zeerex09123.github.io/techno-compass/"><strong>Открыть Techno Compass →</strong></a>
</p>

![Deploy](https://github.com/zeerex09123/techno-compass/actions/workflows/deploy.yml/badge.svg)

## Возможности

- Авторизация участников через **Google** и **GitHub**.
- Опрос из 28 вопросов о предпочтениях в компьютерном железе.
- Сохранение ответов в PostgreSQL через Supabase.
- Ограничение доступа к индивидуальным ответам с помощью Row Level Security (RLS).
- SQL-функция для получения агрегированной статистики без раскрытия отдельных записей.
- Автоматическая сборка и публикация сайта на GitHub Pages при обновлении ветки `main`.

## Технологии

| Часть проекта | Технологии |
| --- | --- |
| Интерфейс | HTML, CSS, Vanilla JavaScript |
| Сборка | Vite |
| Авторизация | Supabase Auth, OAuth |
| База данных | Supabase PostgreSQL |
| Защита данных | PostgreSQL RLS, SQL RPC |
| Публикация | GitHub Actions, GitHub Pages |

## Как устроен проект

```text
.
├── .github/workflows/deploy.yml  # CI/CD: сборка и публикация
├── src/
│   ├── auth/                     # вход через OAuth
│   ├── database/                 # клиент Supabase
│   ├── quiz/                     # вопросы и логика опроса
│   ├── statistics/               # получение агрегированной статистики
│   ├── main.js                   # точки входа и отображение экранов
│   └── styles.css                # стили
├── supabase/
│   └── schema.sql                # таблица, RLS-политики и RPC
├── index.html
├── vite.config.js
└── package.json
```

### Поток данных

1. Участник входит через Google или GitHub.
2. Проходит опрос и отправляет ответы.
3. Приложение сохраняет ответы в `survey_responses`, связывая запись с внутренним UUID пользователя Supabase.
4. RLS ограничивает чтение и изменение записи её владельцем.
5. Для общей статистики предусмотрена функция `get_public_survey_stats()`, которая возвращает сгруппированные количества ответов, а не исходные записи.

## Запуск локально

### Требования

- Node.js 22 (или совместимая актуальная версия).
- Проект Supabase.
- OAuth-приложения Google и GitHub.

### Установка

```bash
git clone https://github.com/zeerex09123/techno-compass.git
cd techno-compass
npm install
```

Создай файл `.env` на основе `.env.example` и заполни параметры проекта Supabase:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Затем:

1. Выполни SQL из `supabase/schema.sql` в Supabase SQL Editor.
2. В Supabase Authentication включи провайдеры Google и GitHub и добавь их OAuth credentials.
3. В настройках URL Configuration укажи адрес локального приложения и адрес опубликованного сайта в Redirect URLs.
4. В настройках каждого OAuth-провайдера укажи callback URL Supabase, показанный в настройках провайдера проекта.
5. Запусти dev-сервер:

```bash
npm run dev
```

Для проверки production-сборки:

```bash
npm run build
npm run preview
```

## Публикация

Проект публикуется через GitHub Actions в GitHub Pages. Workflow находится в `.github/workflows/deploy.yml` и запускается при push в `main` или вручную.

В настройках репозитория должны быть заданы Actions Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Для фронтенда используется только публичный publishable/anon key Supabase. **OAuth client secrets, Supabase secret keys и service-role key нельзя помещать в исходный код, коммиты или переменные, доступные клиентской сборке.**

## Данные и приватность

- OAuth используется для входа участников.
- Таблица ответов хранит внутренний `user_id`, массив ответов и время завершения опроса.
- Имена и адреса электронной почты не копируются в таблицу ответов и не выводятся в публичной статистике.
- Пользователь может работать только со своей записью.
- Публичный доступ к исходным строкам таблицы закрыт; для агрегирования предусмотрена отдельная SQL-функция.

Проект создан в учебных целях. Перед использованием с реальными участниками необходимо проверить настройки OAuth, политики доступа, текст уведомления о данных и соответствие обработки данных применимым требованиям приватности.
