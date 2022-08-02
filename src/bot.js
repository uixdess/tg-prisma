require("dotenv").config();
const { BOT_TOKEN } = process.env;
const { Telegraf } = require("telegraf");

const bot = new Telegraf(BOT_TOKEN);

module.exports = bot;
