const { Composer } = require("telegraf");
const composer = new Composer();
const { setState } = require("./state");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const board = require("./keyboards");

composer.start(async (ctx) => {
  await setState(false);
  await prisma.userlist.upsert({
    where: {
      userid: `${ctx.from.id}`,
    },
    update: {},
    create: {
      userid: `${ctx.from.id}`,
    },
  });
  await ctx.reply(ctx.i18n.t("start", { ctx }), board.keyboard());
});

module.exports = composer;
