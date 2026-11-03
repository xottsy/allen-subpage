import styles from './allen-intro.module.css'

export function AllenIntro() {
    return (
        <section className={styles.intro} aria-labelledby="allen-connect-title">
            <div className={styles.eyebrow}>Личное подключение</div>
            <h1 className={styles.title} id="allen-connect-title">
                Ваш VPN, шаг за шагом
            </h1>
            <p className={styles.description}>
                Всё для подключения на одной странице. Выберите своё устройство и следуйте
                инструкции ниже.
            </p>
            <div className={styles.steps}>
                {['Установите приложение', 'Добавьте подписку', 'Включите подключение'].map(
                    (label, i) => (
                        <div className={styles.step} key={label}>
                            <span className={styles.number}>{i + 1}</span>
                            <span>{label}</span>
                        </div>
                    )
                )}
            </div>
        </section>
    )
}
