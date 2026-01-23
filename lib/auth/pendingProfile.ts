export type PendingProfile = {
  full_name: string;
  phone?: string;
  email: string;
  created_at: string;
};

const KEY = "mcr_pending_profile_v1";

export function setPendingProfile(p: PendingProfile) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function getPendingProfile(): PendingProfile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingProfile;
  } catch {
    return null;
  }
}

export function clearPendingProfile() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
