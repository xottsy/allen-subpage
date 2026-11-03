import { Button, ButtonVariant, Group } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
    TSubscriptionPageButtonConfig,
    TSubscriptionPagePlatformKey
} from '@remnawave/subscription-page-types'
import { useState } from 'react'

import { useTranslation } from '@shared/hooks'
import { getIconFromLibrary } from '@shared/utils/config-parser'
import { constructSubscriptionUrl } from '@shared/utils/construct-subscription-url'
import { TemplateEngine } from '@shared/utils/template-engine'

import { useAppConfig } from '@entities/app-config-store'
import { useSubscription } from '@entities/subscription-info-store'

import { IBlockRendererProps } from './components/blocks/renderer-block.interface'
import classes from './installation-guide.module.css'
export type TBlockVariant = 'accordion' | 'cards' | 'minimal' | 'timeline'
interface IProps {
    BlockRenderer: React.ComponentType<IBlockRendererProps>
    hasPlatformApps: Record<TSubscriptionPagePlatformKey, boolean>
    isMobile: boolean
    platform: TSubscriptionPagePlatformKey | undefined
}
export const InstallationGuideConnector = ({
    isMobile,
    hasPlatformApps,
    BlockRenderer,
    platform
}: IProps) => {
    const { t, currentLang, baseTranslations } = useTranslation()
    const ru = currentLang === 'ru'
    const { platforms, svgLibrary } = useAppConfig()
    const clipboard = useClipboard({ timeout: 2000 })
    const subscription = useSubscription()
    const available = (Object.keys(hasPlatformApps) as TSubscriptionPagePlatformKey[]).filter(
        (key) => hasPlatformApps[key]
    )
    const [selectedPlatform, setSelectedPlatform] = useState<TSubscriptionPagePlatformKey>(() =>
        platform && hasPlatformApps[platform] ? platform : available[0]
    )
    const [selectedAppIndex, setSelectedAppIndex] = useState(0)
    const apps = platforms[selectedPlatform]!.apps
    const selectedApp = apps[selectedAppIndex] ?? apps[0]
    const subscriptionUrl = constructSubscriptionUrl(
        window.location.href,
        subscription.user.shortUuid
    )
    const handleButton = (button: TSubscriptionPageButtonConfig) => {
        const url =
            button.type === 'external'
                ? button.link
                : TemplateEngine.formatWithMetaInfo(button.link, {
                      username: subscription.user.username,
                      subscriptionUrl
                  })
        if (!url) return
        if (button.type === 'copyButton') {
            clipboard.copy(url)
            notifications.show({
                title: t(baseTranslations.linkCopied),
                message: t(baseTranslations.linkCopiedToClipboard),
                color: 'green'
            })
        } else if (button.type === 'external' || button.type === 'subscriptionLink') {
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }
    const renderButtons = (buttons: TSubscriptionPageButtonConfig[], variant: ButtonVariant) => (
        <Group gap="xs" wrap="wrap">
            {buttons.map((button, index) => (
                <Button
                    key={index}
                    onClick={() => handleButton(button)}
                    variant={variant}
                    leftSection={
                        button.svgIconKey ? (
                            <span
                                className={classes.buttonIcon}
                                dangerouslySetInnerHTML={{
                                    __html: getIconFromLibrary(button.svgIconKey, svgLibrary)
                                }}
                            />
                        ) : undefined
                    }
                >
                    {t(button.text)}
                </Button>
            ))}
        </Group>
    )
    return (
        <section className={classes.guide} id="connection-guide" aria-labelledby="guide-heading">
            <div className={classes.heading}>
                <span className={classes.sectionNumber}>01 /</span>
                <div>
                    <h2 id="guide-heading">{ru ? 'Давайте подключимся' : 'Let’s get connected'}</h2>
                    <p>
                        {ru
                            ? 'Начните с устройства, на котором нужен VPN'
                            : 'Choose the device you want to connect'}
                    </p>
                </div>
            </div>
            <div
                className={classes.platforms}
                role="group"
                aria-label={ru ? 'Ваше устройство' : 'Your device'}
            >
                {available.map((key) => (
                    <button
                        type="button"
                        key={key}
                        aria-pressed={selectedPlatform === key}
                        className={`${classes.platform} ${selectedPlatform === key ? classes.selected : ''}`}
                        onClick={() => {
                            setSelectedPlatform(key)
                            setSelectedAppIndex(0)
                        }}
                    >
                        <span
                            dangerouslySetInnerHTML={{
                                __html: getIconFromLibrary(platforms[key]!.svgIconKey, svgLibrary)
                            }}
                        />
                        {t(platforms[key]!.displayName)}
                    </button>
                ))}
            </div>
            {apps.length > 0 && (
                <div className={classes.appRow}>
                    <span>{ru ? 'Приложение' : 'Application'}</span>
                    <div
                        className={classes.apps}
                        role="group"
                        aria-label={ru ? 'Приложение VPN' : 'VPN application'}
                    >
                        {apps.map((app, index) => (
                            <button
                                type="button"
                                key={app.name}
                                aria-pressed={index === selectedAppIndex}
                                className={index === selectedAppIndex ? classes.appSelected : ''}
                                onClick={() => setSelectedAppIndex(index)}
                            >
                                {app.name}
                                {app.featured && (
                                    <small>{ru ? 'Рекомендуем' : 'Recommended'}</small>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {selectedApp && (
                <BlockRenderer
                    key={`${selectedPlatform}-${selectedApp.name}`}
                    blocks={selectedApp.blocks}
                    currentLang={currentLang}
                    getIconFromLibrary={(key) => getIconFromLibrary(key, svgLibrary)}
                    isMobile={isMobile}
                    renderBlockButtons={renderButtons}
                    svgLibrary={svgLibrary}
                />
            )}
        </section>
    )
}
