const DRAG_THRESHOLD_PX = 5;

// Desktop affordances for a horizontally scrolling strip: mouse wheel and click-and-drag.
// Touch keeps the browser's native scrolling.
export function enableHorizontalScroll(element: HTMLElement) {
  const onWheel = (event: WheelEvent) => {
    const maxScroll = element.scrollWidth - element.clientWidth;
    if (maxScroll <= 0) return;

    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 40 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? element.clientWidth : 1;
    const deltaX = event.deltaX * unit;
    const deltaY = event.deltaY * unit;
    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    const nextScroll = Math.max(0, Math.min(maxScroll, element.scrollLeft + delta));

    if (nextScroll === element.scrollLeft) return;
    event.preventDefault();
    element.scrollLeft = nextScroll;
  };

  let start: { x: number; scrollLeft: number } | null = null;
  let dragging = false;

  const swallowClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if (element.scrollWidth <= element.clientWidth) return;
    start = { x: event.clientX, scrollLeft: element.scrollLeft };
    dragging = false;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      // Snap points would pull the strip back while it follows the cursor
      element.style.scrollSnapType = "none";
      element.style.scrollBehavior = "auto";
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    }
    element.scrollLeft = start.scrollLeft - dx;
  };

  const endDrag = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    if (dragging) {
      // The release would otherwise "click" the tile under the cursor
      element.addEventListener("click", swallowClick, { capture: true, once: true });
      setTimeout(() => element.removeEventListener("click", swallowClick, { capture: true }), 0);
      element.style.scrollSnapType = "";
      element.style.scrollBehavior = "";
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    start = null;
    dragging = false;
  };

  // Links and images would start a native drag-and-drop instead of scrolling
  const onDragStart = (event: DragEvent) => event.preventDefault();

  element.addEventListener("wheel", onWheel, { passive: false });
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("dragstart", onDragStart);
  return () => {
    element.removeEventListener("wheel", onWheel);
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("dragstart", onDragStart);
    endDrag();
  };
}
