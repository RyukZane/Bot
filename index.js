require('dotenv').config();
const { Client, GatewayIntentBits, Events, ActivityType, Collection } = require('discord.js');
const config = require('./config');
const db = require('./lib/db');
const loadCommands = require('./lib/loader');
const { base, err } = require('./lib/embeds');
const { E, fill } = require('./lib/util');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // privileged: enable in the developer portal
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged: needed for transcripts, snipe, afk
  ],
});

const { commands, handlers, total } = loadCommands();
client.commands = commands;
client.snipes = new Collection();

client.once(Events.ClientReady, (c) => {
  console.log(`Online as ${c.user.tag} | ${commands.size} commands, ${total} subcommands`);
  c.user.setPresence({ activities: [{ name: `${config.serverName} | /help`, type: ActivityType.Playing }] });
});

client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isChatInputCommand()) {
      const c = commands.get(i.commandName);
      if (c) await c.execute(i);
    } else if (i.customId) {
      const h = handlers.get(i.customId.split(':')[0]);
      if (h) await h(i);
    }
  } catch (e) {
    console.error(e);
    const payload = { embeds: [err('Something went wrong running that.')], flags: E };
    if (i.deferred || i.replied) i.followUp(payload).catch(() => {});
    else i.reply(payload).catch(() => {});
  }
});

client.on(Events.MessageDelete, (m) => {
  if (m.partial || !m.guild || m.author?.bot || !m.content) return;
  client.snipes.set(m.channelId, { content: m.content, author: m.author.tag, at: Date.now() });
});

client.on(Events.MessageCreate, (m) => {
  if (!m.guild || m.author.bot) return;
  const g = db.guild(m.guild.id);
  if (g.afk[m.author.id]) {
    delete g.afk[m.author.id];
    db.save();
    m.reply({ content: 'Welcome back, your AFK was removed.', allowedMentions: { repliedUser: false } }).catch(() => {});
  }
  for (const u of m.mentions.users.values()) {
    const a = g.afk[u.id];
    if (a) m.reply({ content: `${u.username} is AFK: ${a.reason}`, allowedMentions: { repliedUser: false } }).catch(() => {});
  }
});

const greet = (t, m) => fill(t, m.guild).replace(/{user}/gi, `${m}`).replace(/{username}/gi, m.user.username);

client.on(Events.GuildMemberAdd, async (m) => {
  const s = db.guild(m.guild.id).settings;
  if (s.autorole) m.roles.add(s.autorole).catch(() => {});
  if (!s.welcomeChannel) return;
  const ch = await m.guild.channels.fetch(s.welcomeChannel).catch(() => null);
  if (ch) ch.send({ content: `${m}`, embeds: [base(greet(s.welcomeMessage || 'Welcome {user} to **{server}**! You are member #{members}.', m)).setThumbnail(m.user.displayAvatarURL())] }).catch(() => {});
});

client.on(Events.GuildMemberRemove, async (m) => {
  const s = db.guild(m.guild.id).settings;
  if (!s.leaveChannel) return;
  const ch = await m.guild.channels.fetch(s.leaveChannel).catch(() => null);
  if (ch) ch.send({ embeds: [base(greet(s.leaveMessage || '**{username}** left **{server}**.', m))] }).catch(() => {});
});

process.on('unhandledRejection', (e) => console.error(e));
client.login(process.env.TOKEN);
