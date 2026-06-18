export function BackgroundGrid() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(139,92,246,0.18),transparent_30%),linear-gradient(180deg,var(--background),var(--muted))]" />
      <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:3rem_3rem]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,var(--background)_72%)]" />
    </div>
  );
}
