import type { ReactNode } from 'react'

type IconProps = { size?: number }

function Svg({
  size = 20,
  strokeWidth = 1.8,
  children,
}: IconProps & { strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const PlusIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size} strokeWidth={2.2}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const LogoIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size} strokeWidth={2.2}>
    <path d="M4 7h16M4 12h10M4 17h6" />
  </Svg>
)

export const ListIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
  </Svg>
)

export const PencilIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Svg>
)

export const TrashIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </Svg>
)

export const CloseIcon = ({ size }: IconProps) => (
  <Svg size={size} strokeWidth={2}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const WalletIcon = ({ size = 28 }: IconProps) => (
  <Svg size={size}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18M16 15h2" />
  </Svg>
)

export const AlertIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size} strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6M12 16.5h.01" />
  </Svg>
)

export const WarningIcon = ({ size = 28 }: IconProps) => (
  <Svg size={size}>
    <path d="M12 3l9.5 17h-19z" />
    <path d="M12 10v4M12 17h.01" />
  </Svg>
)

export const CheckIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size} strokeWidth={2.4}>
    <path d="M5 12l5 5 9-10" />
  </Svg>
)

export const ChevronLeftIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size} strokeWidth={2.2}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
)

export const ChevronRightIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size} strokeWidth={2.2}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)

export const HomeIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
  </Svg>
)

export const TargetIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
)

export const DownloadIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size} strokeWidth={2}>
    <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </Svg>
)

export const RepeatIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size}>
    <path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3" />
  </Svg>
)

export const PauseIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size}>
    <path d="M8 5v14M16 5v14" />
  </Svg>
)

export const PlayIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size}>
    <path d="M7 4l13 8-13 8z" />
  </Svg>
)

export const CopyIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <rect x="4" y="4" width="11" height="11" rx="2" />
  </Svg>
)
