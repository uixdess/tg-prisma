const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function isAdmin(ctx, next) {
  const alist = await prisma.adminstats.findMany();
  const state = alist.find((id) => id.userid == ctx.from.id);
  if (state !== undefined) {
    return next();
  } else {
    ctx.reply("Вы не администратор😣");
  }
}

async function isAdminctx(ctx, next) {
  const alist = await prisma.adminstats.findMany();
  const state = alist.find((id) => id.userid == ctx.from.id);
  if (state !== undefined) {
    return next();
  } else {
    ctx.reply("Вы не администратор😣");
  }
}

module.exports = { isAdmin, isAdminctx };
