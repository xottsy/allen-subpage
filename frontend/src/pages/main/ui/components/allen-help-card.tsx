import { Image, Stack } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import {
    IconArrowUpRight,
    IconCheck,
    IconCopy,
    IconLifebuoy,
    IconQrcode
} from '@tabler/icons-react'
import { renderSVG } from 'uqr'

import { constructSubscriptionUrl } from '@shared/utils/construct-subscription-url'

import { useAppConfig, useCurrentLang } from '@entities/app-config-store'
import { useSubscription } from '@entities/subscription-info-store'

import classes from './help.module.css'

export function AllenHelpCard() {
    const config = useAppConfig()
    const ru = useCurrentLang() === 'ru'
    const subscription = useSubscription()
    const clipboard = useClipboard({ timeout: 2500 })
    const url = constructSubscriptionUrl(window.location.href, subscription.user.shortUuid)
    const showQR = () =>
        modals.open({
            title: ru ? 'Добавить на другое устройство' : 'Add another device',
            centered: true,
            children: (
                <Stack align="center" gap="lg">
                    <Image
                        w={230}
                        h={230}
                        alt={ru ? 'QR-код подписки' : 'Subscription QR code'}
                        src={`data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(url, { whiteColor: '#ffffff', blackColor: '#19372e' }))}`}
                    />
                    <p className={classes.qrDescription}>
                        {ru
                            ? 'Отсканируйте код камерой другого устройства и откройте страницу подключения.'
                            : 'Scan with another device and open the connection page.'}
                    </p>
                </Stack>
            )
        })
    return (
        <>
            {!config.baseSettings.hideGetLinkButton && (
                <section className={classes.linkCard}>
                    <span className={classes.kicker}>
                        {ru ? 'ВАША ПОДПИСКА' : 'YOUR SUBSCRIPTION'}
                    </span>
                    <h2>{ru ? 'Ещё одно устройство?' : 'Another device?'}</h2>
                    <p>
                        {ru
                            ? 'Откройте эту страницу на нём — и повторите настройку.'
                            : 'Open this page there and follow the same steps.'}
                    </p>
                    <button
                        type="button"
                        className={classes.copy}
                        onClick={() => clipboard.copy(url)}
                    >
                        {clipboard.copied ? <IconCheck size={17} /> : <IconCopy size={17} />}
                        <span aria-live="polite">
                            {clipboard.copied
                                ? ru
                                    ? 'Ссылка скопирована'
                                    : 'Link copied'
                                : ru
                                  ? 'Скопировать ссылку'
                                  : 'Copy subscription link'}
                        </span>
                    </button>
                    {clipboard.error && (
                        <input
                            className={classes.fallback}
                            aria-label={ru ? 'Ссылка для копирования' : 'Link to copy'}
                            value={url}
                            readOnly
                            onFocus={(event) => event.target.select()}
                        />
                    )}
                    <button type="button" className={classes.qr} onClick={showQR}>
                        <IconQrcode size={17} />
                        {ru ? 'Показать QR-код' : 'Show QR code'}
                    </button>
                </section>
            )}
            <section className={classes.helpCard}>
                <IconLifebuoy className={classes.lifeIcon} size={24} stroke={1.5} />
                <h2>{ru ? 'Поможем разобраться' : 'We’re here to help'}</h2>
                <p>
                    {ru
                        ? 'Не открывается приложение или не получается подключиться? Напишите нам.'
                        : 'Can’t open the app or connect? Send us a message.'}
                </p>
                {config.brandingSettings.supportUrl && (
                    <a
                        href={config.brandingSettings.supportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {ru ? 'Написать в поддержку' : 'Contact support'}
                        <IconArrowUpRight size={16} />
                    </a>
                )}
            </section>
        </>
    )
}
