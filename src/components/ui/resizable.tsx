"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/utils/shadcn_utils";

const ResizablePanelGroupPrimitive = (ResizablePrimitive as any).PanelGroup;
const ResizablePanelPrimitive = (ResizablePrimitive as any).Panel;
const ResizablePanelResizeHandlePrimitive = (ResizablePrimitive as any)
  .PanelResizeHandle;

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<any>) {
  return (
    <ResizablePanelGroupPrimitive
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: React.ComponentProps<any>) {
  return <ResizablePanelPrimitive data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<any> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePanelResizeHandlePrimitive
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border lg:z-10 lg:flex lg:h-4 lg:w-3 lg:items-center lg:justify-center lg:rounded-xs lg:border">
          <GripVerticalIcon className="lg:size-2.5" />
        </div>
      )}
    </ResizablePanelResizeHandlePrimitive>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
