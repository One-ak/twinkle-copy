"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  seedDiary,
  seedMemories,
  seedMessages,
  seedReminders,
  universe,
  type ChatMessage,
  type DiaryEntry,
  type Memory,
  type Reminder
} from "@/data/universe";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type LocalState = {
  memories: Memory[];
  diary: DiaryEntry[];
  reminders: Reminder[];
  messages: ChatMessage[];
};

const siteId = process.env.NEXT_PUBLIC_LOVE_SITE_ID ?? universe.siteId;
const storageKey = `love-universe:${siteId}`;
const seedState: LocalState = {
  memories: seedMemories,
  diary: seedDiary,
  reminders: seedReminders,
  messages: seedMessages
};

function readLocalState(): LocalState {
  if (typeof window === "undefined") {
    return seedState;
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return seedState;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<LocalState>;
    const mergeById = <T extends { id: string }>(storedItems: T[] | undefined, seedItems: T[]) => {
      const storedList = storedItems?.length ? storedItems : [];
      const seedIds = new Set(seedItems.map((item) => item.id));
      return [...seedItems, ...storedList.filter((item) => !seedIds.has(item.id))];
    };

    return {
      memories: mergeById(parsed.memories, seedMemories),
      diary: mergeById(parsed.diary, seedDiary),
      reminders: mergeById(parsed.reminders, seedReminders),
      messages: mergeById(parsed.messages, seedMessages)
    };
  } catch {
    return seedState;
  }
}

function persistLocalState(state: LocalState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useLoveBackend() {
  const [state, setState] = useState<LocalState>(seedState);
  const [localReady, setLocalReady] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    setState(readLocalState());
    setLocalReady(true);
  }, []);

  useEffect(() => {
    if (!localReady) return;
    persistLocalState(state);
    channelRef.current?.postMessage({ type: "sync", state });
  }, [localReady, state]);

  useEffect(() => {
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(storageKey) : null;
    channelRef.current = channel;
    if (channel) {
      channel.onmessage = (event: MessageEvent<{ type: string; state: LocalState }>) => {
        if (event.data?.type === "sync") {
          setState(event.data.state);
        }
      };
    }

    return () => {
      channel?.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !isSupabaseConfigured) {
      setIsRealtime(false);
      return;
    }

    const liveClient = client;
    let ignore = false;

    async function loadRemote() {
      const [memories, diary, reminders, messages] = await Promise.all([
        liveClient
          .from("love_memories")
          .select("*")
          .eq("site_id", siteId)
          .order("memory_date", { ascending: true }),
        liveClient
          .from("love_diary_entries")
          .select("*")
          .eq("site_id", siteId)
          .order("entry_date", { ascending: false }),
        liveClient
          .from("love_reminders")
          .select("*")
          .eq("site_id", siteId)
          .order("reminder_date", { ascending: true }),
        liveClient
          .from("love_messages")
          .select("*")
          .eq("site_id", siteId)
          .order("created_at", { ascending: true })
      ]);

      if (ignore) return;

      setState((current) => ({
        memories: memories.data?.length
          ? memories.data.map((row) => ({
              id: row.id,
              date: row.memory_date,
              title: row.title,
              text: row.body,
              photos: row.photo_urls,
              hiddenNote: row.hidden_note,
              unlockAt: row.unlock_at ?? undefined,
              constellation: { x: row.constellation_x, y: row.constellation_y }
            }))
          : current.memories,
        diary: diary.data?.length
          ? diary.data.map((row) => ({
              id: row.id,
              date: row.entry_date,
              title: row.title,
              note: row.note,
              mood: row.mood as DiaryEntry["mood"],
              photo: row.photo_url ?? undefined
            }))
          : current.diary,
        reminders: reminders.data?.length
          ? reminders.data.map((row) => ({
              id: row.id,
              date: row.reminder_date,
              title: row.title,
              note: row.note,
              kind: row.kind as Reminder["kind"]
            }))
          : current.reminders,
        messages: messages.data?.length
          ? messages.data.map((row) => ({
              id: row.id,
              author: row.author,
              body: row.body,
              createdAt: row.created_at,
              reaction: row.reaction ?? undefined,
              image: row.image_url ?? undefined,
              voice: row.voice_url ?? undefined,
              pinned: row.pinned
            }))
          : current.messages
      }));
    }

    loadRemote().catch(() => setIsRealtime(false));

    const channel = liveClient
      .channel(`love-universe-${siteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "love_memories", filter: `site_id=eq.${siteId}` },
        () => loadRemote()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "love_diary_entries", filter: `site_id=eq.${siteId}` },
        () => loadRemote()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "love_reminders", filter: `site_id=eq.${siteId}` },
        () => loadRemote()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "love_messages", filter: `site_id=eq.${siteId}` },
        () => loadRemote()
      )
      .subscribe((status) => setIsRealtime(status === "SUBSCRIBED"));

    return () => {
      ignore = true;
      liveClient.removeChannel(channel);
    };
  }, []);

  const addDiaryEntry = useCallback(async (entry: Omit<DiaryEntry, "id" | "date">, file?: File | null) => {
    const photo = file ? await fileToDataUrl(file) : entry.photo;
    const nextEntry: DiaryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      photo
    };

    setState((current) => ({ ...current, diary: [nextEntry, ...current.diary] }));

    if (supabase && isSupabaseConfigured) {
      await supabase.from("love_diary_entries").insert({
        id: nextEntry.id,
        site_id: siteId,
        entry_date: nextEntry.date,
        title: nextEntry.title,
        note: nextEntry.note,
        mood: nextEntry.mood,
        photo_url: nextEntry.photo ?? null
      });
    }
  }, []);

  const addReminder = useCallback(async (reminder: Omit<Reminder, "id">) => {
    const nextReminder: Reminder = {
      ...reminder,
      id: crypto.randomUUID()
    };

    setState((current) => ({ ...current, reminders: [...current.reminders, nextReminder] }));

    if (supabase && isSupabaseConfigured) {
      await supabase.from("love_reminders").insert({
        id: nextReminder.id,
        site_id: siteId,
        reminder_date: nextReminder.date,
        title: nextReminder.title,
        note: nextReminder.note,
        kind: nextReminder.kind
      });
    }
  }, []);

  const addMemory = useCallback(async (memory: Omit<Memory, "id" | "constellation">, files: File[]) => {
    const uploadedPhotos = files.length
      ? await Promise.all(files.map((file) => fileToDataUrl(file)))
      : memory.photos;

    const nextMemory: Memory = {
      ...memory,
      id: crypto.randomUUID(),
      photos: uploadedPhotos,
      constellation: {
        x: 12 + Math.random() * 78,
        y: 16 + Math.random() * 58
      }
    };

    setState((current) => ({ ...current, memories: [...current.memories, nextMemory] }));

    if (supabase && isSupabaseConfigured) {
      await supabase.from("love_memories").insert({
        id: nextMemory.id,
        site_id: siteId,
        memory_date: nextMemory.date,
        title: nextMemory.title,
        body: nextMemory.text,
        photo_urls: nextMemory.photos,
        hidden_note: nextMemory.hiddenNote,
        unlock_at: nextMemory.unlockAt ?? null,
        constellation_x: nextMemory.constellation.x,
        constellation_y: nextMemory.constellation.y
      });
    }
  }, []);

  const sendMessage = useCallback(async (message: Omit<ChatMessage, "id" | "createdAt">, file?: File | null) => {
    const image = file ? await fileToDataUrl(file) : message.image;
    const nextMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      image,
      createdAt: new Date().toISOString()
    };

    setState((current) => ({ ...current, messages: [...current.messages, nextMessage] }));

    if (supabase && isSupabaseConfigured) {
      await supabase.from("love_messages").insert({
        id: nextMessage.id,
        site_id: siteId,
        author: nextMessage.author,
        body: nextMessage.body,
        reaction: nextMessage.reaction ?? null,
        image_url: nextMessage.image ?? null,
        voice_url: nextMessage.voice ?? null,
        pinned: nextMessage.pinned ?? false,
        created_at: nextMessage.createdAt
      });
    }
  }, []);

  const reactToMessage = useCallback(async (messageId: string, reaction: string) => {
    setState((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.id === messageId ? { ...message, reaction } : message
      )
    }));

    if (supabase && isSupabaseConfigured) {
      await supabase.from("love_messages").update({ reaction }).eq("id", messageId).eq("site_id", siteId);
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isRealtime,
      addDiaryEntry,
      addReminder,
      addMemory,
      sendMessage,
      reactToMessage
    }),
    [addDiaryEntry, addMemory, addReminder, isRealtime, reactToMessage, sendMessage, state]
  );

  return value;
}
