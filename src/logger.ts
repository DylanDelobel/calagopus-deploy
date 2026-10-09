import { c } from './colors.js';

let _dryRun = false;

export function setDryRun(value: boolean): void {
    _dryRun = value;
}

function prefix(): string {
    return _dryRun ? c.dim('[dry-run] ') : '';
}

export function step(label: string): void {
    console.log(`\n${prefix()}${c.bold('→')} ${label}`);
}

export function ok(msg: string): void {
    console.log(`${prefix()}${c.green('  ✓')} ${msg}`);
}

export function warn(msg: string): void {
    console.warn(`${prefix()}${c.yellow('  ⚠')} ${msg}`);
}

export function error(msg: string): void {
    console.error(`${prefix()}${c.red('  ✗')} ${msg}`);
}
