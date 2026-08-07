import { StoreLocationPicker } from "@/components/StoreLocationPicker";

export function StoreLocationMap({
  lat,
  lng,
  label,
  height = 260,
}: {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
}) {
  return (
    <StoreLocationPicker
      lat={lat}
      lng={lng}
      label={label}
      height={height}
      interactive={false}
    />
  );
}
