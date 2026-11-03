// Actual service/gateway code, with a fake Remnawave transport. No network calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
require('reflect-metadata');
const root = path.resolve(__dirname, '..', 'src');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
    if (request.startsWith('@common/')) request = path.join(root, 'common', request.slice(8));
    return resolve.call(this, request, parent, ...args);
};
require.extensions['.ts'] = (module, filename) => {
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            esModuleInterop: true,
        },
    }).outputText;
    module._compile(code, filename);
};
const { DeviceGate } = require('../src/common/antifraud/device-gate.ts');
const { SubscriptionService } = require('../src/modules/subscription/subscription.service.ts');
const { WebpageService } = require('../src/modules/webpage/webpage.service.ts');
const { createHmac } = require('node:crypto');
const SECRET = 'test-secret-'.repeat(4);
const config = {
    url: 'https://core.invalid/keys/antifraud/check',
    secret: SECRET,
    supportUrl: 'https://t.me/example_support',
};
function response() {
    return {
        headers: {},
        statusCode: 0,
        data: undefined,
        destroyed: false,
        set(key, value) {
            if (typeof key === 'object') Object.assign(this.headers, key);
            else this.headers[key.toLowerCase()] = value;
            return this;
        },
        vary() {
            return this;
        },
        status(n) {
            this.statusCode = n;
            return this;
        },
        type(type) {
            this.contentType = type;
            return this;
        },
        send(data) {
            this.data = data;
            return this;
        },
        cookie() {
            return this;
        },
        socket: {
            destroy() {
                throw new Error('Socket should not be destroyed in antifraud tests');
            },
        },
    };
}
const request = {
    headers: {
        'x-hwid': '98ad6d3bb4c86ee28c086f774891e754',
        'x-device-os': 'Android',
        'user-agent': 'Happ/1.0',
    },
};

test('configuration cannot silently start with only URL or only secret', () => {
    assert.throws(() => new DeviceGate({ url: config.url }));
    assert.throws(() => new DeviceGate({ secret: SECRET }));
    assert.throws(() => new DeviceGate({ ...config, supportUrl: 'javascript:alert(1)' }));
});
test('request is signed over exact body; client cannot supply gateway authentication', async () => {
    global.fetch = async (url, options) => {
        assert.equal(url, config.url);
        const stamp = options.headers['X-Allen-Antifraud-Timestamp'];
        assert.equal(
            options.headers['X-Allen-Antifraud-Signature'],
            createHmac('sha256', SECRET)
                .update(stamp + '\n' + options.body)
                .digest('hex'),
        );
        assert.equal(JSON.parse(options.body).hwid, request.headers['x-hwid']);
        assert.equal(options.redirect, 'error');
        return new Response(JSON.stringify({ allowed: true }), { status: 200 });
    };
    assert.equal(await new DeviceGate(config).allow(request, response(), 'synthetic-token'), true);
});
test('blocked raw subscription never contacts Remnawave and returns only a warning placeholder', async () => {
    global.fetch = async () =>
        new Response(JSON.stringify({ allowed: false, reference: 'AF-12', verdict: 'review' }));
    let contacted = false;
    const service = new SubscriptionService(
        {
            getSubscription() {
                contacted = true;
                throw new Error('must not fetch');
            },
        },
        new DeviceGate(config),
    );
    const res = response();
    await service.serveSubscriptionPage('127.0.0.1', request, res, 'synthetic-token', 'clash');
    assert.equal(contacted, false);
    assert.equal(res.statusCode, 200);
    assert.match(res.data, /Подозрительная активность/);
    assert.equal(res.headers['x-allen-antifraud-reference'], 'AF-12');
    const stub = JSON.parse(res.data);
    assert.equal(stub.proxies.length, 1);
    assert.equal(stub.proxies[0].server, '127.0.0.1');
    assert.equal(stub.proxies[0].port, 9);
    assert.doesNotMatch(res.data, /vless:|vmess:|synthetic-token|test-secret/);
    assert.match(res.headers['cache-control'], /no-store/);
});

test('every warning format contains exactly one inert loopback server and no real access', async () => {
    global.fetch = async () =>
        new Response(JSON.stringify({ allowed: false, reference: 'AF-12', verdict: 'review' }));
    for (const format of [
        undefined,
        'base64',
        'vless',
        'clash',
        'mihomo',
        'stash',
        'singbox',
        'sing-box',
        'json',
        'xray-json',
    ]) {
        const res = response();
        assert.equal(
            await new DeviceGate(config).allow(
                request,
                res,
                'private-subscription-token',
                false,
                format,
            ),
            false,
        );
        assert.equal(res.statusCode, 200);
        assert.equal(res.headers['x-allen-antifraud'], 'blocked');
        const body =
            format === undefined || format === 'base64'
                ? Buffer.from(res.data, 'base64').toString('utf8')
                : res.data;
        assert.match(decodeURIComponent(body), /Подозрительная активность/);
        assert.match(body, /127\.0\.0\.1/);
        assert.doesNotMatch(
            body,
            /private-subscription-token|98ad6d3bb4c86ee28c086f774891e754|test-secret/,
        );
        assert.equal((body.match(/11111111-1111-4111-8111-111111111111/g) || []).length, 1);
    }
});
test('blocked browser page never fetches profile data and shows a safe support page', async () => {
    global.fetch = async () =>
        new Response(JSON.stringify({ allowed: false, reference: '<script>x</script>' }));
    let contacted = false;
    const settings = {
        getOrThrow() {
            return 'synthetic';
        },
    };
    const service = new WebpageService(
        settings,
        {
            getSubscriptionInfo() {
                contacted = true;
            },
        },
        {},
        new DeviceGate(config),
    );
    const res = response();
    await service.serveWebpage('127.0.0.1', request, res, 'synthetic-token');
    assert.equal(contacted, false);
    assert.equal(res.statusCode, 403);
    assert.match(res.data, /Обратиться в поддержку/);
    assert.doesNotMatch(res.data, /<script>/);
    assert.match(res.headers['content-security-policy'], /default-src 'none'/);
});
test('network errors, malformed replies and core failures close the subscription', async () => {
    for (const reply of [
        () => {
            throw new Error('private secret URL');
        },
        () => new Response('{}'),
        () => new Response(JSON.stringify({ allowed: 'true' })),
        () => new Response('offline', { status: 503 }),
    ]) {
        global.fetch = reply;
        const res = response();
        assert.equal(await new DeviceGate(config).allow(request, res, 'synthetic-token'), false);
        assert.equal(res.statusCode, 503);
        assert.doesNotMatch(res.data, /private secret/);
    }
});
test('successful subscription forwards format and device headers and forbids shared caching', async () => {
    global.fetch = async () => new Response(JSON.stringify({ allowed: true }));
    let args;
    const upstream = {
        async getSubscription(...values) {
            args = values;
            return {
                subscription: Buffer.from('synthetic-config'),
                headers: { 'cache-control': 'public, max-age=3600' },
            };
        },
    };
    const service = new SubscriptionService(upstream, new DeviceGate(config));
    const res = response();
    await service.serveSubscriptionPage('127.0.0.1', request, res, 'synthetic-token', 'clash');
    assert.equal(args[1], 'synthetic-token');
    assert.equal(args[2]['x-hwid'], request.headers['x-hwid']);
    assert.equal(args[4], 'clash');
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['cache-control'], /no-store/);
});
test('browser bootstrap cannot disclose raw keys even when panel config enables them', async () => {
    global.fetch = async () => new Response(JSON.stringify({ allowed: true }));
    const profile = {
        response: { links: ['vless://private-key'], ssConfLinks: { secret: 'private-key' } },
    };
    const upstream = {
        async getSubscriptionInfo() {
            return { isOk: true, response: profile };
        },
        async getSubpageConfig() {
            return { isOk: true, response: { webpageAllowed: true, subpageConfigUuid: null } };
        },
    };
    const service = new WebpageService(
        {
            getOrThrow() {
                return 'synthetic';
            },
        },
        upstream,
        {
            sign() {
                return 'synthetic-jwt';
            },
        },
        new DeviceGate(config),
    );
    service.getBaseSettings = () => ({ showConnectionKeys: true });
    service.getEncryptedSubpageConfigUuid = () => 'synthetic';
    service.indexTemplate = (data) => Buffer.from(data.panelData, 'base64').toString('utf8');
    const res = response();
    await service.serveWebpage('127.0.0.1', request, res, 'synthetic-token');
    assert.equal(res.statusCode, 0);
    assert.doesNotMatch(res.data, /private-key|vless:/);
    assert.deepEqual(profile.response.links, []);
    assert.deepEqual(profile.response.ssConfLinks, {});
});
test('unconfigured gate preserves upstream behavior intentionally', async () => {
    global.fetch = () => {
        throw new Error('must not contact core');
    };
    assert.equal(await new DeviceGate({}).allow(request, response(), 'synthetic-token'), true);
});
