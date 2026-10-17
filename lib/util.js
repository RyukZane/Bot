const { MessageFlags } = require('discord.js');

const COLORS = { red: 0xe11d2e, green: 0x22c55e, blue: 0x3b82f6, yellow: 0xf59e0b, purple: 0x8b5cf6, pink: 0xec4899, orange: 0xf97316, black: 0x111111, white: 0xffffff, cyan: 0x06b6d4 };

const E = MessageFlags.Ephemeral;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ts = (d, f = 'R') => `<t:${Math.floor(new Date(d).getTime() / 1000)}:${f}>`;

function parseColor(s, fallback) {
  if (!s) return fallback;
  s = String(s).trim().toLowerCase();
  if (COLORS[s] !== undefined) return COLORS[s];
  const h = s.replace('#', '');
  return /^[0-9a-f]{6}$/.test(h) ? parseInt(h, 16) : fallback;
}

// supports {server} {members} and literal \n
function fill(t, guild) {
  return String(t).replace(/\\n/g, '\n').replace(/{server}/gi, guild.name).replace(/{members}/gi, guild.memberCount);
}

function parseDuration(s) {
  const m = /^(\d+)\s*(s|m|h|d|w)$/i.exec(String(s).trim());
  if (!m) return null;
  return Number(m[1]) * { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 }[m[2].toLowerCase()];
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m ${s % 60}s`;
}

module.exports = { E, pick, ts, parseColor, fill, parseDuration, fmtDuration, COLORS };
