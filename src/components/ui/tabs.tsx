"use client";
import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";

export const Tabs = RadixTabs.Root;
export const TabsList: React.FC<React.ComponentProps<typeof RadixTabs.List>> = ({ className, ...props }) => (
  <RadixTabs.List {...props} className={(className ?? "") + " inline-flex gap-2 border-b"} />
);
export const TabsTrigger: React.FC<React.ComponentProps<typeof RadixTabs.Trigger>> = ({ className, ...props }) => (
  <RadixTabs.Trigger {...props} className={(className ?? "") + " px-3 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary"} />
);
export const TabsContent = RadixTabs.Content;
