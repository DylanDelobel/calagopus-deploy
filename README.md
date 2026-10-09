# calagopus-deploy

> CLI tool to bump version, create a GitHub release, and restart a [Calagopus](https://calagopus.com) server - all in one command.

## Install

```bash
npm install -D calagopus-deploy
```

Then add a script to your `package.json`:

```json
"scripts": {
  "update": "calagopus-deploy"
}
```

## Usage

```bash
calagopus-deploy <--major|--minor|--patch> [options]
# or through the npm script
npm run update -- --patch
```

### Bump flags (required)

| Flag | Effect |
|------|--------|
| `--major` | `1.2.3` → `2.0.0` |
| `--minor` | `1.2.3` → `1.3.0` |
| `--patch` | `1.2.3` → `1.2.4` |

### Options

| Flag | Description |
|------|-------------|
| `--no-restart` | Skip the Calagopus server restart |
| `--dry-run` | Show what would happen without making any changes |
| `--version`, `-v` | Print calagopus-deploy version |
| `--help`, `-h` | Show help |

## What it does

1. Reads the current version from `package.json`
2. Bumps to the next version using semver
3. Writes `package.json` and `package-lock.json`
4. Creates a git commit + annotated tag (`v1.2.3`)
5. Pushes branch and tags to the remote
6. Creates a GitHub release (requires [`gh`](https://cli.github.com))
7. Sends a restart action to your Calagopus server

## Configuration

Create a `.env` file in your project root (see `.env.example`):

```env
CALAGOPUS_PANEL_URL=https://panel.example.com
CALAGOPUS_SERVER_ID=your-server-id
CALAGOPUS_API_KEY=your-api-key
```

> Not needed when using `--no-restart`.

- `CALAGOPUS_SERVER_ID` accepts the 8-character short ID or the full UUID.
- Create the API key from **Account → API Keys** in the panel. It only needs the `control.restart` server permission. You can also restrict it to your IP.

## Examples

```bash
# Patch release with full deploy
calagopus-deploy --patch

# Minor release without server restart
calagopus-deploy --minor --no-restart

# Preview a major release without doing anything
calagopus-deploy --major --dry-run
```

## Pre-checks

Before making any changes, `calagopus-deploy` verifies:
- You are inside a git repository
- The working tree is clean (uncommitted changes will abort)
- The target tag (`v1.2.3`) does not already exist locally or on the remote

If anything goes wrong after the version bump, the changes are automatically rolled back (commit undone, tag deleted, files restored).

## Coming from ptero-deploy?

Swap the package and rename the three variables in `.env`:

| ptero-deploy | calagopus-deploy |
|---|---|
| `PTERO_PANEL_URL` | `CALAGOPUS_PANEL_URL` |
| `PTERO_SERVER_ID` | `CALAGOPUS_SERVER_ID` |
| `PTERO_API_BEARER` | `CALAGOPUS_API_KEY` |

## License

MIT © [DylanDelobel](https://github.com/DylanDelobel)
