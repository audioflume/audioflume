"use client";

import { AnimatePresence, motion } from "framer-motion";

type ToastProps = {
  message: string | null;
  bottomOffset?: string;
};

export default function Toast({ message, bottomOffset = "24px" }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, x: "-50%", y: 8 }}
          animate={{ opacity: 1, x: "-50%", y: 0 }}
          exit={{ opacity: 0, x: "-50%", y: 8 }}
          transition={{ duration: 0.18 }}
          className="fixed left-1/2 z-[80] rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] px-[14px] py-[9px] text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-ui)]"
          style={{
            bottom: bottomOffset,
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
