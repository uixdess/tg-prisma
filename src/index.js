require("dotenv").config();
const bot = require("./bot");
const path = require("path");
const { TARGETCHAT, STARTID } = process.env;
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Scenes, session, Markup } = require("telegraf");
const infoScene = require("./scenes/infoScene/");
const sendscene = require("./scenes/sendAll/");
const { isAdminctx } = require("./middlewares/isadmin");
const TelegrafI18n = require("telegraf-i18n");
const i18n = new TelegrafI18n({
  defaultLanguage: "ru",
  allowMissing: false,
  directory: path.resolve(__dirname, "locales"),
});
const rateLimit = require("telegraf-ratelimit");
const limitConfig = {
  window: 1000,
  limit: 1,
  onLimitExceeded: (ctx) =>
    console.log(`Rate limit exceeded by id${ctx.from.id}`),
};
const { getState, setState } = require("./modules/state");
const board = require("./modules/keyboards");
bot.use(session());
const stage = new Scenes.Stage([infoScene, sendscene]);
bot.use(i18n.middleware());
bot.use(stage.middleware());
bot.use(rateLimit(limitConfig));
bot.use(require("./modules/start").middleware());
bot.use(require("./modules/deletekeyboard").middleware());
bot.use(require("./modules/adminutils").middleware());
bot.use(require("./modules/link").middleware());
bot.use(require("./modules/stats").middleware());
let history = [];

const generateStatus = async function (data) {
  switch (data) {
    case "pending":
      return "Ожидает подтверждения⏳";
      break;
    case "accepted":
      return "Подтвержден✅";
      break;
    case "denied":
      return "Отклонен❌";
      break;
    default:
      return "";
  }
};

const filterStatus = async function (s) {
  const filtered = history.filter((st) => st.status === s);
  return filtered;
};

bot.action("stats", isAdminctx, async (ctx) => {
  let text = "";
  let amount = 0;
  const alist = await prisma.adminstats.findMany();
  const users = await prisma.userlist.findMany();
  const history = await prisma.user.findMany({
    where: {
      status: "accepted",
    },
  });
  for (v of history) {
    amount += +v.amount;
  }
  for (a of alist) {
    text += `<a href="tg://user?id=${a.userid}">${a.userid}</a>\nПодтверждено✅: ${a.accepted} платежей\nОтклонено⭕: ${a.denied} платежей\n\n`;
  }
  await ctx.replyWithHTML(text);
  await ctx.reply(
    `Пользователей в боте👪: ${users.length}\nОбщая сумма принятых пополнений💼: ${amount} руб.`
  );
  await ctx.answerCbQuery();
});

bot.action("sendtoall", isAdminctx, async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.scene.enter("sendall");
});

bot.action("allpending", async (ctx) => {
  const all = await prisma.user.findMany({
    where: {
      status: "pending",
    },
  });
  if (!all.length) {
    await ctx.reply("Нет платежей в ожидании");
    return;
  }
  for (info of all) {
    let link = "https://t.me/c/" + `${TARGETCHAT.slice(4) + "/" + info.msgid}`;
    await ctx.reply(
      `ip: ${info.ip}\nСумма операции: ${info.amount}\nДата оплаты: ${info.date}\nСтатус: Ожидает подтверждения⏳`,
      Markup.inlineKeyboard([[Markup.button.url("Перейти к платежу", link)]])
    );
  }
  await ctx.answerCbQuery();
});

bot.action(/(.*)_(.*)_(.*)/i, isAdminctx, async (ctx) => {
  const [full, userid, amount, id] = ctx.match;
  const { text, entities } = ctx.callbackQuery.message;
  const msgid = ctx.update.callback_query.message.message_id;
  try {
    await prisma.user.updateMany({
      where: {
        userid: userid,
        amount: amount,
        id: id,
      },
      data: {
        status: "accepted",
      },
    });
    await ctx.telegram.sendMessage(
      `${userid}`,
      `Ваш баланс был пополнен на ${amount} рублей.`
    );
    await ctx.reply(`${ctx.from.first_name} подтвердил платеж✅`, {
      reply_to_message_id: msgid,
    });
    await ctx.answerCbQuery("Подтверждено✅");
    await ctx.editMessageText(text, { entities });
    await prisma.adminstats.update({
      where: {
        userid: `${ctx.from.id}`,
      },
      data: {
        accepted: {
          increment: 1,
        },
      },
    });
  } catch (e) {
    ctx.telegram.sendMessage(TARGETCHAT, e.toString());
  }
});

bot.action(/(.*)-(.*)-(.*)/i, isAdminctx, async (ctx) => {
  const [full, userid, amount, id] = ctx.match;
  const { text, entities } = ctx.callbackQuery.message;
  const msgid = ctx.update.callback_query.message.message_id;
  try {
    await prisma.user.updateMany({
      where: {
        userid: userid,
        amount: amount,
        id: id,
      },
      data: {
        status: "denied",
      },
    });
    await ctx.telegram.sendMessage(
      `${userid}`,
      `Отклонено пополнение баланса на ${amount} рублей.`
    );
    await ctx.reply(`${ctx.from.first_name} отклонил платеж❌`, {
      reply_to_message_id: msgid,
    });
    await ctx.answerCbQuery("Отклонен❌");
    await ctx.editMessageText(text, { entities });
    await prisma.adminstats.update({
      where: {
        userid: `${ctx.from.id}`,
      },
      data: {
        denied: {
          increment: 1,
        },
      },
    });
  } catch (e) {
    ctx.telegram.sendMessage(TARGETCHAT, e.toString());
  }
});

bot.action("showall", async (ctx) => {
  if (history.length) {
    for (info of history) {
      const status = await generateStatus(info.status);
      await ctx.reply(
        `ip: ${info.ip}\nСумма операции: ${info.amount}\nДата оплаты: ${info.date}\nСтатус: ${status}`
      );
    }
  } else {
    await ctx.reply("У вас ещё не было пополнений");
  }
  await ctx.reply(`Всего пополнений: ${history.length}`);
  await ctx.answerCbQuery();
});

bot.action("accepted", async (ctx) => {
  const data = await filterStatus("accepted");
  if (data.length) {
    for (info of data) {
      const status = await generateStatus(info.status);
      await ctx.reply(
        `ip: ${info.ip}\nСумма операции: ${info.amount}\nДата оплаты: ${info.date}\nСтатус: ${status}`
      );
    }
  } else {
    await ctx.reply("У вас нет пополений со статусом: Принято");
  }
  await ctx.reply(`Принятых пополнений: ${data.length}`);
  await ctx.answerCbQuery();
});

bot.action("denied", async (ctx) => {
  const data = await filterStatus("denied");
  if (data.length) {
    for (info of data) {
      const status = await generateStatus(info.status);
      await ctx.reply(
        `ip: ${info.ip}\nСумма операции: ${info.amount}\nДата оплаты: ${info.date}\nСтатус: ${status}`
      );
    }
  } else {
    await ctx.reply("У вас нет пополнений со статусом: Отклонено");
  }
  await ctx.reply(`Отклоненных пополнений: ${data.length}`);
  await ctx.answerCbQuery();
});

bot.action("pending", async (ctx) => {
  const data = await filterStatus("pending");
  if (data.length) {
    for (info of data) {
      const status = await generateStatus(info.status);
      await ctx.reply(
        `ip: ${info.ip}\nСумма операции: ${info.amount}\nДата оплаты: ${info.date}\nСтатус: ${status}`
      );
    }
  } else {
    await ctx.reply("У вас нет пополнений со статусом: В ожидании");
  }
  await ctx.reply(`Пополнений в ожидании: ${data.length}`);
  await ctx.answerCbQuery();
});

bot.action("enter", async (ctx) => {
  try {
    await ctx.editMessageReplyMarkup({});
    return ctx.scene.enter("infoScene");
  } catch (e) {
    console.log(e);
  }
});

bot.action("reenter", async (ctx) => {
  try {
    await ctx.editMessageReplyMarkup({});
    return ctx.scene.reenter();
  } catch (e) {
    console.log(e);
  }
});

bot.hears("Оплатить", (ctx) => {
  if (!getState()) {
    ctx.scene.enter("infoScene");
  }
});

bot.hears("История пополнений", async (ctx) => {
  if (!getState()) {
    history = await prisma.user.findMany({
      where: {
        userid: `${ctx.from.id}`,
      },
    });
    await ctx.reply(ctx.i18n.t("filterchoose"), board.history());
  }
});

bot
  .launch()
  .then(
    bot.telegram.sendMessage(
      `${STARTID}`,
      `Бот был запущен ${new Date().toLocaleDateString()} в ${new Date().toLocaleTimeString()}`
    )
  )
  .then(console.log("bot started"))
  .catch((e) => console.error(e));

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
