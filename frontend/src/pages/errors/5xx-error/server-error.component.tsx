import { Button, Container, Group, Text, Title } from '@mantine/core'
import { useNavigate } from 'react-router'

import classes from './ServerError.module.css'

export function ErrorPageComponent() {
    const navigate = useNavigate()

    const handleRefresh = () => {
        navigate(0)
    }

    return (
        <div className={classes.root}>
            <Container>
                <div className={classes.label}>ALLEN VPN</div>
                <Title className={classes.title}>Не удалось открыть страницу</Title>
                <Text className={classes.description} size="lg" ta="center">
                    Попробуйте обновить её через несколько секунд.
                </Text>
                <Group justify="center">
                    <Button onClick={handleRefresh} size="md" variant="outline">
                        Попробовать снова
                    </Button>
                </Group>
            </Container>
        </div>
    )
}
