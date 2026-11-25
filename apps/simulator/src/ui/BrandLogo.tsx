/* The StemGrid Tech Labs logo (public/brand/stemgrid-logo.png, transparent PNG, 640x287).
   `chip` puts it on a white rounded tile for dark or red backgrounds. */
export default function BrandLogo({ height = 36, chip = false }: { height?: number; chip?: boolean }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/stemgrid-logo.png" alt="StemGrid Tech Labs" width={Math.round(height * 640 / 287)} height={height}
      style={{ display: 'block', height, width: 'auto', flex: 'none' }} />
  );
  if (!chip) return img;
  return (
    <span style={{ display: 'inline-flex', padding: `${Math.round(height / 6)}px ${Math.round(height / 4)}px`, borderRadius: Math.round(height / 3.5), background: '#fff', flex: 'none' }}>
      {img}
    </span>
  );
}
