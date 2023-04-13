import { serve } from "std/http";
import { Bot, webhookCallback } from "grammy";
import { Menu } from "grammy/menu";

console.log(`Function "telegram-bot" up and running!`);

async function getToken() {
  const envToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

  if (envToken) {
    return envToken;
  }

  const creds = JSON.parse(
    await Deno.readTextFile("./telegram.credentials.json"),
  );

  return creds["TELEGRAM_BOT_TOKEN"];
}

const token = await getToken();
const bot = new Bot(token);

const menu = new Menu("my-menu-identifier")
  .text("1", (x) => x.reply("1 slected"))
  .text("2", (x) => x.reply("2 slected"));

// Make it interactive.
bot.use(menu);

bot.command("start", (ctx) => {
  ctx.reply("Welcome! Up and running. Your id: " + ctx.from?.id);
  ctx.reply("Options", { reply_markup: menu });
});
bot.command("ping", (ctx) => ctx.reply(`Pong! ${new Date()} ${Date.now()}`));
bot.hears(new RegExp(".*"), (ctx) => ctx.reply("Hello"));
bot.on(":sticker", (x) => x.reply("Nice sticker"));

const secret = Deno.env.get("FUNCTION_SECRET");

if (!secret) {
  console.log("FUNCTION_SECRET is not provided, running in long-polling mode");

  bot.start();
} else {
  console.log("FUNCTION_SECRET is provided, running in serverless mode");
  const handleUpdate = webhookCallback(bot, "std/http");

  serve(async (req) => {
    try {
      const url = new URL(req.url);
      if (url.searchParams.get("secret") !== secret) {
        return new Response("not allowed", { status: 405 });
      }

      return await handleUpdate(req);
    } catch (err) {
      console.error(err);
    }
  });
}
