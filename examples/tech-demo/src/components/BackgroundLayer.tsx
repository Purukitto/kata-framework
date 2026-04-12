interface BackgroundLayerProps {
  src: string | null;
}

export function BackgroundLayer({ src }: BackgroundLayerProps) {
  if (!src) return null;

  return (
    <div
      className="bg-layer"
      role="img"
      aria-label={`Background: ${src}`}
      style={{
        backgroundImage: `url(/assets/images/${src})`,
      }}
    />
  );
}
