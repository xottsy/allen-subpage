import { Image } from '@mantine/core'
import { TSubscriptionPagePlatformKey } from '@remnawave/subscription-page-types'
import { IconArrowUpRight, IconMessageCircle } from '@tabler/icons-react'
import { InstallationGuideConnector, RawKeysWidget } from '@widgets/main'
import { useEffect } from 'react'

import { Page } from '@shared/ui'
import { LanguagePicker } from '@shared/ui/language-picker/language-picker.shared'

import { useAppConfig, useAppConfigStoreActions, useCurrentLang } from '@entities/app-config-store'

import { AllenHelpCard } from './allen-help-card'
import { AllenIntro } from './allen-intro'
import { AllenSubscriptionCard } from './allen-subscription-card'
import { GuidedBlockRenderer } from './guided-block-renderer'
import classes from './main.module.css'

interface IMainPageComponentProps {
    isMobile: boolean
    platform: TSubscriptionPagePlatformKey | undefined
}

export const MainPageComponent = ({ isMobile, platform }: IMainPageComponentProps) => {
    const config = useAppConfig()
    const currentLang = useCurrentLang()
    useEffect(() => {
        document.documentElement.lang = currentLang
    }, [currentLang])
    const { setLanguage } = useAppConfigStoreActions()
    const ru = currentLang === 'ru'
    const support = config.brandingSettings.supportUrl
    const logo = config.brandingSettings.logoUrl
    const hasCustomLogo = Boolean(logo && !logo.includes('docs.rw'))
    const hasPlatformApps = Object.fromEntries(
        (['ios', 'android', 'windows', 'macos', 'linux', 'androidTV', 'appleTV'] as const).map(
            (key) => [key, Boolean(config.platforms[key]?.apps.length)]
        )
    ) as Record<TSubscriptionPagePlatformKey, boolean>
    return (
        <Page>
            <header className={classes.header}>
                <div className={classes.headerInner}>
                    <div className={classes.brand}>
                        {hasCustomLogo ? (
                            <Image src={logo} alt="" w={38} h={38} fit="contain" />
                        ) : (
                            <span className={classes.brandMark} aria-hidden="true">
                                <svg viewBox="0 0 32 32" fill="none">
                                    <path
                                        d="m7 24 9-17 9 17M11 18h10"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </span>
                        )}
                        <span>
                            {config.brandingSettings.title}
                            <small>{ru ? 'Личное подключение' : 'Your personal connection'}</small>
                        </span>
                    </div>
                    <div className={classes.headerActions}>
                        <LanguagePicker
                            currentLang={currentLang}
                            locales={config.locales}
                            onLanguageChange={setLanguage}
                        />
                        {support && (
                            <a
                                className={classes.headerHelp}
                                href={support}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <IconMessageCircle size={18} />
                                <span>{ru ? 'Поддержка' : 'Support'}</span>
                                <IconArrowUpRight size={15} />
                            </a>
                        )}
                    </div>
                </div>
            </header>
            <div className={classes.container}>
                <AllenIntro />
                <div className={classes.workspace}>
                    <div className={classes.main}>
                        {Object.values(hasPlatformApps).some(Boolean) ? (
                            <InstallationGuideConnector
                                BlockRenderer={GuidedBlockRenderer}
                                hasPlatformApps={hasPlatformApps}
                                isMobile={isMobile}
                                platform={platform}
                            />
                        ) : (
                            <section className={classes.empty}>
                                <h2>{ru ? 'Поможем с подключением' : 'Let’s get you connected'}</h2>
                                <p>
                                    {ru
                                        ? 'Инструкции для устройств пока не добавлены. Обратитесь в поддержку.'
                                        : 'Device instructions are not available yet. Please contact support.'}
                                </p>
                            </section>
                        )}
                        <RawKeysWidget isMobile={isMobile} />
                    </div>
                    <aside
                        className={classes.sidebar}
                        aria-label={ru ? 'Ваша подписка и помощь' : 'Subscription and help'}
                    >
                        {config.uiConfig.subscriptionInfoBlockType !== 'hidden' && (
                            <AllenSubscriptionCard />
                        )}
                        <AllenHelpCard />
                    </aside>
                </div>
                <footer className={classes.footer}>
                    <span>
                        {config.brandingSettings.title}
                        <span className={classes.footerDot}>·</span>
                        {ru ? 'Оставайтесь на связи' : 'Stay connected'}
                    </span>
                    <a
                        href="https://github.com/xottsy/allen-subpage/tree/codex/device-antifraud"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {ru ? 'Исходный код' : 'Source code'}
                        <IconArrowUpRight size={13} />
                    </a>
                </footer>
            </div>
        </Page>
    )
}
