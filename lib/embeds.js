const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const base = (desc) => {
  const e = new EmbedBuilder().setColor(config.colors.primary).setFooter({ text: config.footer }).setTimestamp();
  if (desc) e.setDescription(desc);
  return e;
};
const ok = (t) => base(`✅ ${t}`).setColor(config.colors.success);
const err = (t) => base(`❌ ${t}`).setColor(config.colors.error);
const info = (t) => base(t).setColor(config.colors.info);

module.exports = { base, ok, err, info };
