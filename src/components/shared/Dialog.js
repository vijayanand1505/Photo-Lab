import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const dialogStack = [];
let originalOverflow = "";
let originalRootInert = false;
const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

export default function Dialog({ children, onClose, labelledBy, describedBy, className = "", onKeyDown }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  const keyRef = useRef(onKeyDown);
  closeRef.current = onClose;
  keyRef.current = onKeyDown;

  useEffect(() => {
    const node = ref.current;
    const previousFocus = document.activeElement;
    const root = document.getElementById("root");
    if (!dialogStack.length) {
      originalOverflow = document.body.style.overflow;
      originalRootInert = Boolean(root?.inert);
    }
    dialogStack.push(node);
    document.body.style.overflow = "hidden";
    if (root) root.inert = true;
    dialogStack.forEach((dialog) => { dialog.inert = dialog !== node; });
    (node.querySelector("[data-autofocus]") || node.querySelector(focusable) || node).focus();

    const handleKey = (event) => {
      if (dialogStack[dialogStack.length - 1] !== node) return;
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key === "Tab") {
        const notice = document.querySelector(".undo-notice");
        const elements = [...node.querySelectorAll(focusable), ...(notice?.querySelectorAll(focusable) || [])].filter((element) => element.getClientRects().length > 0);
        const first = elements[0];
        if (!first) { event.preventDefault(); node.focus(); }
        else {
          event.preventDefault();
          const index = elements.indexOf(document.activeElement);
          elements[index < 0 ? (event.shiftKey ? elements.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + elements.length) % elements.length].focus();
        }
      }
      keyRef.current?.(event);
    };
    const containFocus = (event) => {
      if (dialogStack[dialogStack.length - 1] === node && !node.contains(event.target) && !event.target.closest(".undo-notice")) {
        (node.querySelector(focusable) || node).focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("focusin", containFocus);
      dialogStack.splice(dialogStack.indexOf(node), 1);
      dialogStack.forEach((dialog, index) => { dialog.inert = index !== dialogStack.length - 1; });
      if (!dialogStack.length) {
        document.body.style.overflow = originalOverflow;
        if (root) root.inert = originalRootInert;
      }
      if (previousFocus?.isConnected) previousFocus.focus();
      else document.querySelector(".main-nav button[aria-current='page']")?.focus();
    };
  }, []);

  return createPortal(
    <div className={`dialog-backdrop ${className}`} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={ref} className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}>
        {children}
      </section>
    </div>, document.body
  );
}
