import { IconArrowDown, IconCheck, IconPower, IconShieldCheck } from '@tabler/icons-react'

import { useCurrentLang } from '@entities/app-config-store'

import classes from './allen-intro.module.css'
export function AllenIntro() {
    const ru = useCurrentLang() === 'ru'
    return (
        <section className={classes.intro}>
            <div className={classes.copy}>
                <div className={classes.eyebrow}>
                    <span />
                    {ru ? 'ВАШ VPN. ВАШИ УСТРОЙСТВА.' : 'YOUR VPN. YOUR DEVICES.'}
                </div>
                <h1>
                    {ru ? (
                        <>
                            На связи.
                            <br />
                            Без лишних шагов.
                        </>
                    ) : (
                        <>
                            Stay connected.
                            <br />
                            Keep it simple.
                        </>
                    )}
                </h1>
                <p>
                    {ru
                        ? 'Выберите устройство — и мы проведём вас от установки приложения до подключения.'
                        : 'Choose your device. We’ll guide you from installing the app to connecting.'}
                </p>
                <a href="#connection-guide" className={classes.start}>
                    {ru ? 'Настроить подключение' : 'Set up your connection'}
                    <IconArrowDown size={17} />
                </a>
            </div>
            <div className={classes.visual} aria-hidden="true">
                <div className={classes.orbit} />
                <span className={classes.visualLabel}>ALLEN / CONNECTION</span>
                <div className={classes.phone}>
                    <span className={classes.speaker} />
                    <span className={classes.phoneBrand}>
                        allen<span>vpn</span>
                    </span>
                    <div className={classes.power}>
                        <IconPower size={42} stroke={1.5} />
                    </div>
                    <span className={classes.phoneCaption}>
                        {ru ? 'Всё начинается с одного нажатия' : 'It starts with one tap'}
                    </span>
                    <div className={classes.phoneBottom}>
                        <IconShieldCheck size={18} />
                        <span>{ru ? 'Личное подключение' : 'Personal connection'}</span>
                    </div>
                </div>
                <span className={classes.floating}>
                    <IconCheck size={16} />
                    {ru ? 'Просто настроить' : 'Easy to set up'}
                </span>
                <span className={classes.visualFoot}>01 — 02 — 03</span>
            </div>
        </section>
    )
}
