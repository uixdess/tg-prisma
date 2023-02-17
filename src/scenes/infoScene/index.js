require("dotenv").config();
const { TARGETCHAT, LINK } = process.env;
const { Telegraf, Markup, Scenes } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { setState } = require("../../modules/state");
const board = require("../../modules/keyboards");
const users = require("../../users.json").users.item;

module.exports = new Scenes.WizardScene(
  "infoScene",
  async (ctx) => {
    await setState(true);
    await ctx.reply(ctx.i18n.t("id"));
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
    uid = ctx.message.text;
    ctx.session.id = uid;
    const f = await users.find((id) => id.uid == uid);
    if (f !== undefined) {
      ctx.session.name = f.fullname;
      await ctx.reply(
        `Поиск по id ${uid}\nФио: ${f.fullname}`,
        board.paytoip()
      );
      return ctx.wizard.next();
    } else {
      await ctx.scene.leave();
      return ctx.reply("Пользователь с таким id не был найден", board.enter());
    }
  }),
  Telegraf.action("gotoip", async (ctx) => {
    await ctx.editMessageReplyMarkup({});
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
    if (ctx.update.message.media_group_id) {
      return ctx.reply(
        "Бот принимает только один скриншот\nОтправьте изображение заново"
      );
    }
    await setState(false);
    const file = ctx.update.message.message_id;
    const picture =
      ctx.update.message.photo[1].file_id ??
      ctx.update.message.photo[0].file_id;
    await ctx.telegram.forwardMessage(TARGETCHAT, `${ctx.from.id}`, file);
    const link = await ctx.telegram.getFileLink(picture);
    const uid = Date.now() + Number(ctx.from.id);
    const msg = await ctx.telegram.sendMessage(
      TARGETCHAT,
      ctx.i18n.t("forcheck", { ctx }),
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.url("Добавить платеж", LINK + ctx.session.id)],
          [
            Markup.button.callback(
              "Подтвердить",
              `${ctx.from.id}_${ctx.session.amount}_${uid}`
            ),
            Markup.button.callback(
              "Отклонить",
              `${ctx.from.id}-${ctx.session.amount}-${uid}`
            ),
          ],
        ]),
      }
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
          url: link.href,
          status: "pending",
          msgid: `${msg.message_id}`,
        },
      });
    } catch (e) {
      console.error("Ошибка при внесении в базу данных", e);
    }
    await ctx.reply(ctx.i18n.t("thanks"));
    return ctx.scene.leave();
  })
);
