const { PermissionFlagsBits: P, ChannelType } = require('discord.js');
const { group } = require('../lib/group');
const { base, ok, err } = require('../lib/embeds');
const db = require('../lib/db');
const { E, parseDuration, ts } = require('../lib/util');

const fail = (i, t) => i.reply({ embeds: [err(t)], flags: E });
const done = (i, t) => i.reply({ embeds: [ok(t)] });
const getMember = (i, n = 'user') => i.guild.members.fetch(i.options.getUser(n).id).catch(() => null);
const above = (i, m) => i.guild.ownerId === i.user.id || i.member.roles.highest.position > m.roles.highest.position;
const reasonOf = (i) => i.options.getString('reason') || 'No reason provided';
const chOf = (i) => i.options.getChannel('channel') || i.channel;
const R = ['reason', 'string', 'Reason', false, { maxLength: 400 }];
const U = (d = 'Member') => ['user', 'user', d, true];
const CH = ['channel', 'channel', 'Channel (default: current)', false, { types: [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice] }];

async function modlog(i, action, user, reason, extra = []) {
  const id = db.guild(i.guild.id).settings.modLog;
  const ch = id && (await i.guild.channels.fetch(id).catch(() => null));
  if (!ch) return;
  ch.send({ embeds: [base().setTitle(action).addFields({ name: 'User', value: `${user} (${user.id})`, inline: true }, { name: 'Moderator', value: `${i.user}`, inline: true }, { name: 'Reason', value: reason || 'No reason provided' }, ...extra)] }).catch(() => {});
}

const dm = (u, text) => u.send({ embeds: [base(text)] }).catch(() => {});

const subs = [
  { name: 'ban', desc: 'Ban a member', perm: P.BanMembers, opts: [U(), R, ['delete_days', 'integer', 'Days of messages to delete (0-7)', false, { min: 0, max: 7 }]],
    run: async (i) => {
      const u = i.options.getUser('user'), reason = reasonOf(i), m = await getMember(i);
      if (m) {
        if (!m.bannable) return fail(i, 'I cannot ban that member.');
        if (!above(i, m)) return fail(i, 'Their role is equal to or higher than yours.');
        await dm(u, `You were banned from **${i.guild.name}**.\nReason: ${reason}`);
      }
      await i.guild.members.ban(u, { reason: `${i.user.tag}: ${reason}`, deleteMessageSeconds: (i.options.getInteger('delete_days') || 0) * 86400 });
      await done(i, `Banned **${u.username}**. Reason: ${reason}`);
      modlog(i, 'Member banned', u, reason);
    } },
  { name: 'unban', desc: 'Unban a user by ID', perm: P.BanMembers, opts: [['user_id', 'string', 'User ID', true], R],
    run: async (i) => {
      const id = i.options.getString('user_id');
      const banned = await i.guild.bans.fetch(id).catch(() => null);
      if (!banned) return fail(i, 'That user is not banned.');
      await i.guild.members.unban(id, reasonOf(i));
      await done(i, `Unbanned <@${id}>.`);
    } },
  { name: 'kick', desc: 'Kick a member', perm: P.KickMembers, opts: [U(), R],
    run: async (i) => {
      const m = await getMember(i), reason = reasonOf(i);
      if (!m) return fail(i, 'Member not found.');
      if (!m.kickable) return fail(i, 'I cannot kick that member.');
      if (!above(i, m)) return fail(i, 'Their role is equal to or higher than yours.');
      await dm(m.user, `You were kicked from **${i.guild.name}**.\nReason: ${reason}`);
      await m.kick(`${i.user.tag}: ${reason}`);
      await done(i, `Kicked **${m.user.username}**. Reason: ${reason}`);
      modlog(i, 'Member kicked', m.user, reason);
    } },
  { name: 'softban', desc: 'Ban then unban to wipe recent messages', perm: P.BanMembers, opts: [U(), R],
    run: async (i) => {
      const m = await getMember(i), reason = reasonOf(i);
      if (!m || !m.bannable || !above(i, m)) return fail(i, 'I cannot softban that member.');
      await i.guild.members.ban(m, { reason: `Softban by ${i.user.tag}: ${reason}`, deleteMessageSeconds: 604800 });
      await i.guild.members.unban(m.id, 'Softban');
      await done(i, `Softbanned **${m.user.username}**.`);
      modlog(i, 'Member softbanned', m.user, reason);
    } },
  { name: 'timeout', desc: 'Timeout a member', perm: P.ModerateMembers, opts: [U(), ['duration', 'string', 'e.g. 10m, 2h, 1d (max 28d)', true], R],
    run: async (i) => {
      const m = await getMember(i), ms = parseDuration(i.options.getString('duration')), reason = reasonOf(i);
      if (!m || !m.moderatable || !above(i, m)) return fail(i, 'I cannot timeout that member.');
      if (!ms || ms > 28 * 864e5) return fail(i, 'Use a duration like 10m, 2h or 1d (max 28d).');
      await m.timeout(ms, `${i.user.tag}: ${reason}`);
      await dm(m.user, `You were timed out in **${i.guild.name}** until ${ts(Date.now() + ms, 'F')}.\nReason: ${reason}`);
      await done(i, `Timed out **${m.user.username}** until ${ts(Date.now() + ms, 'R')}.`);
      modlog(i, 'Member timed out', m.user, reason, [{ name: 'Until', value: ts(Date.now() + ms, 'F') }]);
    } },
  { name: 'untimeout', desc: 'Remove a timeout', perm: P.ModerateMembers, opts: [U()],
    run: async (i) => {
      const m = await getMember(i);
      if (!m || !m.moderatable) return fail(i, 'I cannot change that member.');
      await m.timeout(null);
      await done(i, `Timeout removed for **${m.user.username}**.`);
    } },
  { name: 'warn', desc: 'Warn a member', perm: P.ModerateMembers, opts: [U(), ['reason', 'string', 'Reason', true, { maxLength: 400 }]],
    run: async (i) => {
      const u = i.options.getUser('user'), g = db.guild(i.guild.id), reason = reasonOf(i);
      const w = { id: Date.now().toString(36), reason, mod: i.user.id, at: Date.now() };
      (g.warns[u.id] ??= []).push(w); db.save();
      await dm(u, `You were warned in **${i.guild.name}**.\nReason: ${reason}`);
      await done(i, `Warned **${u.username}** (warning #${g.warns[u.id].length}, id \`${w.id}\`).`);
      modlog(i, 'Member warned', u, reason);
    } },
  { name: 'warnings', desc: 'View warnings for a member', perm: P.ModerateMembers, opts: [U()],
    run: (i) => {
      const u = i.options.getUser('user'), list = db.guild(i.guild.id).warns[u.id] || [];
      const text = list.length ? list.map((w, n) => `**${n + 1}.** \`${w.id}\` ${w.reason} — <@${w.mod}> ${ts(w.at)}`).join('\n').slice(0, 4000) : 'No warnings.';
      return i.reply({ embeds: [base(text).setTitle(`Warnings for ${u.username} (${list.length})`)], flags: E });
    } },
  { name: 'delwarn', desc: 'Delete one warning by ID', perm: P.ModerateMembers, opts: [U(), ['warn_id', 'string', 'Warning ID', true]],
    run: (i) => {
      const u = i.options.getUser('user'), g = db.guild(i.guild.id), list = g.warns[u.id] || [], id = i.options.getString('warn_id');
      const idx = list.findIndex((w) => w.id === id);
      if (idx < 0) return fail(i, 'Warning not found.');
      list.splice(idx, 1); db.save();
      return done(i, 'Warning deleted.');
    } },
  { name: 'clearwarns', desc: 'Clear all warnings for a member', perm: P.ModerateMembers, opts: [U()],
    run: (i) => {
      const u = i.options.getUser('user');
      delete db.guild(i.guild.id).warns[u.id]; db.save();
      return done(i, `Cleared warnings for **${u.username}**.`);
    } },
  { name: 'purge', desc: 'Delete recent messages', perm: P.ManageMessages, opts: [['amount', 'integer', 'How many (1-100)', true, { min: 1, max: 100 }]],
    run: async (i) => {
      await i.deferReply({ flags: E });
      const d = await i.channel.bulkDelete(i.options.getInteger('amount'), true);
      await i.editReply({ embeds: [ok(`Deleted ${d.size} messages (messages older than 14 days cannot be bulk deleted).`)] });
    } },
  { name: 'purgeuser', desc: 'Delete recent messages from one member', perm: P.ManageMessages, opts: [U(), ['amount', 'integer', 'How many (1-100)', true, { min: 1, max: 100 }]],
    run: async (i) => {
      await i.deferReply({ flags: E });
      const u = i.options.getUser('user');
      const msgs = (await i.channel.messages.fetch({ limit: 100 })).filter((m) => m.author.id === u.id).first(i.options.getInteger('amount'));
      const d = await i.channel.bulkDelete(msgs, true);
      await i.editReply({ embeds: [ok(`Deleted ${d.size} messages from ${u}.`)] });
    } },
  { name: 'slowmode', desc: 'Set slowmode', perm: P.ManageChannels, opts: [['seconds', 'integer', '0 to turn off (max 21600)', true, { min: 0, max: 21600 }], CH],
    run: async (i) => {
      const s = i.options.getInteger('seconds');
      await chOf(i).setRateLimitPerUser(s);
      await done(i, s ? `Slowmode set to ${s}s.` : 'Slowmode turned off.');
    } },
  { name: 'lock', desc: 'Lock a channel', perm: P.ManageChannels, opts: [CH, R],
    run: async (i) => {
      const ch = chOf(i);
      await ch.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
      await i.reply({ embeds: [base(`🔒 ${ch} is locked.\n${reasonOf(i)}`)] });
    } },
  { name: 'unlock', desc: 'Unlock a channel', perm: P.ManageChannels, opts: [CH],
    run: async (i) => {
      const ch = chOf(i);
      await ch.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
      await i.reply({ embeds: [base(`🔓 ${ch} is unlocked.`)] });
    } },
  { name: 'hide', desc: 'Hide a channel from everyone', perm: P.ManageChannels, opts: [CH],
    run: async (i) => { await chOf(i).permissionOverwrites.edit(i.guild.roles.everyone, { ViewChannel: false }); await done(i, 'Channel hidden.'); } },
  { name: 'unhide', desc: 'Unhide a channel', perm: P.ManageChannels, opts: [CH],
    run: async (i) => { await chOf(i).permissionOverwrites.edit(i.guild.roles.everyone, { ViewChannel: null }); await done(i, 'Channel visible again.'); } },
  { name: 'nick', desc: 'Change a member nickname', perm: P.ManageNicknames, opts: [U(), ['nickname', 'string', 'New nickname', true, { maxLength: 32 }]],
    run: async (i) => {
      const m = await getMember(i);
      if (!m || !m.manageable || !above(i, m)) return fail(i, 'I cannot change that nickname.');
      await m.setNickname(i.options.getString('nickname'));
      await done(i, 'Nickname changed.');
    } },
  { name: 'resetnick', desc: 'Reset a member nickname', perm: P.ManageNicknames, opts: [U()],
    run: async (i) => {
      const m = await getMember(i);
      if (!m || !m.manageable) return fail(i, 'I cannot change that nickname.');
      await m.setNickname(null);
      await done(i, 'Nickname reset.');
    } },
  { name: 'vckick', desc: 'Disconnect a member from voice', perm: P.MoveMembers, opts: [U()],
    run: async (i) => {
      const m = await getMember(i);
      if (!m?.voice.channel) return fail(i, 'That member is not in voice.');
      await m.voice.disconnect();
      await done(i, 'Disconnected from voice.');
    } },
  { name: 'vcmute', desc: 'Server mute a member in voice', perm: P.MuteMembers, opts: [U()],
    run: async (i) => {
      const m = await getMember(i);
      if (!m?.voice.channel) return fail(i, 'That member is not in voice.');
      await m.voice.setMute(true);
      await done(i, 'Member muted in voice.');
    } },
  { name: 'vcunmute', desc: 'Remove a voice mute', perm: P.MuteMembers, opts: [U()],
    run: async (i) => {
      const m = await getMember(i);
      if (!m?.voice.channel) return fail(i, 'That member is not in voice.');
      await m.voice.setMute(false);
      await done(i, 'Member unmuted in voice.');
    } },
  { name: 'banlist', desc: 'Show recent bans', perm: P.BanMembers,
    run: async (i) => {
      const bans = await i.guild.bans.fetch({ limit: 25 });
      const text = bans.size ? bans.map((b) => `**${b.user.username}** (${b.user.id}) — ${b.reason || 'no reason'}`).join('\n').slice(0, 4000) : 'No bans.';
      return i.reply({ embeds: [base(text).setTitle('Recent bans')], flags: E });
    } },
  { name: 'nuke', desc: 'Clone and delete a channel to wipe it', perm: P.ManageChannels, opts: [CH],
    run: async (i) => {
      const ch = chOf(i);
      await i.reply({ embeds: [ok('Nuking channel...')], flags: E });
      const n = await ch.clone({ position: ch.position });
      await ch.delete();
      await n.send({ embeds: [base('💥 Channel nuked.')] });
    } },
];

module.exports = group('mod', 'Moderation tools', subs);
