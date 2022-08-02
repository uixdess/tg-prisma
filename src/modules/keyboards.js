const { Markup } = require("telegraf");

class Keyboard {
  static keyboard() {
    return Markup.keyboard(["Оплатить", "Нужна помощь", "История пополнений"])
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

  static help() {
    return Markup.inlineKeyboard([
      [Markup.button.url("Помощь по платежам", "tg://user?id=314012178")],
      [Markup.button.url("Помощь по боту", "tg://user?id=416135184")],
    ]);
  }
}

module.exports = Keyboard;
