'use client'

import { ReactNode } from 'react'
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  FloatingPortal,
  Placement,
  Padding,
} from '@floating-ui/react'

type DropdownShellProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: (props: { open: boolean }) => ReactNode
  children: ReactNode
  placement?: Placement
  className?: string
  collisionPadding?: Padding
  offsetAmount?: number
  flippedOffsetAmount?: number
  crossAxisOffset?: number
}

export default function DropdownShell({
  open,
  onOpenChange,
  trigger,
  children,
  placement = 'bottom-end',
  className = '',
  collisionPadding = {
    top: 72,
    right: 16,
    bottom: 88,
    left: 16,
  },
  offsetAmount = 8,
  flippedOffsetAmount = offsetAmount,
  crossAxisOffset = 0,
}: DropdownShellProps) {
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
  flip({
    padding: collisionPadding,
  }),
  offset(({ placement }) => {
    const side = placement.split('-')[0]

    return {
      mainAxis: side === 'top' ? flippedOffsetAmount : offsetAmount,
      crossAxis: crossAxisOffset,
    }
  }),
  shift({
    padding: collisionPadding,
  }),
  size({
    padding: collisionPadding,
    apply({ availableHeight, elements }) {
      Object.assign(elements.floating.style, {
        maxHeight: `${Math.max(120, availableHeight)}px`,
      })
    },
  }),
],
  })

  const click = useClick(context)
  const dismiss = useDismiss(context, {
    escapeKey: true,
    outsidePress: true,
  })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ])

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps({
          onClick: (e) => {
            e.stopPropagation()
          },
        })}
      >
        {trigger({ open })}
      </div>

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={className}
            {...getFloatingProps({
              onClick: (e) => {
                e.stopPropagation()
              },
            })}
          >
            {children}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}