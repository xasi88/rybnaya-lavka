// Данные для сайта: каталог из data/menu.js и общие расчёты цен.
// Основа кода: меню «Рамбургер». Админки и базы здесь нет: каталог живёт в одном файле.
// Рыбу на вес (unit "кг") продаём шагом 0,5 кг: так покупатель собирает заказ пальцем, без ввода чисел.

(function () {
  const src = window.MENU_DATA;
  window.CAFE = src.cafe;
  window.ORDER = src.order;
  window.MENU = src.menu.filter((g) => g.items.length);
  const O = window.ORDER;

  const dish = {};
  // Полное имя для корзины и заказа: «Лопатка (баранина)». Лопатка есть и в баранине, и в говядине:
  // менеджер должен видеть, какое мясо. Слово уже есть в названии: не повторяем.
  const MEAT = {};
  window.MENU.forEach((g) => g.items.forEach((it) => {
    const m = MEAT[g.id];
    it.full = m && !/баран|говяд|говяж/i.test(it.name) ? `${it.name} (${m})` : it.name;
    dish[it.id] = it;
  }));
  const rub = (n) => Math.round(n).toLocaleString("ru-RU") + " ₽";

  window.Data = {
    dish,
    // Шаг покупки: полкило для весового товара, одна штука для остального
    step: (it) => (it.unit === "кг" ? 0.5 : 1),
    // Цена как в прайсе: «1 050 ₽/кг», «2 500 ₽/шт», «790 ₽»
    priceText: (it) => rub(it.price) + (it.unit ? "/" + it.unit : ""),
    // Количество словами: «1,5 кг», «2 шт»
    amount(it, qty) {
      if (it.unit === "кг") return (qty * 0.5).toLocaleString("ru-RU") + " кг";
      return qty + " шт";
    },
    // Доставка: бесплатно от суммы, иначе цену скажет лавка (null)
    fee: (sum) => (O.freeFrom && sum >= O.freeFrom ? 0 : null),
    deliveryText: () => (O.freeFrom ? `Доставка бесплатно от ${rub(O.freeFrom)}` : "Доставка"),
  };
})();
