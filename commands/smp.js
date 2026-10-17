const { PermissionFlagsBits: P, ChannelType } = require('discord.js');
const config = require('../config');
const { group } = require('../lib/group');
const { base, err, ok } = require('../lib/embeds');
const { E } = require('../lib/util');

const apiStatus = async () => {
  const r = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(config.serverIp)}`);
  return r.json();
};

const link = (name, title, emoji) => ({
  name, desc: `${title} link`,
  run: (i) => {
    const url = config.links[name];
    return i.reply({ embeds: [base(url ? `${emoji} ${url}` : 'This link has not been set yet. Ask an admin to edit config.js.').setTitle(title)], ...(url ? {} : { flags: E }) });
  },
});

const subs = [
  { name: 'ip', desc: 'Server IP', run: (i) => i.reply({ embeds: [base(`\`${config.serverIp}\``).setTitle(`🌍 ${config.serverName} IP`)] }) },
  { name: 'status', desc: 'Live server status', run: async (i) => {
    await i.deferReply();
    try {
      const d = await apiStatus();
      if (!d.online) return i.editReply({ embeds: [err(`${config.serverName} is offline.`)] });
      return i.editReply({ embeds: [base().setTitle(`🟢 ${config.serverName} is online`).addFields(
        { name: 'Players', value: `${d.players?.online ?? 0}/${d.players?.max ?? '?'}`, inline: true },
        { name: 'Version', value: `${d.version || 'unknown'}`, inline: true },
        { name: 'IP', value: `\`${config.serverIp}\``, inline: true },
        { name: 'MOTD', value: (d.motd?.clean || []).join('\n') || '-' })] });
    } catch { return i.editReply({ embeds: [err('Could not reach the status API.')] }); }
  } },
  { name: 'players', desc: 'Who is online', run: async (i) => {
    await i.deferReply();
    try {
      const d = await apiStatus();
      const list = (d.players?.list || []).map((p) => p.name).join(', ');
      return i.editReply({ embeds: [base(list || (d.online ? 'Player list is hidden or nobody is online.' : 'Server is offline.')).setTitle(`Players (${d.players?.online ?? 0})`)] });
    } catch { return i.editReply({ embeds: [err('Could not reach the status API.')] }); }
  } },
  { name: 'rules', desc: 'Server rules', run: (i) => i.reply({ embeds: [base(config.rules.map((r, n) => `**${n + 1}.** ${r}`).join('\n\n')).setTitle(`📜 ${config.serverName} Rules`)] }) },
  link('discord', 'Discord', '💬'), link('store', 'Store', '🛒'), link('vote', 'Vote', '🗳️'),
  link('wiki', 'Wiki', '📖'), link('map', 'Live map', '🗺️'), link('apply', 'Staff application', '📝'),
  { name: 'restart', desc: 'Announce a server restart', perm: P.ManageGuild,
    opts: [['minutes', 'integer', 'Minutes until restart', true, { min: 1, max: 120 }], ['channel', 'channel', 'Channel (default: here)', false, { types: [ChannelType.GuildText, ChannelType.GuildAnnouncement] }]],
    run: async (i) => {
      const ch = i.options.getChannel('channel') || i.channel;
      await ch.send({ embeds: [base(`The server restarts in **${i.options.getInteger('minutes')} minutes**. Finish what you are doing and log off safely.`).setTitle('🔄 Restart incoming')] });
      return i.reply({ embeds: [ok('Announced.')], flags: E });
    } },
  { name: 'whitelist', desc: 'How to get whitelisted', run: (i) => i.reply({ embeds: [base(`Open the whitelist channel and follow the steps there, or open a ticket from the support panel.`).setTitle('📋 Whitelist')] }) },
];

module.exports = group('smp', `${config.serverName} server tools`, subs);
