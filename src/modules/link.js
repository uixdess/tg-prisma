require("dotenv").config();
const { LINK } = process.env;
const { Composer, Markup } = require("telegraf");
const { isAdmin } = require("../middlewares/isadmin");
const composer = new Composer();
const users = require("../users.json").users.item;

composer.hears(/link(.+)/i, isAdmin, async (ctx) => {
  const name = ctx.match[1].trim();
  const f = await users.find(
    (u) => u.fullname.toLowerCase().includes(name.toLowerCase()) === true
  )?.uid;
  if (f !== undefined) {
    ctx.reply(
      `Ссылка для ${name}`,
      Markup.inlineKeyboard([[Markup.button.url("Добавить платеж", LINK + f)]])
    );
  } else {
    ctx.reply("Пользователь не был найден");
  }
});

module.exports = composer;
