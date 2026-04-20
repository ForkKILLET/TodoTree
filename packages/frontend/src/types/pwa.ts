export type PwaWaitingRefreshEvent = CustomEvent<{
  worker: ServiceWorker
}>

declare global {
  interface WindowEventMap {
    'rsbuild-plugin-pwa:waiting-refresh': PwaWaitingRefreshEvent
  }
}
