// Builds one top-level slash command with up to 25 subcommands.
// Discord allows 100 top-level commands but 25 subcommands each,
// so grouping is how a bot reaches 150+ commands.
const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { err } = require('./embeds');
const { E } = require('./util');

const TYPES = {
  string: 'addStringOption', user: 'addUserOption', channel: 'addChannelOption', role: 'addRoleOption',
  integer: 'addIntegerOption', number: 'addNumberOption', boolean: 'addBooleanOption', attachment: 'addAttachmentOption',
};

// option descriptor: [name, type, description, required?, { choices, min, max, maxLength, types }]
function addOpt(sc, [name, type, desc, req = false, extra = {}]) {
  sc[TYPES[type]]((o) => {
    o.setName(name).setDescription(desc).setRequired(!!req);
    if (extra.choices) o.addChoices(...extra.choices.map((c) => (typeof c === 'string' ? { name: c, value: c } : c)));
    if (extra.min !== undefined && o.setMinValue) o.setMinValue(extra.min);
    if (extra.max !== undefined && o.setMaxValue) o.setMaxValue(extra.max);
    if (extra.maxLength && o.setMaxLength) o.setMaxLength(extra.maxLength);
    if (extra.types && o.addChannelTypes) o.addChannelTypes(...extra.types);
    return o;
  });
}

function group(name, description, subs, { perm } = {}) {
  if (subs.length > 25) throw new Error(`/${name} has ${subs.length} subcommands (max 25)`);
  const data = new SlashCommandBuilder().setName(name).setDescription(description).setContexts(InteractionContextType.Guild);
  if (perm) data.setDefaultMemberPermissions(perm);
  const map = new Map();
  for (const s of subs) {
    data.addSubcommand((sc) => {
      sc.setName(s.name).setDescription(s.desc);
      [...(s.opts || [])].sort((a, b) => (b[3] ? 1 : 0) - (a[3] ? 1 : 0)).forEach((o) => addOpt(sc, o));
      return sc;
    });
    map.set(s.name, s);
  }
  return {
    data,
    count: subs.length,
    async execute(i) {
      const s = map.get(i.options.getSubcommand());
      if (s.perm && !i.memberPermissions.has(s.perm)) {
        return i.reply({ embeds: [err('You do not have permission to use this command.')], flags: E });
      }
      await s.run(i);
    },
  };
}

module.exports = { group };
