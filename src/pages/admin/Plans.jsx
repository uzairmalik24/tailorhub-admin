import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiUsers, FiStar } from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';
import { useCachedApi, invalidateCache } from '../../hooks/useCachedApi';
import { Skeleton } from '../../components/ui/Skeleton';

const LIMIT_FIELDS = [
    { key: 'customers',     label: 'Customers'      },
    { key: 'products',      label: 'Products'       },
    { key: 'employees',     label: 'Employees'      },
    { key: 'orders',        label: 'Orders'         },
    { key: 'stores',        label: 'Stores'         },
    { key: 'galleryImages', label: 'Gallery images' },
    { key: 'services',      label: 'Services'       },
];

const EMPTY_PLAN = {
    name: '',
    description: '',
    price: 0,
    currency: 'PKR',
    durationDays: 0,
    isActive: true,
    isDefault: false,
    limits: { customers: 100, products: 4, employees: 2, orders: 30, stores: 1, galleryImages: 2, services: 4 },
};

// Coerce input.value (string) → number | '' for state. Lets the user actually clear the field.
function numOrEmpty(v) {
    if (v === '' || v == null) return '';
    const n = Number(v);
    return Number.isFinite(n) ? n : '';
}
// Coerce state back → number on save (empty becomes 0)
function toNum(v) {
    if (v === '' || v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function PlanModal({ open, plan, onClose, onSave, saving }) {
    const [form, setForm] = useState(EMPTY_PLAN);
    const isEdit = !!plan?._id;

    // Reset/sync form whenever modal opens or the plan being edited changes.
    // This fixes "past data prefilled" when reopening after a previous edit.
    useEffect(() => {
        if (!open) return;
        setForm(plan ? { ...EMPTY_PLAN, ...plan, limits: { ...EMPTY_PLAN.limits, ...(plan.limits || {}) } } : EMPTY_PLAN);
    }, [open, plan?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!open) return null;

    const handleSave = () => {
        const normalized = {
            ...form,
            price:        toNum(form.price),
            durationDays: toNum(form.durationDays),
            limits: Object.fromEntries(
                LIMIT_FIELDS.map(({ key }) => [key, toNum(form.limits?.[key])])
            ),
        };
        onSave(normalized);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl my-10 max-h-[calc(100vh-5rem)] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-foreground">{isEdit ? 'Edit plan' : 'New plan'}</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/40"><FiX size={18} /></button>
                </div>

                <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">Name *</label>
                            <input
                                type="text" placeholder="Free, Pro, Premium…"
                                value={form.name ?? ''}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">Price (PKR)</label>
                            <input
                                type="number" min="0"
                                value={form.price === '' || form.price == null ? '' : form.price}
                                onChange={(e) => setForm({ ...form, price: numOrEmpty(e.target.value) })}
                                className="w-full px-3 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-foreground focus:outline-none focus:border-primary tabular-nums"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">Description</label>
                        <textarea
                            rows={2}
                            value={form.description ?? ''}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-foreground focus:outline-none focus:border-primary resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">
                            Duration (days) — 0 means lifetime
                        </label>
                        <input
                            type="number" min="0"
                            value={form.durationDays === '' || form.durationDays == null ? '' : form.durationDays}
                            onChange={(e) => setForm({ ...form, durationDays: numOrEmpty(e.target.value) })}
                            className="w-48 px-3 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-foreground focus:outline-none focus:border-primary tabular-nums"
                        />
                    </div>

                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                            <span className="text-foreground">Active</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                            <span className="text-foreground">Default (auto-assigned to new shops)</span>
                        </label>
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-3">
                            Limits — set <code>0</code> for unlimited
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {LIMIT_FIELDS.map(({ key, label }) => {
                                const v = form.limits?.[key];
                                return (
                                    <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
                                        <label className="text-sm font-medium text-foreground">{label}</label>
                                        <input
                                            type="number" min="0"
                                            value={v === '' || v == null ? '' : v}
                                            onChange={(e) => setForm({
                                                ...form,
                                                limits: { ...form.limits, [key]: numOrEmpty(e.target.value) },
                                            })}
                                            className="w-24 px-2.5 py-1.5 rounded-md bg-background border border-border text-sm text-foreground tabular-nums text-right focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-7">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 text-sm font-medium text-foreground hover:bg-muted">
                        Cancel
                    </button>
                    <button
                        disabled={saving || !form.name?.trim()}
                        onClick={handleSave}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Plans() {
    const { post, patch, delete: del } = useApi();
    const { data, isLoading } = useCachedApi('/plans', null, { ttl: 30_000 });
    const plans = data?.data?.plans || [];

    const [modalOpen, setModalOpen] = useState(false);
    const [editing,   setEditing]   = useState(null);
    const [saving,    setSaving]    = useState(false);

    const refresh = () => invalidateCache('/plans');

    const openCreate = () => { setEditing(null); setModalOpen(true); };
    const openEdit   = (plan) => { setEditing(plan); setModalOpen(true); };

    const save = async (form) => {
        setSaving(true);
        try {
            if (editing?._id) {
                await patch(`/plans/${editing._id}`, form, { successMessage: 'Plan updated' });
            } else {
                await post('/plans', form, { successMessage: 'Plan created' });
            }
            refresh();
            setModalOpen(false);
        } catch { /* toasted */ } finally { setSaving(false); }
    };

    const remove = async (plan) => {
        if (!confirm(`Delete plan "${plan.name}"?`)) return;
        try {
            await del(`/plans/${plan._id}`, null, { successMessage: 'Plan deleted' });
            refresh();
        } catch { /* toasted */ }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Subscription Plans</h1>
                    <p className="text-muted-foreground text-sm">{isLoading ? '—' : `${plans.length} plan${plans.length !== 1 ? 's' : ''}`}</p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
                >
                    <FiPlus size={15} /> New plan
                </button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
                </div>
            ) : plans.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 text-center">
                    <p className="text-sm text-muted-foreground mb-5">No plans yet. Create your first one to define what shops get.</p>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
                        <FiPlus size={15} /> Create first plan
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {plans.map((p) => (
                        <div key={p._id} className="bg-card border border-border rounded-2xl p-6 flex flex-col">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                                        {p.isDefault && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                <FiStar size={9} /> Default
                                            </span>
                                        )}
                                        {!p.isActive && (
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-2xl font-bold text-primary tabular-nums">
                                        {p.price === 0 ? 'Free' : `Rs. ${p.price.toLocaleString('en-PK')}`}
                                        {p.durationDays > 0 && (
                                            <span className="text-xs font-normal text-muted-foreground"> / {p.durationDays}d</span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button onClick={() => remove(p)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors">
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {p.description && (
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{p.description}</p>
                            )}

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                                <FiUsers size={11} />
                                {p.activeSubscribers} active subscriber{p.activeSubscribers !== 1 ? 's' : ''}
                            </div>

                            <div className="border-t border-border pt-4 space-y-1.5 text-xs">
                                {LIMIT_FIELDS.map(({ key, label }) => {
                                    const v = p.limits?.[key] ?? 0;
                                    return (
                                        <div key={key} className="flex justify-between">
                                            <span className="text-muted-foreground">{label}</span>
                                            <span className="font-semibold text-foreground tabular-nums">{v === 0 ? '∞' : v}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <PlanModal
                open={modalOpen}
                plan={editing}
                onClose={() => setModalOpen(false)}
                onSave={save}
                saving={saving}
            />
        </div>
    );
}
