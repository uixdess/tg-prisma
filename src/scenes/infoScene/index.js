require("dotenv").config();
const { BOT_TOKEN, TARGETCHAT } = process.env;
const { Telegraf, Markup, Scenes } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fetch = require("node-fetch");
const { setState } = require("../../modules/state");
const board = require("../../modules/keyboards");

module.exports = new Scenes.WizardScene(
  "infoScene",
  async (ctx) => {
    await setState(true);
    await ctx.reply(ctx.i18n.t("name"));
    return ctx.wizard.next();
  },
  Telegraf.on("text", async (ctx) => {
    if (ctx.update.message.text == "Нужна помощь") {
      await ctx.scene.leave();
      await setState(false);
      return ctx.reply(
        "Если что-то пошло не-так Вы можете написать /start или написать об этом",
        board.help()
      );
    }
    ctx.session.name = ctx.message.text;
    await ctx.reply(ctx.i18n.t("ip"));
    return ctx.wizard.next();
  }),
  Telegraf.hears(
    /^(10)\.(24)\.(19[6-9]|20[0-3])\.([0-9]|[0-9][0-9]|[0-9][0-9][0-9])$/,
    async (ctx) => {
      ctx.session.ip = ctx.message.text;
      await ctx.reply(ctx.i18n.t("amount"));
      return ctx.wizard.next();
    }
  ),
  Telegraf.hears(/^([1-9][0-9][0-9]|[1-9][0-9]|[1-9])*0$/, async (ctx) => {
    ctx.session.amount = ctx.message.text;
    await ctx.reply(ctx.i18n.t("beforepay", { ctx }), board.paykeyboard());
    return ctx.wizard.next();
  }),
  Telegraf.action("pay", async (ctx) => {
    await ctx.reply(ctx.i18n.t("cardnum"));
    await ctx.reply(ctx.i18n.t("screenshot"));
    await ctx.answerCbQuery();
    return ctx.wizard.next();
  }),
  Telegraf.on("photo", async (ctx) => {
    await setState(false);
    const file = ctx.update.message.message_id;
    const picture =
      ctx.update.message.photo[1].file_id ??
      ctx.update.message.photo[0].file_id;
    await ctx.telegram.forwardMessage(TARGETCHAT, `${ctx.from.id}`, file);
    const f = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${picture}`
    );
    const data = await f.json();
    const uid = Date.now() + Number(ctx.from.id);
    if (ctx.from.username === undefined) {
      await ctx.telegram.sendMessage(
        TARGETCHAT,
        ctx.i18n.t("forchecknoname", { ctx }),
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            Markup.button.callback(
              "Подтвердить",
              `${ctx.from.id}_${ctx.session.amount}_${uid}`
            ),
            Markup.button.callback(
              "Отклонить",
              `${ctx.from.id}-${ctx.session.amount}-${uid}`
            ),
          ]),
        }
      );
    } else {
      await ctx.telegram.sendMessage(
        TARGETCHAT,
        ctx.i18n.t("forcheck", { ctx }),
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
    }
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
          url: `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`,
          status: "pending",
        },
      });
    } catch (e) {
      console.error("Ошибка при внесении в базу данных", e);
    }
    await ctx.reply(ctx.i18n.t("thanks"));
    return ctx.scene.leave();
  })
);
