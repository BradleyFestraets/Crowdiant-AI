"use client";
import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";

export const Select = RadixSelect.Root;
export const SelectTrigger: React.FC<
  React.ComponentProps<typeof RadixSelect.Trigger>
> = ({ className, ...props }) => (
  <RadixSelect.Trigger
    {...props}
    className={
      (className ?? "") +
      " bg-background inline-flex h-10 w-64 items-center justify-between rounded-md border px-3 text-sm"
    }
  />
);
export const SelectValue = RadixSelect.Value;
export const SelectContent: React.FC<
  React.ComponentProps<typeof RadixSelect.Content>
> = ({ className, ...props }) => (
  <RadixSelect.Portal>
    <RadixSelect.Content
      {...props}
      className={
        (className ?? "") +
        " bg-popover text-popover-foreground rounded-md border p-1 shadow"
      }
    />
  </RadixSelect.Portal>
);
export const SelectItem: React.FC<
  React.ComponentProps<typeof RadixSelect.Item>
> = ({ className, ...props }) => (
  <RadixSelect.Item
    {...props}
    className={
      (className ?? "") +
      " hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm px-2 py-1 text-sm"
    }
  />
);
