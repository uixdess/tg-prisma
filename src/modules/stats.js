const { Composer } = require("telegraf");
const { isAdmin } = require("../middlewares/isadmin");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const composer = new Composer();

composer.hears(/stats(.+)/i, isAdmin, async (ctx) => {
  try {
    const fulldate = ctx.match[1].trim();
    const date = fulldate.split(".");
    const all = await prisma.user.findMany({
      where: {
        date: {
          contains: `${date[0]}.${date[1]}`,
        },
        status: "accepted",
      },
    });
    let amount = 0;
    all.forEach((user) => {
      amount += +user.amount;
    });
    ctx.reply(`${amount}`);
  } catch (e) {
    console.log(e);
  }
});

module.exports = composer;
