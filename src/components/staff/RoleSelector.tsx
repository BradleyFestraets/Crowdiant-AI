"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";

interface RoleSelectorProps {
    value: "OWNER" | "MANAGER" | "SERVER" | "KITCHEN" | "HOST" | "CASHIER";
    onChange: (value: "OWNER" | "MANAGER" | "SERVER" | "KITCHEN" | "HOST" | "CASHIER") => void;
}

const roleDescriptions = {
    OWNER: "Full access to all features and settings",
    MANAGER: "Can manage staff, menu, and operations",
    SERVER: "Can take orders and manage tables",
    KITCHEN: "Can view and manage kitchen orders",
    HOST: "Can manage reservations and seating",
    CASHIER: "Can process payments and close tabs",
};

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
    return (
        <div className="space-y-2">
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="SERVER">Server</SelectItem>
                    <SelectItem value="KITCHEN">Kitchen</SelectItem>
                    <SelectItem value="HOST">Host</SelectItem>
                    <SelectItem value="CASHIER">Cashier</SelectItem>
                </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">{roleDescriptions[value]}</p>
        </div>
    );
}
