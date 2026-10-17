const { ChannelType, SnowflakeUtil, version: djsVersion } = require('discord.js');
const { group } = require('../lib/group');
const { base, err } = require('../lib/embeds');
const { E, ts, fmtDuration } = require('../lib/util');

const U = ['user', 'user', 'Member (default: you)'];
const fail = (i, t) => i.reply({ embeds: [err(t)], flags: E });
const userOf = (i) => i.options.getUser('user') || i.user;

const subs = [
  { name: 'user', desc: 'Info about a member', opts: [U], run: async (i) => {
    const u = userOf(i), m = await i.guild.members.fetch(u.id).catch(() => null);
    const e = base().setTitle(u.username).setThumbnail(u.displayAvatarURL({ size: 256 })).addFields({ name: 'ID', value: u.id, inline: true }, { name: 'Created', value: ts(u.createdAt), inline: true });
    if (m) e.addFields({ name: 'Joined', value: ts(m.joinedAt), inline: true }, { name: 'Top role', value: `${m.roles.highest}`, inline: true }, { name: `Roles (${m.roles.cache.size - 1})`, value: m.roles.cache.filter((r) => r.id !== i.guild.id).map((r) => `${r}`).join(' ').slice(0, 1000) || 'None' });
    return i.reply({ embeds: [e] });
  } },
  { name: 'server', desc: 'Info about this server', run: async (i) => {
    const g = i.guild, owner = await g.fetchOwner();
    return i.reply({ embeds: [base().setTitle(g.name).setThumbnail(g.iconURL({ size: 256 })).addFields(
      { name: 'Owner', value: `${owner}`, inline: true }, { name: 'Members', value: `${g.memberCount}`, inline: true }, { name: 'Created', value: ts(g.createdAt), inline: true },
      { name: 'Channels', value: `${g.channels.cache.size}`, inline: true }, { name: 'Roles', value: `${g.roles.cache.size}`, inline: true }, { name: 'Boosts', value: `${g.premiumSubscriptionCount || 0} (tier ${g.premiumTier})`, inline: true },
      { name: 'ID', value: g.id })] });
  } },
  { name: 'role', desc: 'Info about a role', opts: [['role', 'role', 'Role', true]], run: (i) => {
    const r = i.options.getRole('role');
    return i.reply({ embeds: [base().setColor(r.color || 0x99aab5).setTitle(r.name).addFields({ name: 'ID', value: r.id, inline: true }, { name: 'Color', value: r.hexColor, inline: true }, { name: 'Members', value: `${r.members.size}`, inline: true }, { name: 'Position', value: `${r.position}`, inline: true }, { name: 'Hoisted', value: r.hoist ? 'Yes' : 'No', inline: true }, { name: 'Mentionable', value: r.mentionable ? 'Yes' : 'No', inline: true }, { name: 'Created', value: ts(r.createdAt) })] });
  } },
  { name: 'channel', desc: 'Info about a channel', opts: [['channel', 'channel', 'Channel (default: here)']], run: (i) => {
    const c = i.options.getChannel('channel') || i.channel;
    return i.reply({ embeds: [base().setTitle(`#${c.name}`).addFields({ name: 'ID', value: c.id, inline: true }, { name: 'Type', value: ChannelType[c.type], inline: true }, { name: 'Created', value: ts(c.createdAt), inline: true }, { name: 'Topic', value: c.topic || 'None' })] });
  } },
  { name: 'avatar', desc: 'Show an avatar', opts: [U], run: (i) => { const u = userOf(i); return i.reply({ embeds: [base().setTitle(u.username).setImage(u.displayAvatarURL({ size: 1024 }))] }); } },
  { name: 'banner', desc: 'Show a profile banner', opts: [U], run: async (i) => {
    const u = await userOf(i).fetch(true), url = u.bannerURL({ size: 1024 });
    if (!url) return fail(i, 'That user has no banner.');
    return i.reply({ embeds: [base().setTitle(u.username).setImage(url)] });
  } },
  { name: 'servericon', desc: 'Show the server icon', run: (i) => i.guild.iconURL() ? i.reply({ embeds: [base().setTitle(i.guild.name).setImage(i.guild.iconURL({ size: 1024 }))] }) : fail(i, 'This server has no icon.') },
  { name: 'bot', desc: 'Bot stats', run: (i) => i.reply({ embeds: [base().setTitle('Bot stats').addFields(
    { name: 'Servers', value: `${i.client.guilds.cache.size}`, inline: true }, { name: 'Uptime', value: fmtDuration(i.client.uptime), inline: true },
    { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1048576).toFixed(1)} MB`, inline: true }, { name: 'Node', value: process.version, inline: true }, { name: 'discord.js', value: djsVersion, inline: true })] }) },
  { name: 'membercount', desc: 'Member breakdown', run: async (i) => {
    const all = await i.guild.members.fetch();
    const bots = all.filter((m) => m.user.bot).size;
    return i.reply({ embeds: [base().setTitle('Members').addFields({ name: 'Total', value: `${all.size}`, inline: true }, { name: 'Humans', value: `${all.size - bots}`, inline: true }, { name: 'Bots', value: `${bots}`, inline: true })] });
  } },
  { name: 'boosts', desc: 'Boost status', run: (i) => i.reply({ embeds: [base(`💎 **${i.guild.premiumSubscriptionCount || 0}** boosts • Tier **${i.guild.premiumTier}**`)] }) },
  { name: 'emojis', desc: 'List server emojis', run: (i) => {
    const list = i.guild.emojis.cache.map((e) => `${e}`).join(' ');
    return i.reply({ embeds: [base(list.slice(0, 4000) || 'No custom emojis.').setTitle(`Emojis (${i.guild.emojis.cache.size})`)] });
  } },
  { name: 'roles', desc: 'List server roles', run: (i) => {
    const list = i.guild.roles.cache.filter((r) => r.id !== i.guild.id).sort((a, b) => b.position - a.position).map((r) => `${r}`).join(' ');
    return i.reply({ embeds: [base(list.slice(0, 4000) || 'No roles.').setTitle(`Roles (${i.guild.roles.cache.size - 1})`)] });
  } },
  { name: 'channels', desc: 'Channel counts', run: (i) => {
    const c = i.guild.channels.cache, n = (t) => c.filter((x) => x.type === t).size;
    return i.reply({ embeds: [base().setTitle('Channels').addFields({ name: 'Text', value: `${n(ChannelType.GuildText)}`, inline: true }, { name: 'Voice', value: `${n(ChannelType.GuildVoice)}`, inline: true }, { name: 'Categories', value: `${n(ChannelType.GuildCategory)}`, inline: true })] });
  } },
  { name: 'id', desc: 'When was this ID created?', opts: [['id', 'string', 'Discord ID', true]], run: (i) => {
    try { return i.reply({ embeds: [base(`Created ${ts(SnowflakeUtil.timestampFrom(i.options.getString('id')), 'F')} (${ts(SnowflakeUtil.timestampFrom(i.options.getString('id')))})`)], flags: E }); }
    catch { return fail(i, 'Invalid ID.'); }
  } },
  { name: 'permissions', desc: 'List a member permissions', opts: [U], run: async (i) => {
    const m = await i.guild.members.fetch(userOf(i).id).catch(() => null);
    if (!m) return fail(i, 'Member not found.');
    return i.reply({ embeds: [base(m.permissions.toArray().map((p) => `\`${p}\``).join(' ').slice(0, 4000)).setTitle(`${m.user.username} permissions`)], flags: E });
  } },
  { name: 'joined', desc: 'Join position of a member', opts: [U], run: async (i) => {
    const all = await i.guild.members.fetch(), u = userOf(i);
    const sorted = [...all.values()].sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    const pos = sorted.findIndex((m) => m.id === u.id) + 1;
    return i.reply({ embeds: [base(`${u} was member **#${pos}** and joined ${ts(sorted[pos - 1].joinedAt, 'F')}.`)] });
  } },
  { name: 'bots', desc: 'List bots in the server', run: async (i) => {
    const all = await i.guild.members.fetch();
    return i.reply({ embeds: [base(all.filter((m) => m.user.bot).map((m) => `${m}`).join(' ').slice(0, 4000) || 'No bots.').setTitle('Bots')] });
  } },
];

module.exports = group('info', 'Server and user info', subs);
