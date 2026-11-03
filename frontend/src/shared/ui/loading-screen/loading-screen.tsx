import { Center, Stack } from '@mantine/core'

import classes from './loading.module.css'

export function LoadingScreen({ height = '100%' }: { height?: string }) {
    return (
        <Center h={height}>
            <Stack align="center" gap="xs" w="100%">
                <span className={classes.mark} aria-hidden="true">
                    A
                </span>
                <span className={classes.label} role="status">
                    Открываем вашу подписку…
                </span>
                <span className={classes.loader} aria-hidden="true" />
            </Stack>
        </Center>
    )
}
