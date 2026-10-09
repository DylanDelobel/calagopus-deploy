#!/usr/bin/env node
import path from 'node:path';
import { config } from 'dotenv';
import { c } from './colors.js';
import { setDryRun } from './logger.js';
import { parseArgs } from './cli.js';
import { readVersion, computeNext, writeVersion } from './version.js';
import {
    GitState,
    assertGitRepo,
    assertCleanTree,
    assertTagFree,
    commitAndTag,
    push,
    rollback,
} from './git.js';
import { createRelease } from './github.js';
import { CalagopusConfig, restart } from './calagopus.js';

config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

async function main(): Promise<void> {
    const opts = parseArgs();
    setDryRun(opts.dryRun);

    // --- Validate env (before any mutation) ---
    let panelConfig: CalagopusConfig | null = null;
    if (!opts.noRestart) {
        const panel = process.env.CALAGOPUS_PANEL_URL;
        const serverId = process.env.CALAGOPUS_SERVER_ID;
        const apiKey = process.env.CALAGOPUS_API_KEY;
        if (!panel || !serverId || !apiKey) {
            console.error(
                c.red('Error: CALAGOPUS_PANEL_URL, CALAGOPUS_SERVER_ID, and CALAGOPUS_API_KEY must be set in .env (or use --no-restart)'),
            );
            process.exit(2);
        }
        panelConfig = { panel, serverId, apiKey };
    }

    // --- Read version (before any mutation) ---
    const versionInfo = readVersion(process.cwd());
    const newVer = computeNext(versionInfo.version, opts.bump);

    console.log(
        c.bold(
            `\n${opts.dryRun ? c.dim('[dry-run] ') : ''}Bump ${c.yellow(versionInfo.version)} → ${c.green(newVer)} (${opts.bump})\n`,
        ),
    );

    // --- Git pre-checks (before any mutation) ---
    if (!opts.dryRun) {
        assertGitRepo();
        assertCleanTree();
        assertTagFree(`v${newVer}`);
    }

    // --- Mutating steps (with tracked state for rollback) ---
    const state: GitState = {
        versionWritten: false,
        committed: false,
        tagged: false,
        pushed: false,
    };

    try {
        writeVersion(versionInfo, newVer, opts.dryRun);
        state.versionWritten = true;

        commitAndTag(newVer, opts.dryRun);
        state.committed = true;
        state.tagged = true;

        push(opts.dryRun);
        state.pushed = true;

        createRelease(newVer, opts.dryRun);

        if (panelConfig) {
            await restart(panelConfig, opts.dryRun);
        }
    } catch (err) {
        // Rollback what was done before the failure
        if (!opts.dryRun) {
            rollback(state, newVer);
        }
        throw err;
    }

    console.log(
        c.bold(
            c.green(
                `\n${opts.dryRun ? '[dry-run] ' : ''}✓ Done - v${newVer} released!\n`,
            ),
        ),
    );
}

main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
        const error = err as Error & { code?: string };
        const exitCode = error.code === 'USAGE' ? 2 : 1;
        console.error(c.red(`\n✗ Deploy failed: ${error.message ?? String(err)}\n`));
        process.exit(exitCode);
    });
