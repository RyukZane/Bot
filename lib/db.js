const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'db.json');
fs.mkdirSync(path.dirname(FILE), { recursive: true });

let data = {};
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}

let timer;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => fs.writeFileSync(FILE, JSON.stringify(data, null, 2)), 250);
}

function guild(id) {
  const g = (data[id] ??= {});
  g.settings ??= {};
  g.tickets ??= {};
  g.warns ??= {};
  g.embeds ??= {};
  g.afk ??= {};
  g.counter ??= 0;
  g.closedCount ??= 0;
  return g;
}

module.exports = { guild, save };
