/* eslint-disable @typescript-eslint/no-explicit-any */

export type Role = "runner" | "admin" | string;

export type User = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role?: Role;
  created_at: string;
};

export type Club = {
  id: string;
  name: string;
  created_at: string;
};

export type ClubMembership = {
  id: string; // user_id (local id for seed + members)
  club_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  is_admin?: boolean;
  created_at: string;
};

export type Shoe = {
  id: string;
  name: string;
  miles: number;
  limit: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Run = {
  id: string;
  user_id: string;
  club_id: string;
  run_date: string; // YYYY-MM-DD
  miles: number;
  type: string;
  race_name?: string;
  notes?: string;
  shoe_id?: string;
  created_at: string;
};

export type Announcement = {
  id: string;
  club_id: string;
  title: string;
  body: string;
  audience: string;
  created_at: string;
  updated_at: string;
};

export type ProfileExtras = {
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function nowISO() {
  return new Date().toISOString();
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function normalizeRunDate(input: any): string {
  // Always return YYYY-MM-DD (local date)
  try {
    if (input instanceof Date && !Number.isNaN(input.getTime())) {
      const y = input.getFullYear();
      const m = String(input.getMonth() + 1).padStart(2, "0");
      const d = String(input.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const s = String(input ?? "").trim();
    if (!s) return "";

    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // If ISO string like 2026-01-07T...
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);

    // If MM/DD/YYYY
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      const mm = String(mdy[1]).padStart(2, "0");
      const dd = String(mdy[2]).padStart(2, "0");
      const yy = mdy[3];
      return `${yy}-${mm}-${dd}`;
    }

    // Last resort: try Date parse
    const dt = new Date(s);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    return s; // keep as-is if unknown
  } catch {
    return String(input ?? "").trim();
  }
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const K_SEEDED = "mcr_seeded_v1";
const K_ME = "mcr_me_v1";
const K_PROFILE_EXTRAS = "mcr_profile_extras_v1";
const K_CLUBS = "mcr_clubs_v1";
const K_MEMBERSHIPS = "mcr_memberships_v1";
const K_ACTIVE_CLUB = "mcr_active_club_v1";
const K_SHOES = "mcr_shoes_v1";
const K_RUNS = "mcr_runs_v1";
const K_ANNOUNCEMENTS = "mcr_announcements_v1";
const K_PREMIUM = "mcr_premium_active_v1";

export const ACTIVE_CLUB_CHANGED_EVENT = "mcr_active_club_changed";

function seedDefaultData() {
  const me: User = {
    id: "local-user",
    full_name: "Runner",
    role: "runner",
    created_at: nowISO(),
  };

const seedIdA = uid();
const seedIdB = uid();

const clubA: Club = { id: seedIdA, name: "Prime Meridian Klub", created_at: nowISO() };
const clubB: Club = { id: seedIdB, name: "BMR Miami", created_at: nowISO() };


  writeJSON(K_ME, me);
  writeJSON(K_PROFILE_EXTRAS, {});

  writeJSON(K_CLUBS, [clubA, clubB]);

  // Seed: user is admin in both clubs
  writeJSON(K_MEMBERSHIPS, [
    {
      id: me.id,
      club_id: clubA.id,
      full_name: me.full_name,
      email: me.email,
      phone: me.phone,
      is_admin: true,
      created_at: nowISO(),
    },
    {
      id: me.id,
      club_id: clubB.id,
      full_name: me.full_name,
      email: me.email,
      phone: me.phone,
      is_admin: true,
      created_at: nowISO(),
    },
  ]);

  writeJSON(K_ACTIVE_CLUB, clubB.id);
  writeJSON(K_SHOES, []);
  writeJSON(K_RUNS, []);
  writeJSON(K_ANNOUNCEMENTS, []);
}

function cleanName(v: any) {
  return String(v ?? "").trim();
}

export const Store = {
  /* ---------- bootstrap ---------- */

  ensureSeeded() {
    if (!isBrowser()) return;

    // seed once
    if (window.localStorage.getItem(K_SEEDED) !== "1") {
      seedDefaultData();
      window.localStorage.setItem(K_SEEDED, "1");
    }

    // ---- MIGRATION: normalize existing run_date values to YYYY-MM-DD ----
    try {
      const runs = readJSON<any[]>(K_RUNS, []);
      let changed = false;

      const next = runs.map((r) => {
        if (!r) return r;

        const prev = String(r.run_date ?? "").trim();
        const normalized = normalizeRunDate(prev);

        if (normalized && normalized !== prev) {
          changed = true;
          return { ...r, run_date: normalized };
        }
        return r;
      });

      if (changed) writeJSON(K_RUNS, next);
    } catch {
      // ignore
    }

    // ---- MIGRATION: ensure memberships have full_name string ----
    try {
      const mems = readJSON<any[]>(K_MEMBERSHIPS, []);
      let changed = false;

      const next = mems.map((m) => {
        if (!m) return m;
        const fn = String(m.full_name ?? "").trim();
        if (!fn) {
          changed = true;
          return { ...m, full_name: "Member" };
        }
        return m;
      });

      if (changed) writeJSON(K_MEMBERSHIPS, next);
    } catch {
      // ignore
    }

    // Ensure extras exists
    try {
      const extras = readJSON<any>(K_PROFILE_EXTRAS, null);
      if (!extras || typeof extras !== "object") writeJSON(K_PROFILE_EXTRAS, {});
    } catch {
      // ignore
    }
  },

  /* ---------- user ---------- */

  getMe(): User | null {
    return readJSON<User | null>(K_ME, null);
  },

  updateMe(patch: Partial<User>) {
    Store.ensureSeeded();
    const prev = Store.getMe();

    const next: User = {
      id: String(patch.id ?? prev?.id ?? "local-user"),
      full_name: cleanName(patch.full_name ?? prev?.full_name ?? "Runner") || "Runner",
      email: patch.email != null ? cleanName(patch.email) || undefined : prev?.email,
      phone: patch.phone != null ? cleanName(patch.phone) || undefined : prev?.phone,
      role: patch.role != null ? String(patch.role) : prev?.role,
      created_at: String(prev?.created_at ?? nowISO()),
    };

    writeJSON(K_ME, next);

    // Keep your memberships row in sync so Admin badges + member directory reflect your name/email/phone
    try {
      const mems = Store.listMemberships();
      const meId = String(next.id);
      const updated = mems.map((m) => {
        if (String(m.id) !== meId) return m;
        return {
          ...m,
          full_name: next.full_name,
          email: next.email,
          phone: next.phone,
        };
      });
      writeJSON(K_MEMBERSHIPS, updated);
    } catch {
      // ignore
    }

    return next;
  },

  isProfileComplete(): boolean {
    Store.ensureSeeded();
    const me = Store.getMe();
    const fn = String(me?.full_name ?? "").trim();
    const em = String(me?.email ?? "").trim();
    const ph = String(me?.phone ?? "").trim();

    if (fn.length < 2) return false;
    if (em.length < 5 || !em.includes("@")) return false;
    if (ph.length < 7) return false;

    return true;
  },

  logout() {
    // Local-only: clear user + extras, and mark as "not complete" by clearing email/phone/name
    Store.ensureSeeded();
    const prev = Store.getMe();
    const next: User = {
      id: String(prev?.id ?? "local-user"),
      full_name: "Runner",
      role: "runner",
      created_at: String(prev?.created_at ?? nowISO()),
    };
    writeJSON(K_ME, next);
    writeJSON(K_PROFILE_EXTRAS, {});
    return true;
  },

  getProfileExtras(): ProfileExtras {
    Store.ensureSeeded();
    const extras = readJSON<ProfileExtras>(K_PROFILE_EXTRAS, {});
    return {
      emergency_contact_name: extras?.emergency_contact_name ? String(extras.emergency_contact_name) : "",
      emergency_contact_phone: extras?.emergency_contact_phone ? String(extras.emergency_contact_phone) : "",
      medical_notes: extras?.medical_notes ? String(extras.medical_notes) : "",
    };
  },

  updateProfileExtras(patch: ProfileExtras) {
    Store.ensureSeeded();
    const prev = Store.getProfileExtras();
    const next: ProfileExtras = {
      emergency_contact_name:
        patch.emergency_contact_name != null ? cleanName(patch.emergency_contact_name) : prev.emergency_contact_name,
      emergency_contact_phone:
        patch.emergency_contact_phone != null ? cleanName(patch.emergency_contact_phone) : prev.emergency_contact_phone,
      medical_notes: patch.medical_notes != null ? cleanName(patch.medical_notes) : prev.medical_notes,
    };
    writeJSON(K_PROFILE_EXTRAS, next);
    return next;
  },

  /* ---------- clubs ---------- */

  listClubs(): Club[] {
    return readJSON<Club[]>(K_CLUBS, []);
  },

  getClubName(clubId: string): string | null {
    const cid = String(clubId ?? "");
    return Store.listClubs().find((c) => String(c.id) === cid)?.name ?? null;
  },

  getActiveClubId(): string | null {
    return Store.getCurrentClubId();
  },

  getCurrentClubId(): string | null {
    return readJSON<string | null>(K_ACTIVE_CLUB, null);
  },

  getMyApprovedClubId(): string | null {
    const me = Store.getMe();
    if (!me) return null;
    const mem = Store.listMemberships().find((m) => String(m.id) === String(me.id));
    return mem ? String(mem.club_id) : null;
  },

  setActiveClubId(clubId: string | null) {
    writeJSON(K_ACTIVE_CLUB, clubId);
    if (isBrowser()) window.dispatchEvent(new Event(ACTIVE_CLUB_CHANGED_EVENT));
  },

  /* ---------- memberships ---------- */

  listMemberships(): ClubMembership[] {
    const mems = readJSON<ClubMembership[]>(K_MEMBERSHIPS, []);
    return mems.map((m: any) => ({
      ...m,
      id: String(m?.id ?? ""),
      club_id: String(m?.club_id ?? ""),
      full_name: String(m?.full_name ?? "").trim() || "Member",
      email: m?.email ? String(m.email) : undefined,
      phone: m?.phone ? String(m.phone) : undefined,
      is_admin: Boolean(m?.is_admin),
      created_at: String(m?.created_at ?? nowISO()),
    }));
  },

  listMembers(clubId: string): ClubMembership[] {
    const cid = String(clubId ?? "");
    return Store.listMemberships()
      .filter((m) => String(m.club_id) === cid)
      .map((m) => ({
        ...m,
        full_name: String(m.full_name ?? "").trim() || "Member",
      }));
  },

  isClubAdmin(clubId: string): boolean {
    const me = Store.getMe();
    if (!me) return false;
    const cid = String(clubId ?? "");
    return Boolean(
      Store.listMemberships().find(
        (m) => String(m.club_id) === cid && String(m.id) === String(me.id) && Boolean(m.is_admin)
      )
    );
  },

  addMember(arg1: any, arg2?: any) {
    Store.ensureSeeded();

    let clubId = "";
    let full_name = "";
    let email = "";
    let phone = "";
    let is_admin = false;

    if (typeof arg1 === "object" && arg1) {
      clubId = String(arg1.club_id ?? "");
      full_name = cleanName(arg1.full_name);
      email = cleanName(arg1.email);
      phone = cleanName(arg1.phone);
      is_admin = Boolean(arg1.is_admin);
    } else {
      clubId = String(arg1 ?? "");
      const payload = arg2 ?? {};
      full_name = cleanName(payload.full_name);
      email = cleanName(payload.email);
      phone = cleanName(payload.phone);
      is_admin = Boolean(payload.is_admin);
    }

    if (!clubId) throw new Error("Missing club.");
    if (!full_name || full_name.length < 2) throw new Error("Full name is required.");

    const memberships = Store.listMemberships();

    if (email) {
      const dup = memberships.find(
        (m) => String(m.club_id) === String(clubId) && String(m.email ?? "").toLowerCase() === email.toLowerCase()
      );
      if (dup) throw new Error("That email is already in this club.");
    }

    const mem: ClubMembership = {
      id: uid(),
      club_id: String(clubId),
      full_name,
      email: email || undefined,
      phone: phone || undefined,
      is_admin,
      created_at: nowISO(),
    };

    memberships.unshift(mem);
    writeJSON(K_MEMBERSHIPS, memberships);
    return mem;
  },

  removeMember(arg1: any, arg2?: any) {
    Store.ensureSeeded();

    const me = Store.getMe();
    const clubId = arg2 != null ? String(arg1 ?? "") : "";
    const memberId = arg2 != null ? String(arg2 ?? "") : String(arg1 ?? "");

    if (!memberId) throw new Error("Missing member.");

    if (me && String(memberId) === String(me.id)) {
      throw new Error("You cannot remove yourself from the club.");
    }

    const memberships = Store.listMemberships();

    const next = memberships.filter((m) => {
      if (clubId) {
        return !(String(m.club_id) === clubId && String(m.id) === memberId);
      }
      return String(m.id) !== memberId;
    });

    writeJSON(K_MEMBERSHIPS, next);
    return true;
  },

  /* ---------- shoes ---------- */

  listShoes(): Shoe[] {
    const shoes = readJSON<Shoe[]>(K_SHOES, []);
    return shoes.map((s: any) => ({
      ...s,
      id: String(s?.id ?? ""),
      name: String(s?.name ?? "").trim() || "Shoe",
      miles: Number(s?.miles ?? 0),
      limit: Number(s?.limit ?? 0),
      active: Boolean(s?.active),
      created_at: String(s?.created_at ?? nowISO()),
      updated_at: String(s?.updated_at ?? nowISO()),
    }));
  },

  listActiveShoes(): Shoe[] {
    return Store.listShoes().filter((s) => s.active === true);
  },

  addShoe(arg1: any, arg2?: any) {
    Store.ensureSeeded();

    let name = "";
    let limit = 0;
    let active = true;

    if (typeof arg1 === "object" && arg1) {
      name = String(arg1.name ?? "").trim();
      limit = Number(arg1.limit);
      active = arg1.active !== false;
    } else {
      name = String(arg1 ?? "").trim();
      limit = Number(arg2);
    }

    if (!name) throw new Error("Shoe name required.");
    if (!Number.isFinite(limit) || limit <= 0) throw new Error("Invalid mileage limit.");

    const shoes = Store.listShoes();
    const shoe: Shoe = {
      id: uid(),
      name,
      miles: 0,
      limit: round1(limit),
      active,
      created_at: nowISO(),
      updated_at: nowISO(),
    };

    shoes.unshift(shoe);
    writeJSON(K_SHOES, shoes);
    return shoe;
  },

  setShoeActive(shoeId: string, isActive: boolean) {
    Store.ensureSeeded();

    const shoes = Store.listShoes();
    const idx = shoes.findIndex((s) => String(s.id) === String(shoeId));
    if (idx < 0) return false;

    shoes[idx] = { ...shoes[idx], active: isActive, updated_at: nowISO() };
    writeJSON(K_SHOES, shoes);
    return true;
  },

  setShoeRetired(shoeId: string, retired: boolean) {
    return Store.setShoeActive(shoeId, !retired);
  },

  addMilesToShoe(shoeId: string, delta: number) {
    Store.ensureSeeded();

    const shoes = Store.listShoes();
    const idx = shoes.findIndex((s) => String(s.id) === String(shoeId));
    if (idx < 0) return;

    const nextMiles = round1(Number(shoes[idx].miles ?? 0) + Number(delta ?? 0));
    shoes[idx].miles = Number.isFinite(nextMiles) ? nextMiles : Number(shoes[idx].miles ?? 0);
    shoes[idx].updated_at = nowISO();
    writeJSON(K_SHOES, shoes);
  },

  /* ---------- runs ---------- */

  listRuns(): Run[] {
    const runs = readJSON<Run[]>(K_RUNS, []);
    return runs
      .map((r: any) => ({
        ...r,
        id: String(r?.id ?? ""),
        user_id: String(r?.user_id ?? ""),
        club_id: String(r?.club_id ?? ""),
        run_date: normalizeRunDate(r?.run_date),
        miles: round1(Number(r?.miles ?? 0)),
        type: String(r?.type ?? "training"),
        race_name: r?.race_name ? String(r.race_name) : "",
        notes: r?.notes ? String(r.notes) : "",
        shoe_id: r?.shoe_id ? String(r.shoe_id) : "",
        created_at: String(r?.created_at ?? nowISO()),
      }))
      .filter((r) => r.id && r.user_id && r.club_id && r.run_date);
  },

  addRun(input: Omit<Run, "id" | "created_at">) {
    Store.ensureSeeded();

    const runDate = normalizeRunDate((input as any).run_date);
    if (!runDate) throw new Error("Run date is required.");

    const miles = round1(Number((input as any).miles));
    if (!Number.isFinite(miles) || miles <= 0) throw new Error("Miles must be greater than 0.");

    const run: Run = {
      ...input,
      run_date: runDate,
      id: uid(),
      miles,
      created_at: nowISO(),
    };

    if (run.shoe_id) {
      Store.addMilesToShoe(run.shoe_id, run.miles);
    }

    const runs = Store.listRuns();
    runs.unshift(run);
    writeJSON(K_RUNS, runs);
    return run;
  },

  updateRun(runId: string, patch: Partial<Run>) {
    Store.ensureSeeded();

    const runs = Store.listRuns();
    const idx = runs.findIndex((r) => String(r.id) === String(runId));
    if (idx < 0) throw new Error("Run not found.");

    const prev = runs[idx];

    const next: Run = {
      ...prev,
      ...patch,
      run_date: patch.run_date != null ? normalizeRunDate(patch.run_date) : prev.run_date,
      miles: patch.miles != null ? round1(Number(patch.miles)) : prev.miles,
      shoe_id: patch.shoe_id != null ? String(patch.shoe_id || "") : prev.shoe_id,
      club_id: patch.club_id != null ? String(patch.club_id || "") : prev.club_id,
      type: patch.type != null ? String(patch.type || "") : prev.type,
      race_name: patch.race_name != null ? String(patch.race_name || "") : prev.race_name,
      notes: patch.notes != null ? String(patch.notes || "") : prev.notes,
    };

    if (!next.run_date) throw new Error("Run date is required.");
    if (!Number.isFinite(next.miles) || next.miles <= 0) throw new Error("Miles must be greater than 0.");

    const prevShoe = prev.shoe_id ? String(prev.shoe_id) : "";
    const nextShoe = next.shoe_id ? String(next.shoe_id) : "";

    if (prevShoe) Store.addMilesToShoe(prevShoe, -Number(prev.miles ?? 0));
    if (nextShoe) Store.addMilesToShoe(nextShoe, Number(next.miles ?? 0));

    runs[idx] = next;
    writeJSON(K_RUNS, runs);
    return next;
  },

  deleteRun(runId: string) {
    Store.ensureSeeded();

    const runs = Store.listRuns();
    const idx = runs.findIndex((r) => String(r.id) === String(runId));
    if (idx < 0) return;

    const run = runs[idx];

    if (run.shoe_id) Store.addMilesToShoe(run.shoe_id, -run.miles);

    runs.splice(idx, 1);
    writeJSON(K_RUNS, runs);
  },

  /* ---------- announcements ---------- */

  listAnnouncements(clubId: string): Announcement[] {
    Store.ensureSeeded();

    const cid = String(clubId ?? "");
    const all = readJSON<Announcement[]>(K_ANNOUNCEMENTS, []);

    return all
      .filter((a: any) => String(a?.club_id ?? "") === cid)
      .map((a: any) => ({
        ...a,
        id: String(a?.id ?? ""),
        club_id: String(a?.club_id ?? ""),
        title: String(a?.title ?? "").trim(),
        body: String(a?.body ?? "").trim(),
        audience: String(a?.audience ?? "team"),
        created_at: String(a?.created_at ?? nowISO()),
        updated_at: String(a?.updated_at ?? nowISO()),
      }))
      .filter((a) => a.title.length > 0 && a.body.length > 0);
  },

  listAllAnnouncements(): Announcement[] {
    Store.ensureSeeded();
    const all = readJSON<Announcement[]>(K_ANNOUNCEMENTS, []);
    return all
      .map((a: any) => ({
        ...a,
        id: String(a?.id ?? ""),
        club_id: String(a?.club_id ?? ""),
        title: String(a?.title ?? "").trim(),
        body: String(a?.body ?? "").trim(),
        audience: String(a?.audience ?? "team"),
        created_at: String(a?.created_at ?? nowISO()),
        updated_at: String(a?.updated_at ?? nowISO()),
      }))
      .filter((a) => a.title.length > 0 && a.body.length > 0);
  },

  getAnnouncementById(id: string): Announcement | null {
    Store.ensureSeeded();
    const all = Store.listAllAnnouncements();
    const found = all.find((a) => String(a.id) === String(id));
    return found ?? null;
  },

  createAnnouncement(input: any) {
    return (Store as any).addAnnouncement(input);
  },

  addAnnouncement(input: Omit<Announcement, "id" | "created_at" | "updated_at">) {
    Store.ensureSeeded();

    const club_id = String((input as any).club_id ?? "");
    const title = String((input as any).title ?? "").trim();
    const body = String((input as any).body ?? "").trim();
    const audience = String((input as any).audience ?? "team").trim() || "team";

    if (!club_id) throw new Error("Missing club.");
    if (!title) throw new Error("Title is required.");
    if (!body) throw new Error("Message is required.");

    const a: Announcement = {
      id: uid(),
      club_id,
      title,
      body,
      audience,
      created_at: nowISO(),
      updated_at: nowISO(),
    };

    const all = readJSON<Announcement[]>(K_ANNOUNCEMENTS, []);
    all.unshift(a);
    writeJSON(K_ANNOUNCEMENTS, all);
    return a;
  },

  deleteAnnouncement(id: string) {
    Store.ensureSeeded();
    const all = readJSON<Announcement[]>(K_ANNOUNCEMENTS, []);
    const next = all.filter((a: any) => String(a?.id ?? "") !== String(id));
    writeJSON(K_ANNOUNCEMENTS, next);
  },

  /* ---------- premium ---------- */

  isPremium(): boolean {
    return readJSON<boolean>(K_PREMIUM, false);
  },

  setPremiumActive(active: boolean) {
    writeJSON(K_PREMIUM, active);
  },
};
