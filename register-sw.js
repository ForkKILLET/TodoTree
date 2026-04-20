
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        let refreshing = false;

        // Triggers the actual page reload AFTER the new worker activates
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        navigator.serviceWorker.register("/TodoTree/sw.js", { scope: "./" })
          .then((reg) => {
            window.dispatchEvent(new CustomEvent("rsbuild-plugin-pwa:registered", { 
              detail: { registration: reg } 
            }));

            // Check if there is already a waiting worker from a previous visit
            if (reg.waiting) {
              dispatchWaitingRefresh(reg.waiting);
              return;
            }

            // Listen for a new service worker installing in the background
            reg.addEventListener("updatefound", () => {
              const newWorker = reg.installing;
              if (!newWorker) return;

              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed") {
                  // If there's a controller, it's an update
                  if (navigator.serviceWorker.controller) {
                    dispatchWaitingRefresh(newWorker);
                  } else {
                    // If no controller, it's the first install!
                    window.dispatchEvent(new CustomEvent("rsbuild-plugin-pwa:offline-ready"));
                  }
                }
              });
            });
          })
          .catch((err) => {
            console.error("SW registration failed:", err);
            window.dispatchEvent(new CustomEvent("rsbuild-plugin-pwa:register-error", { 
              detail: { error: err } 
            }));
          });

        function dispatchWaitingRefresh(worker) {
          const event = new CustomEvent("rsbuild-plugin-pwa:waiting-refresh", { 
            detail: { worker } 
          });
          window.dispatchEvent(event);
        }
      });
    }
  