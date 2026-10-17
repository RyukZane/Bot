// Auto-responders: when a message matches a trigger, the bot replies.
// This file hooks itself into the client, so index.js does not need any change.
const { Client, Events, ChannelType, PermissionFlagsBits: P } = require('discord.js');
const db = require('../lib/db');
const { group } = require('../lib/group');
const { base, ok, err } = require('../lib/embeds');
const { E, fill } = require('../lib/util');

const MODES = ['word', 'exact', 'contains', 'startswith', 'endswith'];
const MAX = 100;
const cooldown = new Map();

const store = (guildId) => (db.guild(guildId).triggers ??= {});
const keyOf = (s) => String(s).trim().toLowerCase().slice(0, 100);
const fail = (i, t) => i.reply({ embeds: [err(t)], flags: E });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matches(t, content) {
  const c = content.toLowerCase().trim();
  const w = t.word;
  switch (t.mode) {
    case 'exact': return c === w;
    case 'startswith': return c.startsWith(w);
    case 'endswith': return c.endsWith(w);
    case 'contains': return c.includes(w);
    default: return new RegExp(`(^|[^\\p{L}\\p{N}])${esc(w)}($|[^\\p{L}\\p{N}])`, 'u').test(c);
  }
}

async function onMessage(m) {
  if (!m.guild || m.author.bot || !m.content) return;
  const list = db.guild(m.guild.id).triggers;
  if (!list) return;
  for (const t of Object.values(list)) {
    if (!t.enabled || (t.channel && t.channel !== m.channelId) || !matches(t, m.content)) continue;
    const ck = `${m.guild.id}:${t.word}:${m.channelId}`;
    if (Date.now() - (cooldown.get(ck) || 0) < 3000) return;
    cooldown.set(ck, Date.now());
    t.uses = (t.uses || 0) + 1;
    db.save();
    const text = fill(t.response, m.guild)
      .replace(/{user}/gi, `${m.author}`).replace(/{username}/gi, m.author.username).replace(/{channel}/gi, `${m.channel}`);
    const payload = t.embed ? { embeds: [base(text)] } : { content: text };
    m.reply({ ...payload, allowedMentions: { parse: [], repliedUser: false } }).catch(() => {});
    return; // one trigger per message
  }
}

// attach the listener automatically when the bot logs in
const HOOK = Symbol.for('strafesmp.triggers');
const origLogin = Client.prototype.login;
if (!origLogin[HOOK]) {
  const patched = function (...args) {
    if (!this[HOOK]) { this[HOOK] = true; this.on(Events.MessageCreate, onMessage); }
    return origLogin.apply(this, args);
  };
  patched[HOOK] = true;
  Client.prototype.login = patched;
}

const TRIG = ['trigger', 'string', 'The trigger text', true, { maxLength: 100 }];
const MATCH = ['match', 'string', 'How it matches (default: word)', false, { choices: MODES }];
const EMB = ['embed', 'boolean', 'Reply as an embed?'];
const CHAN = ['channel', 'channel', 'Only work in this channel', false, { types: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }];

const subs = [
  { name: 'create', desc: 'Create an auto-response trigger', perm: P.ManageMessages,
    opts: [TRIG, ['response', 'string', 'Reply text. Use {user} {username} {server} {members} {channel}, \\n for new line', true, { maxLength: 1900 }], MATCH, EMB, CHAN],
    run: (i) => {
      const list = store(i.guild.id), key = keyOf(i.options.getString('trigger'));
      if (!key) return fail(i, 'The trigger cannot be empty.');
      if (list[key]) return fail(i, 'That trigger already exists. Use /trigger edit or /trigger delete.');
      if (Object.keys(list).length >= MAX) return fail(i, `You can have at most ${MAX} triggers.`);
      list[key] = {
        word: key, response: i.options.getString('response'), mode: i.options.getString('match') || 'word',
        embed: !!i.options.getBoolean('embed'), channel: i.options.getChannel('channel')?.id || null,
        enabled: true, uses: 0, by: i.user.id, created: Date.now(),
      };
      db.save();
      return i.reply({ embeds: [ok(`Trigger **${key}** created (${list[key].mode}).`)] });
    } },
  { name: 'delete', desc: 'Delete a trigger', perm: P.ManageMessages, opts: [TRIG],
    run: (i) => {
      const list = store(i.guild.id), key = keyOf(i.options.getString('trigger'));
      if (!list[key]) return fail(i, 'No trigger with that name. Use /trigger list to see them.');
      delete list[key]; db.save();
      return i.reply({ embeds: [ok(`Trigger **${key}** deleted.`)] });
    } },
  { name: 'edit', desc: 'Edit a trigger', perm: P.ManageMessages,
    opts: [TRIG, ['response', 'string', 'New reply text', false, { maxLength: 1900 }], MATCH, EMB, CHAN],
    run: (i) => {
      const t = store(i.guild.id)[keyOf(i.options.getString('trigger'))];
      if (!t) return fail(i, 'No trigger with that name.');
      const r = i.options.getString('response'), m = i.options.getString('match'), e = i.options.getBoolean('embed'), c = i.options.getChannel('channel');
      if (r === null && m === null && e === null && c === null) return fail(i, 'Give at least one thing to change.');
      if (r !== null) t.response = r;
      if (m !== null) t.mode = m;
      if (e !== null) t.embed = e;
      if (c !== null) t.channel = c.id;
      db.save();
      return i.reply({ embeds: [ok(`Trigger **${t.word}** updated.`)] });
    } },
  { name: 'list', desc: 'List all triggers', perm: P.ManageMessages,
    run: (i) => {
      const all = Object.values(store(i.guild.id));
      const text = all.length ? all.map((t) => `${t.enabled ? '🟢' : '🔴'} \`${t.word}\` (${t.mode}) → ${t.response.replace(/\n/g, ' ').slice(0, 60)}`).join('\n').slice(0, 4000) : 'No triggers yet. Use /trigger create.';
      return i.reply({ embeds: [base(text).setTitle(`Triggers (${all.length})`)], flags: E });
    } },
  { name: 'info', desc: 'Show details of a trigger', perm: P.ManageMessages, opts: [TRIG],
    run: (i) => {
      const t = store(i.guild.id)[keyOf(i.options.getString('trigger'))];
      if (!t) return fail(i, 'No trigger with that name.');
      return i.reply({ embeds: [base(t.response.slice(0, 1000)).setTitle(`Trigger: ${t.word}`).addFields(
        { name: 'Match', value: t.mode, inline: true }, { name: 'Embed', value: t.embed ? 'Yes' : 'No', inline: true }, { name: 'Enabled', value: t.enabled ? 'Yes' : 'No', inline: true },
        { name: 'Uses', value: `${t.uses || 0}`, inline: true }, { name: 'Channel', value: t.channel ? `<#${t.channel}>` : 'Any', inline: true }, { name: 'Created by', value: `<@${t.by}>`, inline: true })], flags: E });
    } },
  { name: 'toggle', desc: 'Turn a trigger on or off', perm: P.ManageMessages, opts: [TRIG],
    run: (i) => {
      const t = store(i.guild.id)[keyOf(i.options.getString('trigger'))];
      if (!t) return fail(i, 'No trigger with that name.');
      t.enabled = !t.enabled; db.save();
      return i.reply({ embeds: [ok(`Trigger **${t.word}** is now ${t.enabled ? 'on' : 'off'}.`)] });
    } },
  { name: 'clear', desc: 'Delete ALL triggers', perm: P.ManageGuild,
    run: (i) => {
      const n = Object.keys(store(i.guild.id)).length;
      db.guild(i.guild.id).triggers = {}; db.save();
      return i.reply({ embeds: [ok(`Deleted ${n} triggers.`)] });
    } },
];

module.exports = { ...group('trigger', 'Auto-response triggers', subs, { perm: P.ManageMessages }), _matches: matches };
      
