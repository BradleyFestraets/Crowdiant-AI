"use client";
import * as React from "react";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { ToastProvider, useToast } from "~/components/ui/toast";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import Skeleton from "~/components/ui/skeleton";
import { Table, THead, TBody, TR, TH, TD } from "~/components/ui/table";

function ToastDemo() {
  const { add } = useToast();
  return (
    <Button
      onClick={() => add({ title: "Hello", description: "This is a toast" })}
    >
      Show Toast
    </Button>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <div className="container mx-auto max-w-2xl space-y-6 p-6">
          <h1 className="text-2xl font-semibold">UI Examples</h1>
          <section className="space-y-2">
            <h2 className="text-lg font-medium">Buttons</h2>
            <div className="flex gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Input</h2>
            <Input placeholder="Type here" />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Select</h2>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Choose an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Option A</SelectItem>
                <SelectItem value="b">Option B</SelectItem>
                <SelectItem value="c">Option C</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Dialog</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Example Dialog</DialogTitle>
                <DialogDescription>
                  Accessible dialog using Radix primitives.
                </DialogDescription>
              </DialogContent>
            </Dialog>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Tabs</h2>
            <Tabs defaultValue="account">
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
              </TabsList>
              <TabsContent value="account">
                Account settings go here.
              </TabsContent>
              <TabsContent value="password">
                Password settings go here.
              </TabsContent>
            </Tabs>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Tooltip</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button>Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>Helpful tip!</TooltipContent>
            </Tooltip>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Toast</h2>
            <ToastDemo />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Table</h2>
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Status</TH>
                  <TH>Role</TH>
                </TR>
              </THead>
              <TBody>
                <TR>
                  <TD>Jane</TD>
                  <TD>Active</TD>
                  <TD>Server</TD>
                </TR>
                <TR>
                  <TD>Sam</TD>
                  <TD>Inactive</TD>
                  <TD>Chef</TD>
                </TR>
              </TBody>
            </Table>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Skeleton</h2>
            <div className="flex gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-48" />
            </div>
          </section>
        </div>
      </TooltipProvider>
    </ToastProvider>
  );
}
