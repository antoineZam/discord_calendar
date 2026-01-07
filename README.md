# CalendarSync - Vencord Plugin

A Vencord plugin that unifies your calendar experience by syncing Outlook, Google Calendar, and Discord server events into one beautiful interface.

## Features

- 📅 **Unified Calendar View** - See all your events from Discord, Google Calendar, and Outlook in one place
- 🔄 **Multi-Source Sync** - Connect multiple calendar sources simultaneously
- ✅ **Event Opt-In System** - Easily opt in/out of Discord server events
- 👁️ **Smart Visibility** - Non-opted events appear with lower opacity (with option to hide)
- 🎨 **Beautiful UI** - Modern calendar interface integrated seamlessly into Discord

## Installation

### As a UserPlugin (Recommended for Development)

1. Clone this repository into your Vencord `src/userplugins` folder:
   ```bash
   cd /path/to/Vencord/src/userplugins
   git clone https://github.com/yourusername/discord_calendar CalendarSync
   ```

2. Rebuild Vencord:
   ```bash
   pnpm build
   ```

3. Restart Discord

### Configuration

1. Open Discord Settings → Vencord → Plugins
2. Find "CalendarSync" and enable it
3. Click the settings cog to configure:
   - Connect your Google Calendar (OAuth)
   - Connect your Outlook Calendar (OAuth)
   - Choose which Discord servers to sync events from

## OAuth Setup

### Google Calendar
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add the Client ID in plugin settings

### Outlook Calendar
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add Calendar.Read permissions
4. Create a client secret
5. Add the Client ID in plugin settings

## Usage

- Click the calendar icon in the Discord toolbar to open the calendar view
- Events are color-coded by source:
  - 🟣 Discord Events
  - 🔵 Google Calendar
  - 🟠 Outlook Calendar
- Click on any Discord event to opt in/out
- Use the filter buttons to show/hide event sources
- Toggle "Show pending events" to hide events you haven't opted into

## License

MIT License - Feel free to modify and distribute!

## Contributing

Pull requests are welcome! Please read the contributing guidelines first.

