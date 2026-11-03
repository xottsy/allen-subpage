import type { Request, Response } from 'express';

import { createHmac } from 'node:crypto';

import { blockedSubscription } from './blocked-subscription';

export interface DeviceGateOptions {
    url?: string;
    secret?: string;
    supportUrl?: string;
    timeoutMs?: number;
}

const SUSPICIOUS = 'Подозрительная активность. Обратитесь в поддержку.';
const UNAVAILABLE = 'Проверка устройства временно недоступна. Попробуйте позже.';
const escapeHtml = (value: string) =>
    value.replace(
        /[&<>"']/g,
        (c) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[c]!,
    );

export class DeviceGate {
    public readonly enabled: boolean;
    private readonly supportUrl: string;

    constructor(private readonly options: DeviceGateOptions) {
        this.enabled = Boolean(options.url);
        if (
            this.enabled !== Boolean(options.secret) ||
            (this.enabled && options.secret!.length < 32)
        ) {
            throw new Error(
                'Both ALLEN_ANTIFRAUD_URL and a secret of at least 32 characters are required',
            );
        }
        if (options.url) {
            const url = new URL(options.url);
            if (
                !['https:', 'http:'].includes(url.protocol) ||
                url.username ||
                url.password ||
                url.hash ||
                url.search
            ) {
                throw new Error('Invalid antifraud endpoint');
            }
        }
        this.supportUrl = '';
        if (this.enabled && !options.supportUrl) {
            throw new Error('ALLEN_SUPPORT_URL is required when antifraud is connected');
        }
        if (options.supportUrl) {
            const support = new URL(options.supportUrl);
            if (support.protocol !== 'https:' || support.username || support.password) {
                throw new Error('ALLEN_SUPPORT_URL must be an HTTPS URL without credentials');
            }
            this.supportUrl = support.href;
        }
    }

    public noStore(res: Response): void {
        res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
        res.set('Surrogate-Control', 'no-store');
        res.set('X-Accel-Expires', '0');
        res.set('Pragma', 'no-cache');
        res.vary('User-Agent');
        res.vary('x-hwid');
    }

    public async allow(
        req: Request,
        res: Response,
        shortUuid: string,
        browser = false,
        clientType?: string,
    ): Promise<boolean> {
        if (!this.enabled) return true;
        this.noStore(res);
        const header = (name: string, length: number) => {
            const value = req.headers[name];
            return (Array.isArray(value) ? value.join(',') : value || '').slice(0, length);
        };
        const payload = JSON.stringify({
            short_uuid: shortUuid,
            hwid: header('x-hwid', 128),
            device_os: header('x-device-os', 128),
            model: header('x-device-model', 128),
            os_version: header('x-ver-os', 64),
            user_agent: header('user-agent', 512),
            browser,
        });
        const stamp = Math.floor(Date.now() / 1000).toString();
        const signature = createHmac('sha256', this.options.secret!)
            .update(stamp + '\n' + payload)
            .digest('hex');
        try {
            const response = await fetch(this.options.url!, {
                method: 'POST',
                redirect: 'error',
                cache: 'no-store',
                signal: AbortSignal.timeout(this.options.timeoutMs || 2000),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Allen-Antifraud-Timestamp': stamp,
                    'X-Allen-Antifraud-Signature': signature,
                },
                body: payload,
            });
            if (response.status === 404) {
                this.reject(res, browser, 404, 'Подписка не найдена.', '');
                return false;
            }
            if (!response.ok) throw new Error('Antifraud endpoint is unavailable');
            const result = (await response.json()) as Record<string, unknown>;
            if (typeof result.allowed !== 'boolean') throw new Error('Invalid antifraud response');
            if (result.allowed === true) return true;
            const reference =
                typeof result.reference === 'string' && /^AF-(?:K-)?\d+$/.test(result.reference)
                    ? result.reference
                    : '';
            const message =
                result.verdict === 'unsupported'
                    ? 'Приложение не передало данные устройства. Включите HWID в настройках приложения или обратитесь в поддержку.'
                    : SUSPICIOUS;
            if (!browser) {
                const name =
                    result.verdict === 'unsupported'
                        ? message
                        : 'Подозрительная активность, обратитесь в ТП';
                const stub = blockedSubscription(header('user-agent', 512), clientType, name);
                this.noStore(res);
                res.set('X-Allen-Antifraud', 'blocked');
                res.set(
                    'announce',
                    'base64:' +
                        Buffer.from(
                            reference ? message + '\nКод обращения: ' + reference : message,
                        ).toString('base64'),
                );
                res.set(
                    'profile-title',
                    'base64:' + Buffer.from('Allen VPN · требуется проверка').toString('base64'),
                );
                res.set('profile-update-interval', '1');
                if (this.supportUrl) res.set('support-url', this.supportUrl);
                if (reference) res.set('X-Allen-Antifraud-Reference', reference);
                res.status(200).type(stub.contentType).send(stub.body);
                return false;
            }
            this.reject(res, true, 403, message, reference);
            return false;
        } catch {
            // Ошибка/таймаут проверки закрывает выдачу. Исключение не логируется: оно может содержать URL/секреты.
            this.reject(res, browser, 503, UNAVAILABLE, '');
            return false;
        }
    }

    private reject(
        res: Response,
        browser: boolean,
        status: number,
        message: string,
        reference: string,
    ): void {
        this.noStore(res);
        res.set('X-Allen-Antifraud', status === 403 ? 'blocked' : 'unavailable');
        res.set('announce', 'base64:' + Buffer.from(message).toString('base64'));
        res.set(
            'profile-title',
            'base64:' + Buffer.from('Allen VPN · проверка устройства').toString('base64'),
        );
        if (this.supportUrl) res.set('support-url', this.supportUrl);
        if (status === 503) res.set('Retry-After', '30');
        const text = reference ? message + '\nКод обращения: ' + reference : message;
        if (!browser) {
            res.status(status).type('text/plain; charset=utf-8').send(text);
            return;
        }
        res.set(
            'Content-Security-Policy',
            "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        );
        res.set('X-Content-Type-Options', 'nosniff');
        const title =
            status === 403
                ? 'Нужна проверка устройства'
                : status === 404
                  ? 'Подписка не найдена'
                  : 'Попробуйте немного позже';
        const button = this.supportUrl
            ? `<a class="button" href="${escapeHtml(this.supportUrl)}" rel="noopener noreferrer">Обратиться в поддержку</a>`
            : '';
        res.status(status).type('text/html; charset=utf-8').send(`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} · Allen VPN</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f7f1;color:#19372e;font:16px/1.75 system-ui,sans-serif}.card{width:min(100%,500px);padding:40px;border:1px solid #dfe4d8;border-radius:24px;background:#fff}.brand{color:#607457;letter-spacing:.14em;font-size:11px;font-weight:700}h1{font-size:34px;font-weight:550;letter-spacing:-.045em;line-height:1.15;margin:28px 0 18px}p{color:#687566}.reference{font-size:13px}.button{display:block;margin-top:28px;padding:14px 20px;border-radius:12px;background:#19372e;color:#eff6e7;text-align:center;font-weight:600;font-size:14px;text-decoration:none}.button:hover{background:#2b5142}.button:focus-visible{outline:2px solid #71965b;outline-offset:4px}@media(max-width:480px){.card{padding:28px}h1{font-size:30px}}</style></head>
<body><main class="card"><div class="brand">ALLEN VPN</div><h1>${title}</h1><p>${escapeHtml(message)}</p>${reference ? `<p class="reference">Код обращения: <strong>${escapeHtml(reference)}</strong></p>` : ''}${button}</main></body></html>`);
    }
}
