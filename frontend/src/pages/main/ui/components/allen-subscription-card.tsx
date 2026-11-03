import { IconCalendar, IconChartBar } from '@tabler/icons-react'

import { useTranslation } from '@shared/hooks'
import { formatDate } from '@shared/utils/config-parser'

import { useSubscription } from '@entities/subscription-info-store'

import classes from './subscription.module.css'
export function AllenSubscriptionCard() {
    const { user } = useSubscription()
    const { currentLang, baseTranslations } = useTranslation()
    const ru = currentLang === 'ru'
    const active = user.userStatus === 'ACTIVE'
    const unlimited = Number(user.trafficLimitBytes) === 0 || user.trafficLimit === '0'
    const used = Number(user.trafficUsedBytes)
    const limit = Number(user.trafficLimitBytes)
    const percent = !unlimited && limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0
    return (
        <section className={classes.card}>
            <div className={classes.top}>
                <h2>{ru ? 'Подписка' : 'Subscription'}</h2>
                <span className={active ? classes.active : classes.inactive}>
                    {active ? (ru ? 'Активна' : 'Active') : ru ? 'Неактивна' : 'Inactive'}
                </span>
            </div>
            <div className={classes.row}>
                <IconCalendar size={17} />
                <div>
                    <small>{ru ? 'Действует до' : 'Valid until'}</small>
                    <strong>{formatDate(user.expiresAt, currentLang, baseTranslations)}</strong>
                </div>
            </div>
            <div className={classes.row}>
                <IconChartBar size={17} />
                <div>
                    <small>{ru ? 'Использовано трафика' : 'Traffic used'}</small>
                    <strong>
                        {user.trafficUsed}
                        <span>
                            {' '}
                            / {unlimited ? (ru ? 'безлимит' : 'unlimited') : user.trafficLimit}
                        </span>
                    </strong>
                </div>
            </div>
            {!unlimited && (
                <div
                    className={classes.meter}
                    role="meter"
                    aria-label={ru ? 'Расход трафика' : 'Traffic usage'}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(percent)}
                >
                    <span style={{ width: `${percent}%` }} />
                </div>
            )}
        </section>
    )
}
