export default function Header({ title, subtitle, icon: Icon }) {
  return (
    <header className="px-6 pt-10 pb-6 bg-[#F4ECD8]/40" data-testid="page-header">
      <div className="flex items-center gap-4">
        {Icon ? (
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
            <Icon size={20} strokeWidth={1.5} className="text-[#B89953]" />
          </div>
        ) : null}
        <div>
          <h1 className="font-serif-display text-3xl text-[#2C2A26] leading-none">{title}</h1>
          {subtitle ? (
            <p className="text-xs text-[#6B655B] mt-1.5 tracking-wide">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
