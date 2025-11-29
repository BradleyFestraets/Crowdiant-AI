"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export default function VenueRegistrationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createVenue = api.venue.create.useMutation({
    onSuccess: (data) => {
      setSuccess("Venue created successfully");
      router.push(`/dashboard/${data.slug}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  return (
    <div className="mx-auto mt-16 max-w-xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Register Venue</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSuccess(null);
          createVenue.mutate({ name, timezone, currency });
        }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Venue Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border px-3 py-2"
            placeholder="Example Bistro"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Timezone</label>
          <input
            required
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="rounded border px-3 py-2"
            placeholder="America/New_York"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Currency (ISO 4217)</label>
          <input
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="rounded border px-3 py-2"
            placeholder="USD"
            maxLength={3}
          />
        </div>
        <button
          type="submit"
          disabled={createVenue.isPending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {createVenue.isPending ? "Creating..." : "Create Venue"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  );
}
