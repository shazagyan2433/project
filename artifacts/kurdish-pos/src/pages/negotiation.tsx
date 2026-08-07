import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Handshake, Send, Search, Circle, CheckCheck, Paperclip, Smile } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSectorLabel } from "@/hooks/useSectorScope";
import { useGetCustomers } from "@workspace/api-client-react";

type Message = { id: number; from: "me" | "them"; text: string; time: string; read: boolean };

export default function Negotiation() {
  const { t } = useTranslation("common");
  const sectorLabel = useSectorLabel();
  const { data: customers = [], isLoading } = useGetCustomers();

  const contacts = useMemo(
    () =>
      customers.map((c, i) => ({
        id: c.id,
        name: c.name,
        role: t("emptyStates.customerRole", { defaultValue: "کڕیار" }),
        avatar: c.name.charAt(0),
        color: ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#A855F7"][i % 5],
        unread: 0,
        last: "—",
        time: "—",
        online: false,
      })),
    [customers, t],
  );

  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, Message[]>>({});
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const active = contacts.find((c) => c.id === activeId);
  const msgs = activeId ? messages[activeId] ?? [] : [];

  const filteredContacts = contacts.filter(
    (c) => c.name.includes(search) || c.role.includes(search),
  );

  const send = () => {
    if (!input.trim() || !activeId) return;
    const newMsg: Message = { id: Date.now(), from: "me", text: input.trim(), time: "ئێستا", read: false };
    setMessages((prev) => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), newMsg] }));
    setInput("");
  };

  return (
    <div className="space-y-4 pb-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.3)" }}>
          <Handshake className="w-5 h-5" style={{ color: "#EC4899" }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">{t("pageTitles.negotiation", { sector: sectorLabel })}</h1>
          <p className="text-xs text-white/40">{t("pageTitles.negotiationSubtitle", { sector: sectorLabel })}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-white/30 text-sm">{t("common.loading", { defaultValue: "بارکردن…" })}</div>
      ) : contacts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
          <Handshake className="w-12 h-12 mb-3 opacity-20 text-white" />
          <p className="text-sm font-semibold text-white/50">{t("emptyStates.noContacts")}</p>
          <p className="text-xs text-white/25 mt-1">{t("emptyStates.noContactsSubtitle")}</p>
        </div>
      ) : (
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-72 shrink-0 rounded-2xl flex flex-col overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="p-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="گەڕان..."
                className="w-full ps-8 pe-3 py-2 rounded-xl text-xs text-white/70 placeholder-white/25 outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="w-full flex items-center gap-3 px-3 py-3 text-start transition-all"
                style={{
                  background: activeId === c.id ? "rgba(236,72,153,0.08)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                  style={{ background: `linear-gradient(135deg,${c.color}80,${c.color}40)` }}
                >
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{c.name}</p>
                  <p className="text-[10px] text-white/35 truncate">{c.last}</p>
                </div>
                {c.unread > 0 && (
                  <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: "#EC4899" }}>
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 rounded-2xl flex flex-col overflow-hidden min-w-0" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-white/30 text-sm">{t("emptyStates.selectContact")}</div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
                  style={{ background: `linear-gradient(135deg,${active.color}80,${active.color}40)` }}
                >
                  {active.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{active.name}</p>
                  <p className="text-[10px] text-white/35 flex items-center gap-1">
                    <Circle className="w-2 h-2" style={{ color: active.online ? "#34D399" : "rgba(255,255,255,0.2)", fill: active.online ? "#34D399" : "transparent" }} />
                    {active.role}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {msgs.length === 0 ? (
                  <div className="text-center py-12 text-white/25 text-xs">{t("emptyStates.noMessages")}</div>
                ) : (
                  msgs.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className="max-w-[75%] px-3 py-2 rounded-2xl text-xs"
                        style={{
                          background: m.from === "me" ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.06)",
                          border: m.from === "me" ? "1px solid rgba(236,72,153,0.25)" : "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.85)",
                        }}
                      >
                        <p>{m.text}</p>
                        <p className="text-[9px] mt-1 text-white/30 flex items-center gap-1 justify-end">
                          {m.time}
                          {m.from === "me" && <CheckCheck className="w-3 h-3" style={{ color: m.read ? "#34D399" : "rgba(255,255,255,0.2)" }} />}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="px-4 py-3 shrink-0 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button className="text-white/25 hover:text-white/50"><Paperclip className="w-4 h-4" /></button>
                <button className="text-white/25 hover:text-white/50"><Smile className="w-4 h-4" /></button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="نامە بنووسە..."
                  className="flex-1 px-3 py-2 rounded-xl text-xs text-white/80 placeholder-white/25 outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <button
                  onClick={send}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#EC4899,#BE185D)" }}
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
