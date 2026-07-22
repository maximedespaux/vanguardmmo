/**
 * <Icon> — jeu d'icônes SVG maison de Vanguard (remplace les emojis).
 * Style : line-art 24×24, stroke = currentColor (hérite la couleur → charte orange).
 * Usage : <Icon name="vault" size={22} />  ·  couleur via `color` / CSS parent.
 * Ajouter une icône = ajouter une entrée dans ICONS (paths en currentColor).
 */
import * as React from "react";

export type IconName =
  | "target" | "trending-up" | "key" | "swords" | "sword" | "vault" | "clipboard"
  | "star" | "map" | "graduation" | "puzzle" | "settings" | "users" | "shield"
  | "discord" | "flame" | "book" | "dragon" | "coins" | "sprout" | "search"
  | "check" | "x" | "arrow-right" | "chevron-right" | "trophy" | "sparkles"
  | "grid" | "menu" | "power" | "calendar" | "eye" | "swap" | "moon" | "zap" | "link"
  | "cart" | "package" | "trash" | "edit"
  | "user-plus" | "shirt" | "landmark" | "compass" | "skull" | "heart" | "gift"
  | "alert" | "save" | "ban" | "video" | "clock"
  | "megaphone" | "send" | "map-pin" | "bell" | "message" | "palette" | "plus" | "info" | "lock";

const ICONS: Record<IconName, React.ReactNode> = {
  "target": <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  "trending-up": <><polyline points="3 17 9 11 13 15 21 7" /><polyline points="16 7 21 7 21 12" /></>,
  "key": <><circle cx="7.5" cy="15.5" r="4.5" /><path d="M11 12.5 20 3.5" /><path d="m16.5 7 2.5 2.5L21 7l-2.5-2.5" /></>,
  "swords": <><path d="M6 3 15 12" /><path d="m3 6 3-3" /><path d="M4.5 19.5 8 16" /><path d="M18 3 9 12" /><path d="m21 6-3-3" /><path d="M19.5 19.5 16 16" /><path d="m13 14 3 3" /><path d="m8 14-3 3" /></>,
  "sword": <><path d="M14.5 4H20v5.5L9 20.5 3.5 15Z" /><path d="M13 11 6 4" /><path d="m4 20 3-3" /></>,
  "vault": <><rect x="3" y="4" width="18" height="15" rx="2" /><circle cx="12" cy="11.5" r="3.5" /><path d="M12 9.5v4" /><path d="M10 11.5h4" /><path d="M6 19v2" /><path d="M18 19v2" /></>,
  "clipboard": <><rect x="7" y="4" width="10" height="16" rx="2" /><path d="M9 4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v.5H9Z" fill="currentColor" stroke="none" /><path d="M9.5 10h5" /><path d="M9.5 13.5h5" /><path d="M9.5 17h3" /></>,
  "star": <><path d="M12 3.5 14.6 9l6 .8-4.3 4.2 1 6-5.3-2.9L6.7 20l1-6L3.4 9.8l6-.8Z" /></>,
  "map": <><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z" /><path d="M9 4v14" /><path d="M15 6v14" /></>,
  "graduation": <><path d="M12 4 2 9l10 5 8-4v6" /><path d="M6 12v4c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-4" /></>,
  "puzzle": <><path d="M9 4.5a1.5 1.5 0 0 1 3 0c0 .8-.5 1-.5 1.5H15V9c.5 0 .7-.5 1.5-.5a1.5 1.5 0 0 1 0 3c-.8 0-1-.5-1.5-.5v3.5h-3.5c0-.5.5-.7.5-1.5a1.5 1.5 0 0 0-3 0c0 .8.5 1 .5 1.5H6V11c-.5 0-.7.5-1.5.5a1.5 1.5 0 0 1 0-3c.8 0 1 .5 1.5.5V6h3c0-.5-.5-.7-.5-1.5Z" /></>,
  "settings": <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" /></>,
  "users": <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M16 5.2A3.2 3.2 0 0 1 16 11.4" /><path d="M17 15c2.3.5 3.5 2.4 3.5 5" /></>,
  "shield": <><path d="M12 3 5 6v5c0 4.2 3 7.5 7 9 4-1.5 7-4.8 7-9V6Z" /><path d="m9 11.5 2 2 4-4" /></>,
  "discord": <><path d="M8 6.5A13 13 0 0 1 16 6.5c1.7 2 2.7 4.5 3 8.2-1.4 1.1-2.8 1.8-4 2.3l-1-1.7M8 6.5C6.3 8.5 5.3 11 5 14.7c1.4 1.1 2.8 1.8 4 2.3l1-1.7M8 6.5 7.3 5M16 6.5 16.7 5" /><ellipse cx="9.5" cy="12.5" rx="1.1" ry="1.4" fill="currentColor" stroke="none" /><ellipse cx="14.5" cy="12.5" rx="1.1" ry="1.4" fill="currentColor" stroke="none" /></>,
  "flame": <><path d="M12 3c.5 3-2 4-2 7a2 2 0 0 0 4 0c0-.8-.3-1.3-.3-1.3 1.8 1 3.3 3 3.3 5.3a5 5 0 0 1-10 0C7 12 9.5 9 12 3Z" /></>,
  "book": <><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z" /><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19" /></>,
  "dragon": <><path d="M4 14c0-3 2.5-5 5.5-5 2 0 3 1 4.5 1 2 0 3-2 5-2 1 0 2 .7 2 2 0 2-2 2.5-2 2.5" /><path d="M4 14c-.5 2 .5 4 3 5l2-1 2 1 2-1 2 1c2.5-1 3.5-3 3-5" /><circle cx="17.5" cy="11" r=".8" fill="currentColor" stroke="none" /><path d="m6 9 1.5-2.5L9 9" /></>,
  "coins": <><ellipse cx="9" cy="7" rx="5" ry="2.5" /><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" /><path d="M10 13.4c.4 1.3 2.4 2.3 4.8 2.3 2.8 0 5-1.1 5-2.5v-4c0-1.3-1.8-2.3-4.3-2.5" /></>,
  "sprout": <><path d="M12 20v-8" /><path d="M12 12c0-3-2-5-6-5 0 4 2 5 6 5Z" /><path d="M12 13c0-2.5 1.7-4.5 5-4.5-.2 3.4-2 4.5-5 4.5Z" /></>,
  "search": <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.7-4.7" /></>,
  "check": <><path d="m4 12.5 5 5 11-11" /></>,
  "x": <><path d="M6 6l12 12M18 6 6 18" /></>,
  "arrow-right": <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  "chevron-right": <><path d="m9 5 7 7-7 7" /></>,
  "trophy": <><path d="M7 4h10v4a5 5 0 0 1-10 0Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" /><path d="M12 13v3M9 20h6M10 20c0-2 1-2.5 2-2.5s2 .5 2 2.5" /></>,
  "sparkles": <><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" /><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z" /></>,
  "grid": <><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /></>,
  "menu": <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
  "power": <><path d="M12 3v9" /><path d="M6.6 7.6a8 8 0 1 0 10.8 0" /></>,
  "calendar": <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18" /><path d="M8 2.5v4" /><path d="M16 2.5v4" /></>,
  "eye": <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  "swap": <><path d="M4 8h13" /><path d="m14 5 3 3-3 3" /><path d="M20 16H7" /><path d="m10 13-3 3 3 3" /></>,
  "moon": <><path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z" /></>,
  "zap": <><path d="M13 2 4 13.5h6.5L10 22l9-12h-6.5L13 2Z" /></>,
  "link": <><path d="M9.5 14.5 14.5 9.5" /><path d="M11 6.5 12.4 5a4 4 0 0 1 5.6 5.6l-1.5 1.4" /><path d="M13 17.5 11.6 19a4 4 0 0 1-5.6-5.6L7.5 12" /></>,
  "cart": <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2.4l2.3 12.3a1.5 1.5 0 0 0 1.5 1.2h8.9a1.5 1.5 0 0 0 1.5-1.2L20.5 7H6.2" /></>,
  "package": <><path d="M21 8 12 3 3 8v8l9 5 9-5Z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>,
  "trash": <><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7l.9 12.1a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L17.5 7" /><path d="M10 11v6M14 11v6" /></>,
  "edit": <><path d="M11 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L11 15l-4 1 1-4Z" /></>,
  "user-plus": <><circle cx="9" cy="8" r="3.4" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M19 8.5v5" /><path d="M16.5 11h5" /></>,
  "shirt": <><path d="M8 3 3 7l2.6 3.4L8 8.8V21h8V8.8l2.4 1.6L21 7l-5-4-1.6 1.6a2.6 2.6 0 0 1-4.8 0Z" /></>,
  "landmark": <><path d="M3 21h18" /><path d="M4 10h16" /><path d="m12 3 8 5H4Z" /><path d="M5.5 10v11M9.5 10v11M14.5 10v11M18.5 10v11" /></>,
  "compass": <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 5.3-5.3 2.2 2.2-5.3Z" /></>,
  "skull": <><path d="M5 11a7 7 0 1 1 14 0c0 2-1 3.6-2.3 4.6a1.4 1.4 0 0 0-.5 1.1V18a1 1 0 0 1-1 1h-.6v-2h-2v2h-1.2v-2h-2v2H9a1 1 0 0 1-1-1v-1.3a1.4 1.4 0 0 0-.5-1.1C6.1 14.6 5 13 5 11Z" /><circle cx="9.2" cy="11.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="14.8" cy="11.5" r="1.2" fill="currentColor" stroke="none" /></>,
  "heart": <><path d="M12 20.3S3.5 15.5 3.5 9.6A4.1 4.1 0 0 1 12 7.5a4.1 4.1 0 0 1 8.5 2.1c0 5.9-8.5 10.7-8.5 10.7Z" /></>,
  "gift": <><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v7.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V12" /><path d="M12 8v12.5" /><path d="M12 8S10.8 4 8.3 4a2 2 0 1 0 0 4Z" /><path d="M12 8s1.2-4 3.7-4a2 2 0 1 1 0 4Z" /></>,
  "alert": <><path d="M12 3.6 2.5 20h19L12 3.6Z" /><path d="M12 10v4.5" /><path d="M12 17.5h.01" /></>,
  "save": <><path d="M15.2 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.8Z" /><path d="M17 21v-7H7v7" /><path d="M7 3v4h8" /></>,
  "ban": <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  "video": <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m10 9.5 5 2.5-5 2.5Z" fill="currentColor" stroke="none" /></>,
  "clock": <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3.5 2" /></>,
  "megaphone": <><path d="m3.5 9 13-5v16l-13-5Z" /><path d="M3.5 9H3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h.5" /><path d="M7 15.3V19h3v-2.6" /></>,
  "send": <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></>,
  "map-pin": <><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  "bell": <><path d="M18 9a6 6 0 1 0-12 0c0 4.5-2 6-2 6h16s-2-1.5-2-6Z" /><path d="M10.2 20a1.9 1.9 0 0 0 3.6 0" /></>,
  "message": <><path d="M20 4H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3v4l4-4h9a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z" /></>,
  "palette": <><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.6-1.6 0-.4-.2-.7-.4-1-.2-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.4-4-7.8-9-7.8Z" /><circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="16.3" cy="10.5" r="1.1" fill="currentColor" stroke="none" /></>,
  "plus": <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  "info": <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
  "lock": <><rect x="4.5" y="10" width="15" height="10.5" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
};

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, strokeWidth = 1.9, style, ...rest }: IconProps) {
  const node = ICONS[name];
  if (!node) return null;
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
      focusable="false"
      style={{ flexShrink: 0, display: "block", ...style }}
      {...rest}
    >
      {node}
    </svg>
  );
}

export default Icon;
