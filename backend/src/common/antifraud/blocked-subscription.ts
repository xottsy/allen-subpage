// Deliberately inert: no real server address, customer UUID, token or subscription URL.
const UUID = '11111111-1111-4111-8111-111111111111';
const ADDRESS = '127.0.0.1';
const PORT = 9;
export function blockedSubscription(
    userAgent: string,
    clientType: string | undefined,
    message: string,
) {
    const label = message.replace(/[\r\n]/g, ' ').slice(0, 220);
    const format = (clientType || '').toLowerCase();
    const ua = userAgent.toLowerCase();
    const json = (value: unknown) => ({
        body: JSON.stringify(value),
        contentType: 'application/json; charset=utf-8',
    });
    if (
        ['clash', 'mihomo', 'stash'].includes(format) ||
        (!format && /clash|mihomo|stash/.test(ua))
    ) {
        // JSON is a valid YAML 1.2 document, avoiding unsafe interpolation of labels.
        return {
            ...json({
                proxies: [
                    {
                        name: label,
                        type: 'vless',
                        server: ADDRESS,
                        port: PORT,
                        uuid: UUID,
                        network: 'tcp',
                        tls: false,
                        udp: false,
                    },
                ],
                'proxy-groups': [{ name: 'Allen VPN', type: 'select', proxies: [label] }],
                rules: ['MATCH,Allen VPN'],
            }),
            contentType: 'application/yaml; charset=utf-8',
        };
    }
    if (
        ['singbox', 'sing-box'].includes(format) ||
        (!format && /sing-box|singbox|hiddify|karing/.test(ua))
    ) {
        return json({
            outbounds: [
                { type: 'vless', tag: label, server: ADDRESS, server_port: PORT, uuid: UUID },
            ],
            route: { final: label },
        });
    }
    if (['json', 'xray-json'].includes(format)) {
        return json([
            {
                remarks: label,
                outbounds: [
                    {
                        tag: label,
                        protocol: 'vless',
                        settings: {
                            vnext: [
                                {
                                    address: ADDRESS,
                                    port: PORT,
                                    users: [{ id: UUID, encryption: 'none' }],
                                },
                            ],
                        },
                        streamSettings: { network: 'tcp', security: 'none' },
                    },
                ],
            },
        ]);
    }
    const uri = `vless://${UUID}@${ADDRESS}:${PORT}?encryption=none&security=none&type=tcp#${encodeURIComponent(label)}`;
    return {
        body: format === 'vless' ? uri + '\n' : Buffer.from(uri + '\n').toString('base64'),
        contentType: 'text/plain; charset=utf-8',
    };
}
