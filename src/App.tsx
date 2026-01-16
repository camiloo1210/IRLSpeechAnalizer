import { LiveStream } from './components/LiveStream';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSettingsStore } from './store/settingsStore';

function App() {
  const theme = useSettingsStore((state) => state.theme);

  return (
    <div className={theme === 'light' ? 'theme-light' : ''}>
      <ErrorBoundary>
        <LiveStream />
      </ErrorBoundary>
    </div>
  );
}

export default App;
