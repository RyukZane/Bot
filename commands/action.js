const { group } = require('../lib/group');
const { base } = require('../lib/embeds');

// [name, verb with target, solo text, emoji]
const A = [
  ['hug', 'hugs', 'hugs themselves', '🤗'], ['slap', 'slaps', 'slaps themselves', '🖐️'], ['pat', 'pats', 'pats themselves', '👋'],
  ['kiss', 'kisses', 'blows a kiss', '😘'], ['poke', 'pokes', 'pokes the air', '👉'], ['bite', 'bites', 'bites their lip', '😬'],
  ['cuddle', 'cuddles', 'cuddles a pillow', '🫂'], ['highfive', 'high-fives', 'high-fives the air', '🙌'], ['wave', 'waves at', 'waves hello', '👋'],
  ['bonk', 'bonks', 'bonks themselves', '🔨'], ['boop', 'boops', 'boops the air', '👆'], ['yeet', 'yeets', 'yeets themselves', '🚀'],
  ['stare', 'stares at', 'stares into the void', '👀'], ['fistbump', 'fist-bumps', 'fist-bumps the air', '👊'], ['tickle', 'tickles', 'giggles', '🤭'],
  ['punch', 'punches', 'punches the air', '🥊'], ['cry', 'cries on', 'is crying', '😭'], ['laugh', 'laughs at', 'is laughing', '😂'],
  ['blush', 'blushes at', 'is blushing', '😊'], ['dance', 'dances with', 'is dancing', '💃'], ['wink', 'winks at', 'winks', '😉'],
  ['facepalm', 'facepalms at', 'facepalms', '🤦'], ['shrug', 'shrugs at', 'shrugs', '🤷'], ['sleep', 'sleeps next to', 'is sleeping', '😴'], ['salute', 'salutes', 'salutes', '🫡'],
];

const subs = A.map(([name, verb, solo, emoji]) => ({
  name,
  desc: `${name[0].toUpperCase()}${name.slice(1)} someone`,
  opts: [['user', 'user', 'Who?']],
  run: (i) => {
    const u = i.options.getUser('user');
    return i.reply({ embeds: [base(u && u.id !== i.user.id ? `${emoji} ${i.user} ${verb} ${u}!` : `${emoji} ${i.user} ${solo}!`)] });
  },
}));

module.exports = group('action', 'Roleplay actions', subs);
