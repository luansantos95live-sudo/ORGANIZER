/** Casa com lupa (Amostragem). O lucide não tem esse ícone; desenhado no mesmo traço dos outros do menu. */
export function IconeCasaLupa({ size = 24, strokeWidth = 2, className }: { size?: number | string; strokeWidth?: number | string; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true">
      <path d="M10 21H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v1" />
      <circle cx="16" cy="16" r="3.5" />
      <path d="m21.5 21.5-3-3" />
    </svg>
  )
}
