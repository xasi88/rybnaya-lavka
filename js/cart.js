// Корзина: количество и суммы.
// Ключ строки: id товара. Значение: число шагов (для рыбы на вес шаг 0,5 кг, для остального 1 штука).
// Корзина хранится в браузере покупателя, чтобы не пропасть при перезагрузке.

window.Cart = (function () {
  const KEY = "rybnaya-lavka-cart";
  const D = window.Data;
  const byId = D.dish;

  // Что лежит под ключом: название, цена одного шага, цена из прайса, единица
  function info(key) {
    const it = byId[key];
    if (!it) return null;
    return { key, id: key, name: it.full, price: it.price * D.step(it), art: it, item: it };
  }

  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { state = {}; }
  // dropped: сколько строк убрано при открытии (товара больше нет в каталоге)
  let dropped = 0;
  for (const k of Object.keys(state)) {
    if (!info(k) || !(state[k] > 0)) { if (state[k] > 0) dropped++; delete state[k]; }
  }

  const listeners = [];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* без хранилища корзина живёт до перезагрузки */ }
    listeners.forEach((fn) => fn());
  }

  const rub = (n) => Math.round(n).toLocaleString("ru-RU") + " ₽";
  // Сумма строки: рубли без копеек (795 ₽/кг × 0,5 кг = 398 ₽)
  const lineSum = (l) => Math.round(l.info.price * l.qty);
  const lines = () => Object.keys(state).map((k) => ({ key: k, info: info(k), qty: state[k] }));
  const total = () => lines().reduce((a, l) => a + lineSum(l), 0);

  return {
    byId,
    dropped,
    rub,
    info,
    lineSum,
    qty: (key) => state[key] || 0,
    amount: (key) => D.amount(byId[key], state[key] || 0),
    add(key) { if (!info(key)) return; state[key] = (state[key] || 0) + 1; save(); },
    sub(key) { if (!state[key]) return; state[key] -= 1; if (!state[key]) delete state[key]; save(); },
    clear() { state = {}; save(); },
    lines,
    // Число позиций в корзине: килограммы и штуки вместе не складываем
    count: () => Object.keys(state).length,
    total,
    onChange(fn) { listeners.push(fn); },
  };
})();
