import React, { useEffect, useRef } from "react";
import { useNetwork } from "@/providers/NetworkProvider";
import { useMessage } from "@/providers/MessageProvider";

const NetworkStatus: React.FC = () => {
    const { isOnline } = useNetwork();
    const { showMessage, hideMessage } = useMessage();
    const offlineMessageId = useRef<number | null>(null);

    useEffect(() => {
        if (!isOnline && offlineMessageId.current === null) {
            offlineMessageId.current = showMessage(
                "Jste offline. Některé funkce nemusí být dostupné.",
                "warning",
                false
            );
        }

        if (isOnline && offlineMessageId.current !== null) {
            hideMessage(offlineMessageId.current);
            offlineMessageId.current = null;

            showMessage("Jste zpět online!", "success");
        }
    }, [isOnline, showMessage, hideMessage]);

    return null;
};

export default NetworkStatus;
