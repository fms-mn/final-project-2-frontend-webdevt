// Normalizes native and provider events while retaining the reason playback paused.
export function createTrailerPlayback(adapter, initialPolicy, callbacks) {
  let policy = initialPolicy;
  let phase = 'loading';
  let ready = false;
  let disposed = false;
  let automaticallyPaused = false;
  let pendingPlay = false;
  let cancelPendingPlay = false;
  let hasPlayed = false;
  let endedReported = false;
  const status = value => { phase = value; callbacks.onStatus(value); };
  const fail = () => {
    if (disposed || phase === 'failed') return;
    pendingPlay = false;
    status('failed');
    adapter.pause();
    callbacks.onFailure();
  };
  const blocked = () => {
    if (disposed || phase === 'failed' || phase === 'playing') return;
    pendingPlay = false;
    automaticallyPaused = false;
    status('blocked');
  };
  const play = () => {
    if (disposed || !ready || pendingPlay || phase === 'failed') return;
    pendingPlay = true;
    try {
      Promise.resolve(adapter.play()).catch(error => {
        if (disposed || phase === 'failed' || error?.name === 'AbortError') { pendingPlay = false; return; }
        if (error?.name === 'NotAllowedError') blocked();
        else fail();
      });
    } catch { fail(); }
  };
  const sync = () => {
    if (disposed || !ready || phase === 'failed') return;
    if (!policy.active || policy.manualPaused) {
      if (phase === 'playing' || pendingPlay) {
        automaticallyPaused = !policy.manualPaused;
        adapter.pause();
      }
    } else if (policy.autoplay && phase !== 'blocked' && phase !== 'ended' && (!hasPlayed || automaticallyPaused)) play();
  };
  return {
    ready() { if (disposed || ready || phase === 'failed') return; ready = true; status('ready'); sync(); },
    update(next) {
      const stoppedAutoplay = policy.autoplay && !next.autoplay;
      policy = next;
      if (stoppedAutoplay && (phase === 'playing' || pendingPlay)) { cancelPendingPlay = pendingPlay; automaticallyPaused = true; adapter.pause(); }
      sync();
    },
    playing() {
      if (disposed || phase === 'failed') return;
      pendingPlay = false;
      if (!policy.active || cancelPendingPlay) { cancelPendingPlay = false; automaticallyPaused = !policy.manualPaused; adapter.pause(); return; }
      hasPlayed = true;
      endedReported = false;
      automaticallyPaused = false;
      policy = { ...policy, manualPaused: false };
      callbacks.onManualPause(false);
      status('playing');
    },
    paused(active = policy.active) {
      if (disposed || phase === 'failed' || phase === 'ended') return;
      policy = { ...policy, active };
      if (!active && !policy.manualPaused) automaticallyPaused = true;
      pendingPlay = false;
      if (!automaticallyPaused && hasPlayed) {
        policy = { ...policy, manualPaused: true };
        callbacks.onManualPause(true);
      }
      status('paused');
      // Handles a late provider PAUSED event after visibility was restored.
      if (automaticallyPaused && policy.active) sync();
    },
    ended() {
      if (disposed || phase === 'failed' || !hasPlayed || endedReported) return;
      endedReported = true;
      pendingPlay = false;
      automaticallyPaused = false;
      status('ended');
      callbacks.onEnded();
    },
    resume() {
      if (disposed || !ready || phase === 'failed' || !policy.active) return;
      if (phase === 'ended') adapter.rewind();
      cancelPendingPlay = false;
      policy = { ...policy, manualPaused: false };
      callbacks.onManualPause(false);
      play();
    },
    pause() {
      if (disposed || !ready) return;
      policy = { ...policy, manualPaused: true };
      cancelPendingPlay = pendingPlay;
      automaticallyPaused = false;
      callbacks.onManualPause(true);
      adapter.pause();
      status('paused');
    },
    blocked,
    fail,
    destroy() { if (disposed) return; disposed = true; adapter.destroy(); },
  };
}
