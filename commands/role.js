const { PermissionFlagsBits: P } = require('discord.js');
const { group } = require('../lib/group');
const { base, ok, err } = require('../lib/embeds');
const { E, parseColor } = require('../lib/util');

const fail = (i, t) => i.reply({ embeds: [err(t)], flags: E });
const R = ['role', 'role', 'Role', true];
const canManage = (i, r) => r.id !== i.guild.id && !r.managed && r.position < i.guild.members.me.roles.highest.position && (i.guild.ownerId === i.user.id || r.position < i.member.roles.highest.position);

const subs = [
  { name: 'add', desc: 'Give a role to a member', opts: [['user', 'user', 'Member', true], R], run: async (i) => {
    const r = i.options.getRole('role'), m = await i.guild.members.fetch(i.options.getUser('user').id).catch(() => null);
    if (!m) return fail(i, 'Member not found.');
    if (!canManage(i, r)) return fail(i, 'I cannot manage that role (it is above you or me, or managed).');
    await m.roles.add(r);
    return i.reply({ embeds: [ok(`Gave ${r} to ${m}.`)] });
  } },
  { name: 'remove', desc: 'Take a role from a member', opts: [['user', 'user', 'Member', true], R], run: async (i) => {
    const r = i.options.getRole('role'), m = await i.guild.members.fetch(i.options.getUser('user').id).catch(() => null);
    if (!m) return fail(i, 'Member not found.');
    if (!canManage(i, r)) return fail(i, 'I cannot manage that role (it is above you or me, or managed).');
    await m.roles.remove(r);
    return i.reply({ embeds: [ok(`Removed ${r} from ${m}.`)] });
  } },
  { name: 'create', desc: 'Create a role', opts: [['name', 'string', 'Name', true, { maxLength: 100 }], ['color', 'string', 'Hex or color name'], ['hoist', 'boolean', 'Show separately in the member list']], run: async (i) => {
    const r = await i.guild.roles.create({ name: i.options.getString('name'), color: parseColor(i.options.getString('color'), 0x99aab5), hoist: !!i.options.getBoolean('hoist') });
    return i.reply({ embeds: [ok(`Created ${r}.`)] });
  } },
  { name: 'delete', desc: 'Delete a role', opts: [R], run: async (i) => {
    const r = i.options.getRole('role');
    if (!canManage(i, r)) return fail(i, 'I cannot delete that role.');
    await r.delete();
    return i.reply({ embeds: [ok(`Deleted **${r.name}**.`)] });
  } },
  { name: 'rename', desc: 'Rename a role', opts: [R, ['name', 'string', 'New name', true, { maxLength: 100 }]], run: async (i) => {
    const r = i.options.getRole('role');
    if (!canManage(i, r)) return fail(i, 'I cannot edit that role.');
    await r.setName(i.options.getString('name'));
    return i.reply({ embeds: [ok('Role renamed.')] });
  } },
  { name: 'color', desc: 'Change a role color', opts: [R, ['color', 'string', 'Hex or color name', true]], run: async (i) => {
    const r = i.options.getRole('role'), c = parseColor(i.options.getString('color'), null);
    if (!canManage(i, r)) return fail(i, 'I cannot edit that role.');
    if (c === null) return fail(i, 'Invalid color.');
    await r.setColor(c);
    return i.reply({ embeds: [ok('Role color updated.')] });
  } },
  { name: 'members', desc: 'List members with a role', opts: [R], run: async (i) => {
    await i.guild.members.fetch();
    const r = i.guild.roles.cache.get(i.options.getRole('role').id);
    return i.reply({ embeds: [base(r.members.map((m) => `${m}`).join(' ').slice(0, 4000) || 'Nobody has this role.').setTitle(`${r.name} (${r.members.size})`)], flags: E });
  } },
];

module.exports = group('role', 'Role management', subs, { perm: P.ManageRoles });
