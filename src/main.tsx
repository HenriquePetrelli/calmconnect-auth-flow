import './lib/installRequestDedupe'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { preloadCoreRoutesWhenIdle } from './lib/routePreload'
import { silenceVerboseLogsInProduction } from './lib/productionLogging'
import { currentFrameContext, isUntrustedFrame, renderFrameBlockedNotice } from './lib/frameGuard'

let storage: Storage | null = null
try {
  storage = window.localStorage
} catch {
  // storage blocked (private mode): diagnostics flag just can't be read
}
silenceVerboseLogsInProduction(import.meta.env.PROD, window.location.search, storage)

// Outro site exibindo o Soliv num iframe: não monta o app (clickjacking).
if (isUntrustedFrame(currentFrameContext())) {
  renderFrameBlockedNotice()
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}

// Preload core route chunks when browser is idle
preloadCoreRoutesWhenIdle();
