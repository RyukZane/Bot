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
    maxPerUser: 1,
    panelTitle: 'StrafeSMP Support',
    panelStyle: 'grid', // 'grid' | 'dropdown' | 'list'
    banner: '', // optional: direct https image link
    thumbnail: '', // optional: direct https image link
    panelDescription: 'Choose a ticket type below. Reports and ban appeals are handled here.',
    panelFooter: 'Opening a ticket you do not need may result in a punishment.',
    // style: Success (green) | Danger (red) | Primary (blue) | Secondary (grey)
    types: [
      { id: 'general', label: 'General Support', emoji: '✅', style: 'Success', description: 'Get help with the server or your account.', welcome: 'Staff will be with you shortly. Explain your issue in detail.' },
      { id: 'report', label: 'Player Reports', emoji: '⚠️', style: 'Danger', description: 'Report a player with clear evidence.', welcome: 'Include the player name, what happened, and screenshots or clips.' },
      { id: 'bug', label: 'Bug Reports', emoji: '🐞', style: 'Primary', description: 'Report a bug, exploit, or glitch.', welcome: 'Explain how to reproduce the bug. Do not abuse exploits.' },
      { id: 'claims', label: 'Claims & Perks', emoji: '🪙', style: 'Secondary', description: 'Ask about an existing claim or reward request.', welcome: 'Include your in-game name and what you are trying to claim.' },
      { id: 'appeal', label: 'Ban Appeal', emoji: '⚖️', style: 'Secondary', description: 'Ask staff to review a ban decision.', welcome: 'Include your in-game name, ban reason, and why it should be lifted.' },
      { id: 'refunds', label: 'Refunds', emoji: '↩️', style: 'Primary', description: 'Request a refund through the existing review process.', welcome: 'Include your order ID and the reason for the refund.' },
    ],
  },
};
