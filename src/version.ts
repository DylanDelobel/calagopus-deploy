import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import { step, ok } from './logger.js';

export interface VersionInfo {
    pkg: Record<string, unknown>;
    packageJsonPath: string;
    packageLockPath: string;
    version: string;
}

export function readVersion(cwd: string): VersionInfo {
    const packageJsonPath = path.join(cwd, 'package.json');
    const packageLockPath = path.join(cwd, 'package-lock.json');

    if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`No package.json found in ${cwd}`);
    }

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
    const version = pkg.version as string;

    if (!version) {
        throw new Error('package.json has no "version" field');
    }

    return { pkg, packageJsonPath, packageLockPath, version };
}

export function computeNext(
    oldVer: string,
    bump: '--major' | '--minor' | '--patch',
): string {
    const releaseType = bump.replace('--', '') as semver.ReleaseType;
    const newVer = semver.inc(oldVer, releaseType);
    if (!newVer) throw new Error(`Cannot compute next version from "${oldVer}" with bump "${bump}"`);
    return newVer;
}

export function writeVersion(info: VersionInfo, newVer: string, dryRun: boolean): void {
    step('Updating package.json');
    if (!dryRun) {
        info.pkg.version = newVer;
        fs.writeFileSync(info.packageJsonPath, `${JSON.stringify(info.pkg, null, 2)}\n`);
    }
    ok('package.json updated');

    if (fs.existsSync(info.packageLockPath)) {
        step('Updating package-lock.json');
        if (!dryRun) {
            const lock = JSON.parse(
                fs.readFileSync(info.packageLockPath, 'utf8'),
            ) as Record<string, unknown>;
            lock.version = newVer;
            const packages = lock.packages as Record<string, { version?: string }> | undefined;
            if (packages?.['']) packages[''].version = newVer;
            fs.writeFileSync(info.packageLockPath, `${JSON.stringify(lock, null, 2)}\n`);
        }
        ok('package-lock.json updated');
    }
}
