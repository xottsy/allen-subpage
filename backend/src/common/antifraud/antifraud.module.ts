import { Global, Module } from '@nestjs/common';

import { TypedConfigService } from '@common/config/app-config';

import { DeviceGate } from './device-gate';

@Global()
@Module({
    providers: [
        {
            provide: DeviceGate,
            inject: [TypedConfigService],
            useFactory: (config: TypedConfigService) =>
                new DeviceGate({
                    url: config.get('ALLEN_ANTIFRAUD_URL'),
                    secret: config.get('ALLEN_ANTIFRAUD_SECRET'),
                    supportUrl: config.get('ALLEN_SUPPORT_URL'),
                    timeoutMs: config.get('ALLEN_ANTIFRAUD_TIMEOUT_MS'),
                }),
        },
    ],
    exports: [DeviceGate],
})
export class AntifraudModule {}
