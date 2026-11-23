// Текст заказа для WhatsApp лавки.
// Менеджер сразу видит: товары, вес или количество, цену из прайса, сумму, получение, адрес и пожелания.
// Сумма примерная: рыбу на вес взвешивают, точную сумму лавка говорит после весов.

window.Zakaz = (function () {
  const D = window.Data, C = window.CAFE, cart = window.Cart;

  // z: { mode: "delivery" | "pickup" }, x: { addr, time, note }
  function text(z, x) {
    x = x || {};
    const lines = cart.lines(), sum = cart.total(), deliv = z.mode === "delivery", fee = deliv ? D.fee(sum) : 0;
    const rows = lines.map((l, i) => `${i + 1}. ${l.info.name}: ${D.amount(l.info.item, l.qty)} × ${D.priceText(l.info.item)} = ${cart.rub(cart.lineSum(l))}`);
    const out = ["Ассаламу алейкум! Заказ с каталога «" + C.name + "».", "", ...rows, ""];
    out.push(`*Примерно: ${cart.rub(sum)}*`);
    out.push("Точную сумму жду после взвешивания.", "");
    if (deliv) {
      out.push(`Получение: доставка${fee === 0 ? " (бесплатно, заказ от " + cart.rub(window.ORDER.freeFrom) + ")" : ""}`);
      if (x.addr) out.push(`Адрес: ${x.addr}`);
    } else {
      out.push(`Получение: заберу сам${x.time ? `, ${x.time}` : ""}`);
    }
    if (x.note) out.push(`Пожелания: ${x.note}`);
    return out.join("\n");
  }

  return { text };
})();
