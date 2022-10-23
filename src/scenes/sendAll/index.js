const { Telegraf, Scenes } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { back } = require("./actions");
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
    let ok = 0;
    let failed = 0;
    for (user of all) {
      const msg = await ctx.telegram
        .sendMessage(`${user.userid}`, `${ctx.message.text}`)
        .catch((e) => e);
      if (msg.message_id) {
        ok++;
      } else {
        failed++;
      }
    }
    try {
      await ctx.telegram.editMessageText(
        ctx.from.id,
        ctx.scene.state.msgid,
        undefined,
        "🤖Вы успешно вошли в админ меню🤖",
        board.akeyboard()
      );
    } catch (e) {
      console.log(e);
    }
    await ctx.reply(
      `Отправлено: ${ok} сообщений\nНе удалось отправить: ${failed} сообщений`
    );
    return ctx.scene.leave();
  })
);

sendscene.action("aback", back);

module.exports = sendscene;
