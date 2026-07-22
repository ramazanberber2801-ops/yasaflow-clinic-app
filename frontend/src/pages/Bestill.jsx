import { CalendarCheck } from "lucide-react";
import Header from "@/components/Header";
import EmbeddedTimmaFrame from "@/components/EmbeddedTimmaFrame";
import { useClinicSettings } from "@/contexts/ClinicSettingsContext";

export default function Bestill() {
  const { settings } = useClinicSettings();

  return (
    <div data-testid="page-bestill" className="min-h-screen bg-paper">
      <Header
        title="Bestill Time"
        subtitle="Velg behandling og tidspunkt"
        icon={CalendarCheck}
      />

      <section className="mt-2 w-full" aria-label="Bestill time">
        <EmbeddedTimmaFrame
          title={`Bestill time hos ${settings.clinic_name || "klinikken"}`}
          configuredUrl={settings.booking_url}
          fallbackUrl="https://bestill.timma.no/seldaesthetic"
          testId="bestill-iframe"
        />
      </section>
    </div>
  );
}
