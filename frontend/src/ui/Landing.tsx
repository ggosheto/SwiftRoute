import { useState } from "react";
import { Brand, Icon } from "./DispatchVisuals";

function Logo() {
  return (
    <a className="n-logo" href="#start" aria-label="SwiftRoute — начало">
      <Brand />
    </a>
  );
}
function Go({ children = "Отвори таблото" }: { children?: string }) {
  return (
    <a href="#dashboard" className="n-btn red">
      {children}
      <span aria-hidden="true">↗︎</span>
    </a>
  );
}
function Caption({ index, children }: { index: string; children: string }) {
  return (
    <div className="n-caption">
      <b>{index}</b>
      {children}
    </div>
  );
}

function CityMap() {
  return (
    <svg
      className="n-citymap"
      viewBox="0 0 510 225"
      role="img"
      aria-label="Схематичен маршрут между ресторант и клиент в Пловдив"
    >
      <defs>
        <pattern
          id="city-block"
          width="61"
          height="48"
          patternTransform="rotate(-24)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="61" height="48" fill="white" />
          <g fill="#639CC5" stroke="#03203D" strokeWidth="1">
            <rect x="3" y="3" width="29" height="30" rx="3" />
            <rect x="37" y="3" width="17" height="16" rx="2" />
            <rect x="37" y="22" width="17" height="12" rx="2" />
          </g>
          <path d="M2 40h53" stroke="#03203D" opacity=".4" />
        </pattern>
      </defs>
      <rect width="510" height="225" fill="url(#city-block)" />
      <path
        d="M-35 51Q28 105 77 68T181 30t99 0 100-4 170-13"
        stroke="white"
        strokeWidth="24"
        fill="none"
      />
      <path
        d="M-35 51Q28 105 77 68T181 30t99 0 100-4 170-13"
        stroke="#639CC5"
        strokeWidth="16"
        fill="none"
      />
      <path
        d="m87 172 41-18 17-48 84-35 36 25 42-18 27-44 52 11"
        stroke="#000000"
        fill="none"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <path
        d="m87 172 41-18 17-48 84-35 36 25 42-18 27-44 52 11"
        stroke="#EB2F33"
        fill="none"
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      <g
        fontFamily="Arial,sans-serif"
        fontWeight="bold"
        textAnchor="middle"
        fontSize="14"
      >
        <circle
          cx="87"
          cy="172"
          r="13"
          fill="#03203D"
          stroke="white"
          strokeWidth="3"
        />
        <text x="87" y="177" fill="white">
          А
        </text>
        <circle
          cx="386"
          cy="45"
          r="13"
          fill="#EB2F33"
          stroke="#000000"
          strokeWidth="2"
        />
        <text x="386" y="50" fill="white">
          Б
        </text>
      </g>
    </svg>
  );
}
function Mockup() {
  return (
    <div className="n-visual">
      <div className="n-window">
        <div className="n-chrome">
          <i />
          <i />
          <i />
          <span>SWIFTROUTE / DISPATCH</span>
        </div>
        <div className="n-screen">
          <div className="n-screenhead">
            <div>
              <small>ОПЕРАТИВЕН ИЗГЛЕД</small>
              <strong>Доставка #024</strong>
            </div>
            <span>ДЕМО</span>
          </div>
          <div className="n-mapframe">
            <CityMap />
            <div className="n-mapkey">BG / PDV</div>
          </div>
          <div className="n-readouts">
            <div>
              <small>МАРШРУТ</small>
              <b>А → Б</b>
            </div>
            <div>
              <small>АЛГОРИТЪМ</small>
              <b>A*</b>
            </div>
            <div>
              <small>СТАТУС</small>
              <b>В доставка</b>
            </div>
          </div>
        </div>
      </div>
      <div className="n-stamp">
        <Icon name="route" size={16} /> ROUTE ENGINE / 01
      </div>
    </div>
  );
}

const features = [
  [
    "route",
    "Маршрут по улиците",
    "A* търси най-бързия път от ресторанта до клиента по посоките на реалната пътна мрежа.",
  ],
  [
    "bike",
    "Избор на куриер",
    "Дийкстра сравнява времето до ресторанта за свободните куриери, включително при еднопосочни улици.",
  ],
  [
    "box",
    "Цикъл на доставката",
    "От създаване до предаване: всяка поръчка има статус, а наличността на куриера се обновява при доставка.",
  ],
];
const steps = [
  [
    "Ресторант",
    "Въведи ресторанта и координатите на клиента. Поръчката се появява в опашката.",
  ],
  [
    "Куриер",
    "Назначи свободен куриер. Той може да приеме и да отбележи вземането на поръчката.",
  ],
  [
    "Клиент",
    "Покажи маршрута до адреса. След предаването отбележи доставката като завършена.",
  ],
];
const cases = [
  [
    "Ресторант",
    "Вечерен наплив",
    "Открий свободен куриер за следващата поръчка, без да сравняваш адреси на ръка.",
  ],
  [
    "Куриер",
    "Следващ адрес",
    "Виж от кой ресторант започва маршрутът и къде е точката за предаване.",
  ],
  [
    "Диспечер",
    "Поглед отгоре",
    "Следи активните доставки и виж кой от екипа отново е на разположение.",
  ],
];
const quotes = [
  ["Ресторант", "„Искам да видя кой може да вземе тази поръчка.“"],
  ["Куриер", "„Трябват ми началната точка и пътят до клиента.“"],
  ["Диспечер", "„Кои доставки още са на път?“"],
];
export default function Landing() {
  const [menu, setMenu] = useState(false);
  const nav = [
    ["#features", "Възможности"],
    ["#how", "Как работи"],
    ["#roles", "За кого"],
  ];
  return (
    <div className="neo" id="start">
      <header className="n-header">
        <div className="n-wrap n-nav">
          <Logo />
          <nav aria-label="Основна навигация" className={menu ? "is-open" : ""}>
            {nav.map(([href, s]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {s}
              </a>
            ))}
          </nav>
          <div className="n-navbuttons">
            <button
              className="n-menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              Меню
            </button>
            <Go>Към таблото</Go>
          </div>
        </div>
      </header>
      <main>
        <section className="n-hero n-dot">
          <div className="n-wrap n-hgrid">
            <div className="n-hero-copy">
              <span className="n-badge">
                <i /> БЕТА ВЕРСИЯ · ПЛОВДИВ
              </span>
              <h1>
                Поръчка.
                <br />
                Куриер.
                <br />
                <span>Маршрут.</span>
              </h1>
              <p>
                От кухнята до адреса. SwiftRoute свързва ресторанти и куриери по
                улиците на Пловдив.
              </p>
              <div className="n-actions">
                <Go />
                <a href="#how" className="n-btn white">
                  Как работи <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
            <Mockup />
          </div>
        </section>
        <section className="n-section white">
          <div className="n-wrap">
            <Caption index="01">ПРОБЛЕМ / РЕШЕНИЕ</Caption>
            <h2>Когато кухнята е готова.</h2>
            <div className="n-pair">
              <article className="n-problem">
                <small>БЕЗ ОБЩО ТАБЛО</small>
                <h3>Кой ще вземе поръчката?</h3>
                <ul>
                  {[
                    "Наличността се проверява по телефона.",
                    "Близък на картата невинаги значи бърз по улиците.",
                    "Статусът се предава от човек на човек.",
                  ].map((x) => (
                    <li key={x}>
                      <b>×</b>
                      {x}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="n-solution">
                <small>СЪС SWIFTROUTE</small>
                <h3>Отговорът е на таблото.</h3>
                <ul>
                  {[
                    "Свободните куриери се виждат на едно място.",
                    "Изборът отчита времето по пътната мрежа.",
                    "Всяка доставка има номер и актуален статус.",
                  ].map((x) => (
                    <li key={x}>
                      <b>✓</b>
                      {x}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>
        <section className="n-section stone" id="features">
          <div className="n-wrap">
            <Caption index="02">ВЪЗМОЖНОСТИ</Caption>
            <h2>Под капака.</h2>
            <div className="n-three">
              {features.map(([icon, title, copy], i) => (
                <article className="n-feature" key={title}>
                  <div className="n-ftop">
                    <span>
                      <Icon name={icon} size={30} />
                    </span>
                    <small>F / 0{i + 1}</small>
                  </div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="n-section dark n-dot" id="how">
          <div className="n-wrap">
            <Caption index="03">КАК РАБОТИ</Caption>
            <h2>Една поръчка. Три стъпки.</h2>
            <div className="n-steps">
              {steps.map(([t, p], i) => (
                <article key={t}>
                  <strong>0{i + 1}</strong>
                  <h3>{t}</h3>
                  <p>{p}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="n-section white" id="roles">
          <div className="n-wrap">
            <Caption index="04">ЗА КОГО</Caption>
            <h2>Три гледни точки.</h2>
            <div className="n-personas">
              {cases.map(([r, t, p]) => (
                <article key={r}>
                  <span className="n-badge">{r}</span>
                  <h3>{t}</h3>
                  <p>{p}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="n-section stone">
          <div className="n-wrap">
            <Caption index="05">ПРИМЕРНИ СЦЕНАРИИ</Caption>
            <h2>Въпроси от терен.</h2>
            <div className="n-three">
              {quotes.map(([r, q]) => (
                <figure key={r}>
                  <span className="n-stars" aria-hidden="true">
                    ★★★★★
                  </span>
                  <blockquote>{q}</blockquote>
                  <figcaption>— {r} · примерна ситуация</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
        <section className="n-cta n-dot dark">
          <div className="n-wrap">
            <Caption index="06">СТАРТ</Caption>
            <h2>Готов за диспечер?</h2>
            <p>Създай поръчка и виж как се избира куриер.</p>
            <Go>Отвори SwiftRoute</Go>
          </div>
        </section>
      </main>
      <footer className="n-footer">
        <div className="n-wrap n-foot-grid">
          <div>
            <Logo />
            <p>Градска логистика · Пловдив</p>
          </div>
          <div>
            <b>Продукт</b>
            <a href="#features">Възможности</a>
            <a href="#roles">Сценарии</a>
          </div>
          <div>
            <b>Работно място</b>
            <a href="#dashboard">Диспечерско табло</a>
            <a href="#how">Как работи</a>
          </div>
          <div>
            <b>Навигация</b>
            <div className="n-foot-btns">
              <a href="#start" aria-label="Към началото">
                ↑
              </a>
              <a href="#dashboard" aria-label="Към таблото">
                ↗︎
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
