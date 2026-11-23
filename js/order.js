// Заказ: список товаров, доставка или самовывоз, адрес, пожелания, сумма, отправка в WhatsApp лавки.
// Один и тот же заказ показан на экране «Заказ» и в боковой панели большого экрана.
// Сумма примерная: рыбу взвешивают при сборке заказа.

window.OrderView = (function () {
  const { esc, ico, ctl, toast, countTo } = window.UI;
  const C = window.CAFE, O = window.ORDER, D = window.Data, cart = window.Cart;
  const MODES = [["delivery", "Доставка", ico.truck]].concat(O.pickup ? [["pickup", "Заберу сам", ico.walk]] : []);
  // sent: покупатель нажал «Отправить заказ», ждём ответа «Заказ отправлен?» (против двойных заказов)
  const state = { mode: "delivery", time: "", addr: "", note: "", sent: false };
  // Поля заказа живут в памяти вкладки: в сеть они не уходят
  const FORM = "rybnaya-lavka-order";
  try {
    const s = JSON.parse(sessionStorage.getItem(FORM)) || {};
    if (MODES.some(([m]) => m === s.mode)) state.mode = s.mode;
    ["time", "addr", "note"].forEach((f) => { if (typeof s[f] === "string") state[f] = s[f].slice(0, 140); });
    state.sent = s.sent === true;
  } catch (e) { /* нет памяти вкладки: поля пустые */ }
  const keep = () => { try { sessionStorage.setItem(FORM, JSON.stringify(state)); } catch (e) { /* не страшно */ } };
  const mounts = [];

  function field(f, label, ph, extra) {
    return `<label class="field" data-for="${f}"><span class="o-label">${label}</span><input data-f="${f}" placeholder="${ph}" ${extra || ""}></label>`;
  }

  function skeleton(side) {
    return `
      ${side ? "" : '<a class="back" href="#menu">' + ico.back + "Каталог</a>"}
      <h2 class="page-title">Ваш заказ</h2>
      <div class="blank" data-empty>
        <div class="blank-art">${window.LOGO}</div>
        <h2>Пока пусто</h2>
        <p>Добавьте товары кнопкой «+». Заказ уйдёт в WhatsApp лавки готовым списком.</p>
        ${side ? "" : '<a class="btn btn-main" href="#menu">Открыть каталог</a>'}
      </div>
      <div data-full hidden>
        <ul class="o-list" data-list></ul>
        <div class="o-free" data-free hidden><p data-free-text></p><span class="o-free-bar"><i data-free-bar></i></span></div>
        <div class="o-section">
          ${MODES.length > 1 ? `<span class="o-label">Как получить</span>
          <div class="seg" role="radiogroup" aria-label="Как получить"><span class="seg-pill"></span>
            ${MODES.map(([m, t, i]) => `<button type="button" role="radio" data-mode="${m}" aria-checked="false">${i}${t}</button>`).join("")}
          </div>` : ""}
          ${field("addr", "Адрес доставки", "Улица, дом, ориентир", 'autocomplete="street-address" maxlength="120"')}
          ${field("time", "Когда заберёте", "Например, сегодня в 18:00", 'maxlength="60"')}
          <p class="o-addr" data-pickup-addr>${ico.walk}<span>Самовывоз: ${esc(C.address)}</span></p>
          ${field("note", "Пожелания", "Например, нарезать юколу кусками", 'maxlength="140"')}
        </div>
        <div class="o-sums">
          <span>Товары</span><b data-sum></b>
          <span data-fee-name>Доставка</span><b data-fee></b>
        </div>
        <div class="o-total"><span>Примерно</span><b data-total></b></div>
        <p class="o-total-note">Рыбу на вес взвешивают при сборке. Точную сумму и наличие лавка напишет в WhatsApp.</p>
        <a class="btn btn-wa btn-wide" data-send target="_blank" rel="noopener">${ico.wa}Отправить заказ в WhatsApp</a>
        <p class="o-hint" data-hint>Откроется WhatsApp лавки с готовым списком. Останется нажать «Отправить».</p>
        <div class="o-sent" data-sent hidden>
          <b>Заказ отправлен?</b>
          <p>Если вы отправили сообщение в WhatsApp, корзину можно очистить.</p>
          <button class="btn btn-main btn-wide" type="button" data-sent-yes>Да, очистить корзину</button>
          <button class="btn btn-soft btn-wide" type="button" data-sent-no>Нет, вернуться к заказу</button>
        </div>
        <button class="o-clear" type="button" data-clear>Очистить заказ</button>
      </div>`;
  }

  // Подсветить, что покупатель пропустил
  function shake(x) {
    if (!x) return;
    x.classList.remove("invalid"); void x.offsetWidth; x.classList.add("invalid");
    if (x.scrollIntoView) x.scrollIntoView({ block: "center" });
  }

  // Почему заказ пока нельзя отправить. Пусто: можно.
  function problem(el) {
    if (state.mode === "delivery" && !state.addr.trim()) {
      const input = el.querySelector('[data-f="addr"]');
      shake(input); input.focus();
      return "Напишите адрес доставки";
    }
    return "";
  }

  function mount(el, side) {
    el.innerHTML = skeleton(side);
    mounts.push(el);
    el.addEventListener("click", (e) => {
      const m = e.target.closest("[data-mode]");
      if (m) { state.mode = m.dataset.mode; update(); return; }
      if (e.target.closest("[data-clear]")) { cart.clear(); toast("Заказ очищен"); return; }
      if (e.target.closest("[data-sent-yes]")) { state.note = ""; state.time = ""; cart.clear(); toast("Корзина очищена. Спасибо за заказ!"); return; }
      if (e.target.closest("[data-sent-no]")) { asked(false); return; }
      const send = e.target.closest("[data-send]");
      if (!send) return;
      const why = problem(el);
      if (why) { e.preventDefault(); toast(why); return; }
      window.Stats.order(cart.lines(), state.mode, cart.total());
      // Вопрос «Заказ отправлен?» встаёт чуть позже: нажатие сначала открывает WhatsApp
      setTimeout(() => asked(true), 400);
    });
    el.addEventListener("input", (e) => {
      const f = e.target.dataset.f;
      if (!f) return;
      state[f] = e.target.value;
      e.target.classList.remove("invalid");
      mounts.forEach((m) => { const x = m.querySelector(`[data-f="${f}"]`); if (x !== e.target) x.value = state[f]; });
      link();
    });
    update();
  }

  const message = () => window.Zakaz.text({ mode: state.mode }, { addr: state.addr.trim(), time: state.time.trim(), note: state.note.trim() });

  function link() {
    const href = `https://wa.me/${C.phone}?text=${encodeURIComponent(message())}`;
    keep();
    mounts.forEach((m) => { m.querySelector("[data-send]").href = href; });
  }

  function update() {
    const lines = cart.lines(), deliv = state.mode === "delivery", sum = cart.total(), fee = D.fee(sum);
    if (!lines.length) state.sent = false;
    const idx = MODES.findIndex(([m]) => m === state.mode);
    mounts.forEach((el) => {
      const q = (s) => el.querySelector(s);
      q("[data-empty]").hidden = lines.length > 0;
      q("[data-full]").hidden = !lines.length;
      q("[data-list]").innerHTML = lines.map((l) => `
        <li class="o-line">
          <div><b>${esc(l.info.name)}</b><span>${esc(D.priceText(l.info.item))} × ${esc(D.amount(l.info.item, l.qty))} <i>= ${cart.rub(cart.lineSum(l))}</i></span></div>
          <span data-ctl="${l.key}">${ctl(l.key)}</span></li>`).join("");
      // До бесплатной доставки: полоса растёт вместе с корзиной
      const free = q("[data-free]");
      free.hidden = !(deliv && O.freeFrom);
      q("[data-free-text]").textContent = fee === 0 ? "Доставка бесплатная" : `До бесплатной доставки: ${cart.rub(O.freeFrom - sum)}`;
      q("[data-free-bar]").style.width = Math.min(100, Math.round((sum / O.freeFrom) * 100)) + "%";
      free.classList.toggle("done", fee === 0);
      countTo(q("[data-sum]"), sum, cart.rub);
      q("[data-fee-name]").hidden = q("[data-fee]").hidden = !deliv;
      q("[data-fee]").textContent = fee === 0 ? "бесплатно" : O.noPrice;
      countTo(q("[data-total]"), sum, cart.rub);
      el.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === state.mode)));
      const pill = q(".seg-pill");
      if (pill) pill.style.transform = `translateX(${idx * 100}%)`;
      q('[data-for="time"]').hidden = deliv;
      q("[data-pickup-addr]").hidden = deliv;
      q('[data-for="addr"]').hidden = !deliv;
      q("[data-hint]").hidden = state.sent;
      // Ждём ответа «Заказ отправлен?»: кнопки отправки и очистки убраны, второй раз заказ не уйдёт случайно
      q("[data-sent]").hidden = !state.sent;
      q("[data-clear]").hidden = state.sent;
      q("[data-send]").hidden = state.sent;
      el.querySelectorAll("[data-f]").forEach((x) => { if (document.activeElement !== x) x.value = state[x.dataset.f]; });
    });
    link();
  }

  function asked(v) { state.sent = v && cart.lines().length > 0; update(); }

  return { mount, update, message, asked };
})();
