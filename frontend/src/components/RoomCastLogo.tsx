interface RoomCastLogoProps {
  compact?: boolean;
}

export default function RoomCastLogo({ compact = false }: RoomCastLogoProps) {
  return (
    <span className={`roomcast-logo${compact ? ' roomcast-logo-compact' : ''}`}>
      <svg
        className="roomcast-logo-mark"
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <path
          d="M8 9.5h24v17H19l-7.5 5v-5H8z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.8"
        />
        <path
          d="M14 17h12M14 22h8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
      <span className="roomcast-word">RoomCast</span>
    </span>
  );
}
