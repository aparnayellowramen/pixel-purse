import { PixelIcon } from "./pixel-icon";

export function Stars({ n, max, small }: { n: number; max: number; small?: boolean }) {
  return (
    <div className={`starrow ${small ? "sm" : ""}`} role="img" aria-label={`${n} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <PixelIcon key={i} name="star" className={i < n ? "on" : ""} />
      ))}
    </div>
  );
}
