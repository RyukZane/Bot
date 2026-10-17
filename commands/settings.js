const { PermissionFlagsBits: P, ChannelType } = require('discord.js');
const db = require('../lib/db');
const { group } = require('../lib/group');
const { base, ok } = require('../lib/embeds');
const { E } = require('../lib/util');

const TXT = { types: [ChannelType.GuildText, ChannelType.GuildAnnouncement] };
const set = (i, patch) => { Object.assign(db.guild(i.guild.id).settings, patch); db.save(); return i.reply({ embeds: [ok('Saved.')], flags: E }); };

const subs = [
  { name: 'welcome', desc: 'Set the welcome channel and message', opts: [['channel', 'channel', 'Welcome channel', true, TXT], ['message', 'string', 'Use {user} {username} {server} {members}', false, { maxLength: 1000 }]],
    run: (i) => set(i, { welcomeChannel: i.options.getChannel('channel').id, welcomeMessage: i.options.getString('message') || undefined }) },
  { name: 'leave', desc: 'Set the leave channel and message', opts: [['channel', 'channel', 'Leave channel', true, TXT], ['message', 'string', 'Use {username} {server} {members}', false, { maxLength: 1000 }]],
    run: (i) => set(i, { leaveChannel: i.options.getChannel('channel').id, leaveMessage: i.options.getString('message') || undefined }) },
  { name: 'autorole', desc: 'Role given to new members (leave empty to turn off)', opts: [['role', 'role', 'Role']],
    run: (i) => set(i, { autorole: i.options.getRole('role')?.id }) },
  { name: 'modlog', desc: 'Channel for moderation logs', opts: [['channel', 'channel', 'Log channel', true, TXT]], run: (i) => set(i, { modLog: i.options.getChannel('channel').id }) },
  { name: 'suggestions', desc: 'Channel for /utility suggest', opts: [['channel', 'channel', 'Suggestion channel', true, TXT]], run: (i) => set(i, { suggestChannel: i.options.getChannel('channel').id }) },
  { name: 'view', desc: 'Show current settings', run: (i) => {
    const s = db.guild(i.guild.id).settings, c = (id) => (id ? `<#${id}>` : 'Not set'), r = (id) => (id ? `<@&${id}>` : 'Not set');
    return i.reply({ embeds: [base().setTitle('Settings').addFields(
      { name: 'Welcome', value: c(s.welcomeChannel), inline: true }, { name: 'Leave', value: c(s.leaveChannel), inline: true }, { name: 'Autorole', value: r(s.autorole), inline: true },
      { name: 'Mod log', value: c(s.modLog), inline: true }, { name: 'Suggestions', value: c(s.suggestChannel), inline: true },
      { name: 'Ticket category', value: s.category ? `<#${s.category}>` : 'Not set', inline: true }, { name: 'Ticket staff role', value: r(s.staffRole), inline: true }, { name: 'Ticket logs', value: c(s.logChannel), inline: true })], flags: E });
  } },
  { name: 'reset', desc: 'Reset welcome, leave, autorole, modlog and suggestions', run: (i) =>
    set(i, { welcomeChannel: undefined, welcomeMessage: undefined, leaveChannel: undefined, leaveMessage: undefined, autorole: undefined, modLog: undefined, suggestChannel: undefined }) },
];

module.exports = group('settings', 'Bot settings', subs, { perm: P.ManageGuild });
