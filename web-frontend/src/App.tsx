import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './store/AuthContext';
import { ChatSseProvider } from './store/ChatSseContext';
import theme from './theme';
import router from './router';
import './i18n';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ChatSseProvider>
          <RouterProvider router={router} />
        </ChatSseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
