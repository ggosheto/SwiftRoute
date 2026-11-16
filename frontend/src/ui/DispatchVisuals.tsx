import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  box: (
    <>
      <path d="m3 7 9-5 9 5v10l-9 5-9-5zM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5" />
    </>
  ),
  bike: (
    <>
      <circle cx="5" cy="17" r="3.5" />
      <circle cx="19" cy="17" r="3.5" />
      <path d="m5 17 5-9 5 9H5m10-13h3l2 13M8 8h5" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  route: (
    <>
      <circle cx="5" cy="18" r="2.3" />
      <circle cx="19" cy="5" r="2.3" />
      <path d="M5 15.5V9a3 3 0 0 1 3-3h3a3 3 0 0 1 0 6h-1a3 3 0 0 0 0 6h6a3 3 0 0 0 3-3V8" />
    </>
  ),
  pulse: <path d="M2 12h5l3-8 4 16 3-8h5" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m7.5 12 3 3 6-6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 4v6h-6M4 20v-6h6" />
      <path d="M19.5 9a8 8 0 0 0-14-3M4.5 15a8 8 0 0 0 14 3" />
    </>
  ),
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Brand() {
  return (
    <span className="sr-brand">
      <img src="/swiftroute-logo.png" alt="" width="56" height="56" />
      <span>SwiftRoute</span>
    </span>
  );
}
// Decorative city grid, deliberately separate from the real street map.
export function Atlas() {
  const blocks = Array.from({ length: 144 }, (_, i) => {
    const x = (i % 16) * 48 - 70,
      y = Math.floor(i / 16) * 38 - 100;
    return (
      <g key={i}>
        <rect x={x} y={y} width={i % 3 === 0 ? 17 : 29} height="23" rx="2" />
        <path d={`M${x + 35} ${y + 1}v22`} strokeWidth="3" />
      </g>
    );
  });
  return (
    <svg
      className="atlas"
      viewBox="0 0 610 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#6cb6fa" opacity=".33" />
        </pattern>
      </defs>
      <rect width="610" height="220" fill="url(#dots)" />
      <g
        transform="rotate(-19 300 100) skewX(10)"
        fill="#355989"
        stroke="#56759d"
        strokeWidth=".8"
      >
        {blocks}
        <path
          d="M-40 210Q140 15 280 85T700 18"
          fill="none"
          stroke="#172e59"
          strokeWidth="23"
        />
        <path
          d="M-40 210Q140 15 280 85T700 18"
          fill="none"
          stroke="#42739c"
          strokeWidth="2"
        />
      </g>
      <path
        d="m128 176 64-20 25-53 69-20 47 23 61-20 25-48 49-16"
        stroke="#152f61"
        fill="none"
        strokeWidth="11"
        strokeLinejoin="round"
      />
      <path
        d="m128 176 64-20 25-53 69-20 47 23 61-20 25-48 49-16"
        stroke="#92f5de"
        fill="none"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {[
        [128, 176, "A"],
        [468, 22, "Б"],
      ].map(([x, y, t]) => (
        <g key={t} transform={`translate(${x} ${y})`}>
          <circle r="17" fill="#102754" stroke="#8cead8" strokeOpacity=".5" />
          <circle r="10" fill="#b2f6e8" />
          <text
            y="4"
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#0c2242"
          >
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}
