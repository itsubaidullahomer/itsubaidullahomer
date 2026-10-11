type Contact = Pick<Touch, "identifier" | "clientX" | "clientY">;
type TouchInput = {
  touches: ArrayLike<Contact>;
  changedTouches: ArrayLike<Contact>;
  timeStamp: number;
};

export function createScreenshotSwipe({
  canSwipe,
  onStep,
  onDrag = () => {},
  onCancel = () => {},
  getWidth = () => 300,
}: {
  canSwipe: () => boolean;
  onStep: (direction: -1 | 1, velocity: number) => void;
  onDrag?: (offset: number) => void;
  onCancel?: () => void;
  getWidth?: () => number;
}) {
  let start:
    | (Contact & {
        time: number;
        dragging: boolean;
        lastX: number;
        lastTime: number;
        velocity: number;
      })
    | null = null;

  function cancel() {
    start = null;
    onCancel();
  }

  return {
    onTouchStart(event: TouchInput) {
      if (start) cancel();
      if (!canSwipe() || event.touches.length !== 1) return;
      const touch = event.touches[0];
      start = {
        identifier: touch.identifier,
        clientX: touch.clientX,
        clientY: touch.clientY,
        time: event.timeStamp,
        dragging: false,
        lastX: 0,
        lastTime: event.timeStamp,
        velocity: 0,
      };
    },
    onTouchMove(event: TouchInput) {
      if (!start) return;
      if (!canSwipe() || event.touches.length !== 1) {
        cancel();
        return;
      }
      const touch = event.touches[0];
      const dx = touch.clientX - start.clientX;
      const dy = Math.abs(touch.clientY - start.clientY);
      // Once a gesture becomes a scroll or pinch, never turn it into a swipe.
      if (
        touch.identifier !== start.identifier ||
        (!start.dragging && dy > 12 && dy > Math.abs(dx))
      ) {
        cancel();
        return;
      }
      if (Math.abs(dx) > 8 && Math.abs(dx) > dy * 1.5) start.dragging = true;
      start.velocity =
        (dx - start.lastX) / Math.max(1, event.timeStamp - start.lastTime);
      start.lastX = dx;
      start.lastTime = event.timeStamp;
      if (start.dragging) onDrag(dx);
    },
    onTouchEnd(event: TouchInput) {
      const origin = start;
      start = null;
      if (
        !origin ||
        !canSwipe() ||
        event.touches.length !== 0 ||
        event.changedTouches.length !== 1
      ) {
        if (origin) onCancel();
        return;
      }

      const touch = event.changedTouches[0];
      const dx = touch.clientX - origin.clientX;
      const dy = touch.clientY - origin.clientY;
      const sinceMove = event.timeStamp - origin.lastTime;
      const velocity =
        dx === origin.lastX && sinceMove < 100
          ? origin.velocity
          : (dx - origin.lastX) / Math.max(1, sinceMove);
      const threshold = Math.min(120, Math.max(48, getWidth() * 0.22));
      const flick =
        Math.abs(dx) >= 24 &&
        Math.abs(velocity) >= 0.5 &&
        Math.sign(velocity) === Math.sign(dx);
      if (
        touch.identifier === origin.identifier &&
        (origin.dragging || event.timeStamp - origin.time <= 800) &&
        (Math.abs(dx) >= threshold || flick) &&
        Math.abs(dx) > Math.abs(dy) * 1.5
      ) {
        if (origin.dragging) onDrag(dx);
        onStep(dx < 0 ? 1 : -1, velocity);
      } else {
        onCancel();
      }
    },
    onTouchCancel() {
      if (start) cancel();
    },
  };
}
