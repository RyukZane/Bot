const crypto = require('crypto');
const { group } = require('../lib/group');
const { base, err } = require('../lib/embeds');
const { E, pick } = require('../lib/util');

const T = ['text', 'string', 'Text', true, { maxLength: 500 }];
const rand = (n) => crypto.randomInt(n);
const hashNum = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 101, 7);

const BALL = ['It is certain.', 'Without a doubt.', 'Yes, definitely.', 'Most likely.', 'Signs point to yes.', 'Ask again later.', 'Cannot predict now.', 'Do not count on it.', 'My sources say no.', 'Very doubtful.'];
const JOKES = ['Why do Creepers never win arguments? They always blow up.', 'Why did the Enderman cross the road? He did not, he teleported.', 'What do you call a sleeping bull in Minecraft? A bulldozer... no wait, that is real life.', 'Why was the Zombie bad at poker? Everyone could see his rotten hand.', 'How does a Skeleton send mail? Through the bone-mail.'];
const FACTS = ['Honey can last thousands of years without spoiling.', 'Octopuses have three hearts.', 'Bananas are berries but strawberries are not.', 'A day on Venus is longer than its year.', 'Sharks are older than trees.'];
const MC = ['Creepers were created by accident when Notch mixed up a pig model.', 'Endermen get angry if you look at their eyes, not their face.', 'You can sleep through the night only if everyone is in bed.', 'A Minecraft day lasts exactly 20 real minutes.', 'Wolves can be calmed by giving them bones.', 'Axolotls play dead to heal when hurt.', 'Phantoms spawn when you have not slept for 3 days.'];
const WYR = ['Would you rather fight 100 zombies or 1 Ender Dragon?', 'Would you rather lose your best armor or your best pickaxe?', 'Would you rather live in the Nether or the End?', 'Would you rather always have Mining Fatigue or always have Slowness?', 'Would you rather build a house in 1 minute or a farm in 1 hour?'];
const TOPICS = ['What is your favorite biome?', 'What is the best way to spend your first night?', 'What is the dumbest way you have died?', 'What would your dream base look like?', 'What is your favorite mob and why?'];
const PICKUP = ['Are you a diamond? Because I would mine you all day.', 'Are you a Creeper? Because you just blew me away.', 'You must be an Ender Pearl, because I fell for you.'];
const FORTUNE = ['You will find diamonds at Y -59 today.', 'Beware of a Creeper behind you.', 'A great build awaits you.', 'Today is a good day to start a new world.', 'Someone will gift you an elytra.'];
const ROASTS = ['you build like a Creeper that never exploded.', 'your base is just a dirt hut with confidence.', 'you got lost in your own spawn.', 'you swing a sword like you are fishing.', 'your redstone has more bugs than the Nether has Piglins.'];
const COMPS = ['you are the MVP of this server.', 'your builds are insane.', 'you make this community better.', 'you are a legend.', 'everyone is glad you are here.'];
const MCN1 = ['Shadow', 'Blaze', 'Frost', 'Void', 'Crimson', 'Storm', 'Ender', 'Iron', 'Ghost', 'Dark'];
const MCN2 = ['Wolf', 'Miner', 'Slayer', 'Knight', 'Hunter', 'Reaper', 'Dragon', 'Raider', 'Smith', 'Walker'];

const say = (f) => (i) => i.reply({ embeds: [base(f(i))] });
const subs = [
  { name: '8ball', desc: 'Ask the magic 8ball', opts: [['question', 'string', 'Your question', true]], run: say((i) => `🎱 **${i.options.getString('question')}**\n${pick(BALL)}`) },
  { name: 'coinflip', desc: 'Flip a coin', run: say(() => `🪙 **${rand(2) ? 'Heads' : 'Tails'}**`) },
  { name: 'dice', desc: 'Roll dice', opts: [['sides', 'integer', 'Sides (default 6)', false, { min: 2, max: 1000 }], ['count', 'integer', 'How many (default 1)', false, { min: 1, max: 20 }]],
    run: say((i) => { const s = i.options.getInteger('sides') || 6, c = i.options.getInteger('count') || 1, r = Array.from({ length: c }, () => rand(s) + 1); return `🎲 ${r.join(', ')}${c > 1 ? ` (total ${r.reduce((a, b) => a + b)})` : ''}`; }) },
  { name: 'rps', desc: 'Rock paper scissors', opts: [['choice', 'string', 'Your pick', true, { choices: ['rock', 'paper', 'scissors'] }]],
    run: say((i) => { const u = i.options.getString('choice'), b = pick(['rock', 'paper', 'scissors']); const win = { rock: 'scissors', paper: 'rock', scissors: 'paper' }; return `You: **${u}** • Me: **${b}**\n${u === b ? 'Tie!' : win[u] === b ? 'You win!' : 'I win!'}`; }) },
  { name: 'joke', desc: 'Tell a joke', run: say(() => `😂 ${pick(JOKES)}`) },
  { name: 'fact', desc: 'Random fact', run: say(() => `🧠 ${pick(FACTS)}`) },
  { name: 'mcfact', desc: 'Random Minecraft fact', run: say(() => `⛏️ ${pick(MC)}`) },
  { name: 'choose', desc: 'Pick between options', opts: [['options', 'string', 'Options separated by |', true]],
    run: (i) => { const o = i.options.getString('options').split('|').map((x) => x.trim()).filter(Boolean); return o.length < 2 ? i.reply({ embeds: [err('Give at least 2 options separated by |')], flags: E }) : i.reply({ embeds: [base(`I choose **${pick(o)}**`)] }); } },
  { name: 'reverse', desc: 'Reverse text', opts: [T], run: say((i) => [...i.options.getString('text')].reverse().join('')) },
  { name: 'mock', desc: 'mOcK tExT', opts: [T], run: say((i) => [...i.options.getString('text')].map((c, n) => (n % 2 ? c.toUpperCase() : c.toLowerCase())).join('')) },
  { name: 'clap', desc: 'Add 👏 between 👏 words', opts: [T], run: say((i) => i.options.getString('text').split(/\s+/).join(' 👏 ')) },
  { name: 'owo', desc: 'OwOify text', opts: [T], run: say((i) => i.options.getString('text').replace(/[rl]/g, 'w').replace(/[RL]/g, 'W').replace(/n([aeiou])/g, 'ny$1') + ' owo') },
  { name: 'emojify', desc: 'Turn text into letter emojis', opts: [T], run: say((i) => [...i.options.getString('text').toLowerCase()].map((c) => (/[a-z]/.test(c) ? `:regional_indicator_${c}:` : c === ' ' ? '   ' : c)).join(' ').slice(0, 4000)) },
  { name: 'ship', desc: 'Ship two people', opts: [['first', 'user', 'First', true], ['second', 'user', 'Second', true]],
    run: say((i) => { const a = i.options.getUser('first'), b = i.options.getUser('second'), p = hashNum([a.id, b.id].sort().join('')); return `💘 ${a} + ${b}\n**${p}%** ${'█'.repeat(Math.round(p / 10))}${'░'.repeat(10 - Math.round(p / 10))}`; }) },
  { name: 'rate', desc: 'Rate anything out of 10', opts: [['thing', 'string', 'What to rate', true]], run: say((i) => `⭐ I rate **${i.options.getString('thing')}** a **${hashNum(i.options.getString('thing').toLowerCase()) % 11}/10**`) },
  { name: 'iq', desc: 'Measure IQ (accuracy: zero)', opts: [['user', 'user', 'Who? (default: you)']], run: say((i) => { const u = i.options.getUser('user') || i.user; return `🧠 ${u} has an IQ of **${hashNum(u.id) + 60}**`; }) },
  { name: 'roast', desc: 'Light roast', opts: [['user', 'user', 'Target', true]], run: say((i) => `🔥 ${i.options.getUser('user')}, ${pick(ROASTS)}`) },
  { name: 'compliment', desc: 'Compliment someone', opts: [['user', 'user', 'Who', true]], run: say((i) => `💖 ${i.options.getUser('user')}, ${pick(COMPS)}`) },
  { name: 'slots', desc: 'Spin the slot machine', run: say(() => { const s = ['🍒', '🍋', '💎', '⭐', '🔔'], r = [pick(s), pick(s), pick(s)]; return `🎰 | ${r.join(' | ')} |\n${r[0] === r[1] && r[1] === r[2] ? '**JACKPOT!**' : r[0] === r[1] || r[1] === r[2] || r[0] === r[2] ? 'Two of a kind!' : 'No luck this time.'}`; }) },
  { name: 'wyr', desc: 'Would you rather', run: say(() => `🤔 ${pick(WYR)}`) },
  { name: 'topic', desc: 'Conversation starter', run: say(() => `💬 ${pick(TOPICS)}`) },
  { name: 'pickup', desc: 'Pickup line', run: say(() => `😏 ${pick(PICKUP)}`) },
  { name: 'fortune', desc: 'Get your fortune', run: say(() => `🔮 ${pick(FORTUNE)}`) },
  { name: 'vibe', desc: 'Vibe check', opts: [['user', 'user', 'Who? (default: you)']], run: say((i) => { const u = i.options.getUser('user') || i.user, p = hashNum(u.id + new Date().toDateString()); return `✨ ${u} vibe check: **${p}%** ${p > 60 ? 'immaculate' : p > 30 ? 'decent' : 'questionable'}`; }) },
  { name: 'mcname', desc: 'Random gamer tag', run: say(() => `🏷️ **${pick(MCN1)}${pick(MCN2)}${rand(100)}**`) },
];

module.exports = group('fun', 'Fun commands', subs);
