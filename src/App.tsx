import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Seizure {
  id: string;
  date: string;
  time: string;
  type: string;
  duration: string;
  triggers: string[];
  description: string;
  intensity: number;
}

interface Medication {
  id: string;
  name: string;
  dose: string;
  times: string[];
  taken: Record<string, boolean>;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

type Tab = "home" | "diary" | "meds" | "analytics" | "learn";

interface Profile {
  fullName: string;
  birthDate: string;
  email: string;
  phone: string;
  workplace: string;
  school: string;
  height: string;
  weight: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const SEIZURE_TYPES = ["Генерализованный тонико-клонический", "Абсанс", "Фокальный", "Миоклонический", "Атонический", "Другой"];
const TRIGGER_OPTIONS = ["Стресс", "Усталость", "Нарушение сна", "Яркий свет", "Мерцание", "Алкоголь", "Пропуск лекарства", "Менструация", "Жара", "Громкие звуки"];

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initial;
    } catch {
      return initial;
    }
  });
  const set = (v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };
  return [value, set] as const;
}

// ─── SOS Screen ───────────────────────────────────────────────────────────
function SOSScreen({ contacts, onClose }: { contacts: Contact[]; onClose: () => void }) {
  const primary = contacts.filter(c => c.isPrimary);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-red-600 text-white animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center animate-scale-in">
          <div className="text-7xl mb-4">🆘</div>
          <h1 className="text-4xl font-golos font-bold mb-2">ПРИСТУП</h1>
          <p className="text-red-100 text-lg">Вызовите скорую или позвоните близким</p>
        </div>

        <a
          href="tel:103"
          className="w-full max-w-xs bg-white text-red-600 rounded-2xl py-5 text-center text-2xl font-bold font-golos shadow-lg active:scale-95 transition-transform"
        >
          📞 103 — Скорая
        </a>

        {primary.map(c => (
          <a
            key={c.id}
            href={`tel:${c.phone}`}
            className="w-full max-w-xs bg-red-700 border-2 border-red-300 rounded-2xl py-4 text-center text-xl font-bold font-golos active:scale-95 transition-transform"
          >
            📞 {c.name}
            <div className="text-base font-normal text-red-200 mt-1">{c.phone}</div>
          </a>
        ))}

        <div className="bg-white/20 rounded-2xl p-4 text-center max-w-xs w-full">
          <p className="font-semibold mb-2">Что делать рядом находящимся:</p>
          <ul className="text-sm text-red-100 text-left space-y-1">
            <li>• Уложите человека на бок</li>
            <li>• Подложите что-то мягкое под голову</li>
            <li>• Не удерживайте силой</li>
            <li>• Не кладите в рот никаких предметов</li>
            <li>• Засеките время приступа</li>
          </ul>
        </div>
      </div>

      <button
        onClick={onClose}
        className="m-6 py-4 rounded-2xl bg-red-800 text-white text-lg font-golos font-semibold"
      >
        Закрыть
      </button>
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────
function HomeTab({
  seizures, contacts
}: {
  seizures: Seizure[];
  medications: Medication[];
  contacts: Contact[];
  onSOS: () => void;
}) {
  const sorted = [...seizures].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const lastSeizure = sorted[sorted.length - 1];

  // Текущий период без приступов (дней с последнего)
  const daysSince = lastSeizure
    ? Math.floor((Date.now() - new Date(lastSeizure.date).getTime()) / 86400000)
    : null;

  // Максимальный интервал между приступами
  let maxGap: number | null = null;
  if (sorted.length >= 2) {
    for (let i = 1; i < sorted.length; i++) {
      const gap = Math.floor(
        (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000
      );
      if (maxGap === null || gap > maxGap) maxGap = gap;
    }
  }

  // Среднее время между приступами
  let avgGap: number | null = null;
  if (sorted.length >= 2) {
    const totalDays =
      (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / 86400000;
    avgGap = Math.round(totalDays / (sorted.length - 1));
  }

  // Гистограмма по годам
  const yearCounts: Record<string, number> = {};
  seizures.forEach(s => {
    const year = s.date.slice(0, 4);
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });
  const years = Object.keys(yearCounts).sort();
  const maxCount = Math.max(...Object.values(yearCounts), 1);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Счётчик безприступного периода */}
      <div className="card-calm p-4">
        <h3 className="font-golos font-semibold mb-3 flex items-center gap-2">
          <Icon name="ShieldCheck" size={18} className="text-primary" />
          Безприступный период
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/50 rounded-2xl p-3 text-center">
            <div className="text-2xl font-golos font-bold text-primary leading-tight">
              {daysSince !== null ? daysSince : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">сейчас<br/>дней</div>
          </div>
          <div className="bg-muted/50 rounded-2xl p-3 text-center">
            <div className="text-2xl font-golos font-bold text-primary leading-tight">
              {maxGap !== null ? maxGap : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">макс.<br/>дней</div>
          </div>
          <div className="bg-muted/50 rounded-2xl p-3 text-center">
            <div className="text-2xl font-golos font-bold text-primary leading-tight">
              {avgGap !== null ? avgGap : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">среднее<br/>дней</div>
          </div>
        </div>
      </div>

      {/* Гистограмма частоты приступов по годам */}
      <div className="card-calm p-4">
        <h3 className="font-golos font-semibold mb-4 flex items-center gap-2">
          <Icon name="BarChart2" size={18} className="text-primary" />
          Частота приступов
        </h3>
        {years.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Добавьте записи в дневник, чтобы увидеть график
          </div>
        ) : (
          <div className="space-y-3">
            {/* Y-axis labels + bars */}
            <div className="flex gap-3">
              {/* Y-axis */}
              <div className="flex flex-col justify-between text-right" style={{ minWidth: "28px", height: "140px" }}>
                <span className="text-xs text-muted-foreground">{maxCount}</span>
                <span className="text-xs text-muted-foreground">{Math.round(maxCount / 2)}</span>
                <span className="text-xs text-muted-foreground">0</span>
              </div>
              {/* Bars area */}
              <div className="flex-1 relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: "140px" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-full border-t border-border/40" />
                  ))}
                </div>
                {/* Bars */}
                <div className="flex items-end gap-2 justify-around" style={{ height: "140px" }}>
                  {years.map(year => {
                    const count = yearCounts[year];
                    const heightPct = (count / maxCount) * 100;
                    return (
                      <div key={year} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-xs font-medium text-primary">{count}</span>
                        <div className="w-full flex items-end" style={{ height: "108px" }}>
                          <div
                            className="w-full rounded-t-lg bg-primary transition-all duration-500"
                            style={{ height: `${heightPct}%`, minHeight: "4px" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* X-axis labels */}
            <div className="flex justify-around pl-10">
              {years.map(year => (
                <div key={year} className="flex-1 text-center text-xs text-muted-foreground font-medium">
                  {year}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Последний приступ */}
      {lastSeizure && (
        <div className="card-calm p-4">
          <h3 className="font-golos font-semibold mb-2 flex items-center gap-2">
            <Icon name="Clock" size={18} className="text-primary" />
            Последний приступ
          </h3>
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">{lastSeizure.date}</span> в {lastSeizure.time}
            <div className="mt-1">{lastSeizure.type}</div>
          </div>
        </div>
      )}

      {/* Экстренные контакты */}
      {contacts.length > 0 && (
        <div className="card-calm p-4">
          <h3 className="font-golos font-semibold mb-3 flex items-center gap-2">
            <Icon name="Phone" size={18} className="text-primary" />
            Экстренные контакты
          </h3>
          <div className="space-y-2">
            {contacts.slice(0, 3).map(c => (
              <a
                key={c.id}
                href={`tel:${c.phone}`}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-primary/10 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.relation}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{c.phone}</span>
                  <Icon name="Phone" size={16} className="text-primary" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Diary Tab ────────────────────────────────────────────────────────────
function DiaryTab({ seizures, setSeizures }: { seizures: Seizure[]; setSeizures: (v: Seizure[] | ((p: Seizure[]) => Seizure[])) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    type: SEIZURE_TYPES[0],
    duration: "",
    triggers: [] as string[],
    description: "",
    intensity: 3,
  });

  const addSeizure = () => {
    const s: Seizure = { id: Date.now().toString(), ...form };
    setSeizures(prev => [s, ...prev]);
    setShowForm(false);
    setForm({ date: new Date().toISOString().split("T")[0], time: new Date().toTimeString().slice(0, 5), type: SEIZURE_TYPES[0], duration: "", triggers: [], description: "", intensity: 3 });
  };

  const toggleTrigger = (t: string) => {
    setForm(f => ({ ...f, triggers: f.triggers.includes(t) ? f.triggers.filter(x => x !== t) : [...f.triggers, t] }));
  };

  const sorted = [...seizures].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-golos font-bold">Дневник приступов</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Icon name="Plus" size={16} />
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="card-calm p-4 space-y-4 animate-slide-up">
          <h3 className="font-golos font-semibold">Новый приступ</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Дата</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Время</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Тип приступа</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm">
              {SEIZURE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Длительность (мин)</label>
            <input type="number" placeholder="например: 2" value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Интенсивность: {form.intensity}/5</label>
            <input type="range" min={1} max={5} value={form.intensity}
              onChange={e => setForm(f => ({ ...f, intensity: +e.target.value }))}
              className="w-full accent-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Триггеры</label>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_OPTIONS.map(t => (
                <button key={t} onClick={() => toggleTrigger(t)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.triggers.includes(t) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Описание</label>
            <textarea placeholder="Что происходило до, во время и после..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-medium">Отмена</button>
            <button onClick={addSeizure}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Сохранить</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <p>Записей пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(s => (
            <div key={s.id} className="card-calm p-4 animate-fade-in">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-golos font-semibold text-sm">{s.date} · {s.time}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.type}</div>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i < s.intensity ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              </div>
              {s.duration && <div className="text-xs text-muted-foreground">⏱ {s.duration} мин</div>}
              {s.triggers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.triggers.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{t}</span>
                  ))}
                </div>
              )}
              {s.description && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.description}</p>}
              <button onClick={() => setSeizures(prev => prev.filter(x => x.id !== s.id))}
                className="mt-2 text-xs text-destructive/70 hover:text-destructive">Удалить</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Medications Tab ───────────────────────────────────────────────────────
function MedsTab({ medications, setMedications }: { medications: Medication[]; setMedications: (v: Medication[] | ((p: Medication[]) => Medication[])) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dose: "", times: ["08:00"] });
  const today = new Date().toISOString().split("T")[0];

  const addMed = () => {
    const m: Medication = { id: Date.now().toString(), ...form, taken: {} };
    setMedications(prev => [...prev, m]);
    setShowForm(false);
    setForm({ name: "", dose: "", times: ["08:00"] });
  };

  const toggleTaken = (medId: string, time: string) => {
    setMedications(prev => prev.map(m =>
      m.id === medId ? { ...m, taken: { ...m.taken, [`${today}_${time}`]: !m.taken[`${today}_${time}`] } } : m
    ));
  };

  const addTime = () => setForm(f => ({ ...f, times: [...f.times, "12:00"] }));
  const updateTime = (i: number, v: string) => setForm(f => ({ ...f, times: f.times.map((t, idx) => idx === i ? v : t) }));
  const removeTime = (i: number) => setForm(f => ({ ...f, times: f.times.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-golos font-bold">Лекарства</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium">
          <Icon name="Plus" size={16} />
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="card-calm p-4 space-y-4 animate-slide-up">
          <h3 className="font-golos font-semibold">Новое лекарство</h3>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Название</label>
            <input placeholder="Например: Карбамазепин" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Дозировка</label>
            <input placeholder="200 мг" value={form.dose}
              onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Время приёма</label>
            {form.times.map((t, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="time" value={t} onChange={e => updateTime(i, e.target.value)}
                  className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm" />
                {form.times.length > 1 && (
                  <button onClick={() => removeTime(i)} className="text-destructive/70 px-2">
                    <Icon name="X" size={16} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addTime} className="text-xs text-primary flex items-center gap-1">
              <Icon name="Plus" size={14} /> Добавить время
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-medium">Отмена</button>
            <button onClick={addMed} disabled={!form.name}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Сохранить</button>
          </div>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">💊</div>
          <p>Лекарства не добавлены</p>
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map(m => (
            <div key={m.id} className="card-calm p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-golos font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.dose}</div>
                </div>
                <button onClick={() => setMedications(prev => prev.filter(x => x.id !== m.id))}
                  className="text-xs text-destructive/70">Удалить</button>
              </div>
              <div className="space-y-2">
                {m.times.map(time => {
                  const key = `${today}_${time}`;
                  const taken = m.taken[key] || false;
                  return (
                    <button key={time} onClick={() => toggleTaken(m.id, time)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${taken ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" : "bg-muted/40 border-border"}`}>
                      <span className="text-sm font-medium">{time}</span>
                      <div className="flex items-center gap-2 text-sm">
                        {taken ? "✓ Принято" : "Отметить"}
                        <Icon name={taken ? "CheckCircle" : "Circle"} size={18} className={taken ? "text-green-500" : "text-muted-foreground"} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Analytics Tab ─────────────────────────────────────────────────────────
function AnalyticsTab({ seizures }: { seizures: Seizure[] }) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toISOString().slice(0, 7);
  });

  const maxCount = Math.max(...months.map(m => seizures.filter(s => s.date.startsWith(m)).length), 1);

  const triggerCounts: Record<string, number> = {};
  seizures.forEach(s => s.triggers.forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; }));
  const topTriggers = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const typesCounts: Record<string, number> = {};
  seizures.forEach(s => { typesCounts[s.type] = (typesCounts[s.type] || 0) + 1; });

  const avgIntensity = seizures.length
    ? (seizures.reduce((s, x) => s + x.intensity, 0) / seizures.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-golos font-bold">Аналитика</h2>

      {seizures.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">📊</div>
          <p>Добавьте приступы в дневник, чтобы увидеть статистику</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="card-calm p-3 text-center">
              <div className="text-2xl font-golos font-bold text-primary">{seizures.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">всего</div>
            </div>
            <div className="card-calm p-3 text-center">
              <div className="text-2xl font-golos font-bold text-primary">{avgIntensity}</div>
              <div className="text-xs text-muted-foreground mt-0.5">интенс.</div>
            </div>
            <div className="card-calm p-3 text-center">
              <div className="text-2xl font-golos font-bold text-primary">
                {seizures.filter(s => s.date.startsWith(new Date().toISOString().slice(0, 7))).length}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">за месяц</div>
            </div>
          </div>

          <div className="card-calm p-4">
            <h3 className="font-golos font-semibold mb-4">Приступы по месяцам</h3>
            <div className="flex items-end justify-between gap-2 h-24">
              {months.map(m => {
                const count = seizures.filter(s => s.date.startsWith(m)).length;
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const label = m.slice(5);
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-muted-foreground">{count || ""}</div>
                    <div className="w-full flex items-end" style={{ height: "64px" }}>
                      <div
                        className="w-full rounded-t-lg bg-primary/70 transition-all"
                        style={{ height: count === 0 ? "4px" : `${height}%`, opacity: count === 0 ? 0.2 : 1 }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {topTriggers.length > 0 && (
            <div className="card-calm p-4">
              <h3 className="font-golos font-semibold mb-3">Частые триггеры</h3>
              <div className="space-y-2">
                {topTriggers.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="text-sm flex-1">{name}</div>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${(count / topTriggers[0][1]) * 100}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground w-5 text-right">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-calm p-4">
            <h3 className="font-golos font-semibold mb-3">Типы приступов</h3>
            <div className="space-y-2">
              {Object.entries(typesCounts).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm">{type}</span>
                  <span className="text-sm font-medium text-primary">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Learn Tab ─────────────────────────────────────────────────────────────
const LEARN_ARTICLES = [
  {
    id: "1", icon: "🧠", title: "Что такое эпилепсия",
    content: `Эпилепсия — это хроническое неврологическое расстройство, характеризующееся повторяющимися эпилептическими приступами. Приступы возникают из-за аномальной электрической активности в мозге.\n\nЭпилепсия — одно из самых распространённых неврологических заболеваний. Ею страдают около 50 миллионов человек во всём мире.\n\nСовременная медицина позволяет контролировать приступы у большинства пациентов с помощью правильно подобранных противоэпилептических препаратов.`,
  },
  {
    id: "2", icon: "🤝", title: "Первая помощь при приступе",
    content: `Что делать при генерализованном приступе:\n\n✅ Уложите человека на бок (поза восстановления)\n✅ Подложите что-то мягкое под голову\n✅ Засеките время начала приступа\n✅ Уберите острые и твёрдые предметы рядом\n✅ Оставайтесь рядом до полного восстановления\n\n❌ Не удерживайте силой\n❌ Не кладите ничего в рот\n❌ Не давайте воду во время приступа\n\nВызовите скорую, если:\n• Приступ длится более 5 минут\n• Это первый приступ у человека\n• После приступа человек не приходит в сознание`,
  },
  {
    id: "3", icon: "💊", title: "Важность регулярного приёма лекарств",
    content: `Пропуск дозы — одна из главных причин прорывных приступов.\n\nСоветы по соблюдению режима:\n• Принимайте лекарства в одно и то же время каждый день\n• Используйте напоминания на телефоне\n• Храните запас лекарств дома\n• Не прекращайте приём без консультации врача\n\nНикогда не меняйте дозировку самостоятельно. Изменения делаются только под контролем невролога.`,
  },
  {
    id: "4", icon: "⚠️", title: "Как избегать триггеров",
    content: `Общие триггеры эпилептических приступов:\n\n😴 Недосыпание — старайтесь спать 7–9 часов\n😰 Стресс — практикуйте техники расслабления\n💡 Мерцающий свет — избегайте дискотек и некоторых игр\n🍺 Алкоголь — снижает порог судорожной готовности\n🌡️ Перегрев — избегайте длительного пребывания на солнце\n\nВедение дневника приступов помогает выявить ваши личные триггеры.`,
  },
  {
    id: "5", icon: "🚗", title: "Жизнь с эпилепсией",
    content: `Большинство людей с эпилепсией ведут полноценную жизнь.\n\nВождение: В России управление транспортным средством разрешено после 2 лет без приступов.\n\nРабота: Большинство профессий доступны. Ограничения касаются водителей, военных, работы на высоте.\n\nСпорт: Рекомендованы плавание (с наблюдателем), ходьба, велосипед. Избегайте одиночного плавания.\n\nПутешествия: Всегда берите запас лекарств. Уведомите попутчиков о своём состоянии.`,
  },
];

function LearnTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const article = LEARN_ARTICLES.find(a => a.id === selected);

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-golos font-bold">Обучение</h2>

      {article ? (
        <div className="card-calm p-4 animate-slide-up">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-primary text-sm mb-4">
            <Icon name="ChevronLeft" size={16} /> Назад
          </button>
          <div className="text-3xl mb-2">{article.icon}</div>
          <h3 className="font-golos font-bold text-lg mb-4">{article.title}</h3>
          <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{article.content}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {LEARN_ARTICLES.map(a => (
            <button key={a.id} onClick={() => setSelected(a.id)}
              className="w-full card-calm p-4 flex items-center gap-4 text-left hover:bg-primary/5 transition-colors active:scale-[0.98]">
              <div className="text-2xl">{a.icon}</div>
              <div className="flex-1">
                <div className="font-golos font-semibold text-sm">{a.title}</div>
              </div>
              <Icon name="ChevronRight" size={18} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Profile Screen ────────────────────────────────────────────────────────
function ProfileScreen({ profile, setProfile, onClose }: {
  profile: Profile;
  setProfile: (v: Profile | ((p: Profile) => Profile)) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Profile>(profile);

  const save = () => {
    setProfile(form);
    onClose();
  };

  const f = (field: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const bmi = (() => {
    const h = parseFloat(form.height) / 100;
    const w = parseFloat(form.weight);
    if (!h || !w || h <= 0) return null;
    const val = w / (h * h);
    let label = "";
    if (val < 18.5) label = "Недостаточный вес";
    else if (val < 25) label = "Норма";
    else if (val < 30) label = "Избыточный вес";
    else label = "Ожирение";
    return { val: val.toFixed(1), label };
  })();

  const age = (() => {
    if (!form.birthDate) return null;
    const diff = Date.now() - new Date(form.birthDate).getTime();
    return Math.floor(diff / (365.25 * 86400000));
  })();

  const inputCls = "w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm";
  const labelCls = "text-xs text-muted-foreground block mb-1";

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col max-w-md mx-auto animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <Icon name="ChevronLeft" size={20} className="text-muted-foreground" />
        </button>
        <h1 className="font-golos font-bold text-lg flex-1">Профиль</h1>
        <button onClick={save} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          Сохранить
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">

        {/* Аватар */}
        <div className="flex flex-col items-center py-4">
          <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <Icon name="User" size={36} className="text-primary" />
          </div>
          {form.fullName && (
            <div className="font-golos font-bold text-lg">{form.fullName}</div>
          )}
          {age !== null && (
            <div className="text-sm text-muted-foreground">{age} лет</div>
          )}
        </div>

        {/* Личная информация */}
        <div className="card-calm p-4 space-y-3">
          <h2 className="font-golos font-semibold flex items-center gap-2">
            <Icon name="UserCircle" size={17} className="text-primary" />
            Личная информация
          </h2>
          <div>
            <label className={labelCls}>ФИО</label>
            <input value={form.fullName} onChange={f("fullName")} placeholder="Иванов Иван Иванович" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Дата рождения</label>
            <input type="date" value={form.birthDate} onChange={f("birthDate")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input type="email" value={form.email} onChange={f("email")} placeholder="example@mail.ru" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Телефон</label>
            <input type="tel" value={form.phone} onChange={f("phone")} placeholder="+7 (___) ___-__-__" className={inputCls} />
          </div>
        </div>

        {/* Социально-бытовые сведения */}
        <div className="card-calm p-4 space-y-3">
          <h2 className="font-golos font-semibold flex items-center gap-2">
            <Icon name="Briefcase" size={17} className="text-primary" />
            Место работы и учёбы
          </h2>
          <div>
            <label className={labelCls}>Место работы</label>
            <input value={form.workplace} onChange={f("workplace")} placeholder="Название организации или сфера" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Место учёбы</label>
            <input value={form.school} onChange={f("school")} placeholder="Образовательное учреждение" className={inputCls} />
          </div>
        </div>

        {/* Антропометрия */}
        <div className="card-calm p-4 space-y-3">
          <h2 className="font-golos font-semibold flex items-center gap-2">
            <Icon name="Activity" size={17} className="text-primary" />
            Антропометрия
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Рост (см)</label>
              <input type="number" value={form.height} onChange={f("height")} placeholder="170" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Вес (кг)</label>
              <input type="number" value={form.weight} onChange={f("weight")} placeholder="70" className={inputCls} />
            </div>
          </div>

          {bmi && (
            <div className={`rounded-xl p-3 flex items-center justify-between ${
              bmi.label === "Норма" ? "bg-green-500/10 border border-green-500/20" :
              bmi.label === "Недостаточный вес" ? "bg-blue-500/10 border border-blue-500/20" :
              "bg-amber-500/10 border border-amber-500/20"
            }`}>
              <div>
                <div className="text-xs text-muted-foreground">Индекс массы тела (ИМТ)</div>
                <div className="text-sm font-medium mt-0.5">{bmi.label}</div>
              </div>
              <div className="text-2xl font-golos font-bold text-primary">{bmi.val}</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Contacts Manager ─────────────────────────────────────────────────────
function ContactsManager({ contacts, setContacts }: { contacts: Contact[]; setContacts: (v: Contact[] | ((p: Contact[]) => Contact[])) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", relation: "", isPrimary: false });

  const add = () => {
    const c: Contact = { id: Date.now().toString(), ...form };
    setContacts(prev => [...prev, c]);
    setShowForm(false);
    setForm({ name: "", phone: "", relation: "", isPrimary: false });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-golos font-semibold text-sm">Экстренные контакты</span>
        <button onClick={() => setShowForm(true)} className="text-primary text-sm flex items-center gap-1">
          <Icon name="Plus" size={14} /> Добавить
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/30 rounded-2xl p-4 space-y-3 animate-slide-up">
          <input placeholder="Имя" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Телефон" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Кем приходится" value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))}
              className="accent-primary" />
            Показывать на экране SOS
          </label>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-border text-sm">Отмена</button>
            <button onClick={add} disabled={!form.name || !form.phone}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50">Сохранить</button>
          </div>
        </div>
      )}

      {contacts.map(c => (
        <div key={c.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
          <div>
            <div className="text-sm font-medium">{c.name} {c.isPrimary && <span className="text-primary text-xs">★ SOS</span>}</div>
            <div className="text-xs text-muted-foreground">{c.relation} · {c.phone}</div>
          </div>
          <button onClick={() => setContacts(prev => prev.filter(x => x.id !== c.id))}
            className="text-destructive/60 p-1"><Icon name="Trash2" size={15} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
const PROFILE_EMPTY: Profile = { fullName: "", birthDate: "", email: "", phone: "", workplace: "", school: "", height: "", weight: "" };

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [sosVisible, setSOSVisible] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showSettings, setShowSettings] = useState(false);

  const [seizures, setSeizures] = useLocalStorage<Seizure[]>("seizures", []);
  const [medications, setMedications] = useLocalStorage<Medication[]>("medications", []);
  const [contacts, setContacts] = useLocalStorage<Contact[]>("contacts", []);
  const [profile, setProfile] = useLocalStorage<Profile>("profile", PROFILE_EMPTY);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const tabs = [
    { id: "home" as Tab, icon: "Home", label: "Главная" },
    { id: "diary" as Tab, icon: "BookOpen", label: "Дневник" },
    { id: "meds" as Tab, icon: "Pill", label: "Лекарства" },
    { id: "analytics" as Tab, icon: "BarChart2", label: "Анализ" },
    { id: "learn" as Tab, icon: "GraduationCap", label: "Обучение" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {sosVisible && <SOSScreen contacts={contacts} onClose={() => setSOSVisible(false)} />}
      {profileOpen && <ProfileScreen profile={profile} setProfile={setProfile} onClose={() => setProfileOpen(false)} />}

      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center justify-between">
        {/* Иконка профиля */}
        <button onClick={() => setProfileOpen(true)} className="flex items-center gap-2 p-1 rounded-xl hover:bg-muted transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            {profile.fullName
              ? <span className="text-sm font-golos font-bold text-primary">{profile.fullName.charAt(0).toUpperCase()}</span>
              : <Icon name="User" size={16} className="text-primary" />
            }
          </div>
          {profile.fullName && (
            <span className="text-sm font-medium text-foreground max-w-[120px] truncate">{profile.fullName.split(" ")[0]}</span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => setDarkMode((d: boolean) => !d)}
            className="p-2 rounded-xl hover:bg-muted transition-colors">
            <Icon name={darkMode ? "Sun" : "Moon"} size={18} className="text-muted-foreground" />
          </button>
          <button onClick={() => setShowSettings(s => !s)}
            className="p-2 rounded-xl hover:bg-muted transition-colors">
            <Icon name="Settings" size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="animate-slide-up border-b border-border bg-card px-4 py-4">
          <ContactsManager contacts={contacts} setContacts={setContacts} />
        </div>
      )}

      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {tab === "home" && (
          <HomeTab seizures={seizures} medications={medications} contacts={contacts} onSOS={() => setSOSVisible(true)} />
        )}
        {tab === "diary" && <DiaryTab seizures={seizures} setSeizures={setSeizures} />}
        {tab === "meds" && <MedsTab medications={medications} setMedications={setMedications} />}
        {tab === "analytics" && <AnalyticsTab seizures={seizures} />}
        {tab === "learn" && <LearnTab />}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background/95 backdrop-blur border-t border-border/50 px-2 py-2 flex items-center justify-around z-10">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`nav-tab ${tab === t.id ? "active" : ""}`}>
            <Icon name={t.icon} size={20} />
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}