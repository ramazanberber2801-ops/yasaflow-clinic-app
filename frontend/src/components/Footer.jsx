export default function Footer() {
  return (
    <footer
      className="mt-16 mb-6 text-center select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      data-testid="footer"
    >
      <div className="text-[#B89953] font-serif-display text-2xl mb-1">Seldaesthetic</div>
      <div className="text-[10px] tracking-[0.3em] uppercase text-[#6B655B]">
        Skjønnhet i hver detalj
      </div>
      <div className="mt-4 text-[10px] text-[#9C968C]">
        © {new Date().getFullYear()} Seldaesthetic <span aria-hidden="true">•</span>{" "}
        <a
          href="https://yasaflow.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#B89953] hover:underline"
        >
          Utviklet av Yasaflow
        </a>
      </div>
    </footer>
  );
}
