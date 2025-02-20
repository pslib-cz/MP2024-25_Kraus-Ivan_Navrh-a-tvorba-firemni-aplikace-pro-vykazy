import React, { createContext, useContext, useState, useEffect } from 'react';
import Alert from '@/components/Alert';

export interface Message {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  dismissible: boolean;
}

interface MessageContextProps {
  showMessage: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    dismissible?: boolean,
  ) => number;
  hideMessage: (id: number) => void;
}

const MessageContext = createContext<MessageContextProps | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);

  const showMessage = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    dismissible: boolean = true,
  ): number => {
    const id = Date.now();
    setMessages((prev) => [...prev, { id, message, type, dismissible }]);
    return id;
  };

  const hideMessage = (id: number) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
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
    <MessageContext.Provider value={{ showMessage, hideMessage }}>
      {children}
      <div className="message-container">
        {messages.map(({ id, message, type, dismissible }) => (
          <Alert
            key={id}
            message={message}
            type={type}
            onClose={dismissible ? () => hideMessage(id) : undefined}
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
