StrafeSMP Bot

SETUP
1. Install Node 18 or newer.
2. Run: npm install
3. Copy .env.example to .env and fill TOKEN, CLIENT_ID, GUILD_ID.
4. In the Discord developer portal (Bot tab) turn ON Server Members Intent and Message Content Intent.
5. Invite the bot with the bot and applications.commands scopes and Administrator (or at least Manage Channels, Manage Roles, Manage Messages, Ban/Kick/Moderate Members).
6. Edit config.js: server IP, links, rules, ticket types.
7. Run: npm run deploy   (registers slash commands, instant with GUILD_ID)
8. Run: npm start

TICKETS
/ticket setup category:#Tickets staffrole:@Staff logchannel:#ticket-logs
/ticket panel channel:#ticket-support
Ticket types, emojis, button colors and welcome text live in config.js.
Needs discord.js 14.19+ (Components V2 panel).

EMBEDS
/embed create   opens a builder form (add save_as to save it)
/embed quick, edit, json, send, announce, rules, field, set, button, dm and more.
Placeholders: {server} {members}, and \n for new lines.

STRUCTURE
10 slash commands, each with up to 25 subcommands (Discord allows 100 commands, 25 subs each).
commands/ticket embed mod utility info fun action smp role settings
To add commands: add an object to a subs array, then run npm run deploy.
