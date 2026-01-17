import { useEffect } from 'react';
import { LiveStream } from './components/LiveStream';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSettingsStore } from './store/settingsStore';
import { loadGoogleFont } from './hooks/useGoogleFonts';

function App() {
  const theme = useSettingsStore((state) => state.theme);
  const fontFamily = useSettingsStore((state) => state.subtitleStyle.fontFamily);

  // Load saved Google Font on startup
  useEffect(() => {
    if (fontFamily) {

      loadGoogleFont(fontFamily);
    }
  }, [fontFamily]);

  return (
    <div className={theme === 'light' ? 'theme-light' : ''}>
      <ErrorBoundary>
        <LiveStream />
      </ErrorBoundary>
    </div>
  );
}

export default App;
