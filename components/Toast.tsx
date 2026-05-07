'use client'

import { AnimatePresence, motion } from 'framer-motion'

type ToastProps = {
  message: string | null
  bottomOffset?: string
}

export default function Toast({ message, bottomOffset = '24px' }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className="fixed left-1/2 z-[80] -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] px-[14px] py-[9px] text-xs font-medium text-[var(--text-primary)] shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
          style={{
            bottom: bottomOffset,
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}