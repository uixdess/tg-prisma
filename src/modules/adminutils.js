const { Composer } = require("telegraf");
const composer = new Composer();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const isAdmin = require("../middlewares/isadmin");
const board = require("./keyboards");

composer.hears(/add(.+)/i, async (ctx) => {
  if (ctx.from.id !== 314012178) {
    return;
  } else {
    const id = ctx.match[1].trim();
    await prisma.adminstats.upsert({
      where: {
        userid: `${id}`,
      },
      create: {
        userid: `${id}`,
      },
      update: {},
    });
    ctx.reply(`${id} был добавлен в список администраторов`);
  }
});

composer.hears(/adel(.+)/i, async (ctx) => {
  try {
    if (ctx.from.id !== 314012178) {
      return;
    } else {
      const id = ctx.match[1].trim();
      await prisma.adminstats.delete({
        where: {
          userid: `${id}`,
        },
      });
      ctx.reply(`${id} был удален из списка администраторов`);
    }
  } catch (e) {
    ctx.reply("Пользователь не был найден");
  }
});

composer.command("admin", isAdmin, (ctx) => {
  ctx.reply("🤖Вы успешно вошли в админ меню🤖", board.akeyboard());
});

module.exports = composer;
