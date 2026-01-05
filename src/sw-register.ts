// Only register service worker on web (not Capacitor/mobile)
const isCapacitor = window.location.protocol === 'file:' ||
  (window as any).Capacitor !== undefined;

if ("serviceWorker" in navigator && !isCapacitor) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}