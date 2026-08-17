const SERVICE_WORKER_READY_TIMEOUT_MS = 10_000;

function waitForActiveRegistration(
  registration: ServiceWorkerRegistration
): Promise<ServiceWorkerRegistration> {
  if (registration.active) return Promise.resolve(registration);

  return new Promise((resolve, reject) => {
    const workers = new Set<ServiceWorker>();

    const cleanup = () => {
      window.clearTimeout(timeout);
      registration.removeEventListener("updatefound", handleUpdateFound);
      for (const worker of workers) {
        worker.removeEventListener("statechange", finish);
      }
      workers.clear();
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Service worker did not become active in time."));
    }, SERVICE_WORKER_READY_TIMEOUT_MS);

    const finish = () => {
      if (!registration.active) return;
      cleanup();
      resolve(registration);
    };

    const watchWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      if (worker.state === "activated") {
        finish();
        return;
      }
      workers.add(worker);
      worker.addEventListener("statechange", finish, { once: false });
    };

    const handleUpdateFound = () => {
      watchWorker(registration.installing);
    };

    watchWorker(registration.installing);
    watchWorker(registration.waiting);

    registration.addEventListener("updatefound", handleUpdateFound);
  });
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return waitForActiveRegistration(registration);
}
