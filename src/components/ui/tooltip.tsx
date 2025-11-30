"use client";
import * as React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;
export const TooltipContent: React.FC<
  React.ComponentProps<typeof RadixTooltip.Content>
> = ({ className, ...props }) => (
  <RadixTooltip.Portal>
    <RadixTooltip.Content
      {...props}
      className={
        (className ?? "") +
        " bg-popover text-popover-foreground rounded-md px-2 py-1 shadow"
      }
    />
  </RadixTooltip.Portal>
);
