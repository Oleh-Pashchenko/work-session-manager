# Work Session Manager

A VS Code extension to help developers manage their working time effectively using customizable work sessions and rest periods, inspired by the Pomodoro Technique.

## Features

- ⏱️ **Customizable Timers**: Set your own work session and rest period durations
- 📊 **Status Bar Integration**: See your current session status and remaining time at a glance
- 🎨 **Theme Customization**: Customize colors for work sessions and rest periods
- 🔊 **Audio Notifications**: Optional sound alerts for session transitions
- ⏸️ **Pause/Resume**: Full control over your timer with pause and resume functionality
- 💾 **State Persistence**: Your timer state is saved across VS Code sessions
- 🖥️ **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

### From VS Code Marketplace (Recommended) - Coming Soon!

The extension will soon be available on the VS Code Marketplace for easy installation:

1. Open VS Code
2. Go to Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Work Session Manager"
4. Click "Install"
5. The extension will be ready to use immediately

*Currently, please use the manual installation method below.*

### Manual Installation from Source

If you want to install from source or contribute to development:

#### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- VS Code

#### Build and Install Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/work-session-manager/work-session-manager.git
   cd work-session-manager
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Compile the extension**

   ```bash
   npm run compile
   ```

4. **Package the extension**

   ```bash
   npm run package:vsix
   ```

   This creates a `.vsix` file in the project root.

5. **Install the packaged extension**

   **For VS Code:**
   ```bash
   code --install-extension work-session-manager-1.0.0.vsix
   ```

   **For Kiro:**
   ```bash
   kiro --install-extension work-session-manager-1.0.0.vsix
   ```

   Or manually in your editor:

   **VS Code:**
   - Open VS Code
   - Go to Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
   - Click the "..." menu → "Install from VSIX..."
   - Select the generated `.vsix` file

   **Kiro:**
   - Open Kiro
   - Go to Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
   - Click the "..." menu → "Install from VSIX..."
   - Select the generated `.vsix` file

6. **Reload your editor**
   
   **VS Code:**
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter

   **Kiro:**
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter

#### Development Commands

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and auto-compile
- `npm run lint` - Run ESLint for code quality
- `npm run test` - Run unit tests
- `npm run package:vsix` - Create installable .vsix package
- `npm run clean` - Clean build artifacts

## Usage

### Getting Started

1. After installation, look for the timer in your VS Code status bar (bottom of the screen)
2. Click the play button (▶️) to start your first work session
3. The timer will count down and automatically transition to a rest period when complete
4. Customize settings through VS Code preferences (`File > Preferences > Settings` → search "Work Session Manager")

### Commands

Access these commands through the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `Work Session Manager: Start Work Session` - Begin a new work session
- `Work Session Manager: Start Rest Period` - Begin a rest period
- `Work Session Manager: Pause Timer` - Pause the current timer
- `Work Session Manager: Resume Timer` - Resume a paused timer
- `Work Session Manager: Reset Timer` - Reset the timer to idle state

### Status Bar

The status bar shows different information based on your current state:

- **Idle**: `⚪ Ready ▶️` - Click to start a work session
- **Work Session**: `🟢 25:00 ⏸️` - Green dot with countdown and pause button
- **Rest Period**: `🔵 05:00 ⏸️` - Blue dot with countdown and pause button
- **Paused**: `🟡 15:30 ▶️` - Yellow dot with remaining time and play button

## Configuration

Customize the extension through VS Code settings (`File > Preferences > Settings` and search for "Work Session Manager"):

### Timer Settings

- `workSessionManager.sessionDuration` (default: 25) - Work session duration in minutes (1-120)
- `workSessionManager.restDuration` (default: 5) - Rest period duration in minutes (1-60)

### Visual Customization

- `workSessionManager.workSessionColor` (default: "#4CAF50") - Color for work session display
- `workSessionManager.restPeriodColor` (default: "#64B5F6") - Color for rest period display
- `workSessionManager.showCountdown` (default: true) - Show countdown timer in status bar
- `workSessionManager.showStatusDot` (default: true) - Show status indicator dot
- `workSessionManager.showPausePlayButton` (default: true) - Show pause/play button in status bar

### Audio Settings

- `workSessionManager.soundEnabled` (default: true) - Enable sound notifications

### Automation

- `workSessionManager.autoStartRest` (default: true) - Automatically start rest after work session
- `workSessionManager.autoStartWork` (default: false) - Automatically start work after rest period
- `workSessionManager.autoStartOnOpen` (default: false) - Automatically start work session when VS Code opens

## Examples

### Basic Pomodoro Technique

- Session Duration: 25 minutes
- Rest Duration: 5 minutes
- Auto-start rest: Enabled

### Extended Focus Sessions

- Session Duration: 45 minutes
- Rest Duration: 15 minutes
- Auto-start rest: Enabled

### Custom Workflow

- Session Duration: 30 minutes
- Rest Duration: 10 minutes
- Auto-start rest: Disabled (manual control)

## Troubleshooting

### Audio Not Working

If audio notifications aren't working:

1. Check that `workSessionManager.soundEnabled` is set to `true`
2. Ensure your system volume is turned up
3. On Linux, make sure you have audio packages installed (pulseaudio or alsa)

### Timer Not Persisting

If your timer doesn't restore after restarting VS Code:

1. Check VS Code's workspace settings permissions
2. Try resetting the extension by running the "Reset Timer" command

### Status Bar Not Showing

If the status bar item isn't visible:

1. Check that both `showCountdown` and `showStatusDot` aren't disabled
2. Try reloading VS Code window (`Developer: Reload Window`)

## Contributing

This extension is open source. Feel free to contribute by:

- Reporting bugs
- Suggesting new features
- Submitting pull requests

## License

MIT License - see LICENSE file for details.

## Changelog

### 1.0.0

- Initial release
- Basic timer functionality
- Status bar integration
- Configuration options
- Audio notifications
- State persistence
- Cross-platform support
