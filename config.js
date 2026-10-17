module.exports = {
  serverName: 'StrafeSMP',
  serverIp: 'play.strafesmp.net', // change this
  footer: 'StrafeSMP',
  colors: { primary: 0xe11d2e, success: 0x22c55e, warn: 0xf59e0b, error: 0xef4444, info: 0x3b82f6 },

  // used by /smp discord, store, vote, wiki, map, apply
  links: { discord: '', store: '', vote: '', wiki: '', map: '', apply: '' },

  rules: [
    'No cheating, x-ray or unfair client mods.',
    'Respect all players and staff.',
    'No griefing or stealing outside of server events.',
    'No spam, advertising or self-promo.',
    'Follow staff instructions at all times.',
  ],

  ticket: {
    maxPerUser: 25,
    panelStyle: 'list', // keeps the original look
    panelTitle: 'StrafeSMP Support',
    panelDescription: 'Need a hand? Pick a category below and a staff member will be with you shortly.',
    panelFooter: 'Spam tickets or false reports may lead to a punishment.',
    // style: Success (green) | Danger (red) | Primary (blue) | Secondary (grey)
    types: [
      { id: 'general', label: 'General Support', emoji: '💬', style: 'Success', description: 'Questions about the server, your account or anything else.', welcome: 'Thanks for reaching out! Tell us what you need and staff will reply soon.' },
      { id: 'report', label: 'Player Reports', emoji: '🚨', style: 'Danger', description: 'Report cheaters, griefers or rule breakers. Evidence required.', welcome: 'Send the player name, what happened, and screenshots or clips as proof.' },
      { id: 'bug', label: 'Bug Reports', emoji: '🛠️', style: 'Primary', description: 'Found a bug, glitch or exploit? Let us know.', welcome: 'Explain how to reproduce it. Please do not abuse exploits.' },
      { id: 'claims', label: 'Claims & Perks', emoji: '🚚', style: 'Secondary', description: 'Rewards, ranks and store perks you have not received.', welcome: 'Send your in-game name and what you are trying to claim.' },
      { id: 'appeal', label: 'Ban Appeal', emoji: '🔓', style: 'Secondary', description: 'Think a punishment was a mistake? Ask for a review.', welcome: 'Send your in-game name, the ban reason, and why it should be lifted.' },
    ],
  },
};
