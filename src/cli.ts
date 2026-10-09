import path from 'node:path';
import fs from 'node:fs';
import { c } from './colors.js';

export interface CliOptions {
    bump: '--major' | '--minor' | '--patch';
    noRestart: boolean;
    dryRun: boolean;
}

const BUMP_FLAGS = ['--major', '--minor', '--patch'] as const;

function printVersion(): void {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
    console.log(pkg.version);
}

function printHelp(): void {
    console.log(`
${c.bold('calagopus-deploy')} - bump version, release to GitHub, restart a Calagopus server

${c.bold('USAGE')}
  calagopus-deploy <--major|--minor|--patch> [options]

${c.bold('BUMP (required)')}
  --major     Bump the major version  (1.2.3 → 2.0.0)
  --minor     Bump the minor version  (1.2.3 → 1.3.0)
  --patch     Bump the patch version  (1.2.3 → 1.2.4)

${c.bold('OPTIONS')}
  --no-restart  Skip the Calagopus server restart
  --dry-run     Show what would happen without making any changes
  -v, --version Print calagopus-deploy version and exit
  -h, --help    Show this help message and exit

${c.bold('ENVIRONMENT VARIABLES')} ${c.dim('(required unless --no-restart)')}
  CALAGOPUS_PANEL_URL  Base URL of your Calagopus panel  (e.g. https://panel.example.com)
  CALAGOPUS_SERVER_ID  Server short ID (8 chars) or UUID
  CALAGOPUS_API_KEY    API key with the control.restart server permission

${c.bold('EXAMPLE')}
  calagopus-deploy --patch
  calagopus-deploy --minor --no-restart
  calagopus-deploy --major --dry-run
`);
}

/** Parse process.argv and return options, or print help/version and exit. */
export function parseArgs(): CliOptions {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        process.exit(0);
    }

    if (args.includes('--version') || args.includes('-v')) {
        printVersion();
        process.exit(0);
    }

    const bumps = args.filter((a): a is typeof BUMP_FLAGS[number] =>
        BUMP_FLAGS.includes(a as typeof BUMP_FLAGS[number]),
    );

    if (bumps.length === 0) {
        console.error(c.red('Error: one of --major, --minor, or --patch is required.'));
        console.error(`Run ${c.bold('calagopus-deploy --help')} for usage.`);
        process.exit(2);
    }

    if (bumps.length > 1) {
        console.error(c.red(`Error: only one bump flag allowed, got: ${bumps.join(', ')}`));
        process.exit(2);
    }

    const unknown = args.filter(
        (a) =>
            !BUMP_FLAGS.includes(a as typeof BUMP_FLAGS[number]) &&
            !['--no-restart', '--dry-run', '--help', '-h', '--version', '-v'].includes(a),
    );
    if (unknown.length > 0) {
        console.error(c.red(`Error: unknown argument(s): ${unknown.join(', ')}`));
        console.error(`Run ${c.bold('calagopus-deploy --help')} for usage.`);
        process.exit(2);
    }

    return {
        bump: bumps[0],
        noRestart: args.includes('--no-restart'),
        dryRun: args.includes('--dry-run'),
    };
}
