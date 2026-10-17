const { SlashCommandBuilder, InteractionContextType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { base, err } = require('../lib/embeds');
const { E } = require('../lib/util');

// Java Edition status via the free mcsrvstat.us API. Works for ip or ip:port.
async function fetchStatus(ip) {
  const r = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`, { headers: { 'User-Agent': `${config.serverName}-bot` } });
  return r.json();
}

const refreshRow = (ip) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`mcstatus:refresh:${ip}`.slice(0, 100)).setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('mcstatus:copy').setLabel('Show IP').setEmoji('📋').setStyle(ButtonStyle.Primary),
);

async function buildStatus(ip) {
  let d;
  try { d = await fetchStatus(ip); } catch { return { embeds: [err('Could not reach the status API. Try again in a moment.')] }; }

  if (!d.online) {
    return { embeds: [base().setTitle(`🔴 ${config.serverName} is offline`).setDescription(`\`${ip}\``).addFields({ name: 'Edition', value: 'Java', inline: true }).setThumbnail(`https://api.mcsrvstat.us/icon/${encodeURIComponent(ip)}`)], components: [refreshRow(ip)] };
  }

  const online = d.players?.online ?? 0, max = d.players?.max ?? 0;
  const pct = max ? Math.round((online / max) * 10) : 0;
  const bar = `${'█'.repeat(pct)}${'░'.repeat(10 - pct)}`;
  const names = (d.players?.list || []).map((p) => p.name);
  const e = base()
    .setTitle(`🟢 ${config.serverName} is online`)
    .setThumbnail(`https://api.mcsrvstat.us/icon/${encodeURIComponent(ip)}`)
    .addFields(
      { name: 'IP', value: `\`${ip}\``, inline: true },
      { name: 'Edition', value: 'Java', inline: true },
      { name: 'Version', value: `${d.version || 'Unknown'}`, inline: true },
      { name: 'Players', value: `**${online}/${max}**\n${bar}`, inline: true },
      ...(d.software ? [{ name: 'Software', value: d.software, inline: true }] : []),
      ...(d.protocol?.name ? [{ name: 'Protocol', value: `${d.protocol.name}`, inline: true }] : []),
    );
  if (d.motd?.clean?.length) e.addFields({ name: 'MOTD', value: d.motd.clean.join('\n').slice(0, 1000) });
  if (names.length) e.addFields({ name: `Online (${names.length})`, value: names.join(', ').slice(0, 1000) });
  e.setFooter({ text: `${config.footer} • Updated` });
  return { embeds: [e], components: [refreshRow(ip)] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mcstatus')
    .setDescription(`Live Minecraft Java server status`)
    .setContexts(InteractionContextType.Guild)
    .addStringOption((o) => o.setName('ip').setDescription(`Server IP (default: ${config.serverName})`).setRequired(false).setMaxLength(100)),

  async execute(i) {
    await i.deferReply();
    const ip = (i.options.getString('ip') || config.serverIp).trim().toLowerCase();
    await i.editReply(await buildStatus(ip));
  },

  async handle(i) {
    if (!i.isButton()) return;
    const [, action, ...rest] = i.customId.split(':');
    if (action === 'copy') return i.reply({ content: config.serverIp, flags: E });
    if (action === 'refresh') {
      await i.deferUpdate();
      return i.editReply(await buildStatus(rest.join(':')));
    }
  },
};
