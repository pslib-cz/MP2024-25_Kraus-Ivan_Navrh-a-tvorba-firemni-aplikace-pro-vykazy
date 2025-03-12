import { useEffect, useRef } from 'react';
import { useTimerContext } from '@/providers/TimerProvider';
import { useMessage } from '@/providers/MessageProvider';

const TimerStatusMessage: React.FC = () => {
    const { timers } = useTimerContext();
    const { showMessage, hideMessage } = useMessage();
    const messageIdRef = useRef<number | null>(null);

    useEffect(() => {
        const isRunning = timers.some(timer => timer.isRunning);
        if (isRunning && messageIdRef.current === null) {
            const id = showMessage(
                "Probíhá měření času.",
                "info",
                false,
                () => {
                    window.location.href = '/toggle';
                }
            );
            messageIdRef.current = id;
        }
        if (!isRunning && messageIdRef.current !== null) {
            hideMessage(messageIdRef.current);
            messageIdRef.current = null;
        }
    }, [timers, showMessage, hideMessage]);

    return null;
};

export default TimerStatusMessage;
