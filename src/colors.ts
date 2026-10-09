/**
 * ANSI color helpers - respects NO_COLOR (no-color.org) and non-TTY output.
 * If FORCE_COLOR is set, colors are always enabled regardless of TTY.
 */

const enabled =
    !!process.env.FORCE_COLOR ||
    (!process.env.NO_COLOR && !!process.stdout.isTTY);

function wrap(code: string) {
    return (s: string) => (enabled ? `\x1b[${code}m${s}\x1b[0m` : s);
}

export const c = {
    green: wrap('32'),
    yellow: wrap('33'),
    red: wrap('31'),
    bold: wrap('1'),
    dim: wrap('2'),
};
