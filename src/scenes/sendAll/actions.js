const board = require("../../modules/keyboards");

const back = async (ctx) => {
  ctx.scene.leave();
  ctx.editMessageText("🤖Вы успешно вошли в админ меню🤖", board.akeyboard());
};

module.exports = { back };
