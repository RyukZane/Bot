require('dotenv').config();
const { REST, Routes } = require('discord.js');
const loadCommands = require('./lib/loader');

const { commands, total } = loadCommands();
const body = [...commands.values()].map((c) => c.data.toJSON());
const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  const route = process.env.GUILD_ID
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);
  await rest.put(route, { body });
  console.log(`Deployed ${body.length} commands (${total} subcommands) ${process.env.GUILD_ID ? 'to your server' : 'globally'}.`);
})().catch(console.error);
