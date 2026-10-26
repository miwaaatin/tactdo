export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-brand-600/30 blur-3xl animate-float" />
      <div
        className="absolute top-1/3 -right-40 h-[32rem] w-[32rem] rounded-full bg-accent-400/20 blur-3xl animate-float"
        style={{ animationDelay: '-5s' }}
      />
      <div
        className="absolute -bottom-40 left-1/4 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/15 blur-3xl animate-float"
        style={{ animationDelay: '-9s' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgb(2_6_23)_75%)]" />
    </div>
  )
}

export function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-400 shadow-lg shadow-brand-500/40">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="text-lg font-semibold tracking-tight">
        Tact<span className="text-brand-300">Do</span>
      </span>
    </div>
  )
}
