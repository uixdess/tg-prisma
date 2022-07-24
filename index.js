require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fetch = require("node-fetch");
const { Telegraf, Markup } = require("telegraf");
const {
  session,
  Scenes: { Stage, BaseScene, WizardScene },
} = require("telegraf");
const keyboard = Markup.keyboard(["Оплатить", "История пополнений"])
  .oneTime()
  .resize();
const paykeyboard = Markup.inlineKeyboard([
  Markup.button.callback("Оплатить", "pay"),
]);
let isStarted = false;
let history = [];

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.start((ctx) => {
  isStarted = false;
  ctx.reply(`Привет, ${ctx.from.first_name}`, keyboard);
});

bot.action(/.*_.*_.*/i, async (ctx) => {
  const data = ctx.update.callback_query.data.split("_");
  const msgid = ctx.update.callback_query.message.message_id;
  try {
    await prisma.user.updateMany({
      where: {
        userid: `${data[0]}`,
        amount: `${data[1]}`,
        id: `${data[2]}`,
      },
      data: {
        status: "accepted",
      },
    });
    await ctx.telegram.sendMessage(
      `${data[0]}`,
      `Ваш баланс был пополнен на ${data[1]} рублей.`
    );
    await ctx.reply("Подтверждено✅", { reply_to_message_id: msgid });
    await ctx.answerCbQuery();
  } catch (e) {
    ctx.telegram.sendMessage(process.env.TARGETCHAT, e.toString());
  }
});

bot.action(/.*-.*-.*/i, async (ctx) => {
  const data = ctx.update.callback_query.data.split("-");
  const msgid = ctx.update.callback_query.message.message_id;
  try {
    await prisma.user.updateMany({
      where: {
        userid: `${data[0]}`,
        amount: `${data[1]}`,
        id: `${data[2]}`,
      },
      data: {
        status: "denied",
      },
    });
    await ctx.telegram.sendMessage(
      `${data[0]}`,
      `Отклонено пополнение баланса на ${data[1]} рублей.`
    );
    await ctx.reply("Отклонено❌", { reply_to_message_id: msgid });
    await ctx.answerCbQuery();
  } catch (e) {
    ctx.telegram.sendMessage(process.env.TARGETCHAT, e.toString());
  }
});

const askName = async (ctx) => {
  isStarted = true;
  await ctx.reply("Введите Ваше фио");
  return ctx.wizard.next();
};

const nameHandler = Telegraf.on("text", async (ctx) => {
  ctx.session.name = ctx.message.text;
  await ctx.reply(
    "Введите ваш ip: \nПримечание: Если введете некорректный адрес, то оплата не продолжится до тех пор, пока он не будет корректен"
  );
  return ctx.wizard.next();
});

const askIp = Telegraf.hears(
  /^(10)\.(24)\.(19[7-9]|20[0-3])\.([0-9]|[0-9][0-9]|[0-9][0-9][0-9])$/,
  async (ctx) => {
    ctx.session.ip = ctx.message.text;
    await ctx.reply(
      "Введите сумму оплаты: \nПримечание: Сумма должна быть кратна 10"
    );
    return ctx.wizard.next();
  }
);

const askAmount = Telegraf.hears(
  /^([1-9][0-9][0-9]|[1-9][0-9]|[1-9])*0$/,
  async (ctx) => {
    ctx.session.amount = ctx.message.text;
    await ctx.reply(
      `Ваше фио: ${ctx.session.name} \nВаш ip: ${ctx.session.ip} \nСумма пополнения: ${ctx.session.amount}`,
      paykeyboard
    );
    return ctx.wizard.next();
  }
);

const card = Telegraf.action("pay", async (ctx) => {
  await ctx.reply("Номер карты: 4817 7602 6505 7491 \n Сбербанк");
  await ctx.reply(
    "После оплаты пришлите скриншот \n Без него процесс оплаты не будет осуществлен"
  );
  await ctx.answerCbQuery();
  return ctx.wizard.next();
});

const photoHandler = Telegraf.on("photo", async (ctx) => {
  isStarted = false;
  const file = ctx.update.message.message_id;
  const picture =
    ctx.update.message.photo[1].file_id ?? ctx.update.message.photo[0].file_id;
  await ctx.telegram.forwardMessage(
    process.env.TARGETCHAT,
    `${ctx.from.id}`,
    file
  );
  const f = await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${picture}`
  );
  const data = await f.json();
  const uid = Date.now() + Number(ctx.from.id);
  await ctx.telegram.sendMessage(
    process.env.TARGETCHAT,
    `@${ctx.from.username ?? "nousername"} произвел оплату\nФио: ${
      ctx.session.name
    }\nip: ${ctx.session.ip}\nСумма пополнения: ${ctx.session.amount}`,
    Markup.inlineKeyboard([
      Markup.button.callback(
        "Подтвердить",
        `${ctx.from.id}_${ctx.session.amount}_${uid}`
      ),
      Markup.button.callback(
        "Отклонить",
        `${ctx.from.id}-${ctx.session.amount}-${uid}`
      ),
    ])
  );
  try {
    await prisma.user.create({
      data: {
        id: `${uid}`,
        firstname: `${ctx.session.name}`,
        ip: `${ctx.session.ip}`,
        amount: `${ctx.session.amount}`,
        username: `${ctx.from.username ?? "nousername"}`,
        userid: `${ctx.from.id}`,
        date: `${JSON.stringify(new Date().toLocaleString())}`,
        url: `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${data.result.file_path}`,
        status: "pending",
      },
    });
  } catch (e) {
    console.error("Ошибка при внесении в базу данных", e);
  }
  await ctx.reply("Спасибо, после проверки ваш баланс будет пополнен");
  return ctx.scene.leave();
});

async function generateStatus(data) {
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
}

async function filterStatus(s) {
  const filtered = history.filter((st) => st.status === s);
  return filtered;
}

const infoScene = new WizardScene(
  "infoScene",
  askName,
  nameHandler,
  askIp,
  askAmount,
  card,
  photoHandler
);

const stage = new Stage([infoScene]);
bot.use(session(), stage.middleware());
bot.hears("Оплатить", (ctx) => {
  if (!isStarted) {
    ctx.scene.enter("infoScene");
  }
});

bot.hears("История пополнений", async (ctx) => {
  if (!isStarted) {
    history = await prisma.user.findMany({
      where: {
        userid: `${ctx.from.id}`,
      },
    });
    await ctx.reply(
      "Выберите желаемый фильтр для истории пополнений",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Показать все", "showall"),
          Markup.button.callback("Принятые", "accepted"),
        ],
        [
          Markup.button.callback("Отклоненные", "denied"),
          Markup.button.callback("В ожидании", "pending"),
        ],
      ])
    );
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

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

console.log("bot started");
