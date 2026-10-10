// Loads YouTube's player script once and resolves with the `YT` object.
let apiPromise;
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => {
        apiPromise = undefined;
        reject(new Error('The trailer player did not respond.'));
      }, 8000);
      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        previous?.();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        apiPromise = undefined;
        reject(new Error('The trailer player could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}
