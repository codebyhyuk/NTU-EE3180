import SiteFooter from "../components/SiteFooter";

function About() {
  return (
    <div className="min-h-screen flex flex-col lux-canvas text-[var(--lux-ink)]">
      <main className="lux-container flex-1 py-16">
        <h1 className="text-3xl font-extrabold mb-4">About This Project</h1>
        <p className="text-base lux-subtle mb-2">
          This React + Vite application powers the NTU EEE DIP Project E009 experience.
        </p>
        <p className="text-base lux-subtle">
          We explore AI-assisted background removal, product enhancements, and export workflows tailored for e-commerce.
        </p>
      </main>

      <SiteFooter className="lux-sep" />
    </div>
  );
}

export default About;
