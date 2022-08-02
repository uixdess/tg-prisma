const { Composer } = require("telegraf");
const composer = new Composer();
const board = require("./keyboards");

composer.command("del", async (ctx) => {
  ctx.reply("Клавиатура была удалена.", board.delete());
});

module.exports = composer;
