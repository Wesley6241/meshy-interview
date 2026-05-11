import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { FloatingPosition } from "./tracker";

const DRAG_THRESHOLD = 6;

function clampToViewport(left: number, top: number, width: number, height: number): FloatingPosition {
  const maxL = Math.max(0, window.innerWidth - width);
  const maxT = Math.max(0, window.innerHeight - height);
  return {
    left: Math.min(maxL, Math.max(0, left)),
    top: Math.min(maxT, Math.max(0, top)),
  };
}

export function useDraggableFloatingPanel(options: {
  position: FloatingPosition | null;
  onCommit: (next: FloatingPosition) => void;
  elementRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}) {
  const { position, onCommit, elementRef, enabled } = options;
  const [preview, setPreview] = useState<FloatingPosition | null>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    dragging: boolean;
  } | null>(null);

  const displayPosition = preview ?? position;

  const positionStyle: CSSProperties | undefined =
    displayPosition != null
      ? {
          left: displayPosition.left,
          top: displayPosition.top,
          right: "auto",
          bottom: "auto",
        }
      : undefined;

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setPreview(null);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(".floatingMinimize") || target.closest(".enterMeshyButton")) {
        return;
      }

      const el = elementRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const origLeft = position?.left ?? rect.left;
      const origTop = position?.top ?? rect.top;

      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft,
        origTop,
        dragging: false,
      };

      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [enabled, position, elementRef],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (!d.dragging) {
        if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) {
          return;
        }
        d.dragging = true;
      }

      const el = elementRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const next = clampToViewport(d.origLeft + dx, d.origTop + dy, width, height);
      setPreview(next);
    },
    [elementRef],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;

      const el = elementRef.current;
      if (el) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }

      if (d.dragging && el) {
        suppressClickRef.current = true;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        const { width, height } = el.getBoundingClientRect();
        const next = clampToViewport(d.origLeft + dx, d.origTop + dy, width, height);
        onCommit(next);
      }

      endDrag();
    },
    [elementRef, onCommit, endDrag],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const el = elementRef.current;
      if (el) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      endDrag();
    },
    [elementRef, endDrag],
  );

  useEffect(() => {
    if (!position || !elementRef.current) return;

    const onResize = () => {
      const el = elementRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const c = clampToViewport(position.left, position.top, width, height);
      if (c.left !== position.left || c.top !== position.top) {
        onCommit(c);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position, onCommit, elementRef]);

  return {
    positionStyle,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    isDragging: preview !== null,
    suppressClickRef,
  };
}
