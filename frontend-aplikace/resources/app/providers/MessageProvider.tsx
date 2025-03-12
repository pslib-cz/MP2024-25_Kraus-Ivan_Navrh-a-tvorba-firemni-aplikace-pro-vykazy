import React, { createContext, useContext, useState, useEffect } from 'react';
import Alert from '@/components/Alert';

export interface Message {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    dismissible: boolean;
    onClick?: () => void;
}

interface MessageContextProps {
    showMessage: (
        message: string,
        type?: 'success' | 'error' | 'info' | 'warning',
        dismissible?: boolean,
        onClick?: () => void,
    ) => number;
    hideMessage: (id: number) => void;
    updateMessage: (id: number, newMessage: string) => void;
}

const MessageContext = createContext<MessageContextProps | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<Message[]>([]);

    const showMessage = (
        message: string,
        type: 'success' | 'error' | 'info' | 'warning' = 'info',
        dismissible: boolean = true,
        onClick?: () => void,
    ): number => {
        const id = Date.now();
        setMessages((prev) => [...prev, { id, message, type, dismissible, onClick }]);
        return id;
    };

    const hideMessage = (id: number) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
    };

    const updateMessage = (id: number, newMessage: string) => {
        setMessages((prev) =>
            prev.map((msg) => (msg.id === id ? { ...msg, message: newMessage } : msg)),
        );
    };

    useEffect(() => {
        const timers = messages
            .filter((msg) => msg.dismissible)
            .map((msg) =>
                setTimeout(() => {
                    hideMessage(msg.id);
                }, 4000),
            );

        return () => {
            timers.forEach(clearTimeout);
        };
    }, [messages]);

    return (
        <MessageContext.Provider value={{ showMessage, hideMessage, updateMessage }}>
            {children}
            <div className="message-container">
                {messages.map(({ id, message, type, dismissible, onClick }) => (
                    <Alert
                        key={id}
                        message={message}
                        type={type}
                        onClose={dismissible ? () => hideMessage(id) : undefined}
                        onClick={onClick}
                    />
                ))}
            </div>
        </MessageContext.Provider>
    );
};

export const useMessage = (): MessageContextProps => {
    const context = useContext(MessageContext);
    if (!context) {
        throw new Error('useMessage must be used within a MessageProvider');
    }
    return context;
};
