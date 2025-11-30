"use client";
import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html>
      <body className="mx-auto max-w-xl p-8">
        <h1 className="mb-4 text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground mb-6 text-sm">{error.message}</p>
        <button
          onClick={() => reset()}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
