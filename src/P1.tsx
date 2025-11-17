import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mqtt, { MqttClient } from "mqtt";
import { Toaster, toast } from "react-hot-toast";
import {
  DndContext, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DOUBLE_TAP_INTERVAL = 300;

export type Item = {
  id: number;
  name: string;
  status: "정상" | "고장" | "꺼짐";
  statusDot: string; // "green" | "red" | "gray"
  battery: string;
  lat?: number; // 좌표는 안 씀
  lng?: number; // 좌표는 안 씀
};

type NotifyMsg = {
  idx?: number | string;
  id?: number | string;
  status: "GOOD" | "BAD" | "OFF";
  battery?: string;
  cmd: "new_device" | "status_update" | "alert";
  lat?: number | string; // 오더라도 무시
  lng?: number | string; // 오더라도 무시
};

const STORAGE_KEY = "@piling_items";

function mapStatus(status: NotifyMsg["status"]) {
  switch (status) {
    case "GOOD": return { status: "정상" as const, dot: "green" };
    case "BAD": return { status: "고장" as const, dot: "red" };
    case "OFF":
    default: return { status: "꺼짐" as const, dot: "gray" };
  }
}

function loadItems(): Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];
    return (parsed || []).filter((it) => it && typeof it.id === "number" && !Number.isNaN(it.id)) as Item[];
  } catch {
    return [];
  }
}
function saveItems(items: Item[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function SortableRow({ item, onContextMenu }: { item: Item; onContextMenu: (item: Item) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    background: "#fff",
    border: "4px solid #18d",
    borderRadius: 45,
    padding: 15,
    height: 150,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    cursor: "grab",
  };

  const lastTapRef = useRef<number | null>(null);
  const onClick = () => {
    const now = Date.now();
    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_INTERVAL) {
      lastTapRef.current = null;
      onContextMenu(item);
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current && Date.now() - lastTapRef.current >= DOUBLE_TAP_INTERVAL) {
          lastTapRef.current = null;
        }
      }, DOUBLE_TAP_INTERVAL);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#000" }}>{item.id}번 말뚝</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 20, height: 20, borderRadius: 15, background: item.statusDot, display: "inline-block" }} />
        <span style={{ fontSize: 28, fontWeight: 700, color: "#000" }}>{item.status}</span>
      </div>
    </div>
  );
}

const P1: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState<Item[]>(() => loadItems());
  const safeItems = useMemo(() => items.filter((it) => it && typeof it.id === "number" && !Number.isNaN(it.id)), [items]);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
    saveItems(items);
  }, [items]);

  const [selected, setSelected] = useState<Item | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = (item: Item) => {
    setSelected(item);
    setMenuOpen(true);
  };
  const handleDelete = () => {
    if (!selected) return;
    setItems((prev) => prev.filter((i) => i && i.id !== selected.id));
    setMenuOpen(false);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const ids = useMemo(() => safeItems.map((i) => i.id), [safeItems]);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = safeItems.findIndex((i) => i.id === active.id);
    const newIndex = safeItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(safeItems, oldIndex, newIndex);
    setItems(reordered);
  };

  const clientRef = useRef<MqttClient | null>(null);
  useEffect(() => {
    const url = "wss://1c15066522914e618d37acbb80809524.s1.eu.hivemq.cloud:8884/mqtt";
    const client = mqtt.connect(url, { username: "tester", password: "Test1234" });
    clientRef.current = client;

    client.on("connect", () => {
      console.log("MQTT Connected");
      client.subscribe(["Notify", "GET_Response", "Response"], (err) => err && console.error(err));
    });

    client.on("message", (_topic, payload) => {
      if (_topic !== "Notify") return;
      try {
        const m = JSON.parse(String(payload)) as NotifyMsg;
        const { status, dot } = mapStatus(m.status);
        const idx = Number(m.idx ?? m.id);
        if (Number.isNaN(idx)) {
          console.warn("Invalid device id:", m);
          return;
        }

        if (m.cmd === "new_device") {
          if (itemsRef.current.some((it) => it.id === idx)) return;
          toast((t) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 18 }}>
              <b>새로운 말뚝을 찾았어요!</b>
              <div style={{fontSize: 16}}>id: {idx}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setItems((prev) => [
                      ...prev,
                      {
                        id: idx,
                        name: `${prev.length + 1}번 말뚝`,
                        status,
                        statusDot: dot,
                        battery: String(m.battery ?? ""),
                      },
                    ]);
                    toast.dismiss(t.id);
                  }}
                >
                  지금 추가
                </button>
                <button onClick={() => toast.dismiss(t.id)}>닫기</button>
              </div>
            </div>
          ));
        } else if (m.cmd === "status_update") {
          setItems((prev) => prev.map((it) => (it.id === idx ? { ...it, status, statusDot: dot } : it)));
        } else if (m.cmd === "alert") {
          if (Notification && Notification.permission === "granted") {
            new Notification("움직임 감지", { body: `${idx}번 말뚝에서 움직임이 감지되었습니다.` });
          } else if (Notification && Notification.permission !== "denied") {
            Notification.requestPermission();
          }
          toast.success(`${idx}번 말뚝에서 움직임이 감지되었습니다.`);
        }
      } catch (e) {
        console.error("Notify parse error", e);
      }
    });

    client.on("error", (e) => console.error("MQTT Error", e));
    client.on("reconnect", () => console.log("MQTT Reconnecting..."));
    client.on("close", () => console.log("MQTT Closed"));

    (client as any).stream?.addEventListener?.("close", (ev: CloseEvent) => {
      console.warn("WS closed", { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
    });
    (client as any).stream?.addEventListener?.("error", (ev: Event) => {
      console.error("WS stream error", ev);
    });

    return () => {
      client.end(true);
      clientRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#3d3d3d", padding: 20 }}>
      <Toaster position="top-center" />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {safeItems.map((it) => (
            <SortableRow key={it.id} item={it} onContextMenu={openMenu} />
          ))}
        </SortableContext>
      </DndContext>

      <div style={{ position: "fixed", left: 20, right: 20, bottom: 20, display: "flex", justifyContent: "center" }}>
        <button
          style={{ background: "#000", color: "#fff", border: "2px solid #fff", borderRadius: 20, padding: "15px 40px", fontSize: 20, fontWeight: 700 }}
          // ✅ id 리스트만 넘김
          onClick={() => navigate("/p2", { state: { ids: safeItems.map((it) => it.id) } })}
        >
          분석 보기
        </button>
      </div>

      {menuOpen && selected && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", padding: 20, width: 280, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>{selected.id}번 말뚝 삭제</div>
            <button style={{ background: "#000", color: "#fff", padding: "10px 16px", borderRadius: 8 }} onClick={handleDelete}>
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default P1;