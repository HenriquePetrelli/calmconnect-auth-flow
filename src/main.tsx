import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { preloadCoreRoutesWhenIdle } from './lib/routePreload'

createRoot(document.getElementById("root")!).render(<App />);

// Preload core route chunks when browser is idle
preloadCoreRoutesWhenIdle();
