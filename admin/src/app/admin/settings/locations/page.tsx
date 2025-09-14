import { LocationSyncPanel } from "./LocationSyncPanel";

export default function LocationsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Location Data Management
        </h1>
        <p className="text-gray-600 mt-2">
          Manage global countries, states, and cities database for shipping
          zones
        </p>
      </div>

      <LocationSyncPanel />
    </div>
  );
}

export const metadata = {
  title: "Location Data Management",
  description: "Import and manage global location data for shipping management",
};
