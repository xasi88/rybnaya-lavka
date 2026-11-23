// Экран «Каталог»: первый экран «как заказать», полоса разделов, строки товаров, окно товара.
// Товары идут строками, как в прайсе: название, цена, кнопка. Так 97 позиций читаются быстро.

window.MenuView = (function () {
  const { $, esc, ico, art, price, ctl, observe, openSheet, reduced } = window.UI;
  const C = window.CAFE, M = window.MENU, D = window.Data, cart = window.Cart, stats = window.Stats;
  const groupOf = {};
  M.forEach((g) => g.items.forEach((it) => { groupOf[it.id] = g; }));

  // Строка товара: общая для каталога и поиска. Нажатие на название открывает окно товара.
  function card(it) {
    return `<article class="card" data-open="${it.id}" tabindex="0" aria-label="${esc(it.name)}, ${esc(price(it))}">
      ${it.photo ? `<span class="c-pic"><img src="${esc(it.photo)}" alt="" loading="lazy" decoding="async" width="800" height="600"></span>` : ""}
      <div class="c-body">
        <h3 class="c-name">${esc(it.name)}</h3>
        <p class="c-price">${esc(price(it))}</p>
      </div>
      <div class="c-buy" data-ctl="${it.id}">${ctl(it.id)}</div>
    </article>`;
  }

  const sections = [];
  function section(g) {
    sections.push({ id: g.id, title: g.title });
    const head = `<h2 id="h-${g.id}">${esc(g.title)}</h2>${g.note ? `<p>${esc(g.note)}</p>` : ""}`;
    return `
      <section class="group" id="g-${g.id}" aria-labelledby="h-${g.id}">
        ${g.photo
          ? `<div class="group-hero"><img src="${esc(g.photo)}" alt="" loading="lazy" decoding="async" width="800" height="600"><div class="group-head">${head}</div></div>`
          : `<div class="group-head plain">${head}</div>`}
        <div class="grid">${g.items.map(card).join("")}</div>
      </section>`;
  }

  function render() {
    // Первый экран: что делать, в три шага, и условия заказа
    $("intro").innerHTML = `
      <img class="intro-bg" src="img/hero.webp" alt="" width="800" height="600" decoding="async">
      <div class="intro-in">
        <p class="intro-kicker">${esc(C.tagline)}</p>
        <h1 class="intro-title">Соберите заказ, лавка получит его в WhatsApp</h1>
        <ol class="steps">
          <li><i>${ico.plus}</i><span>Выберите товары</span></li>
          <li><i>${ico.bag}</i><span>Откройте корзину</span></li>
          <li><i class="wa">${ico.wa}</i><span>Отправьте в WhatsApp</span></li>
        </ol>
        <p class="terms"><span>${ico.truck}${esc(D.deliveryText())}</span><span>${ico.walk}Самовывоз: ${esc(C.address)}</span></p>
      </div>`;

    $("groups").innerHTML = M.map(section).join("");
    $("chipsTrack").insertAdjacentHTML("beforeend", sections.map((s) => `<button class="chip" type="button" data-cat="${s.id}">${esc(s.title)}</button>`).join(""));
    document.querySelectorAll("#groups .grid").forEach((grid) => [...grid.children].forEach(observe));
    $("priceNote").textContent = `Цены из постов лавки в Instagram, собраны ${C.priceDate}. Рыбу на вес взвешивают при сборке: точную сумму и наличие назовёт лавка.`;
    setupChips();
  }

  // Полоса разделов: подложка едет к текущему разделу
  function setupChips() {
    const track = $("chipsTrack"), pill = $("chipsPill");
    const chips = [...track.querySelectorAll(".chip")];
    if (!chips.length) return;
    let current = sections[0].id, lock = 0;

    function place(id, scrollTrack) {
      current = id;
      const c = chips.find((x) => x.dataset.cat === id);
      if (!c || !c.offsetWidth) return;
      if (!pill.dataset.ready) { pill.style.transition = "none"; requestAnimationFrame(() => requestAnimationFrame(() => { pill.style.transition = ""; pill.dataset.ready = "1"; })); }
      chips.forEach((x) => x.classList.toggle("on", x === c));
      pill.style.width = c.offsetWidth + "px";
      pill.style.transform = `translate(${c.offsetLeft}px, ${c.offsetTop}px)`;
      if (scrollTrack) track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: reduced() ? "auto" : "smooth" });
    }

    track.addEventListener("click", (e) => {
      const c = e.target.closest(".chip");
      if (!c) return;
      lock = Date.now() + 900;
      place(c.dataset.cat, true);
      stats.section(c.textContent);
      $("g-" + c.dataset.cat).scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    });

    function spy() {
      if (Date.now() < lock || $("view-menu").hidden) return;
      const edge = $("chips").getBoundingClientRect().bottom + 24;
      let id = sections[0].id;
      for (const s of sections) if ($("g-" + s.id).getBoundingClientRect().top <= edge) id = s.id;
      if (id !== current) place(id, true);
    }
    addEventListener("scroll", spy, { passive: true });
    addEventListener("resize", () => place(current, false));
    document.fonts.ready.then(() => place(current, false));
  }

  // Окно товара: фото, раздел, цена, сколько уже в корзине, кнопка «В корзину»
  let openId = null;

  function fill() {
    const it = cart.byId[openId], q = cart.qty(openId);
    $("dPrice").textContent = price(it);
    $("dSum").textContent = q ? `В корзине: ${cart.amount(openId)}, примерно ${cart.rub(cart.info(openId).price * q)}` : it.unit === "кг" ? "Шаг: 0,5 кг. Точный вес скажет лавка." : "";
    $("dSum").hidden = !$("dSum").textContent;
    $("dCtl").innerHTML = ctl(openId, true);
  }

  function openDish(key) {
    const it = cart.byId[key];
    if (!it) return;
    openId = key;
    $("dArt").innerHTML = art(it);
    $("dMeta").textContent = groupOf[key].title + (groupOf[key].note ? " · " + groupOf[key].note.toLowerCase() : "");
    $("dName").textContent = it.name;
    fill();
    openSheet($("sheet"));
    stats.opened(key);
  }

  return { render, card, openDish, fill, openKey: () => openId, refreshChips: () => window.dispatchEvent(new Event("resize")) };
})();
