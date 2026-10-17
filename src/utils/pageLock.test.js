import test from 'node:test';
import assert from 'node:assert/strict';
import { lockPageScroll } from './pageLock.js';

const originalDocument = globalThis.document;
test.afterEach(() => { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; });

test('overlapping panels restore page scrolling in either close order', () => {
  for (const order of [[0, 1], [1, 0]]) {
    const body = { style: { overflow: '' } };
    const documentElement = { style: { overflow: 'auto' } };
    globalThis.document = { body, documentElement };
    const release = [lockPageScroll(), lockPageScroll()];
    release[order[0]]();
    assert.equal(body.style.overflow, 'hidden');
    assert.equal(documentElement.style.overflow, 'hidden');
    release[order[1]]();
    assert.equal(body.style.overflow, '');
    assert.equal(documentElement.style.overflow, 'auto');
    release[order[1]]();
    assert.equal(documentElement.style.overflow, 'auto', 'cleanup is safe to repeat');
  }
});

test('nested public dialogs keep the background inert until the last one closes', () => {
  globalThis.document = { body: { style: { overflow: '' } }, documentElement: { style: { overflow: '' } } };
  const root = { inert: false };
  const closeFirst = lockPageScroll({ inertRoot: root });
  const closeSecond = lockPageScroll({ inertRoot: root });
  closeFirst();
  assert.equal(root.inert, true);
  closeSecond();
  assert.equal(root.inert, false);
  assert.equal(document.body.style.overflow, '');
});

test('repeated open/close cycles preserve pre-existing page and background state', () => {
  globalThis.document = { body: { style: { overflow: 'scroll' } }, documentElement: { style: { overflow: 'auto' } } };
  const root = { inert: true };
  for (let i = 0; i < 3; i += 1) {
    const close = lockPageScroll({ inertRoot: root });
    close();
    assert.equal(document.body.style.overflow, 'scroll');
    assert.equal(document.documentElement.style.overflow, 'auto');
    assert.equal(root.inert, true);
  }
});
