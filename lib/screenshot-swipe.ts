type Contact = Pick<Touch, "identifier" | "clientX" | "clientY">;
type TouchInput = {
  touches: ArrayLike<Contact>;
  changedTouches: ArrayLike<Contact>;
  timeStamp: number;
};

export function createScreenshotSwipe({
  canSwipe,
  onStep,
}: {
  canSwipe: () => boolean;
  onStep: (direction: -1 | 1) => void;
}) {
  let start: (Contact & { time: number }) | null = null;

  return {
    onTouchStart(event: TouchInput) {
      start = null;
      if (!canSwipe() || event.touches.length !== 1) return;
      const touch = event.touches[0];
      start = {
        identifier: touch.identifier,
        clientX: touch.clientX,
        clientY: touch.clientY,
        time: event.timeStamp,
      };
    },
    onTouchMove(event: TouchInput) {
      if (!start) return;
      if (!canSwipe() || event.touches.length !== 1) {
        start = null;
        return;
      }
      const touch = event.touches[0];
      const dx = Math.abs(touch.clientX - start.clientX);
      const dy = Math.abs(touch.clientY - start.clientY);
      // Once a gesture becomes a scroll or pinch, never turn it into a swipe.
      if (touch.identifier !== start.identifier || (dy > 12 && dy > dx)) {
        start = null;
      }
    },
    onTouchEnd(event: TouchInput) {
      const origin = start;
      start = null;
      if (
        !origin ||
        !canSwipe() ||
        event.touches.length !== 0 ||
        event.changedTouches.length !== 1
      )
        return;

      const touch = event.changedTouches[0];
      const dx = touch.clientX - origin.clientX;
      const dy = touch.clientY - origin.clientY;
      if (
        touch.identifier === origin.identifier &&
        event.timeStamp - origin.time <= 800 &&
        Math.abs(dx) >= 48 &&
        Math.abs(dx) > Math.abs(dy) * 1.5
      ) {
        onStep(dx < 0 ? 1 : -1);
      }
    },
    onTouchCancel() {
      start = null;
    },
  };
}
