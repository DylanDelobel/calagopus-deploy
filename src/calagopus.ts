import axios from 'axios';
import { step, ok } from './logger.js';
import { c } from './colors.js';

export interface CalagopusConfig {
    panel: string;
    serverId: string;
    apiKey: string;
}

function formatAxiosError(err: unknown, config: CalagopusConfig): string {
    if (!axios.isAxiosError(err)) return (err as Error).message;

    const status = err.response?.status;
    const statusText = err.response?.statusText ?? '';
    const data = err.response?.data;

    let detail = '';
    if (data) {
        try {
            const body = typeof data === 'string' ? data : JSON.stringify(data);
            detail = ` - ${body.slice(0, 200)}`;
        } catch {
            // ignore
        }
    }

    if (status === 401) return `401 Unauthorized - API key is invalid, disabled, expired or not allowed from this IP`;
    if (status === 403) return `403 Forbidden - API key is missing the control.restart server permission`;
    if (status === 404) return `404 Not Found - server ID "${config.serverId}" was not found on the panel`;
    if (status === 409) return `409 Conflict - server is unavailable (suspended, installing or transferring)${detail}`;

    if (!err.response) return `could not reach ${config.panel} (${err.code ?? err.message})`;

    return `HTTP ${status ?? '?'} ${statusText}${detail}`;
}

export async function restart(config: CalagopusConfig, dryRun: boolean): Promise<void> {
    step('Restarting server');

    const panel = config.panel.replace(/\/+$/, '');
    const url = `${panel}/api/client/servers/${config.serverId}/power`;

    if (dryRun) {
        ok(`Would POST restart action to ${c.dim(url)}`);
        return;
    }

    try {
        await axios.post(
            url,
            { action: 'restart' },
            {
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            },
        );
        ok('Server restart triggered');
    } catch (err) {
        throw new Error(`Calagopus API error: ${formatAxiosError(err, config)}`);
    }
}
