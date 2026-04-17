import React from "react";

const GREEN = "#0F6E56";
const GREEN_DARK = "#0B5443";
const GOLD = "#C9920A";
const NEUTRAL = "#9CA3AF";
const NEUTRAL_SOFT = "#F3F4F6";

type IconProps = {
  size?: number;
  className?: string;
  title?: string;
};

/**
 * LeadQuoteIcon — Option A: "Quote a real lead"
 *
 * Concept: A clean quote document with abstract line items, an envelope
 * tucked behind it (it gets sent), and a small green check badge marking
 * the quote as approved/ready. Professional, monochrome-friendly, and
 * structured into <g> groups so individual elements can animate on hover.
 */
export const LeadQuoteIcon: React.FC<IconProps> = ({
  size = 80,
  className = "",
  title = "Quote a real lead",
}) => (
  <svg
    viewBox="0 0 80 80"
    width={size}
    height={size}
    className={className}
    role="img"
    aria-label={title}
    fill="none"
  >
    <title>{title}</title>

    {/* Soft brand-tinted backdrop tile */}
    <g id="lead-tile">
      <rect x="2" y="2" width="76" height="76" rx="18" fill="#EAF4EF" />
      <rect
        x="2"
        y="2"
        width="76"
        height="76"
        rx="18"
        stroke={GREEN}
        strokeOpacity="0.10"
        strokeWidth="1"
      />
    </g>

    {/* Envelope sitting behind the document, hinting "it gets sent" */}
    <g id="lead-envelope" transform="translate(0,0)">
      <rect
        x="20"
        y="30"
        width="40"
        height="26"
        rx="3"
        fill={NEUTRAL_SOFT}
        stroke={NEUTRAL}
        strokeWidth="1.6"
      />
      <path
        d="M20 31l20 14 20-14"
        stroke={NEUTRAL}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>

    {/* Quote document — the focal element */}
    <g id="lead-document">
      <rect
        x="22"
        y="18"
        width="32"
        height="40"
        rx="3"
        fill="#FFFFFF"
        stroke={GREEN}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Header bar on the document */}
      <rect x="27" y="24" width="14" height="3" rx="1.2" fill={GREEN} opacity="0.85" />
      {/* Abstract line items */}
      <line x1="27" y1="33" x2="49" y2="33" stroke={NEUTRAL} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="27" y1="38" x2="46" y2="38" stroke={NEUTRAL} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <line x1="27" y1="43" x2="49" y2="43" stroke={NEUTRAL} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      {/* Total line */}
      <line x1="27" y1="50" x2="40" y2="50" stroke={GREEN_DARK} strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Green approval check badge */}
    <g id="lead-check">
      <circle cx="58" cy="56" r="10" fill={GREEN} />
      <circle cx="58" cy="56" r="10" stroke="#FFFFFF" strokeWidth="2" />
      <path
        d="M53.5 56l3 3 6-6.5"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  </svg>
);

/**
 * OwnHomeIcon — Option B: "Quote your own home" (recommended)
 *
 * Concept: A warm, geometric house with a brand-green roof, gold doorknob
 * accent, a small quote bubble emerging from the roofline (suggesting a
 * quote generated for this home), and a tiny gold sparkle for the
 * "premium / recommended" treatment.
 */
export const OwnHomeIcon: React.FC<IconProps> = ({
  size = 80,
  className = "",
  title = "Quote your own home",
}) => (
  <svg
    viewBox="0 0 80 80"
    width={size}
    height={size}
    className={className}
    role="img"
    aria-label={title}
    fill="none"
  >
    <title>{title}</title>

    {/* Brand-tinted backdrop tile (slightly richer than Option A to mark it premium) */}
    <g id="home-tile">
      <rect x="2" y="2" width="76" height="76" rx="18" fill="#E1F0E8" />
      <rect
        x="2"
        y="2"
        width="76"
        height="76"
        rx="18"
        stroke={GREEN}
        strokeOpacity="0.18"
        strokeWidth="1"
      />
    </g>

    {/* House body */}
    <g id="home-body">
      <rect
        x="20"
        y="38"
        width="40"
        height="26"
        rx="2"
        fill="#FFFFFF"
        stroke={GREEN}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Door */}
      <rect x="35" y="48" width="10" height="16" rx="1.2" fill={GREEN} />
      <circle cx="42.4" cy="56" r="1" fill={GOLD} />
      {/* Windows */}
      <rect x="25" y="44" width="7" height="7" rx="1" fill="#EAF4EF" stroke={GREEN} strokeWidth="1.6" />
      <line x1="28.5" y1="44" x2="28.5" y2="51" stroke={GREEN} strokeWidth="1" opacity="0.6" />
      <line x1="25" y1="47.5" x2="32" y2="47.5" stroke={GREEN} strokeWidth="1" opacity="0.6" />
      <rect x="48" y="44" width="7" height="7" rx="1" fill="#EAF4EF" stroke={GREEN} strokeWidth="1.6" />
      <line x1="51.5" y1="44" x2="51.5" y2="51" stroke={GREEN} strokeWidth="1" opacity="0.6" />
      <line x1="48" y1="47.5" x2="55" y2="47.5" stroke={GREEN} strokeWidth="1" opacity="0.6" />
    </g>

    {/* Roof — solid brand green */}
    <g id="home-roof">
      <path
        d="M16 40 L40 20 L64 40 Z"
        fill={GREEN}
        stroke={GREEN_DARK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Tiny chimney for character */}
      <rect x="52" y="24" width="4" height="8" fill={GREEN_DARK} />
    </g>

    {/* Quote bubble emerging from above — "your home generated a quote" */}
    <g id="home-quote-bubble">
      <path
        d="M58 14
           h10
           a4 4 0 0 1 4 4
           v6
           a4 4 0 0 1 -4 4
           h-7
           l-3 3
           v-3
           h-0
           a4 4 0 0 1 -4 -4
           v-6
           a4 4 0 0 1 4 -4
           z"
        fill="#FFFFFF"
        stroke={GREEN}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Dollar mark inside bubble */}
      <path
        d="M64 17.5 v9 M61.5 19.5 q0 -1.5 2.5 -1.5 q2.5 0 2.5 1.8 q0 1.6 -2.5 2 q-2.5 0.4 -2.5 2 q0 1.8 2.5 1.8 q2.5 0 2.5 -1.5"
        stroke={GREEN_DARK}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>

    {/* Gold sparkle — premium/recommended accent */}
    <g id="home-sparkle">
      <path
        d="M20 16 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 z"
        fill={GOLD}
      />
    </g>
  </svg>
);
