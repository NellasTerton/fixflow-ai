export default function DemoLoading() {
  return (
    <div className="animate-pulse" aria-label="Загрузка демонстрационной CRM">
      <div className="h-3 w-32 rounded bg-[#dce1d8]" />
      <div className="mt-4 h-10 w-80 max-w-full rounded-xl bg-[#dce1d8]" />
      <div className="mt-3 h-5 w-[34rem] max-w-full rounded bg-[#e3e7df]" />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-44 rounded-2xl border border-[#102328]/6 bg-white/70"
          />
        ))}
      </div>
    </div>
  );
}
