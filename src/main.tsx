import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { preloadCoreRoutesWhenIdle } from './lib/routePreload'
import { silenceVerboseLogsInProduction } from './lib/productionLogging'

let storage: Storage | null = null
try {
  storage = window.localStorage
} catch {
  // storage blocked (private mode): diagnostics flag just can't be read
}
silenceVerboseLogsInProduction(import.meta.env.PROD, window.location.search, storage)

createRoot(document.getElementById("root")!).render(<App />);

// Preload core route chunks when browser is idle
preloadCoreRoutesWhenIdle();
