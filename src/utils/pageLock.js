const locks = new WeakMap();

function hold(target, property, value) {
  const properties = locks.get(target) || new Map();
  const state = properties.get(property) || { count: 0, original: target[property] };
  state.count += 1;
  properties.set(property, state);
  locks.set(target, properties);
  target[property] = value;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.count -= 1;
    if (state.count === 0) {
      target[property] = state.original;
      properties.delete(property);
      if (properties.size === 0) locks.delete(target);
    }
  };
}

export function lockPageScroll({ inertRoot = null } = {}) {
  const release = [hold(document.body.style, 'overflow', 'hidden'), hold(document.documentElement.style, 'overflow', 'hidden')];
  if (inertRoot) release.push(hold(inertRoot, 'inert', true));
  return () => release.forEach(unlock => unlock());
}
