const NOTCH = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)"

export default function IndexCard({ children, className = "" }) {
  return (
    <div
      className={`bg-chalk shadow-[5px_5px_0_0_rgba(38,51,44,0.18)] ${className}`}
      style={{ clipPath: NOTCH }}
    >
      {children}
    </div>
  )
}

export function Stamp({ children, tone = "marker" }) {
  const tones = {
    marker: "border-marker text-marker",
    fountain: "border-fountain text-fountain",
    pencil: "border-pencil-light text-pencil",
  }
  return (
    <span
      className={`inline-block -rotate-2 rounded-sm border-2 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
