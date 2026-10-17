module.exports = {
  serverName: 'StrafeSMP',
  serverIp: 'play.strafesmp.net', // change this
  footer: 'StrafeSMP',
  colors: { primary: 0xe11d2e, success: 0x22c55e, warn: 0xf59e0b, error: 0xef4444, info: 0x3b82f6 },

  // used by /smp discord, store, vote, wiki, map, apply
  links: { discord: '', store: '', vote: '', wiki: '', map: '', apply: '' },

  rules: [
    'No cheating, x-ray or unfair client mods.',
    'Respect all players and staff.',
    'No griefing or stealing outside of server events.',
    'No spam, advertising or self-promo.',
    'Follow staff instructions at all times.',
  ],

  ticket: {
    const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle,
  PermissionFlagsBits: P, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, StringSelectMenuBuilder, ThumbnailBuilder,
} = require('discord.js');
const config = require('../config');
const db = require('../lib/db');
const { group } = require('../lib/group');
const { base, ok, err } = require('../lib/embeds');
const { E, ts } = require('../lib/util');

const typeOf = (id) => config.ticket.types.find((t) => t.id === id);
const isStaff = (m, g) => m.permissions.has(P.ManageChannels) || (g.settings.staffRole && m.roles.cache.has(g.settings.staffRole));
const ALLOW = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks];

// ---------- panel ----------
// config.ticket.panelStyle: 'grid' (default, compact buttons) | 'dropdown' (one select menu) | 'list' (button beside each type)
// optional: config.ticket.banner (https image URL) and config.ticket.thumbnail (https image URL)
const typeButton = (t) => new ButtonBuilder().setCustomId(`ticket:open:${t.id}`).setLabel(t.label).setEmoji(t.emoji).setStyle(ButtonStyle[t.style] || ButtonStyle.Secondary);
const gap = (big) => new SeparatorBuilder().setDivider(true).setSpacing(big ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);

function buildPanel() {
  const cfg = config.ticket;
  const style = cfg.panelStyle || 'grid';
  const c = new ContainerBuilder().setAccentColor(config.colors.primary);

  if (cfg.banner) c.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(cfg.banner)));

  const head = new TextDisplayBuilder().setContent(`# ${cfg.panelTitle}\n${cfg.panelDescription}`);
  if (cfg.thumbnail) c.addSectionComponents(new SectionBuilder().addTextDisplayComponents(head).setThumbnailAccessory(new ThumbnailBuilder().setURL(cfg.thumbnail)));
  else c.addTextDisplayComponents(head);

  if (style === 'list') {
    for (const t of cfg.types) {
      c.addSeparatorComponents(gap());
      c.addSectionComponents(new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${t.emoji} ${t.label}\n${t.description}`))
        .setButtonAccessory(typeButton(t).setLabel('Open')));
    }
  } else {
    c.addSeparatorComponents(gap(true));
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(cfg.types.map((t) => `${t.emoji} **${t.label}**\n-# ${t.description}`).join('\n\n')));
    c.addSeparatorComponents(gap(true));
    if (style === 'dropdown') {
      c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('ticket:select').setPlaceholder('Select a ticket type...').addOptions(
          cfg.types.map((t) => ({ label: t.label, description: t.description.slice(0, 100), value: t.id, emoji: t.emoji })),
        ),
      ));
    } else {
      for (let n = 0; n < cfg.types.length; n += 3) {
        c.addActionRowComponents(new ActionRowBuilder().addComponents(cfg.types.slice(n, n + 3).map(typeButton)));
      }
    }
  }
  c.addSeparatorComponents(gap());
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${cfg.panelFooter}`));
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

const ticketRow = (claimed) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('ticket:close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('ticket:claim').setLabel(claimed ? 'Claimed' : 'Claim').setEmoji('🙋').setStyle(ButtonStyle.Success).setDisabled(!!claimed),
);

// ---------- open ----------
function openModal(i, typeId) {
  const t = typeOf(typeId);
  if (!t) return i.reply({ embeds: [err('Unknown ticket type.')], flags: E });
  const modal = new ModalBuilder().setCustomId(`ticket:modal:${typeId}`).setTitle(t.label.slice(0, 45));
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('reason').setLabel('Describe your issue').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000),
  ));
  return i.showModal(modal);
}

async function createTicket(i, typeId, reason) {
  const g = db.guild(i.guild.id);
  const s = g.settings;
  const type = typeOf(typeId);
  const open = Object.values(g.tickets).filter((t) => t.owner === i.user.id);
  if (open.length >= config.ticket.maxPerUser) {
    return i.reply({ embeds: [err(`You already have an open ticket: <#${open[0].channel}>`)], flags: E });
  }
  await i.deferReply({ flags: E });
  g.counter++;
  const num = String(g.counter).padStart(4, '0');
  const overwrites = [
    { id: i.guild.id, deny: [P.ViewChannel] },
    { id: i.user.id, allow: ALLOW },
    { id: i.client.user.id, allow: [...ALLOW, P.ManageChannels] },
  ];
  if (s.staffRole) overwrites.push({ id: s.staffRole, allow: ALLOW });
  const ch = await i.guild.channels.create({
    name: `${type.id}-${num}`,
    type: ChannelType.GuildText,
    parent: s.category || null,
    topic: `${type.label} | ${i.user.username} | ${i.user.id}`,
    permissionOverwrites: overwrites,
  });
  g.tickets[ch.id] = { channel: ch.id, owner: i.user.id, type: type.id, number: num, created: Date.now(), claimedBy: null };
  db.save();

  const e = base()
    .setTitle(`${type.emoji} ${type.label} • #${num}`)
    .setDescription(`${type.welcome}\n\n**Reason**\n${reason}`)
    .addFields({ name: 'Opened by', value: `${i.user}`, inline: true }, { name: 'Created', value: ts(Date.now()), inline: true });
  await ch.send({
    content: `${i.user}${s.staffRole ? ` <@&${s.staffRole}>` : ''}`,
    embeds: [e],
    components: [ticketRow(false)],
    allowedMentions: { users: [i.user.id], roles: s.staffRole ? [s.staffRole] : [] },
  });
  await sendLog(i.guild, g, base().setTitle('Ticket opened').addFields({ name: 'Ticket', value: `${ch} (#${num})`, inline: true }, { name: 'Type', value: type.label, inline: true }, { name: 'By', value: `${i.user}`, inline: true }));
  await i.editReply({ embeds: [ok(`Ticket created: ${ch}`)] });
}

async function sendLog(guild, g, embed, files = []) {
  if (!g.settings.logChannel) return;
  const log = await guild.channels.fetch(g.settings.logChannel).catch(() => null);
  if (log) await log.send({ embeds: [embed], files }).catch(() => {});
}

// ---------- close + transcript ----------
async function transcript(channel) {
  const all = [];
  let last;
  while (all.length < 2000) {
    const batch = await channel.messages.fetch({ limit: 100, ...(last && { before: last }) });
    if (!batch.size) break;
    all.push(...batch.values());
    last = batch.last().id;
  }
  return all.reverse().map((m) => {
    const files = m.attachments.size ? ' ' + [...m.attachments.values()].map((a) => a.url).join(' ') : '';
    return `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.username}: ${m.content}${files}${m.embeds.length ? ' [embed]' : ''}`;
  }).join('\n');
}

async function closeTicket(channel, closer, reason = 'No reason provided') {
  const g = db.guild(channel.guild.id);
  const t = g.tickets[channel.id];
  if (!t) return;
  const text = (await transcript(channel).catch(() => '')) || '(empty)';
  const file = () => new AttachmentBuilder(Buffer.from(text), { name: `transcript-${t.type}-${t.number}.txt` });
  const e = base().setTitle(`Ticket #${t.number} closed`).addFields(
    { name: 'Type', value: typeOf(t.type)?.label || t.type, inline: true },
    { name: 'Opened by', value: `<@${t.owner}>`, inline: true },
    { name: 'Closed by', value: `${closer}`, inline: true },
    { name: 'Claimed by', value: t.claimedBy ? `<@${t.claimedBy}>` : 'Nobody', inline: true },
    { name: 'Reason', value: reason.slice(0, 1000) },
  );
  await sendLog(channel.guild, g, e, [file()]);
  const owner = await channel.client.users.fetch(t.owner).catch(() => null);
  if (owner) await owner.send({ embeds: [e], files: [file()] }).catch(() => {});
  await channel.send({ embeds: [base('🔒 Closing this ticket in 5 seconds...')] }).catch(() => {});
  setTimeout(() => {
    delete g.tickets[channel.id];
    g.closedCount++;
    db.save();
    channel.delete().catch(() => {});
  }, 5000);
}

// ---------- component handlers ----------
async function claim(i) {
  const g = db.guild(i.guild.id);
  const t = g.tickets[i.channel.id];
  if (!t) return;
  if (!isStaff(i.member, g)) return i.reply({ embeds: [err('Only staff can claim tickets.')], flags: E });
  if (t.claimedBy) return i.reply({ embeds: [err(`Already claimed by <@${t.claimedBy}>.`)], flags: E });
  t.claimedBy = i.user.id;
  db.save();
  await i.update({ components: [ticketRow(true)] });
  await i.channel.send({ embeds: [ok(`${i.user} claimed this ticket.`)] });
}

async function closePrompt(i) {
  const g = db.guild(i.guild.id);
  const t = g.tickets[i.channel.id];
  if (!t) return;
  if (!isStaff(i.member, g) && i.user.id !== t.owner) return i.reply({ embeds: [err('You cannot close this ticket.')], flags: E });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:confirm').setLabel('Confirm close').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket:cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
  return i.reply({ content: 'Close this ticket?', components: [row], flags: E });
}

async function handle(i) {
  const [, action, arg] = i.customId.split(':');
  if (i.isStringSelectMenu() && action === 'select') return openModal(i, i.values[0]);
  if (i.isButton()) {
    if (action === 'open') return openModal(i, arg);
    if (action === 'claim') return claim(i);
    if (action === 'close') return closePrompt(i);
    if (action === 'cancel') return i.update({ content: 'Cancelled.', components: [] });
    if (action === 'confirm') {
      await i.update({ content: 'Closing...', components: [] });
      return closeTicket(i.channel, i.user, 'Closed with the close button');
    }
  }
  if (i.isModalSubmit() && action === 'modal') return createTicket(i, arg, i.fields.getTextInputValue('reason'));
}

// ---------- slash commands ----------
function need(i) {
  const g = db.guild(i.guild.id);
  const t = g.tickets[i.channel.id];
  if (!t) { i.reply({ embeds: [err('This is not a ticket channel.')], flags: E }); return null; }
  if (!isStaff(i.member, g)) { i.reply({ embeds: [err('Staff only.')], flags: E }); return null; }
  return { g, t };
}

const subs = [
  { name: 'setup', desc: 'Set ticket category, staff role and log channel', perm: P.ManageGuild,
    opts: [['category', 'channel', 'Category for ticket channels', true, { types: [ChannelType.GuildCategory] }], ['staffrole', 'role', 'Staff role', true], ['logchannel', 'channel', 'Log channel for transcripts', false, { types: [ChannelType.GuildText] }]],
    run: (i) => {
      const s = db.guild(i.guild.id).settings;
      s.category = i.options.getChannel('category').id;
      s.staffRole = i.options.getRole('staffrole').id;
      const log = i.options.getChannel('logchannel');
      if (log) s.logChannel = log.id;
      db.save();
      return i.reply({ embeds: [ok('Ticket system configured.')], flags: E });
    } },
  { name: 'panel', desc: 'Send the ticket panel', perm: P.ManageGuild,
    opts: [['channel', 'channel', 'Where to send it (default: here)', false, { types: [ChannelType.GuildText] }]],
    run: async (i) => {
      const ch = i.options.getChannel('channel') || i.channel;
      await ch.send(buildPanel());
      return i.reply({ embeds: [ok(`Panel sent to ${ch}.`)], flags: E });
    } },
  { name: 'close', desc: 'Close this ticket', opts: [['reason', 'string', 'Reason', false, { maxLength: 300 }]],
    run: async (i) => {
      const g = db.guild(i.guild.id);
      const t = g.tickets[i.channel.id];
      if (!t) return i.reply({ embeds: [err('This is not a ticket channel.')], flags: E });
      if (!isStaff(i.member, g) && i.user.id !== t.owner) return i.reply({ embeds: [err('You cannot close this ticket.')], flags: E });
      await i.reply({ embeds: [ok('Closing ticket.')] });
      return closeTicket(i.channel, i.user, i.options.getString('reason') || undefined);
    } },
  { name: 'claim', desc: 'Claim this ticket', run: async (i) => {
    const x = need(i); if (!x) return;
    if (x.t.claimedBy) return i.reply({ embeds: [err(`Already claimed by <@${x.t.claimedBy}>.`)], flags: E });
    x.t.claimedBy = i.user.id; db.save();
    return i.reply({ embeds: [ok(`${i.user} claimed this ticket.`)] });
  } },
  { name: 'unclaim', desc: 'Release this ticket', run: async (i) => {
    const x = need(i); if (!x) return;
    x.t.claimedBy = null; db.save();
    return i.reply({ embeds: [ok('Ticket released.')] });
  } },
  { name: 'transfer', desc: 'Hand this ticket to another staff member', opts: [['user', 'user', 'New owner', true]], run: async (i) => {
    const x = need(i); if (!x) return;
    const u = i.options.getUser('user');
    x.t.claimedBy = u.id; db.save();
    return i.reply({ embeds: [ok(`Ticket transferred to ${u}.`)] });
  } },
  { name: 'add', desc: 'Add a user to this ticket', opts: [['user', 'user', 'User to add', true]], run: async (i) => {
    const x = need(i); if (!x) return;
    const u = i.options.getUser('user');
    await i.channel.permissionOverwrites.edit(u.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    return i.reply({ embeds: [ok(`Added ${u}.`)] });
  } },
  { name: 'remove', desc: 'Remove a user from this ticket', opts: [['user', 'user', 'User to remove', true]], run: async (i) => {
    const x = need(i); if (!x) return;
    const u = i.options.getUser('user');
    if (u.id === x.t.owner) return i.reply({ embeds: [err('You cannot remove the ticket owner.')], flags: E });
    await i.channel.permissionOverwrites.delete(u.id);
    return i.reply({ embeds: [ok(`Removed ${u}.`)] });
  } },
  { name: 'rename', desc: 'Rename this ticket channel', opts: [['name', 'string', 'New name', true, { maxLength: 60 }]], run: async (i) => {
    const x = need(i); if (!x) return;
    await i.deferReply();
    await i.channel.setName(i.options.getString('name').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90));
    return i.editReply({ embeds: [ok('Ticket renamed.')] });
  } },
  { name: 'list', desc: 'List open tickets', perm: P.ManageChannels, run: (i) => {
    const list = Object.values(db.guild(i.guild.id).tickets);
    const text = list.length ? list.map((t) => `<#${t.channel}> • <@${t.owner}> • ${typeOf(t.type)?.label || t.type}${t.claimedBy ? ` • claimed by <@${t.claimedBy}>` : ''}`).join('\n').slice(0, 4000) : 'No open tickets.';
    return i.reply({ embeds: [base(text).setTitle(`Open tickets (${list.length})`)], flags: E });
  } },
  { name: 'stats', desc: 'Ticket statistics', perm: P.ManageChannels, run: (i) => {
    const g = db.guild(i.guild.id);
    return i.reply({ embeds: [base().setTitle('Ticket stats').addFields({ name: 'Total opened', value: `${g.counter}`, inline: true }, { name: 'Open now', value: `${Object.keys(g.tickets).length}`, inline: true }, { name: 'Closed', value: `${g.closedCount}`, inline: true })], flags: E });
  } },
  { name: 'info', desc: 'Info about this ticket', run: (i) => {
    const x = need(i); if (!x) return;
    return i.reply({ embeds: [base().setTitle(`Ticket #${x.t.number}`).addFields({ name: 'Type', value: typeOf(x.t.type)?.label || x.t.type, inline: true }, { name: 'Owner', value: `<@${x.t.owner}>`, inline: true }, { name: 'Claimed by', value: x.t.claimedBy ? `<@${x.t.claimedBy}>` : 'Nobody', inline: true }, { name: 'Opened', value: ts(x.t.created) })], flags: E });
  } },
];

module.exports = { ...group('ticket', 'Ticket system', subs), handle };
      
