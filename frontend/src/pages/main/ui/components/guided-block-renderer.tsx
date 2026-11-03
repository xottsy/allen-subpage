import { IconArrowLeft, IconArrowRight, IconCheck, IconRotate } from '@tabler/icons-react'
import { IBlockRendererProps } from '@widgets/main/installation-guide/components/blocks/renderer-block.interface'
import { useId, useState } from 'react'

import { getLocalizedText } from '@shared/utils/config-parser'

import classes from './guide.module.css'
const plain = (html: string) =>
    new DOMParser().parseFromString(html, 'text/html').body.textContent || ''
export function GuidedBlockRenderer({
    blocks,
    currentLang,
    renderBlockButtons
}: IBlockRendererProps) {
    const [step, setStep] = useState(0)
    const id = useId()
    const ru = currentLang === 'ru'
    const block = blocks[step]
    if (!block) return null
    return (
        <div>
            <div
                className={classes.steps}
                role="tablist"
                aria-label={ru ? 'Шаги подключения' : 'Connection steps'}
            >
                {blocks.map((item, index) => (
                    <button
                        type="button"
                        key={index}
                        id={`${id}-tab-${index}`}
                        role="tab"
                        aria-selected={index === step}
                        aria-controls={`${id}-panel`}
                        tabIndex={index === step ? 0 : -1}
                        onKeyDown={(event) => {
                            const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
                            if (!keys.includes(event.key)) return
                            event.preventDefault()
                            const next =
                                event.key === 'Home'
                                    ? 0
                                    : event.key === 'End'
                                      ? blocks.length - 1
                                      : (index +
                                            (event.key === 'ArrowRight' ? 1 : -1) +
                                            blocks.length) %
                                        blocks.length
                            setStep(next)
                            document.getElementById(`${id}-tab-${next}`)?.focus()
                        }}
                        onClick={() => setStep(index)}
                        className={`${classes.stepTab} ${index === step ? classes.current : ''} ${index < step ? classes.past : ''}`}
                    >
                        <span>
                            {index < step ? (
                                <IconCheck size={13} />
                            ) : (
                                String(index + 1).padStart(2, '0')
                            )}
                        </span>
                        <span>{plain(getLocalizedText(item.title, currentLang))}</span>
                    </button>
                ))}
            </div>
            <div
                className={classes.panel}
                id={`${id}-panel`}
                role="tabpanel"
                aria-labelledby={`${id}-tab-${step}`}
            >
                <span className={classes.progress}>
                    {ru
                        ? `ШАГ ${step + 1} ИЗ ${blocks.length}`
                        : `STEP ${step + 1} OF ${blocks.length}`}
                </span>
                <h3>{plain(getLocalizedText(block.title, currentLang))}</h3>
                <div
                    className={classes.description}
                    dangerouslySetInnerHTML={{
                        __html: getLocalizedText(block.description, currentLang)
                    }}
                />
                <div className={classes.buttons}>{renderBlockButtons(block.buttons, 'filled')}</div>
                {step === blocks.length - 1 && (
                    <p className={classes.lastHint}>
                        {ru
                            ? 'Откройте любой сайт, чтобы проверить подключение. Если что-то не получается — мы рядом.'
                            : 'Open a website to check your connection. If you need help, just contact us.'}
                    </p>
                )}
            </div>
            <div className={classes.controls}>
                <button
                    type="button"
                    disabled={step === 0}
                    onClick={() => setStep(step - 1)}
                    className={classes.back}
                >
                    <IconArrowLeft size={15} />
                    {ru ? 'Назад' : 'Back'}
                </button>
                {step < blocks.length - 1 ? (
                    <button
                        type="button"
                        className={classes.next}
                        onClick={() => setStep(step + 1)}
                    >
                        {step === 0
                            ? ru
                                ? 'Уже установлено'
                                : 'Already installed'
                            : ru
                              ? 'Следующий шаг'
                              : 'Next step'}
                        <IconArrowRight size={16} />
                    </button>
                ) : (
                    <button type="button" className={classes.back} onClick={() => setStep(0)}>
                        <IconRotate size={15} />
                        {ru ? 'Начать сначала' : 'Start again'}
                    </button>
                )}
            </div>
        </div>
    )
}
