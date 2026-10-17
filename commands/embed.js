const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ChannelType, PermissionFlagsBits: P,
} = require('discord.js');
const config = require('../config');
const db = require('../lib/db');
const { group } = require('../lib/group');
const { base, ok, err } = require('../lib/embeds');
const { E, parseColor, fill } = require('../lib/util');

const TEXT = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const CH = ['channel', 'channel', 'Target channel (default: here)', false, { types: TEXT }];
const MID = ['message_id', 'string', 'ID of a message sent by this bot', true];
const fail = (i, t) => i.reply({ embeds: [err(t)], flags: E });

function build(f, guild) {
  const e = new EmbedBuilder().setColor(parseColor(f.color, config.colors.primary));
  if (f.title) e.setTitle(fill(f.title, guild).slice(0, 256));
  if (f.description) e.setDescription(fill(f.description, guild).slice(0, 4000));
  if (f.author) e.setAuthor({ name: fill(f.author, guild).slice(0, 256) });
  if (f.image && /^https?:\/\//.test(f.image)) e.setImage(f.image);
  if (f.thumbnail && /^https?:\/\//.test(f.thumbnail)) e.setThumbnail(f.thumbnail);
  if (f.footer) e.setFooter({ text: fill(f.footer, guild).slice(0, 2048) });
  return e;
}

const input = (id, label, style, required, value, max) => {
  const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(required);
  if (max) t.setMaxLength(max);
  if (value) t.setValue(String(value).slice(0, max || 4000));
  return new ActionRowBuilder().addComponents(t);
};

function embedModal(customId, title, v = {}) {
  return new ModalBuilder().setCustomId(customId).setTitle(title).addComponents(
    input('title', 'Title', TextInputStyle.Short, false, v.title, 256),
    input('description', 'Description ({server} {members} \\n supported)', TextInputStyle.Paragraph, false, v.description, 4000),
    input('color', 'Color (hex like #E11D2E or red, blue...)', TextInputStyle.Short, false, v.color, 20),
    input('image', 'Image URL', TextInputStyle.Short, false, v.image, 400),
    input('footer', 'Footer text', TextInputStyle.Short, false, v.footer, 200),
  );
}

async function botMessage(i) {
  const ch = i.options.getChannel('channel') || i.channel;
  const m = await ch.messages.fetch(i.options.getString('message_id')).catch(() => null);
  if (!m || m.author.id !== i.client.user.id) { await fail(i, 'Message not found, or it was not sent by this bot.'); return null; }
  return m;
}

async function editFirstEmbed(i, fn) {
  const m = await botMessage(i); if (!m) return;
  if (!m.embeds[0]) return fail(i, 'That message has no embed.');
  const e = EmbedBuilder.from(m.embeds[0]);
  fn(e);
  await m.edit({ embeds: [e, ...m.embeds.slice(1)] });
  return i.reply({ embeds: [ok('Embed updated.')], flags: E });
}

// ---------- modal submissions ----------
async function handle(i) {
  if (!i.isModalSubmit()) return;
  if (!i.memberPermissions.has(P.ManageMessages)) return fail(i, 'You need Manage Messages.');
  const [, kind, chId, extra] = i.customId.split(':');
  const ch = await i.guild.channels.fetch(chId).catch(() => null);
  if (!ch || !ch.isTextBased()) return fail(i, 'Channel not found.');
  try {
    if (kind === 'json') {
      let obj;
      try { obj = JSON.parse(i.fields.getTextInputValue('json')); } catch { return fail(i, 'That is not valid JSON.'); }
      const embeds = (obj.embeds || [obj.embed || obj]).slice(0, 10).map((e) => new EmbedBuilder(e));
      await ch.send({ content: obj.content || undefined, embeds, allowedMentions: { parse: [] } });
      return i.reply({ embeds: [ok(`Sent to ${ch}.`)], flags: E });
    }
    const f = Object.fromEntries(['title', 'description', 'color', 'image', 'footer'].map((k) => [k, i.fields.getTextInputValue(k)]));
    if (!f.title && !f.description) return fail(i, 'Add at least a title or a description.');
    const e = build(f, i.guild);
    if (kind === 'create') {
      await ch.send({ embeds: [e] });
      if (extra && extra !== '-') { db.guild(i.guild.id).embeds[extra] = f; db.save(); }
      return i.reply({ embeds: [ok(`Embed sent to ${ch}${extra && extra !== '-' ? ` and saved as **${extra}**` : ''}.`)], flags: E });
    }
    if (kind === 'edit') {
      const m = await ch.messages.fetch(extra).catch(() => null);
      if (!m) return fail(i, 'Message not found.');
      await m.edit({ embeds: [e] });
      return i.reply({ embeds: [ok('Embed edited.')], flags: E });
    }
  } catch (e) {
    return fail(i, `Could not send: ${e.message}`);
  }
}

// ---------- slash commands ----------
const subs = [
  { name: 'create', desc: 'Open the embed builder', opts: [CH, ['save_as', 'string', 'Save this embed under a name', false, { maxLength: 30 }]],
    run: (i) => {
      const ch = i.options.getChannel('channel') || i.channel;
      const name = (i.options.getString('save_as') || '-').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      return i.showModal(embedModal(`embed:create:${ch.id}:${name || '-'}`, 'Create embed'));
    } },
  { name: 'quick', desc: 'Send an embed in one command',
    opts: [['title', 'string', 'Title', true, { maxLength: 256 }], ['description', 'string', 'Description (use \\n for new lines)', true, { maxLength: 4000 }], CH,
      ['color', 'string', 'Hex or color name'], ['image', 'string', 'Image URL'], ['thumbnail', 'string', 'Thumbnail URL'], ['footer', 'string', 'Footer text'], ['author', 'string', 'Author line']],
    run: async (i) => {
      const ch = i.options.getChannel('channel') || i.channel;
      const g = (k) => i.options.getString(k);
      await ch.send({ embeds: [build({ title: g('title'), description: g('description'), color: g('color'), image: g('image'), thumbnail: g('thumbnail'), footer: g('footer'), author: g('author') }, i.guild)] });
      return i.reply({ embeds: [ok(`Embed sent to ${ch}.`)], flags: E });
    } },
  { name: 'edit', desc: 'Edit an embed this bot sent', opts: [MID, CH],
    run: async (i) => {
      const m = await botMessage(i); if (!m) return;
      const e = m.embeds[0];
      if (!e) return fail(i, 'That message has no embed.');
      return i.showModal(embedModal(`embed:edit:${m.channelId}:${m.id}`, 'Edit embed', {
        title: e.title, description: e.description, color: e.color ? `#${e.color.toString(16).padStart(6, '0')}` : '', image: e.image?.url, footer: e.footer?.text,
      }));
    } },
  { name: 'json', desc: 'Send an embed from raw JSON', opts: [CH],
    run: (i) => {
      const ch = i.options.getChannel('channel') || i.channel;
      return i.showModal(new ModalBuilder().setCustomId(`embed:json:${ch.id}`).setTitle('Embed JSON').addComponents(
        input('json', 'Paste embed JSON', TextInputStyle.Paragraph, true, '{"title":"Hello","description":"World","color":14754094}', 4000)));
    } },
  { name: 'send', desc: 'Send a saved embed', opts: [['name', 'string', 'Saved embed name', true], CH],
    run: async (i) => {
      const f = db.guild(i.guild.id).embeds[i.options.getString('name').toLowerCase()];
      if (!f) return fail(i, 'No saved embed with that name.');
      const ch = i.options.getChannel('channel') || i.channel;
      await ch.send({ embeds: [build(f, i.guild)] });
      return i.reply({ embeds: [ok(`Sent to ${ch}.`)], flags: E });
    } },
  { name: 'preview', desc: 'Preview a saved embed privately', opts: [['name', 'string', 'Saved embed name', true]],
    run: (i) => {
      const f = db.guild(i.guild.id).embeds[i.options.getString('name').toLowerCase()];
      if (!f) return fail(i, 'No saved embed with that name.');
      return i.reply({ embeds: [build(f, i.guild)], flags: E });
    } },
  { name: 'list', desc: 'List saved embeds',
    run: (i) => {
      const names = Object.keys(db.guild(i.guild.id).embeds);
      return i.reply({ embeds: [base(names.length ? names.map((n) => `• ${n}`).join('\n') : 'No saved embeds yet. Use /embed create with save_as.').setTitle('Saved embeds')], flags: E });
    } },
  { name: 'delete', desc: 'Delete a saved embed', opts: [['name', 'string', 'Saved embed name', true]],
    run: (i) => {
      const g = db.guild(i.guild.id), n = i.options.getString('name').toLowerCase();
      if (!g.embeds[n]) return fail(i, 'No saved embed with that name.');
      delete g.embeds[n]; db.save();
      return i.reply({ embeds: [ok(`Deleted **${n}**.`)], flags: E });
    } },
  { name: 'announce', desc: 'Send an announcement embed with an optional ping',
    opts: [['title', 'string', 'Title', true], ['message', 'string', 'Message (use \\n for new lines)', true, { maxLength: 4000 }], CH, ['ping', 'role', 'Role to ping'], ['color', 'string', 'Hex or color name'], ['image', 'string', 'Image URL']],
    run: async (i) => {
      const ch = i.options.getChannel('channel') || i.channel;
      const role = i.options.getRole('ping');
      await ch.send({
        content: role ? `${role}` : undefined,
        embeds: [build({ title: `📢 ${i.options.getString('title')}`, description: i.options.getString('message'), color: i.options.getString('color'), image: i.options.getString('image'), footer: `${config.serverName} Announcement` }, i.guild)],
        allowedMentions: { roles: role ? [role.id] : [] },
      });
      return i.reply({ embeds: [ok(`Announcement sent to ${ch}.`)], flags: E });
    } },
  { name: 'rules', desc: 'Send a numbered rules embed', opts: [['rules', 'string', 'Rules separated by | (blank = config.js rules)'], CH],
    run: async (i) => {
      const raw = i.options.getString('rules');
      const list = raw ? raw.split('|').map((r) => r.trim()).filter(Boolean) : config.rules;
      const ch = i.options.getChannel('channel') || i.channel;
      await ch.send({ embeds: [base(list.map((r, n) => `**${n + 1}.** ${r}`).join('\n\n')).setTitle(`📜 ${config.serverName} Rules`)] });
      return i.reply({ embeds: [ok(`Rules sent to ${ch}.`)], flags: E });
    } },
  { name: 'say', desc: 'Make the bot say something (no pings)', opts: [['message', 'string', 'Message', true, { maxLength: 2000 }], CH],
    run: async (i) => {
      const ch = i.options.getChannel('channel') || i.channel;
      await ch.send({ content: i.options.getString('message').replace(/\\n/g, '\n'), allowedMentions: { parse: [] } });
      return i.reply({ embeds: [ok('Sent.')], flags: E });
    } },
  { name: 'field', desc: 'Add a field to a bot embed', opts: [MID, ['name', 'string', 'Field name', true, { maxLength: 256 }], ['value', 'string', 'Field value', true, { maxLength: 1024 }], ['inline', 'boolean', 'Inline?'], CH],
    run: (i) => editFirstEmbed(i, (e) => e.addFields({ name: i.options.getString('name'), value: i.options.getString('value').replace(/\\n/g, '\n'), inline: !!i.options.getBoolean('inline') })) },
  { name: 'set', desc: 'Change one part of a bot embed',
    opts: [MID, ['part', 'string', 'What to change', true, { choices: ['title', 'description', 'color', 'image', 'thumbnail', 'footer', 'author'] }], ['value', 'string', 'New value', true, { maxLength: 4000 }], CH],
    run: (i) => {
      const part = i.options.getString('part'), v = i.options.getString('value');
      return editFirstEmbed(i, (e) => {
        if (part === 'title') e.setTitle(v.slice(0, 256));
        if (part === 'description') e.setDescription(v.replace(/\\n/g, '\n'));
        if (part === 'color') e.setColor(parseColor(v, config.colors.primary));
        if (part === 'image') e.setImage(v);
        if (part === 'thumbnail') e.setThumbnail(v);
        if (part === 'footer') e.setFooter({ text: v.slice(0, 2048) });
        if (part === 'author') e.setAuthor({ name: v.slice(0, 256) });
      });
    } },
  { name: 'button', desc: 'Add a link button to a bot message', opts: [MID, ['label', 'string', 'Button label', true, { maxLength: 80 }], ['url', 'string', 'Link', true], CH],
    run: async (i) => {
      const url = i.options.getString('url');
      if (!/^https?:\/\//.test(url)) return fail(i, 'The link must start with http:// or https://');
      const m = await botMessage(i); if (!m) return;
      await m.edit({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel(i.options.getString('label')).setStyle(ButtonStyle.Link).setURL(url))] });
      return i.reply({ embeds: [ok('Button added.')], flags: E });
    } },
  { name: 'dm', desc: 'DM an embed to a member', opts: [['user', 'user', 'Member', true], ['title', 'string', 'Title', true], ['message', 'string', 'Message', true, { maxLength: 4000 }]],
    run: async (i) => {
      const u = i.options.getUser('user');
      try {
        await u.send({ embeds: [build({ title: i.options.getString('title'), description: i.options.getString('message'), footer: `Sent from ${i.guild.name}` }, i.guild)] });
        return i.reply({ embeds: [ok(`Sent to ${u}.`)], flags: E });
      } catch { return fail(i, 'That user has DMs closed.'); }
    } },
];

module.exports = { ...group('embed', 'Custom embed tools', subs, { perm: P.ManageMessages }), handle };
