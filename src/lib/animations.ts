import type { MotionProps, TargetAndTransition } from "framer-motion";

// Fade in/out for overlays or subtle appearances
export const fadeInOut: MotionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

// Slide Up: content enters from bottom
export const slideUp: MotionProps = {
  initial: { y: "100%"},
  animate: { y: 0 },
  transition: { type: "spring", duration: 0.4, bounce: 0 },
};

// Slide Down: content exits to bottom (use as exit={slideDown})
export const slideDown: TargetAndTransition = {
  y: "100%",
  transition: { type: "spring", duration: 0.35, bounce: 0 } as const,
};

// Slide Left: enter from left
export const slideLeft: MotionProps = {
  initial: { x: "-100%" },
  animate: { x: 0 },
  transition: { type: "spring", duration: 0.4, bounce: 0 },
};

// Slide Right: enter from right
export const slideRight: MotionProps = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { type: "spring", duration: 0.4, bounce: 0 },
};
// Removed duplicate definitions with pixel-based values; unified presets above.