A robust and persistent Discord bot for creating, managing, and monitoring timers within your server. Built with TypeScript, Discord.js, and Redis for data persistence.

## Features

- **Persistent Timers**: Timers are saved in a Redis database, so they will continue even if the bot restarts.
- **Multiple Timers**: Create multiple timers with unique IDs.
- **Voice Channel Alerts**: The bot can join a voice channel to play an alert sound when a timer finishes.
- **Soundboard Integration**: Use sounds from your server's soundboard as timer alerts.
- **Dynamic Updates**: Timer messages are updated in real-time to show the remaining time.
- **Easy to Use**: Slash commands with autocomplete make it easy to start, edit, stop, and list timers.

## Commands

The bot uses slash commands. Here is a list of the available commands:

### `/start-timer`

Starts a new timer.

**Options:**
- `time` (Required): The duration of the timer. Examples: `30s`, `10m`, `1h 30m`.
- `sound` (Optional): A sound from the server's soundboard to play when the timer ends. (Uses autocomplete)
  
### `/edit-timer`

Edits the duration of an existing timer.

**Options:**
- `id` (Required): The ID of the timer you want to edit. (Uses autocomplete)
- `new_time` (Required): The new duration for the timer from the moment you run the command.

### `/end-timer`

Stops and deletes an active timer.

**Options:**
- `id` (Required): The ID of the timer you want to stop. (Uses autocomplete)

### `/list-timers`

Lists all active timers on the server.
