const routeImports: Record<string, () => Promise<unknown>> = {
  "/home": () => import("@/pages/Home"),
  "/chat": () => import("@/pages/Chat"),
  "/sos": () => import("@/pages/SOS"),
  "/appointments": () => import("@/pages/Appointments"),
  "/statistics": () => import("@/pages/Statistics"),
  "/notifications": () => import("@/pages/Notifications"),
  "/profile": () => import("@/pages/Profile"),
};

const preloadedRoutes = new Set<string>();

export const preloadRoute = (path: string) => {
  const normalizedPath = path.startsWith("/statistics") ? "/statistics" : path;
  const loader = routeImports[normalizedPath];

  if (!loader || preloadedRoutes.has(normalizedPath)) return;
  preloadedRoutes.add(normalizedPath);
  void loader();
};

export const preloadCoreRoutesWhenIdle = () => {
  const preload = () => ["/home", "/chat", "/sos", "/appointments", "/statistics"].forEach(preloadRoute);

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 2500 });
    return;
  }

  window.setTimeout(preload, 1200);
};