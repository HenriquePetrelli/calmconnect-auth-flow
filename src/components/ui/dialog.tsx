import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { releaseStuckPointerLock } from "@/lib/pointerLock"

const Dialog = ({ open, onOpenChange, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  // Janela fechada: garante que a página volta a aceitar cliques.
  React.useEffect(() => {
    if (open === false) releaseStuckPointerLock()
  }, [open])
  return (
    <DialogPrimitive.Root
      {...props}
      open={open}
      onOpenChange={(next) => {
        onOpenChange?.(next)
        if (!next) releaseStuckPointerLock()
      }}
    />
  )
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/** Filhos diretos, abrindo fragmentos (<>...</>) usados em conteúdo condicional. */
const flattenFragments = (nodes: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(nodes).flatMap((node) =>
    React.isValidElement(node) && node.type === React.Fragment
      ? flattenFragments((node.props as { children?: React.ReactNode }).children)
      : [node]
  )

const isElementOf = (node: React.ReactNode, type: React.ElementType) =>
  React.isValidElement(node) && node.type === type

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // Janela com rolagem (overflow-y-auto): o título (DialogHeader) e os botões
  // (DialogFooter) ficam fixos e só o meio rola; o X de fechar também fica
  // sempre visível. Antes a janela inteira rolava e o título e o X sumiam.
  const scrollable = /(^|\s)overflow-y-auto(\s|$)/.test(className ?? "")
  let content: React.ReactNode = children
  let contentClassName = className
  if (scrollable) {
    const items = flattenFragments(children)
    const header = items.filter((n) => isElementOf(n, DialogHeader))
    const footer = items.filter((n) => isElementOf(n, DialogFooter))
    const body = items.filter((n) => !isElementOf(n, DialogHeader) && !isElementOf(n, DialogFooter))
    contentClassName = cn(className, "flex flex-col gap-0 overflow-hidden p-0")
    content = (
      <>
        {header.length > 0 && (
          <div className="shrink-0 space-y-4 border-b border-border px-6 pb-4 pr-12 pt-6">{header}</div>
        )}
        <div
          className={cn(
            "grid min-h-0 flex-1 gap-4 overflow-y-auto px-6",
            header.length > 0 ? "pt-4" : "pt-6",
            footer.length > 0 ? "pb-4" : "pb-6"
          )}
        >
          {body}
        </div>
        {footer.length > 0 && <div className="shrink-0 border-t border-border px-6 py-4">{footer}</div>}
      </>
    )
  }
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        contentClassName
      )}
      {...props}
    >
      {content}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
