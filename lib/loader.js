const fs = require('fs');
const path = require('path');

module.exports = () => {
  const dir = path.join(__dirname, '..', 'commands');
  const commands = new Map();
  const handlers = new Map();
  let total = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const c = require(path.join(dir, f));
    commands.set(c.data.name, c);
    if (c.handle) handlers.set(c.data.name, c.handle); // customId prefix = command name
    total += c.count || 1;
  }
  return { commands, handlers, total };
};
