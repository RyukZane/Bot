const crypto = require('crypto');
const { EmbedBuilder, PermissionFlagsBits: P } = require('discord.js');
const config = require('../config');
const db = require('../lib/db');
const { group } = require('../lib/group');
const { base, ok, err, info } = require('../lib/embeds');
const { E, ts, parseDuration, parseColor, fmtDuration } = require('../lib/util');

const fail = (i, t) => i.reply({ embeds: [err(t)], flags: E });
const NUMS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

const subs = [
  { name: 'ping', desc: 'Bot latency', run: async (i) => {
    const sent = await i.reply({ embeds: [base('Pinging...')], withResponse: true });
    const rt = sent.resource.message.createdTimestamp - i.createdTimestamp;
    await i.editReply({ embeds: [base(`🏓 Roundtrip **${rt}ms** • API **${Math.round(i.client.ws.ping)}ms**`)] });
  } },
  { name: 'uptime', desc: 'How long the bot has been online', run: (i) => i.reply({ embeds: [base(`⏱️ ${fmtDuration(i.client.uptime)}`)] }) },
  { name: 'help', desc: 'List every command', run: (i) => {
    const fields = [...i.client.commands.values()].map((c) => {
      const j = c.data.toJSON();
      const names = (j.options || []).filter((o) => o.type === 1).map((o) => `\`${o.name}\``);
      return { name: `/${j.name} (${names.length})`, value: names.join(' ').slice(0, 1024) || '-' };
    });
    return i.reply({ embeds: [base(`Use \`/command subcommand\`. Pick from the list that appears when you type.`).setTitle(`${config.serverName} commands`).addFields(fields.slice(0, 25))], flags: E });
  } },
  { name: 'poll', desc: 'Create a reaction poll', opts: [['question', 'string', 'Question', true, { maxLength: 250 }], ['options', 'string', 'Up to 5 options separated by | (blank = yes/no)']],
    run: async (i) => {
      const opts = (i.options.getString('options') || '').split('|').map((o) => o.trim()).filter(Boolean).slice(0, 5);
      const yn = opts.length < 2;
      const desc = yn ? '👍 Yes\n👎 No' : opts.map((o, n) => `${NUMS[n]} ${o}`).join('\n');
      const msg = await i.channel.send({ embeds: [base(desc).setTitle(`📊 ${i.options.getString('question')}`).setFooter({ text: `Poll by ${i.user.username}` })] });
      for (const r of yn ? ['👍', '👎'] : NUMS.slice(0, opts.length)) await msg.react(r).catch(() => {});
      return i.reply({ embeds: [ok('Poll created.')], flags: E });
    } },
  { name: 'remind', desc: 'Set a reminder (max 7 days)', opts: [['time', 'string', 'e.g. 10m, 2h, 1d', true], ['text', 'string', 'What to remind you', true, { maxLength: 500 }]],
    run: async (i) => {
      const ms = parseDuration(i.options.getString('time'));
      if (!ms || ms > 7 * 864e5) return fail(i, 'Use a time like 10m, 2h or 1d (max 7d).');
      const text = i.options.getString('text');
      setTimeout(async () => {
        const e = base(`⏰ ${text}`).setTitle('Reminder');
        try { await i.user.send({ embeds: [e] }); } catch { i.channel.send({ content: `${i.user}`, embeds: [e] }).catch(() => {}); }
      }, ms);
      return i.reply({ embeds: [ok(`I will remind you ${ts(Date.now() + ms)}. Reminders reset if the bot restarts.`)], flags: E });
    } },
  { name: 'time', desc: 'Show a Discord timestamp for now', run: (i) => i.reply({ embeds: [base(`Local time: ${ts(Date.now(), 'F')}\nRelative: ${ts(Date.now(), 'R')}\nRaw: \`<t:${Math.floor(Date.now() / 1000)}:F>\``)], flags: E }) },
  { name: 'calc', desc: 'Calculator', opts: [['expression', 'string', 'e.g. (5+3)*2^2', true]], run: (i) => {
    const x = i.options.getString('expression').replace(/\^/g, '**');
    if (!/^[0-9+\-*/().%\s]+$/.test(x)) return fail(i, 'Only numbers and + - * / ^ % ( ) are allowed.');
    try {
      const r = Function(`"use strict";return (${x})`)();
      return i.reply({ embeds: [base(`\`${i.options.getString('expression')}\` = **${r}**`)] });
    } catch { return fail(i, 'Invalid expression.'); }
  } },
  { name: 'color', desc: 'Preview a color', opts: [['hex', 'string', 'Hex like #E11D2E or a name', true]], run: (i) => {
    const c = parseColor(i.options.getString('hex'), null);
    if (c === null) return fail(i, 'Invalid color.');
    const hex = c.toString(16).padStart(6, '0');
    return i.reply({ embeds: [new EmbedBuilder().setColor(c).setTitle(`#${hex.toUpperCase()}`).setDescription(`RGB ${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}`).setThumbnail(`https://singlecolorimage.com/get/${hex}/100x100`)] });
  } },
  { name: 'qr', desc: 'Make a QR code', opts: [['text', 'string', 'Text or link', true, { maxLength: 500 }]],
    run: (i) => i.reply({ embeds: [base().setTitle('QR code').setImage(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(i.options.getString('text'))}`)] }) },
  { name: 'hash', desc: 'Hash some text', opts: [['text', 'string', 'Text', true], ['algorithm', 'string', 'Algorithm', true, { choices: ['md5', 'sha1', 'sha256', 'sha512'] }]],
    run: (i) => i.reply({ embeds: [base(`\`\`\`${crypto.createHash(i.options.getString('algorithm')).update(i.options.getString('text')).digest('hex')}\`\`\``).setTitle(i.options.getString('algorithm').toUpperCase())], flags: E }) },
  { name: 'encode', desc: 'Encode text', opts: [['text', 'string', 'Text', true], ['format', 'string', 'Format', true, { choices: ['base64', 'hex', 'binary'] }]],
    run: (i) => {
      const t = i.options.getString('text'), f = i.options.getString('format');
      const out = f === 'binary' ? [...Buffer.from(t)].map((b) => b.toString(2).padStart(8, '0')).join(' ') : Buffer.from(t).toString(f);
      return i.reply({ embeds: [base(`\`\`\`${out.slice(0, 1900)}\`\`\``).setTitle(`Encoded (${f})`)], flags: E });
    } },
  { name: 'decode', desc: 'Decode text', opts: [['text', 'string', 'Text', true], ['format', 'string', 'Format', true, { choices: ['base64', 'hex', 'binary'] }]],
    run: (i) => {
      const t = i.options.getString('text'), f = i.options.getString('format');
      try {
        const out = f === 'binary' ? Buffer.from(t.split(/\s+/).map((b) => parseInt(b, 2))).toString() : Buffer.from(t, f).toString();
        return i.reply({ embeds: [base(`\`\`\`${out.slice(0, 1900)}\`\`\``).setTitle(`Decoded (${f})`)], flags: E });
      } catch { return fail(i, 'Could not decode that.'); }
    } },
  { name: 'password', desc: 'Generate a strong password (private)', opts: [['length', 'integer', 'Length (8-64)', false, { min: 8, max: 64 }]],
    run: (i) => {
      const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_';
      const n = i.options.getInteger('length') || 16;
      return i.reply({ embeds: [base(`\`${Array.from({ length: n }, () => chars[crypto.randomInt(chars.length)]).join('')}\``).setTitle('Password')], flags: E });
    } },
  { name: 'random', desc: 'Random number', opts: [['min', 'integer', 'Minimum', true], ['max', 'integer', 'Maximum', true]],
    run: (i) => {
      const a = i.options.getInteger('min'), b = i.options.getInteger('max');
      if (b <= a) return fail(i, 'Max must be bigger than min.');
      return i.reply({ embeds: [base(`🎲 **${crypto.randomInt(a, b + 1)}**`)] });
    } },
  { name: 'suggest', desc: 'Post a suggestion', opts: [['idea', 'string', 'Your suggestion', true, { maxLength: 1500 }]],
    run: async (i) => {
      const id = db.guild(i.guild.id).settings.suggestChannel;
      const ch = (id && (await i.guild.channels.fetch(id).catch(() => null))) || i.channel;
      const msg = await ch.send({ embeds: [base(i.options.getString('idea')).setTitle('💡 New suggestion').setAuthor({ name: i.user.username, iconURL: i.user.displayAvatarURL() })] });
      await msg.react('👍').catch(() => {}); await msg.react('👎').catch(() => {});
      return i.reply({ embeds: [ok(`Suggestion posted in ${ch}.`)], flags: E });
    } },
  { name: 'snipe', desc: 'Show the last deleted message here', run: (i) => {
    const s = i.client.snipes.get(i.channel.id);
    if (!s) return fail(i, 'Nothing to snipe.');
    return i.reply({ embeds: [base(s.content.slice(0, 4000)).setTitle(`Deleted by ${s.author}`).setTimestamp(s.at)] });
  } },
  { name: 'afk', desc: 'Set yourself AFK', opts: [['reason', 'string', 'Reason', false, { maxLength: 200 }]], run: (i) => {
    db.guild(i.guild.id).afk[i.user.id] = { reason: i.options.getString('reason') || 'AFK', at: Date.now() }; db.save();
    return i.reply({ embeds: [ok('You are now AFK. Send a message to come back.')], flags: E });
  } },
  { name: 'wordcount', desc: 'Count words and characters', opts: [['text', 'string', 'Text', true]], run: (i) => {
    const t = i.options.getString('text');
    return i.reply({ embeds: [base(`Words **${t.trim().split(/\s+/).length}** • Characters **${t.length}**`)], flags: E });
  } },
  { name: 'invite', desc: 'Invite link for this bot', run: (i) => i.reply({ embeds: [info(`[Click to invite](https://discord.com/oauth2/authorize?client_id=${i.client.user.id}&scope=bot%20applications.commands&permissions=8)`)], flags: E }) },
  { name: 'birthday', desc: 'Days until a date', opts: [['month', 'integer', 'Month 1-12', true, { min: 1, max: 12 }], ['day', 'integer', 'Day 1-31', true, { min: 1, max: 31 }]], run: (i) => {
    const now = new Date(), m = i.options.getInteger('month') - 1, d = i.options.getInteger('day');
    let t = new Date(now.getFullYear(), m, d);
    if (t < now) t = new Date(now.getFullYear() + 1, m, d);
    return i.reply({ embeds: [base(`🎂 ${Math.ceil((t - now) / 864e5)} days to go (${ts(t, 'D')})`)] });
  } },
];

module.exports = group('utility', 'Handy tools', subs);
