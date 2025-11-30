"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Building2, Check, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface VenueOption {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface VenueSelectorProps {
  currentVenue: VenueOption;
  venues: VenueOption[];
}

export function VenueSelector({ currentVenue, venues }: VenueSelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleVenueSwitch = (slug: string) => {
    setIsOpen(false);
    router.push(`/dashboard/${slug}`);
  };

  // If only one venue, just show the name without dropdown
  if (venues.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-gray-700">{currentVenue.name}</span>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {currentVenue.role}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-700">{currentVenue.name}</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {currentVenue.role}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
          Switch Venue
        </div>
        {venues.map((venue) => (
          <DropdownMenuItem
            key={venue.id}
            onClick={() => handleVenueSwitch(venue.slug)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">{venue.name}</p>
                <p className="text-xs text-gray-500">{venue.role}</p>
              </div>
            </div>
            {venue.id === currentVenue.id && (
              <Check className="text-primary h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/register/venue")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Venue</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
