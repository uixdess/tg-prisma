const { Telegraf, Scenes } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { send, back } = require("./actions");
const board = require("../../modules/keyboards");

const sendscene = new Scenes.WizardScene(
  "sendall",
  async (ctx) => {
    ctx.scene.state.msgid = ctx.update.callback_query.message.message_id;
    await ctx.editMessageText(ctx.i18n.t("sendtext"), board.aback());
    return ctx.wizard.next();
  },
  Telegraf.on("text", async (ctx) => {
    const all = await prisma.userlist.findMany();
    for (user of all) {
      await ctx.telegram.sendMessage(`${user.userid}`, `${ctx.message.text}`);
    }
    try {
      await ctx.telegram.editMessageText(
        ctx.from.id,
        ctx.scene.state.msgid,
        undefined,
        "🤖Вы успешно вошли в админ меню🤖",
        board.akeyboard()
      );
    } catch (e) {}
    await ctx.reply(ctx.i18n.t("sendcount", { all }));
    return ctx.scene.leave();
  })
);

sendscene.action("aback", back);

module.exports = sendscene;
