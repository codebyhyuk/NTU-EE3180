export default function SiteFooter({ className = "", containerClassName = "" }) {
  return (
    <footer
      className={[
        "mt-auto border-t border-[var(--lux-border)] bg-[rgba(255,255,255,.05)] backdrop-blur-sm",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "lux-container py-6 text-center text-xs md:text-sm text-[var(--lux-ink)]",
          containerClassName,
        ].join(" ")}
      >
        NTU EEE DIP Project E009 (AY25/26 Sem 1)
      </div>
    </footer>
  );
}
