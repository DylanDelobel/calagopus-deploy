import { execFileSync, execSync } from 'node:child_process';
import { c } from './colors.js';
import { step, ok } from './logger.js';

export interface GitState {
    versionWritten: boolean;
    committed: boolean;
    tagged: boolean;
    pushed: boolean;
}

function git(...args: string[]): string {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function gitSilent(...args: string[]): string {
    try {
        return execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch {
        return '';
    }
}

/** Verify we are inside a git repo; throws with exit code 2 if not. */
export function assertGitRepo(): void {
    try {
        git('rev-parse', '--is-inside-work-tree');
    } catch {
        const err = new Error('Not inside a git repository.');
        (err as NodeJS.ErrnoException).code = 'USAGE';
        throw err;
    }
}

/**
 * Verify the working tree is clean - ignoring package.json and package-lock.json
 * which will be written by writeVersion().
 * Throws with USAGE code if dirty.
 */
export function assertCleanTree(): void {
    const status = gitSilent('status', '--porcelain');
    const dirty = status
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .filter((l) => {
            const file = l.slice(3).trim().split(' -> ').pop() ?? '';
            return file !== 'package.json' && file !== 'package-lock.json';
        });

    if (dirty.length > 0) {
        const err = new Error(
            `Working tree has uncommitted changes:\n${dirty.map((l) => `  ${l}`).join('\n')}\n\nCommit or stash them before running calagopus-deploy.`,
        );
        (err as NodeJS.ErrnoException).code = 'USAGE';
        throw err;
    }
}

/** Check that a tag does not already exist locally or on the remote. */
export function assertTagFree(tag: string): void {
    const localTag = gitSilent('rev-parse', '-q', '--verify', `refs/tags/${tag}`);
    if (localTag) {
        const err = new Error(`Tag ${c.bold(tag)} already exists locally. Delete it first: git tag -d ${tag}`);
        (err as NodeJS.ErrnoException).code = 'USAGE';
        throw err;
    }

    // Check remote (best-effort - skip if no remote configured)
    try {
        const remoteTag = execFileSync(
            'git',
            ['ls-remote', '--tags', 'origin', tag],
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
        ).trim();
        if (remoteTag) {
            const err = new Error(`Tag ${c.bold(tag)} already exists on remote. Choose a different version or delete the remote tag.`);
            (err as NodeJS.ErrnoException).code = 'USAGE';
            throw err;
        }
    } catch (e) {
        // If the error we just threw, re-throw it
        if ((e as NodeJS.ErrnoException).code === 'USAGE') throw e;
        // Otherwise (no remote, network issue) - silently skip
    }
}

export function commitAndTag(newVer: string, dryRun: boolean): void {
    step('Committing and tagging');
    if (!dryRun) {
        execFileSync('git', ['add', 'package.json', 'package-lock.json']);
        execFileSync('git', ['commit', '-m', `chore: bump version to ${newVer}`]);
        execFileSync('git', ['tag', '-a', `v${newVer}`, '-m', `Version ${newVer}`]);
    }
    ok(`Commit and tag v${newVer} created`);
}

export function push(dryRun: boolean): void {
    step('Pushing to remote');
    if (!dryRun) {
        execSync('git push --follow-tags', { stdio: 'inherit' });
    }
    ok('Branch and tags pushed');
}

/**
 * Undo mutations that have already been applied, in reverse order.
 * Called from the global catch handler when something goes wrong mid-flight.
 */
export function rollback(state: GitState, newVer: string): void {
    console.error(c.yellow('\n  Rolling back changes...'));

    if (state.tagged) {
        try {
            git('tag', '-d', `v${newVer}`);
            console.error(c.yellow(`  ✓ Deleted local tag v${newVer}`));
        } catch {
            console.error(c.red(`  ✗ Could not delete tag v${newVer} - remove it manually`));
        }
    }

    if (state.committed) {
        try {
            git('reset', '--soft', 'HEAD~1');
            console.error(c.yellow('  ✓ Undid version bump commit'));
        } catch {
            console.error(c.red('  ✗ Could not undo commit - run: git reset --soft HEAD~1'));
        }
    }

    if (state.versionWritten) {
        try {
            git('checkout', '--', 'package.json', 'package-lock.json');
            console.error(c.yellow('  ✓ Restored package.json and package-lock.json'));
        } catch {
            console.error(c.red('  ✗ Could not restore package files - run: git checkout -- package.json package-lock.json'));
        }
    }
}
