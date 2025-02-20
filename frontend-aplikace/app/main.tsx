import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './providers/AuthProvider';
import { ScreenSizeProvider } from './providers/ScreenSizeProvider';
import { MenuProvider } from './providers/MenuProvider';
import { MessageProvider } from '@/providers/MessageProvider';
import { ReportProvider } from '@/providers/ReportProvider';
import { ClientsProvider } from '@/providers/ClientsProvider';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { UserProvider } from '@/providers/UserProvider';
import { TaskProvider } from '@/providers/TaskProvider';
import { RoleProvider } from '@/providers/RoleProvider';
import { JobTitleProvider } from '@/providers/JobTitleProvider';

createRoot(document.getElementById('app') as HTMLElement).render(
  <StrictMode>
    <ScreenSizeProvider>
      <NetworkProvider>
        <AuthProvider>
          <UserProvider>
            <ClientsProvider>
              <TaskProvider>
                <ReportProvider>
                  <MenuProvider>
                    <MessageProvider>
                      <RoleProvider>
                        <JobTitleProvider>
                          <App />
                        </JobTitleProvider>
                      </RoleProvider>
                    </MessageProvider>
                  </MenuProvider>
                </ReportProvider>
              </TaskProvider>
            </ClientsProvider>
          </UserProvider>
        </AuthProvider>
      </NetworkProvider>
    </ScreenSizeProvider>
  </StrictMode>,
);

// Registrace Service Workeru
if ('serviceWorker' in navigator) {
  window.addEventListener('offline', () => {
    console.log('Offline mode');
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/serviceWorker.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful:', registration);
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}
