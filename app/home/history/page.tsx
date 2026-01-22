// app/home/history/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";

import { Store, type Run, type Shoe } from "@/lib/mcrStore";

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDateLabel(yyyyMmDd: string) {
  try {
    const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return yyyyMmDd;
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

type Toast = { msg: string; kind?: "ok" | "err" };
type EditMode = "add" | "edit";

export default function HomeHistoryPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [refreshNonce, setRefreshNonce] = useState(0);

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<EditMode>("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  // form fields
  const [fDate, setFDate] = useState(todayYYYYMMDD());
  const [fMiles, setFMiles] = useState("");
  const [fType, setFType] = useState<string>("training");
  const [fRaceName, setFRaceName] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fShoeId, setFShoeId] = useState<string>("");

  const [showNotes, setShowNotes] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded?.();
  }, [mounted]);

  function bump() {
    setRefreshNonce((n) => n + 1);
  }

  function showToast(msg: string, kind: "ok" | "err" = "ok") {
    setToast({ msg, kind });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }

  const userName = useMemo(() => {
    if (!mounted) return "Runner";
    return Store.getMe()?.full_name ?? "Runner";
  }, [mounted, refreshNonce]);

  // Active club for this section: prefer explicit active, else approved club
  const clubId = useMemo(() => {
    if (!mounted) return null;
    return Store.getActiveClubId() ?? Store.getMyApprovedClubId();
  }, [mounted, refreshNonce]);

  const clubName = useMemo(() => {
    if (!mounted || !clubId) return null;
    return Store.getClubName(clubId);
  }, [mounted, clubId, refreshNonce]);

  const runs: Run[] = useMemo(() => {
    if (!mounted) return [];
    return Store.listRuns();
  }, [mounted, refreshNonce]);

  const shoes: Shoe[] = useMemo(() => {
    if (!mounted) return [];
    return Store.listShoes();
  }, [mounted, refreshNonce]);

  const filteredRuns = useMemo(() =>
