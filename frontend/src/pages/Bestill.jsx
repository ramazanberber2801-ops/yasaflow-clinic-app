import { CalendarCheck } from "lucide-react";
import Header from "@/components/Header";

export default function Bestill() {
  return (
    <div data-testid="page-bestill" className="min-h-screen bg-paper">
      <Header
        title="Bestill Time"
        subtitle="Velg behandling og tidspunkt"
        icon={CalendarCheck}
      />

      <section className="mt-2 w-full" aria-label="Bestill time">
        <iframe
          title="Bestill time hos Seldaesthetic"
          src="https://bestill.timma.no/seldaesthetic"
          data-testid="bestill-iframe"
          className="block w-full bg-white"
          style={{ height: "calc(100vh - 190px)", minHeight: "760px", border: "none" }}
          allow="payment; clipboard-write"
        />
      </section>
    </div>
  );
}
