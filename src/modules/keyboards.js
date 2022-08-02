const { Markup } = require("telegraf");

class Keyboard {
  static keyboard() {
    return Markup.keyboard(["Оплатить", "История пополнений"])
      .oneTime()
      .resize();
  }

  static akeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback("Массовая рассылка", "sendtoall")],
      [Markup.button.callback("Платежи в ожидании", "allpending")],
      [Markup.button.callback("Статистика", "stats")],
    ]);
  }

  static paykeyboard() {
    return Markup.inlineKeyboard([Markup.button.callback("Оплатить", "pay")]);
  }

  static aback() {
    return Markup.inlineKeyboard([Markup.button.callback("Назад", "aback")]);
  }

  static history() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback("Показать все", "showall"),
        Markup.button.callback("Принятые", "accepted"),
      ],
      [
        Markup.button.callback("Отклоненные", "denied"),
        Markup.button.callback("В ожидании", "pending"),
      ],
    ]);
  }

  static delete() {
    return Markup.removeKeyboard();
  }
}

module.exports = Keyboard;
