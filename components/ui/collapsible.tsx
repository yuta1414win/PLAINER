"use client";

import * as React from "react";

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(
  null
);

export interface CollapsibleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Collapsible({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  className,
  children,
  ...props
}: CollapsibleProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    !!defaultOpen
  );

  const open = isControlled ? !!controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div data-state={open ? "open" : "closed"} className={className} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export interface CollapsibleTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(function CollapsibleTrigger(
  { asChild, children, onClick, ...props },
  ref
) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) {
    return (
      <button ref={ref} type="button" {...props}>
        {children}
      </button>
    );
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    onClick?.(e);
    if (!e.defaultPrevented) ctx.setOpen(!ctx.open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref,
      onClick: (e: any) => {
        children.props?.onClick?.(e);
        handleClick(e);
      },
      "data-state": ctx.open ? "open" : "closed",
    });
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      data-state={ctx.open ? "open" : "closed"}
      {...props}
    >
      {children}
    </button>
  );
});

export interface CollapsibleContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  CollapsibleContentProps
>(function CollapsibleContent({ style, children, ...props }, ref) {
  const ctx = React.useContext(CollapsibleContext);
  const open = ctx?.open ?? false;

  return (
    <div
      ref={ref}
      hidden={!open}
      data-state={open ? "open" : "closed"}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
});

export default Collapsible;

