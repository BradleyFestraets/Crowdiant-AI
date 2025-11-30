"use client";
import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export const DialogContent: React.FC<
  React.ComponentProps<typeof RadixDialog.Content>
> = (props) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay className="fixed inset-0 bg-black/40" />
    <RadixDialog.Content
      {...props}
      className={
        "bg-background fixed top-1/2 left-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-lg focus:outline-none " +
        (props.className ?? "")
      }
    />
  </RadixDialog.Portal>
);

export const DialogTitle = RadixDialog.Title;
export const DialogDescription = RadixDialog.Description;
export const DialogClose = RadixDialog.Close;
