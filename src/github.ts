import { execSync, execFileSync } from 'node:child_process';
import { step, ok, warn } from './logger.js';

function isGhAvailable(): boolean {
    try {
        execFileSync('gh', ['--version'], { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

export function createRelease(newVer: string, dryRun: boolean): void {
    step('Creating GitHub release');

    if (!isGhAvailable()) {
        warn('gh CLI not found - skipping GitHub release. Install it from https://cli.github.com');
        return;
    }

    try {
        if (!dryRun) {
            execSync(`gh release create v${newVer} --title "v${newVer}" --generate-notes`, {
                stdio: 'inherit',
            });
        }
        ok(`GitHub release v${newVer} created`);
    } catch {
        warn('gh release create failed - you can create the release manually on GitHub');
    }
}
