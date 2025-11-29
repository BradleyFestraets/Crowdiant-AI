"use client";
import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";

export const Select = RadixSelect.Root;
export const SelectTrigger: React.FC<React.ComponentProps<typeof RadixSelect.Trigger>> = ({ className, ...props }) => (
  <RadixSelect.Trigger {...props} className={(className ?? "") + " inline-flex h-10 w-64 items-center justify-between rounded-md border bg-background px-3 text-sm"} />
);
export const SelectValue = RadixSelect.Value;
export const SelectContent: React.FC<React.ComponentProps<typeof RadixSelect.Content>> = ({ className, ...props }) => (
  <RadixSelect.Portal>
    <RadixSelect.Content {...props} className={(className ?? "") + " rounded-md border bg-popover p-1 text-popover-foreground shadow"} />
  </RadixSelect.Portal>
);
export const SelectItem: React.FC<React.ComponentProps<typeof RadixSelect.Item>> = ({ className, ...props }) => (
  <RadixSelect.Item {...props} className={(className ?? "") + " cursor-pointer rounded-sm px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground"} />
);
