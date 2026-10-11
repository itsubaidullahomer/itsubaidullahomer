import { test } from "node:test";
import assert from "node:assert/strict";
import { createScreenshotSwipe } from "../lib/screenshot-swipe";

const contact = (clientX: number, clientY = 100, identifier = 1) => ({
  clientX,
  clientY,
  identifier,
});
const input = (
  touches: ReturnType<typeof contact>[],
  timeStamp = 0,
  changedTouches = touches,
) => ({ touches, changedTouches, timeStamp });

function gallery() {
  let enabled = true;
  const steps: number[] = [];
  const handlers = createScreenshotSwipe({
    canSwipe: () => enabled,
    onStep: (step) => steps.push(step),
  });
  return {
    handlers,
    steps,
    disable: () => {
      enabled = false;
    },
  };
}

test("left and right swipes navigate once in the expected direction", () => {
  const { handlers, steps } = gallery();
  handlers.onTouchStart(input([contact(260)]));
  handlers.onTouchMove(input([contact(160, 110)], 100));
  handlers.onTouchEnd(input([], 200, [contact(80, 110)]));
  handlers.onTouchEnd(input([], 210, [contact(80, 110)]));
  handlers.onTouchStart(input([contact(80)], 300));
  handlers.onTouchEnd(input([], 500, [contact(260)]));
  assert.deepEqual(steps, [1, -1]);
});

test("taps, small drags, diagonal gestures and long presses do not navigate", () => {
  const { handlers, steps } = gallery();
  for (const [x, y, elapsed] of [
    [201, 100, 100],
    [170, 105, 200],
    [100, 190, 200],
    [80, 100, 1200],
  ]) {
    handlers.onTouchStart(input([contact(200)]));
    handlers.onTouchEnd(input([], elapsed, [contact(x, y)]));
  }
  assert.deepEqual(steps, []);
});

test("a vertical scroll cannot turn into navigation after changing direction", () => {
  const { handlers, steps } = gallery();
  handlers.onTouchStart(input([contact(250)]));
  handlers.onTouchMove(input([contact(245, 140)], 100));
  handlers.onTouchEnd(input([], 300, [contact(80, 150)]));
  assert.deepEqual(steps, []);
});

test("pinching cancels the whole gesture even after one finger is lifted", () => {
  const { handlers, steps } = gallery();
  handlers.onTouchStart(input([contact(250)]));
  handlers.onTouchStart(input([contact(250), contact(80, 100, 2)], 50));
  handlers.onTouchEnd(input([contact(250)], 100, [contact(80, 100, 2)]));
  handlers.onTouchMove(input([contact(80)], 150));
  handlers.onTouchEnd(input([], 200, [contact(80)]));
  assert.deepEqual(steps, []);
  // A fresh single-finger gesture works again after the pinch ends.
  handlers.onTouchStart(input([contact(250)], 300));
  handlers.onTouchEnd(input([], 500, [contact(80)]));
  assert.deepEqual(steps, [1]);
});

test("a second finger outside the image also cancels navigation", () => {
  const { handlers, steps } = gallery();
  handlers.onTouchStart(input([contact(250)]));
  handlers.onTouchMove(input([contact(230), contact(80, 100, 2)], 100));
  handlers.onTouchEnd(input([], 200, [contact(80)]));
  assert.deepEqual(steps, []);
});

test("browser cancellation and mismatched touches do not navigate", () => {
  const { handlers, steps } = gallery();
  handlers.onTouchStart(input([contact(250)]));
  handlers.onTouchCancel();
  handlers.onTouchEnd(input([], 200, [contact(80)]));
  handlers.onTouchStart(input([contact(250)]));
  handlers.onTouchEnd(input([], 200, [contact(80, 100, 2)]));
  assert.deepEqual(steps, []);
});

test("original-size, browser zoom and single-image modes can disable swiping", () => {
  const { handlers, steps, disable } = gallery();
  handlers.onTouchStart(input([contact(250)]));
  disable();
  handlers.onTouchEnd(input([], 200, [contact(80)]));
  handlers.onTouchStart(input([contact(250)], 300));
  handlers.onTouchEnd(input([], 500, [contact(80)]));
  assert.deepEqual(steps, []);
});
