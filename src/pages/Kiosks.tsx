import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Edit2,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  clubApi,
  ClubActivity,
  ClubKiosk,
  ClubReservation,
} from "../lib/club-api";
import { hasActionPermission } from "../components/Layout";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";

const labels: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  MANUTENCAO: "Manutenção",
  PENDENTE_PAGAMENTO: "Pendente de pagamento",
  CONFIRMADA: "Confirmada",
  ATIVA: "Em utilização",
  CANCELADA: "Cancelada",
  CONCLUIDA: "Concluída",
  EXPIRADA: "Expirada",
};
const money = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
const dayRange = (day: string) => ({
  startsAt: new Date(`${day}T00:00:00-03:00`).toISOString(),
  endsAt: new Date(new Date(`${day}T00:00:00-03:00`).getTime()+86400_000).toISOString(),
});
const emptyKiosk = {
  name: "",
  description: "",
  capacity: 2,
  barbecue: false,
  electricity: false,
  nearby: "",
  price: "0.00",
  latitude: "",
  longitude: "",
  status: "ATIVO",
  notes: "",
};
const emptyActivity = { name: "", description: "", imageUrl: "", active: true };
function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${["ATIVO", "ATIVA", "CONFIRMADA"].includes(status) ? "bg-emerald-50 text-emerald-700" : ["MANUTENCAO", "PENDENTE_PAGAMENTO"].includes(status) ? "bg-amber-50 text-amber-700" : "bg-surface-100 text-surface-600"}`}
    >
      {labels[status] || status}
    </span>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
function Pager({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-surface-500">
      <span>
        {total} registros · página {page} de {Math.max(1, pages)}
      </span>
      <div className="flex gap-2">
        <button
          className="btn-secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </button>
        <button
          className="btn-secondary"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
function LocationMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const bbox = [
    longitude - 0.003,
    latitude - 0.003,
    longitude + 0.003,
    latitude + 0.003,
  ].join(",");
  return (
    <iframe
      title="Localização do quiosque"
      className="h-64 w-full rounded-lg border"
      loading="lazy"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude},${longitude}`}
    />
  );
}

export default function Kiosks() {
  const canManage = hasActionPermission("kiosks:manage");
  const { showToast } = useToast();
  const { confirm, prompt } = useConfirm();
  const [tab, setTab] = useState("dashboard"),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [kioskFilter, setKioskFilter] = useState(""),
    [day, setDay] = useState(""),
    [suffix, setSuffix] = useState("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null),
    [kiosks, setKiosks] = useState<ClubKiosk[]>([]),
    [options, setOptions] = useState<ClubKiosk[]>([]),
    [reservations, setReservations] = useState<ClubReservation[]>([]),
    [activities, setActivities] = useState<ClubActivity[]>([]),
    [audit, setAudit] = useState<any[]>([]),
    [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [editing, setEditing] = useState<ClubKiosk | null>(null),
    [kioskModal, setKioskModal] = useState(false),
    [form, setForm] = useState(emptyKiosk);
  const [photoUrl, setPhotoUrl] = useState(""),
    [photoCaption, setPhotoCaption] = useState(""),
    [photoOrder, setPhotoOrder] = useState("0");
  const [detail, setDetail] = useState<ClubReservation | null>(null),
    [agenda, setAgenda] = useState<ClubKiosk | null>(null),
    [agendaDay, setAgendaDay] = useState(today),
    [agendaRows, setAgendaRows] = useState<ClubReservation[]>([]),
    [agendaLoading, setAgendaLoading] = useState(false),
    [agendaError, setAgendaError] = useState("");
  const [activityModal, setActivityModal] = useState(false),
    [activityEditing, setActivityEditing] = useState<ClubActivity | null>(null),
    [activityForm, setActivityForm] = useState(emptyActivity);
  const sequence = useRef(0);
  const reload = () => setRefresh((value) => value + 1);
  useEffect(() => {
    let alive = true;
    clubApi
      .kiosks("limit=100")
      .then(async (result) => {
        const remaining=await Promise.all(Array.from({length:Math.max(0,result.pagination.pages-1)},(_,index)=>clubApi.kiosks(`limit=100&page=${index+2}`)));
        if (alive) setOptions([...result.data,...remaining.flatMap(row=>row.data)]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [refresh]);
  useEffect(() => {
    const current = ++sequence.current;
    setLoading(true);
    setError("");
    const q = new URLSearchParams({ page: String(page) });
    if (tab === "kiosks") {
      if (search) q.set("search", search);
      if (status) q.set("status", status);
    }
    if (tab === "reservations") {
      if (status) q.set("status", status);
      if (kioskFilter) q.set("kioskId", kioskFilter);
      if (suffix) q.set("cardSuffix", suffix);
      if (day) {
        const range = dayRange(day);
        q.set("startsAt", range.startsAt);
        q.set("endsAt", range.endsAt);
      }
    }
    const call =
      tab === "dashboard"
        ? clubApi.dashboard()
        : tab === "kiosks"
          ? clubApi.kiosks(q.toString())
          : tab === "reservations"
            ? clubApi.reservations(q.toString())
            : tab === "activities"
              ? clubApi.activities()
              : clubApi.audit(q.toString());
    call
      .then((result: any) => {
        if (current !== sequence.current) return;
        if (tab === "dashboard") setDashboard(result);
        else if (tab === "activities") setActivities(result);
        else {
          setPagination(result.pagination);
          if (tab === "kiosks") setKiosks(result.data);
          else if (tab === "reservations") setReservations(result.data);
          else setAudit(result.data);
        }
      })
      .catch((e: Error) => {
        if (current === sequence.current) setError(e.message);
      })
      .finally(() => {
        if (current === sequence.current) setLoading(false);
      });
    return () => {
      sequence.current++;
    };
  }, [tab, page, refresh, search, status, kioskFilter, day, suffix]);
  useEffect(() => {
    if (!agenda) return;
    let alive = true;
    setAgendaLoading(true);
    setAgendaError("");
    clubApi
      .agenda(agenda.id, new URLSearchParams(dayRange(agendaDay)).toString())
      .then((rows) => {
        if (alive) setAgendaRows(rows);
      })
      .catch((e) => {
        if (alive) setAgendaError(e.message);
      })
      .finally(() => {
        if (alive) setAgendaLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [agenda, agendaDay, refresh]);
  function changeTab(value: string) {
    setTab(value);
    setPage(1);
    setStatus("");
    setSearch("");
  }
  function openKiosk(row?: ClubKiosk) {
    setEditing(row || null);
    setForm(
      row
        ? {
            name: row.name,
            description: row.description,
            capacity: row.capacity,
            barbecue: row.barbecue,
            electricity: row.electricity,
            nearby: row.nearby || "",
            price: String(row.price),
            latitude: String(row.latitude),
            longitude: String(row.longitude),
            status: row.status,
            notes: row.notes || "",
          }
        : emptyKiosk,
    );
    setPhotoUrl("");
    setPhotoCaption("");
    setPhotoOrder("0");
    setError("");
    setKioskModal(true);
  }
  async function saveKiosk(event: FormEvent) {
    event.preventDefault();
    if (!Number.isInteger(form.capacity) || form.capacity < 1)
      return setError("Informe uma capacidade inteira positiva.");
    setSaving(true);
    setError("");
    try {
      await clubApi.saveKiosk(editing?.id, {
        ...form,
        price: form.price.replace(",", "."),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      setKioskModal(false);
      showToast("success", "Quiosque salvo.");
      reload();
    } catch (e: any) {
      setError(e.message);
      showToast("error", e.message);
    } finally {
      setSaving(false);
    }
  }
  async function photoAction(action: () => Promise<unknown>) {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      await action();
      setEditing(await clubApi.kiosk(editing.id));
      setPhotoUrl("");
      setPhotoCaption("");
      showToast("success", "Fotos atualizadas.");
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function removePhoto(id: string) {
    if (
      !editing ||
      !(await confirm({
        title: "Remover foto",
        message: "A foto ficará inativa e não será exibida no aplicativo.",
        confirmText: "Remover",
        type: "danger",
      }))
    )
      return;
    await photoAction(() =>
      clubApi.editPhoto(editing.id, id, { active: false }),
    );
  }
  async function changeReservation(row: ClubReservation, next: string) {
    const reason = await prompt({
      title: next === "CANCELADA" ? "Cancelar reserva" : "Alterar reserva",
      message: `Alterar ${row.kiosk.name} para ${labels[next]}?`,
      label: "Justificativa",
      required: true,
      minLength: 3,
      type: next === "CANCELADA" ? "danger" : "info",
    });
    if (!reason) return;
    setSaving(true);
    try {
      const result = await clubApi.status(row.id, next, reason);
      if (detail?.id === row.id)
        setDetail({ ...result, cardMasked: row.cardMasked });
      showToast("success", "Situação atualizada.");
      reload();
    } catch (e: any) {
      showToast("error", e.message);
    } finally {
      setSaving(false);
    }
  }
  function openActivity(row?: ClubActivity) {
    setActivityEditing(row || null);
    setActivityForm(
      row
        ? {
            name: row.name,
            description: row.description,
            imageUrl: row.imageUrl || "",
            active: row.active,
          }
        : emptyActivity,
    );
    setError("");
    setActivityModal(true);
  }
  async function saveActivity(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await clubApi.saveActivity(activityEditing?.id, {
        ...activityForm,
        imageUrl: activityForm.imageUrl || null,
      });
      setActivityModal(false);
      reload();
      showToast("success", "Atividade salva.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  const actions = (row: ClubReservation) =>
    canManage ? (
      <div className="flex flex-wrap gap-2">
        {row.status === "PENDENTE_PAGAMENTO" ? (
          <button
            disabled={saving}
            className="btn-secondary"
            onClick={() => void changeReservation(row, "CONFIRMADA")}
          >
            Confirmar
          </button>
        ) : null}
        {row.status === "CONFIRMADA" ? (
          <button
            disabled={saving}
            className="btn-secondary"
            onClick={() => void changeReservation(row, "ATIVA")}
          >
            Iniciar utilização
          </button>
        ) : null}
        {row.status === "ATIVA" ? (
          <button
            disabled={saving}
            className="btn-secondary"
            onClick={() => void changeReservation(row, "CONCLUIDA")}
          >
            Concluir
          </button>
        ) : null}
        {["PENDENTE_PAGAMENTO", "CONFIRMADA", "ATIVA"].includes(row.status) ? (
          <button
            disabled={saving}
            className="btn-secondary text-red-600"
            onClick={() => void changeReservation(row, "CANCELADA")}
          >
            Cancelar reserva
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Quiosques</h1>
          <p className="text-sm text-surface-500">
            Rio das Pedras · cadastro, disponibilidade e reservas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={reload}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          {canManage && tab === "kiosks" ? (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => openKiosk()}
            >
              <Plus size={16} />
              Novo quiosque
            </button>
          ) : null}
          {canManage && tab === "activities" ? (
            <button className="btn-primary" onClick={() => openActivity()}>
              Nova atividade
            </button>
          ) : null}
        </div>
      </div>
      <nav
        aria-label="Gestão de quiosques"
        className="flex gap-1 overflow-x-auto border-b border-surface-200"
      >
        {[
          ["dashboard", "Resumo"],
          ["kiosks", "Quiosques"],
          ["reservations", "Reservas"],
          ["activities", "Atividades"],
          ["audit", "Auditoria"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${tab === key ? "border-b-2 border-brand-600 text-brand-600" : "text-surface-500"}`}
            onClick={() => changeTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && !kioskModal && !activityModal ? (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="card p-10 text-center text-surface-500">
          Carregando…
        </div>
      ) : null}
      {!loading && !error && tab === "dashboard" && dashboard ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Quiosques",
                dashboard.kiosks.reduce(
                  (sum: number, row: any) => sum + row._count,
                  0,
                ),
              ],
              ["Reservas abertas", dashboard.open],
              ["Pendentes de pagamento", dashboard.pending],
              ["Confirmadas / em uso", dashboard.confirmed],
            ].map(([label, value]) => (
              <div className="card p-5" key={label}>
                <p className="text-sm text-surface-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold">Situação dos quiosques</h2>
            <div className="flex flex-wrap gap-4">
              {dashboard.kiosks.map((row: any) => (
                <div key={row.status}>
                  <Badge status={row.status} />
                  <span className="ml-2 font-semibold">{row._count}</span>
                </div>
              ))}
            </div>
            <p className="text-sm">
              Valor das reservas confirmadas:{" "}
              <strong>{money(dashboard.totalAmount)}</strong>
            </p>
            <p className="text-xs text-surface-500">
              Este total inclui confirmações simuladas. Não representa
              recebimento financeiro real.
            </p>
          </div>
        </>
      ) : null}
      {tab === "kiosks" ? (
        <>
          <div className="flex flex-wrap gap-3">
            <input
              aria-label="Buscar quiosque"
              placeholder="Buscar quiosque"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              aria-label="Situação do quiosque"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os status</option>
              {["ATIVO", "INATIVO", "MANUTENCAO"].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </div>
          {!loading && !error ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {kiosks.map((row) => (
                  <div className="card overflow-hidden" key={row.id}>
                    {row.photos[0] ? (
                      <img
                        src={row.photos[0].url}
                        alt={row.photos[0].caption || row.name}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-24 items-center justify-center bg-surface-100">
                        <MapPin className="text-surface-400" />
                      </div>
                    )}
                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-semibold">{row.name}</h2>
                        <Badge status={row.status} />
                      </div>
                      <p className="text-sm text-surface-500">
                        Até {row.capacity} pessoas ·{" "}
                        {row.barbecue ? "com" : "sem"} churrasqueira
                      </p>
                      <p className="font-semibold text-brand-600">
                        {money(row.price)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary flex items-center gap-1"
                          onClick={() => {
                            setAgenda(row);
                            setAgendaDay(today());
                          }}
                        >
                          <CalendarDays size={14} />
                          Agenda / mapa
                        </button>
                        {canManage ? (
                          <button
                            aria-label={`Editar ${row.name}`}
                            className="btn-secondary"
                            onClick={() => openKiosk(row)}
                          >
                            <Edit2 size={15} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!kiosks.length ? (
                <div className="card p-8 text-center text-surface-500">
                  Nenhum quiosque cadastrado para estes filtros.
                </div>
              ) : null}
              <Pager page={page} {...pagination} onChange={setPage} />
            </>
          ) : null}
        </>
      ) : null}
      {tab === "reservations" ? (
        <>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              aria-label="Data das reservas"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setPage(1);
              }}
            />
            <select
              aria-label="Quiosque"
              value={kioskFilter}
              onChange={(e) => {
                setKioskFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os quiosques</option>
              {options.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Status da reserva"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os status</option>
              {[
                "PENDENTE_PAGAMENTO",
                "CONFIRMADA",
                "ATIVA",
                "CANCELADA",
                "CONCLUIDA",
                "EXPIRADA",
              ].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
            <input
              aria-label="Final da comanda"
              placeholder="Últimos dígitos da comanda"
              value={suffix}
              maxLength={4}
              onChange={(e) => {
                setSuffix(e.target.value.replace(/\D/g, ""));
                setPage(1);
              }}
            />
          </div>
          {!loading && !error ? (
            <>
              <div className="card overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-50">
                    <tr>
                      {[
                        "Quiosque / comanda",
                        "Período (Brasília)",
                        "Status",
                        "Valor",
                        "",
                      ].map((heading, i) => (
                        <th key={i} className="p-4">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((row) => (
                      <tr key={row.id} className="border-t border-surface-100">
                        <td className="p-4">
                          <p className="font-medium">{row.kiosk.name}</p>
                          <span className="text-surface-500">
                            {row.cardMasked}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {date(row.startsAt)}
                          <br />
                          {date(row.endsAt)}
                        </td>
                        <td className="p-4">
                          <Badge status={row.status} />
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {money(row.amount)}
                          {row.paymentMode === "SIMULADO" ? (
                            <p className="text-xs text-amber-600">Simulado</p>
                          ) : null}
                        </td>
                        <td className="p-4">
                          <button
                            className="btn-secondary"
                            onClick={() => setDetail(row)}
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!reservations.length ? (
                  <p className="p-8 text-center text-surface-500">
                    Nenhuma reserva neste filtro.
                  </p>
                ) : null}
              </div>
              <Pager page={page} {...pagination} onChange={setPage} />
            </>
          ) : null}
        </>
      ) : null}
      {!loading && !error && tab === "activities" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {activities.map((row) => (
            <div className="card p-5 space-y-3" key={row.id}>
              <div className="flex justify-between gap-3">
                <h2 className="font-semibold">{row.name}</h2>
                <Badge status={row.active ? "ATIVO" : "INATIVO"} />
              </div>
              <p className="text-sm text-surface-500">{row.description}</p>
              {row.imageUrl ? (
                <img
                  src={row.imageUrl}
                  alt={row.name}
                  className="h-32 w-full rounded-lg object-cover"
                />
              ) : null}
              {canManage ? (
                <button
                  className="btn-secondary"
                  onClick={() => openActivity(row)}
                >
                  Editar atividade
                </button>
              ) : null}
            </div>
          ))}
          {!activities.length ? (
            <p className="text-surface-500">Nenhuma atividade publicada.</p>
          ) : null}
        </div>
      ) : null}
      {!loading && !error && tab === "audit" ? (
        <>
          <div className="card divide-y">
            {audit.map((row) => (
              <div key={row.id} className="p-4 text-sm">
                <div className="flex justify-between gap-2">
                  <strong>{row.operationType}</strong>
                  <span className="text-surface-500">
                    {date(row.createdAt)}
                  </span>
                </div>
                <p className="mt-1 break-words text-surface-500">{row.notes}</p>
                <p className="mt-1 text-xs text-surface-400">
                  Referência: {row.referenceId} · responsável:{" "}
                  {row.userId || "Associado / automático"}
                </p>
              </div>
            ))}
            {!audit.length ? (
              <p className="p-8 text-center text-surface-500">
                Nenhuma alteração registrada.
              </p>
            ) : null}
          </div>
          <Pager page={page} {...pagination} onChange={setPage} />
        </>
      ) : null}
      {kioskModal ? (
        <Modal
          title={editing ? "Editar quiosque" : "Novo quiosque"}
          onClose={() => {
            if (!saving) {
              setKioskModal(false);
              setError("");
            }
          }}
        >
          <form onSubmit={saveKiosk} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                Nome
                <input
                  className="w-full"
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm">
                Status
                <select
                  className="w-full"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {["ATIVO", "INATIVO", "MANUTENCAO"].map((s) => (
                    <option key={s} value={s}>
                      {labels[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                Capacidade
                <input
                  className="w-full"
                  type="number"
                  required
                  min={1}
                  max={1000}
                  step={1}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: Number(e.target.value) })
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                Valor da reserva (R$)
                <input
                  className="w-full"
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm">
                Latitude
                <input
                  className="w-full"
                  required
                  type="number"
                  min={-90}
                  max={90}
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm({ ...form, latitude: e.target.value })
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                Longitude
                <input
                  className="w-full"
                  required
                  type="number"
                  min={-180}
                  max={180}
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm({ ...form, longitude: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.barbecue}
                  onChange={(e) =>
                    setForm({ ...form, barbecue: e.target.checked })
                  }
                />
                Churrasqueira
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.electricity}
                  onChange={(e) =>
                    setForm({ ...form, electricity: e.target.checked })
                  }
                />
                Energia
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              Descrição
              <textarea
                className="w-full"
                required
                minLength={3}
                maxLength={2000}
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              Proximidades
              <input
                className="w-full"
                maxLength={500}
                value={form.nearby}
                onChange={(e) => setForm({ ...form, nearby: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              Observações
              <textarea
                className="w-full"
                maxLength={2000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            {form.latitude !== "" &&
            form.longitude !== "" &&
            Number.isFinite(Number(form.latitude)) &&
            Number.isFinite(Number(form.longitude)) ? (
              <LocationMap
                latitude={Number(form.latitude)}
                longitude={Number(form.longitude)}
              />
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => {
                  setKioskModal(false);
                  setError("");
                }}
              >
                Cancelar
              </button>
              <button className="btn-primary" disabled={saving}>
                {saving ? "Salvando…" : "Salvar quiosque"}
              </button>
            </div>
          </form>
          {editing ? (
            <section className="mt-6 space-y-3 border-t pt-5">
              <h3 className="font-semibold">Fotos</h3>
              <p className="text-xs text-surface-500">
                Cadastre a URL HTTPS de uma imagem já hospedada. Remoção é
                lógica; ordem menor aparece primeiro.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {editing.photos.map((photo) => (
                  <div
                    className="rounded-lg border p-3 space-y-2"
                    key={photo.id}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || editing.name}
                      className="h-28 w-full rounded object-cover"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs">
                        Ordem
                        <input
                          aria-label={`Ordem da foto ${photo.id}`}
                          className="w-20"
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={photo.position}
                          disabled={saving}
                          onBlur={(e) => {
                            const position = Number(e.target.value);
                            if(!Number.isInteger(position)||position<0){e.target.value=String(photo.position);setError('A ordem da foto deve ser um número inteiro não negativo.');return;}
                            if (
                              Number.isInteger(position) &&
                              position >= 0 &&
                              position !== photo.position
                            )
                              void photoAction(() =>
                                clubApi.editPhoto(editing.id, photo.id, {
                                  position,
                                }),
                              );
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        aria-label="Remover foto"
                        disabled={saving}
                        className="btn-secondary text-red-600"
                        onClick={() => void removePhoto(photo.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void photoAction(() =>
                    clubApi.addPhoto(editing.id, {
                      url: photoUrl,
                      caption: photoCaption || null,
                      position: Number(photoOrder),
                    }),
                  );
                }}
              >
                <input
                  className="w-full"
                  type="url"
                  required
                  placeholder="https://.../foto.jpg"
                  aria-label="URL da foto"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1"
                    placeholder="Legenda"
                    aria-label="Legenda"
                    maxLength={300}
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                  />
                  <input
                    className="w-24"
                    type="number"
                    min={0}
                    step={1}
                    required
                    aria-label="Ordem da nova foto"
                    value={photoOrder}
                    onChange={(e) => setPhotoOrder(e.target.value)}
                  />
                </div>
                <button className="btn-secondary" disabled={saving}>
                  Adicionar foto
                </button>
              </form>
            </section>
          ) : (
            <p className="mt-4 text-xs text-surface-500">
              Salve o quiosque para cadastrar suas fotos.
            </p>
          )}
        </Modal>
      ) : null}
      {agenda ? (
        <Modal
          title={`Agenda · ${agenda.name}`}
          onClose={() => setAgenda(null)}
        >
          <div className="space-y-4">
            <LocationMap
              latitude={Number(agenda.latitude)}
              longitude={Number(agenda.longitude)}
            />
            <label className="block text-sm">
              Data
              <input
                className="ml-3"
                type="date"
                value={agendaDay}
                required
                onChange={(e) => {
                  if (e.target.value) setAgendaDay(e.target.value);
                }}
              />
            </label>
            {agendaLoading ? (
              <p>Consultando agenda…</p>
            ) : agendaError ? (
              <p role="alert" className="text-red-600">
                {agendaError}
              </p>
            ) : (
              <>
                {agendaRows.map((row) => (
                  <div className="rounded-lg border p-3 space-y-2" key={row.id}>
                    <div className="flex justify-between gap-2">
                      <span>{row.cardMasked}</span>
                      <Badge status={row.status} />
                    </div>
                    <p className="text-sm">
                      {date(row.startsAt)} até {date(row.endsAt)}
                    </p>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setDetail(row);
                        setAgenda(null);
                      }}
                    >
                      Detalhes da reserva
                    </button>
                  </div>
                ))}
                {!agendaRows.length ? (
                  <p className="text-surface-500">Sem reservas nesta data.</p>
                ) : null}
                <p className="text-xs text-surface-500">
                  Reservas canceladas, concluídas ou expiradas não bloqueiam
                  disponibilidade.
                </p>
              </>
            )}
          </div>
        </Modal>
      ) : null}
      {detail ? (
        <Modal title="Detalhes da reserva" onClose={() => setDetail(null)}>
          <div className="space-y-4">
            <div className="flex justify-between gap-2">
              <h3 className="font-semibold">{detail.kiosk.name}</h3>
              <Badge status={detail.status} />
            </div>
            <p className="text-sm">
              Comanda {detail.cardMasked} · {detail.people} pessoas
            </p>
            <p className="text-sm">
              {date(detail.startsAt)} até {date(detail.endsAt)}
            </p>
            <p className="font-semibold">
              {money(detail.amount)}{" "}
              {detail.paymentMode === "SIMULADO" ? "· pagamento simulado" : ""}
            </p>
            {actions(detail)}
            <p className="text-xs text-surface-500">
              Ativação e conclusão respeitam o período; alterações exigem
              justificativa e não reabrem reservas encerradas.
            </p>
            <h3 className="font-semibold">Histórico</h3>
            {detail.history.map((row) => (
              <div className="rounded border p-3 text-sm" key={row.id}>
                <Badge status={row.status} />
                <p className="mt-2">{row.reason}</p>
                <span className="text-xs text-surface-500">
                  {date(row.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
      {activityModal ? (
        <Modal
          title={activityEditing ? "Editar atividade" : "Nova atividade"}
          onClose={() => {
            if (!saving) {
              setActivityModal(false);
              setError("");
            }
          }}
        >
          <form onSubmit={saveActivity} className="space-y-4">
            <label className="block text-sm">
              Nome
              <input
                className="mt-1 w-full"
                required
                minLength={2}
                maxLength={200}
                value={activityForm.name}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, name: e.target.value })
                }
              />
            </label>
            <label className="block text-sm">
              Descrição
              <textarea
                className="mt-1 w-full"
                required
                minLength={3}
                maxLength={2000}
                value={activityForm.description}
                onChange={(e) =>
                  setActivityForm({
                    ...activityForm,
                    description: e.target.value,
                  })
                }
              />
            </label>
            <label className="block text-sm">
              URL da imagem
              <input
                className="mt-1 w-full"
                type="url"
                value={activityForm.imageUrl}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, imageUrl: e.target.value })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={activityForm.active}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, active: e.target.checked })
                }
              />
              Publicada
            </label>
            {error ? (
              <p className="text-red-600 text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <button className="btn-primary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar atividade"}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
