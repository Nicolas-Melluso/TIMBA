import type { ProfileCosmetics } from "../../game/profile.js";

type MenuBadge = { label: string; color: string };

export function menuMusicLabel(musicMuted: boolean): string {
  return musicMuted ? "Activar musica" : "Musica activa";
}

export function menuPanelBorder(cosmetics: ProfileCosmetics): { width: number; alpha: number } {
  if (cosmetics["frame_contract_gold"]) {
    return { width: 3, alpha: 0.9 };
  }
  return { width: 1, alpha: 0.45 };
}

export function menuCosmeticBadges(cosmetics: ProfileCosmetics): MenuBadge[] {
  return [
    cosmetics["frame_contract_gold"] ? { label: "MARCO DORADO", color: "#f2d06b" } : null,
    cosmetics["badge_speed_stamp"] ? { label: "SELLO RAYO", color: "#9fe7db" } : null,
    cosmetics["skin_parca_trophy"] ? { label: "PARCA CAIDA", color: "#ffcbcb" } : null
  ].filter((badge): badge is MenuBadge => Boolean(badge));
}
