// Запуск: экраны по адресу, кнопка корзины внизу, поиск, экран «О лавке», связь с корзиной.
// Путь покупателя: каталог → «+» → кнопка «Корзина» внизу → «Отправить заказ в WhatsApp».

(function () {
  const { $, esc, ico, ctl, qtyOf, toast, fly, countTo, haptic, closeSheet } = window.UI;
  const C = window.CAFE, M = window.MENU, cart = window.Cart, stats = window.Stats;
  const Menu = window.MenuView, Order = window.OrderView;
  const VIEWS = ["menu", "search", "order", "cafe"];

  $("brandMark").innerHTML = window.LOGO;
  Menu.render();
  Order.mount($("orderPage"), false);
  Order.mount($("sideOrder"), true);

  // Экран «О лавке»
  const row = (href, icon, title, sub, ext) => `<a class="row" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ""}><i>${icon}</i><div><b>${title}</b><span>${sub}</span></div>${ico.go.replace("<svg", '<svg class="go"')}</a>`;
  $("cafePage").innerHTML = `
    <a class="back" href="#menu">${ico.back}Каталог</a>
    <div class="cafe-hero">
      <span class="cafe-logo">${window.LOGO}</span>
      <h2>${esc(C.name)}</h2>
      <p>${esc(C.tagline)}. Прямые поставки с Камчатки.</p>
    </div>
    <div class="rows">
      ${row("tel:+" + C.phone, ico.phone, esc(C.phoneText), "Телефон и WhatsApp лавки", false)}
      ${row(`https://instagram.com/${C.instagram}`, ico.ig, "@" + esc(C.instagram), "Instagram", true)}
      <div class="row"><i>${ico.walk}</i><div><b>${esc(C.address)}</b><span>Каждый день ${esc(C.hours)}</span></div><span></span></div>
    </div>
    <div class="cafe-cta">
      <a class="btn btn-wa" href="https://wa.me/${C.phone}" target="_blank" rel="noopener">${ico.wa}Написать в WhatsApp</a>
    </div>
    <p class="cafe-ver">Версия ${esc(window.Versii.nomer)} · цены от ${esc(C.priceDate)}</p>`;

  // Поиск: без учёта регистра и буквы «ё»
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
  const all = M.flatMap((g) => g.items.map((it) => ({ it, hay: norm(`${it.name} ${g.title} ${g.note}`) })));
  ["Икра", "Юкола", "Креветки", "Краб", "Чинар", "Раки"].forEach((w) => $("quick").insertAdjacentHTML("beforeend", `<button type="button">${w}</button>`));
  function search() {
    const q = norm($("q").value.trim());
    $("qClear").hidden = !q;
    $("quick").hidden = !!q;
    if (!q) { $("results").innerHTML = ""; return; }
    const found = all.filter((x) => q.split(/\s+/).every((w) => x.hay.includes(w))).map((x) => x.it);
    stats.search(q, found.length > 0);
    $("results").innerHTML = found.length
      ? `<p class="results-head">Найдено: ${found.length}</p><div class="grid">${found.map(Menu.card).join("")}</div>`
      : `<div class="blank"><div class="blank-art">${ico.search}</div><h2>Ничего не нашли</h2><p>Попробуйте другое слово: «икра», «юкола», «креветки».</p></div>`;
    $("results").querySelectorAll(".card").forEach((c) => c.classList.add("in"));
  }
  $("q").addEventListener("input", search);
  $("qClear").addEventListener("click", () => { $("q").value = ""; search(); $("q").focus(); });
  $("quick").addEventListener("click", (e) => { if (e.target.tagName === "BUTTON") { $("q").value = e.target.textContent; search(); } });

  // Экраны по адресу (#menu, #search, #order, #cafe)
  const scrollMemo = {};
  let view = null;
  function route() {
    const want = (location.hash || "#menu").slice(1);
    const next = VIEWS.includes(want) ? want : "menu";
    if (next === view) return;
    if (view) scrollMemo[view] = scrollY;
    view = next;
    if ($("sheet").classList.contains("open")) closeSheet($("sheet"));
    document.querySelectorAll(".view").forEach((v) => { v.hidden = v.dataset.view !== next; });
    document.body.dataset.view = next;
    document.querySelectorAll("[data-go]").forEach((t) => t.classList.toggle("on", t.dataset.go === next));
    scrollTo(0, scrollMemo[next] || 0);
    if (next === "menu") Menu.refreshChips();
    if (next === "search" && matchMedia("(hover: hover)").matches) $("q").focus({ preventScroll: true });
    stats.screen(next);
  }
  addEventListener("hashchange", route);
  route();

  // Нажатия: добавить, убрать, открыть товар
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]"), sub = e.target.closest("[data-sub]");
    if (add) {
      e.stopPropagation();
      const key = add.dataset.add, first = !cart.qty(key);
      cart.add(key);
      stats.added(key);
      haptic();
      const it = cart.byId[key];
      requestAnimationFrame(() => fly(add, it.photo || "img/logo.webp"));
      if (first) toast(`${it.full}: в корзине`);
      return;
    }
    if (sub) { e.stopPropagation(); cart.sub(sub.dataset.sub); haptic(); return; }
    const card = e.target.closest("[data-open]");
    if (card) Menu.openDish(card.dataset.open);
  });
  document.addEventListener("keydown", (e) => {
    const card = e.target.closest && e.target.closest("[data-open]");
    if (card && (e.key === "Enter" || e.key === " ") && e.target === card) { e.preventDefault(); Menu.openDish(card.dataset.open); }
    if (e.key === "Escape" && $("sheet").classList.contains("open")) closeSheet($("sheet"));
  });
  $("sheet").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet($("sheet")); });

  // Кнопка корзины внизу: сколько позиций и на какую сумму
  const bar = $("cartbar");
  bar.addEventListener("animationend", () => bar.classList.remove("bump"));
  function syncBar() {
    const n = cart.count();
    const was = bar.classList.contains("show");
    bar.classList.toggle("show", n > 0);
    document.body.classList.toggle("has-cart", n > 0);
    $("cartbarCount").textContent = n;
    countTo($("cartbarSum"), cart.total(), cart.rub);
    if (was && n) { bar.classList.remove("bump"); void bar.offsetWidth; bar.classList.add("bump"); }
  }

  // Корзина изменилась: счётчики в строках, окно товара, кнопка корзины, экран заказа
  function sync() {
    document.querySelectorAll("[data-ctl]").forEach((el) => {
      const q = String(qtyOf(el.dataset.ctl));
      if (el.dataset.q !== q) { el.innerHTML = ctl(el.dataset.ctl, !!el.dataset.big); el.dataset.q = q; }
      const c = el.closest(".card");
      if (c) c.classList.toggle("picked", q !== "0");
    });
    if (Menu.openKey() && $("sheet").classList.contains("open")) Menu.fill();
    syncBar();
    Order.update();
  }
  cart.onChange(sync);
  sync();
  if (cart.dropped) toast("Каталог изменился: часть товаров убрана из корзины. Проверьте заказ.", 5000);

  addEventListener("scroll", () => document.querySelector(".appbar").classList.toggle("scrolled", scrollY > 4), { passive: true });
})();
