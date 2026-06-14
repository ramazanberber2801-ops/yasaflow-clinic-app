import { Gift } from "lucide-react";
import Header from "@/components/Header";

export default function Gavekort() {
  return (
    <div data-testid="page-gavekort">
      <Header
        title="Kjøp Gavekort"
        subtitle="Gi bort velvære og skjønnhet"
        icon={Gift}
      />
      <div className="px-4 mt-4">
        <div className="bg-white rounded-3xl overflow-hidden border border-[#EBE5DC]/60 shadow-[0_4px_24px_rgba(44,42,38,0.05)]">
          <iframe
            title="Kjøp gavekort hos Seldaesthetic"
            src="https://bestill.timma.no/giftcard/seldaesthetic"
            data-testid="gavekort-iframe"
            style={{ width: "100%", height: "calc(100vh - 230px)", border: "none" }}
            allow="payment; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
}
