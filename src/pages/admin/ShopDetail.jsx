import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    FiArrowLeft, FiCheckCircle, FiSlash, FiTrash2, FiEdit2, FiSliders,
    FiUsers, FiPackage, FiShoppingBag, FiUserCheck, FiEye, FiClock, FiStar, FiX,
    FiExternalLink, FiTrendingUp, FiCreditCard,
} from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';
import { useCachedApi, invalidateCache } from '../../hooks/useCachedApi';
import { Skeleton, SkeletonCard } from '../../components/ui/Skeleton';

const STATUS_BADGE = {
    approved:  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    pending:   'bg-amber-500/10 text-amber-600 border-amber-500/20',
    suspended: 'bg-red-500/10 text-red-600 border-red-500/20',
};

function StatTile({ icon: Icon, label, value, accent }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center mb-4`}>
                <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                {(value ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{label}</p>
        </div>
    );
}

// Smooth mount/unmount wrapper — keeps DOM during exit transition for 200ms
function ModalShell({ open, onClose, children, maxWidth = 'max-w-md' }) {
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(false);

    // Mount/visibility timing — separate from body lock so cleanup is independent
    useEffect(() => {
        if (open) {
            setMounted(true);
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            const t = setTimeout(() => setMounted(false), 200);
            return () => clearTimeout(t);
        }
    }, [open]);

    // Body scroll lock — guaranteed to restore on close OR component unmount
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    // Esc to close
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!mounted) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`bg-card border border-border rounded-2xl p-6 w-full ${maxWidth} transition-all duration-200 ease-out ${
                    visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
                }`}
            >
                {children}
            </div>
        </div>
    );
}

function LimitsModal({ open, current, onClose, onSave, saving }) {
    const [limits, setLimits] = useState(current || { customers: 0, products: 0, employees: 0, orders: 0, stores: 0 });
    useEffect(() => { setLimits(current || {}); }, [current]);

    const fields = [
        { key: 'customers',     label: 'Customers'      },
        { key: 'products',      label: 'Products'       },
        { key: 'employees',     label: 'Employees'      },
        { key: 'orders',        label: 'Orders'         },
        { key: 'stores',        label: 'Stores'         },
        { key: 'galleryImages', label: 'Gallery images' },
        { key: 'services',      label: 'Services'       },
    ];

    return (
        <ModalShell open={open} onClose={onClose}>
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-foreground">Update limits</h3>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/40 transition-colors">
                    <FiX size={18} />
                </button>
            </div>
            <p className="text-xs text-muted-foreground mb-5">Set <code className="text-foreground">0</code> for unlimited.</p>
            <div className="space-y-3">
                {fields.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                        <label className="text-sm font-medium text-foreground">{label}</label>
                        <input
                            type="number"
                            min="0"
                            value={limits[key] ?? ''}
                            onChange={(e) => setLimits({ ...limits, [key]: Number(e.target.value) })}
                            className="w-32 px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm text-foreground tabular-nums text-right focus:outline-none focus:border-primary"
                        />
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-3 mt-6">
                <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                    Cancel
                </button>
                <button
                    disabled={saving}
                    onClick={() => onSave(limits)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </ModalShell>
    );
}

function ConfirmModal({ open, title, body, danger, onCancel, onConfirm, busy }) {
    return (
        <ModalShell open={open} onClose={onCancel} maxWidth="max-w-sm">
            <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-6">{body}</p>
            <div className="flex items-center gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                    Cancel
                </button>
                <button
                    disabled={busy}
                    onClick={onConfirm}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity ${
                        danger ? 'bg-red-600' : 'bg-primary'
                    }`}
                >
                    {busy ? 'Working…' : 'Confirm'}
                </button>
            </div>
        </ModalShell>
    );
}

export default function ShopDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { patch, delete: del } = useApi();
    const [busy,        setBusy]        = useState(false);
    const [limitsOpen,  setLimitsOpen]  = useState(false);
    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [confirm,     setConfirm]     = useState(null);

    // Main detail (cached, 30s TTL)
    const detailQ = useCachedApi(`/shops/${id}`, null, { ttl: 30_000 });

    // Employees inline (small list, cached longer)
    const employeesQ = useCachedApi(`/shops/${id}/employees`, null, { ttl: 60_000 });

    // Store + products: lazy — only fetched when user asks
    const [showStore, setShowStore] = useState(false);
    const storeQ = useCachedApi(
        `/shops/${id}/store-with-products`,
        null,
        { ttl: 60_000, enabled: showStore },
    );

    if (detailQ.isLoading) return <ShopDetailSkeleton />;
    if (!detailQ.data?.data?.shop) {
        return <div className="p-6 text-muted-foreground">Shop not found</div>;
    }

    const data  = detailQ.data.data;
    const { shop, stats } = data;
    const store           = data.store;
    const subscription    = data.subscription || null;
    const effectiveLimits = data.effectiveLimits || {};

    // After any mutation: clear all shop-related cache + refresh detail
    const refresh = async () => {
        invalidateCache('/shops');
        invalidateCache('/dashboard');
        invalidateCache('/audit');
        invalidateCache('/plans');
        await detailQ.refresh();
    };

    const doAssignPlan = async ({ planId, expiresAt, notes }) => {
        setBusy(true);
        try {
            await patch(`/plans/subscriptions/${id}`, { planId, expiresAt, notes });
            setPlanModalOpen(false);
            await refresh();
        } finally { setBusy(false); }
    };

    const doCancelSubscription = async () => {
        setBusy(true);
        try {
            await del(`/plans/subscriptions/${id}`);
            await refresh();
        } finally { setBusy(false); setConfirm(null); }
    };

    const doApprove = async () => {
        setBusy(true);
        try { await patch(`/shops/${id}/approve`); await refresh(); } finally { setBusy(false); setConfirm(null); }
    };
    const doBlock = async () => {
        setBusy(true);
        try { await patch(`/shops/${id}/block`); await refresh(); } finally { setBusy(false); setConfirm(null); }
    };
    const doUnblock = async () => {
        setBusy(true);
        try { await patch(`/shops/${id}/unblock`); await refresh(); } finally { setBusy(false); setConfirm(null); }
    };
    const doDelete = async () => {
        setBusy(true);
        try {
            await del(`/shops/${id}`);
            invalidateCache('/shops');
            invalidateCache('/dashboard');
            navigate('/dashboard/shops');
        } finally { setBusy(false); setConfirm(null); }
    };
    const doSaveLimits = async (limits) => {
        setBusy(true);
        try {
            await patch(`/shops/${id}/limits`, limits);
            setLimitsOpen(false);
            await refresh();
        } finally { setBusy(false); }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Back */}
            <Link to="/dashboard/shops" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <FiArrowLeft size={14} /> All shops
            </Link>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex items-center gap-4">
                    {shop.picture ? (
                        <img src={shop.picture} alt={shop.name} className="w-16 h-16 rounded-2xl object-cover" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                            {shop.name?.[0]?.toUpperCase()}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{shop.name}</h1>
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[shop.status] || ''}`}>
                                {shop.status}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{shop.email || '—'} · {shop.phone}</p>
                    </div>
                </div>

                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-2">
                    {shop.status === 'pending' && (
                        <button
                            onClick={() => setConfirm({ type: 'approve', title: 'Approve this shop?', body: 'They will be visible on the public site.', action: doApprove })}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:opacity-90"
                        >
                            <FiCheckCircle size={14} /> Approve
                        </button>
                    )}
                    {shop.status === 'approved' && (
                        <button
                            onClick={() => setConfirm({ type: 'block', danger: true, title: 'Block this shop?', body: 'They will be logged out and hidden from the public site.', action: doBlock })}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:opacity-90"
                        >
                            <FiSlash size={14} /> Block
                        </button>
                    )}
                    {shop.status === 'suspended' && (
                        <button
                            onClick={() => setConfirm({ type: 'unblock', title: 'Unblock this shop?', body: 'They will regain access.', action: doUnblock })}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:opacity-90"
                        >
                            <FiCheckCircle size={14} /> Unblock
                        </button>
                    )}
                    <button
                        onClick={() => setLimitsOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm font-semibold text-foreground hover:bg-muted/40"
                    >
                        <FiSliders size={14} /> Limits
                    </button>
                    <button
                        onClick={() => setConfirm({ type: 'delete', danger: true, title: 'Delete this shop permanently?', body: 'This removes their store, employees, products, customers, orders and reviews. This cannot be undone.', action: doDelete })}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-red-500/30 text-sm font-semibold text-red-600 hover:bg-red-500/5"
                    >
                        <FiTrash2 size={14} /> Delete
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile icon={FiShoppingBag} label="Stores"    value={stats.stores}    accent="bg-blue-500/10 text-blue-500" />
                <StatTile icon={FiPackage}     label="Products"  value={stats.products}  accent="bg-orange-500/10 text-orange-500" />
                <StatTile icon={FiUsers}       label="Customers" value={stats.customers} accent="bg-cyan-500/10 text-cyan-500" />
                <StatTile icon={FiShoppingBag} label="Orders"    value={stats.orders}    accent="bg-purple-500/10 text-purple-500" />
                <StatTile icon={FiUserCheck}   label="Employees" value={stats.employees} accent="bg-emerald-500/10 text-emerald-500" />
                <StatTile icon={FiEye}         label="Views"     value={stats.views}     accent="bg-pink-500/10 text-pink-500" />
                <StatTile icon={FiStar}        label="Reviews"   value={stats.reviews}   accent="bg-amber-500/10 text-amber-500" />
            </div>

            {/* Subscription panel */}
            <SubscriptionPanel
                subscription={subscription}
                effectiveLimits={effectiveLimits}
                stats={stats}
                onChange={() => setPlanModalOpen(true)}
                onCancel={() => setConfirm({
                    type: 'cancel-sub',
                    danger: true,
                    title: 'Cancel subscription?',
                    body: 'The shop will fall back to the default plan limits.',
                    action: doCancelSubscription,
                })}
                onEditOverride={() => setLimitsOpen(true)}
                hasOverride={Object.values(shop.limits || {}).some((v) => v !== null && v !== undefined)}
            />

            {/* Store info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-foreground mb-5">Custom override</h3>
                    {Object.values(shop.limits || {}).some((v) => v !== null && v !== undefined) ? (
                        <>
                            <p className="text-xs text-muted-foreground mb-4">
                                These fields are set on this shop and beat the subscription plan.
                            </p>
                            <div className="divide-y divide-border">
                                {Object.entries(shop.limits || {}).filter(([, v]) => v !== null && v !== undefined).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-sm">
                                        <span className="text-foreground capitalize">{key}</span>
                                        <span className="font-semibold text-foreground tabular-nums">{val === 0 ? '∞' : val}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setLimitsOpen(true)} className="mt-4 text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1">
                                <FiEdit2 size={12} /> Edit override
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground mb-4">
                                No override. This shop is using the plan&apos;s limits.
                            </p>
                            <button onClick={() => setLimitsOpen(true)} className="text-sm text-primary font-semibold hover:underline">
                                Add custom override →
                            </button>
                        </>
                    )}
                </div>

                {/* Store info */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-foreground mb-5">Public store</h3>
                    {store ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Name</span>
                                <span className="font-semibold text-foreground">{store.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Slug</span>
                                <a href={`https://tailorshub.store/stores/${store.slug}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:underline">
                                    /{store.slug}
                                </a>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Active</span>
                                <span className="font-semibold text-foreground">{store.isActive ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Rating</span>
                                <span className="font-semibold text-foreground tabular-nums">
                                    {(store.averageRating || 0).toFixed(1)} ({store.reviewCount || 0})
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Views</span>
                                <span className="font-semibold text-foreground tabular-nums">{store.viewCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">WhatsApp clicks</span>
                                <span className="font-semibold text-foreground tabular-nums">{store.whatsappClickCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Phone clicks</span>
                                <span className="font-semibold text-foreground tabular-nums">{store.phoneClickCount || 0}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No store created yet</p>
                    )}
                </div>
            </div>

            {/* Employees */}
            <EmployeesSection
                isLoading={employeesQ.isLoading}
                employees={employeesQ.data?.data?.employees || []}
            />

            {/* Store + products (on-demand) */}
            <StoreSection
                show={showStore}
                onToggle={() => setShowStore((s) => !s)}
                isLoading={storeQ.isLoading && showStore}
                storeData={storeQ.data?.data}
                hasStore={!!store}
            />

            {/* Recent activity for this shop */}
            {data.recentLogs?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-foreground mb-5">Activity for this shop</h3>
                    <div className="divide-y divide-border">
                        {data.recentLogs.map((log) => (
                            <div key={log._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 text-sm">
                                <FiClock className="text-muted-foreground shrink-0" size={13} />
                                <span className="font-semibold text-foreground">{log.adminName}</span>
                                <span className="text-muted-foreground flex-1 truncate">{log.action}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <LimitsModal
                open={limitsOpen}
                current={shop.limits}
                onClose={() => setLimitsOpen(false)}
                onSave={doSaveLimits}
                saving={busy}
            />
            <ConfirmModal
                open={!!confirm}
                title={confirm?.title}
                body={confirm?.body}
                danger={confirm?.danger}
                busy={busy}
                onCancel={() => setConfirm(null)}
                onConfirm={() => confirm?.action()}
            />

            <ChangePlanModal
                open={planModalOpen}
                currentPlanId={subscription?.planId?._id}
                onClose={() => setPlanModalOpen(false)}
                onSave={doAssignPlan}
                saving={busy}
            />
        </div>
    );
}

// ── Subscription panel ────────────────────────────────────────────────────────
function SubscriptionPanel({ subscription, effectiveLimits, stats, onChange, onCancel, onEditOverride, hasOverride }) {
    const plan = subscription?.planId;
    const expiresAt = subscription?.expiresAt;
    const expired = expiresAt && new Date(expiresAt) < new Date();

    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FiCreditCard className="text-primary" size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">
                            {plan ? plan.name : 'No subscription'}
                            {expired && <span className="ml-2 text-xs font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">Expired</span>}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {plan ? (
                                <>
                                    {plan.price === 0 ? 'Free' : `Rs. ${plan.price?.toLocaleString('en-PK') ?? plan.price}`}
                                    {plan.durationDays > 0 && ` · ${plan.durationDays} day${plan.durationDays !== 1 ? 's' : ''}`}
                                    {expiresAt && (
                                        <> · {expired ? 'Expired' : 'Expires'} {new Date(expiresAt).toLocaleDateString('en-PK')}</>
                                    )}
                                </>
                            ) : (
                                'Falling back to hardcoded free defaults'
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onChange} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                        {plan ? 'Change plan' : 'Assign plan'}
                    </button>
                    {plan && (
                        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-red-600 transition-colors px-2 py-2">
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            <div className="border-t border-border pt-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Effective limits</p>
                    {hasOverride && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Has override
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { key: 'customers',     label: 'Customers'  },
                        { key: 'products',      label: 'Products'   },
                        { key: 'employees',     label: 'Employees'  },
                        { key: 'orders',        label: 'Orders'     },
                        { key: 'stores',        label: 'Stores'     },
                        { key: 'galleryImages', label: 'Gallery'    },
                        { key: 'services',      label: 'Services'   },
                    ].map(({ key, label }) => {
                        const cap = effectiveLimits[key] ?? 0;
                        const used = stats?.[key] ?? 0;
                        const unlimited = cap === 0;
                        const overused = !unlimited && used > cap;
                        return (
                            <div key={key} className="bg-muted/20 border border-border rounded-xl p-3">
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                                <p className={`text-sm font-semibold tabular-nums ${overused ? 'text-red-600' : 'text-foreground'}`}>
                                    {used} <span className="text-muted-foreground font-normal">/ {unlimited ? '∞' : cap}</span>
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Change Plan modal ─────────────────────────────────────────────────────────
function ChangePlanModal({ open, currentPlanId, onClose, onSave, saving }) {
    const [selected,  setSelected]  = useState(currentPlanId || '');
    const [expiresAt, setExpiresAt] = useState('');
    const [notes,     setNotes]     = useState('');
    const plansQ = useCachedApi('/plans', null, { ttl: 60_000, enabled: open });

    useEffect(() => { setSelected(currentPlanId || ''); }, [currentPlanId, open]);

    return (
        <ModalShell open={open} onClose={onClose} maxWidth="max-w-lg">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-foreground">Assign subscription</h3>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/40">
                    <FiX size={18} />
                </button>
            </div>
            <p className="text-xs text-muted-foreground mb-5">Pick a plan to grant this shop.</p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {plansQ.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                ) : (plansQ.data?.data?.plans || []).filter((p) => p.isActive).map((p) => (
                    <button
                        key={p._id}
                        onClick={() => setSelected(p._id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selected === p._id
                                ? 'border-primary bg-primary/5'
                                : 'border-border bg-card hover:border-border'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-foreground">{p.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {p.price === 0 ? 'Free' : `Rs. ${p.price.toLocaleString('en-PK')}`}
                                    {p.durationDays > 0 && ` · ${p.durationDays} days`}
                                </p>
                            </div>
                            {p.isDefault && (
                                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Default</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">
                        Expires at (optional)
                    </label>
                    <input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">Leave blank to use plan&apos;s default duration.</p>
                </div>
                <div>
                    <label className="block text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">
                        Notes (optional)
                    </label>
                    <input
                        type="text"
                        placeholder="Promo, refund, etc."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 text-sm font-medium text-foreground hover:bg-muted">
                    Cancel
                </button>
                <button
                    disabled={saving || !selected}
                    onClick={() => onSave({ planId: selected, expiresAt: expiresAt || undefined, notes: notes || undefined })}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Assign'}
                </button>
            </div>
        </ModalShell>
    );
}

// ── Employees ────────────────────────────────────────────────────────────────
function EmployeesSection({ isLoading, employees }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Employees</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                    {isLoading ? '—' : `${employees.length} total`}
                </span>
            </div>
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                            <Skeleton className="w-10 h-10 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-2/3" />
                                <Skeleton className="h-2.5 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : employees.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No employees added yet</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employees.map((e) => (
                        <div key={e._id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/10">
                            {e.picture ? (
                                <img src={e.picture} alt={e.name} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                                    {e.name?.[0]?.toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{e.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{e.phone}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Store + Products (on-demand) ─────────────────────────────────────────────
function StoreSection({ show, onToggle, isLoading, storeData, hasStore }) {
    const store     = storeData?.store;
    const products  = storeData?.products  || [];
    const analytics = storeData?.analytics || null;

    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Store & products</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        {hasStore ? 'Click to load products and analytics' : 'No store created yet'}
                    </p>
                </div>
                {hasStore && (
                    <button
                        onClick={onToggle}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        {show ? 'Hide' : 'Show store'}
                    </button>
                )}
            </div>

            {!show || !hasStore ? null : isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="border border-border rounded-xl overflow-hidden">
                                <Skeleton className="aspect-square w-full rounded-none" />
                                <div className="p-3 space-y-2">
                                    <Skeleton className="h-3 w-3/4" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Analytics tiles */}
                    {analytics && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MetricTile label="Total products"    value={analytics.totalProducts}      Icon={FiPackage}     accent="bg-orange-500/10 text-orange-500" />
                            <MetricTile label="Available"         value={analytics.availableCount}     Icon={FiCheckCircle} accent="bg-emerald-500/10 text-emerald-500" />
                            <MetricTile label="Product views"     value={analytics.totalProductViews}  Icon={FiEye}         accent="bg-pink-500/10 text-pink-500" />
                            <MetricTile label="Avg. product ⭐"   value={analytics.avgProductRating}   Icon={FiStar}        accent="bg-amber-500/10 text-amber-500" />
                        </div>
                    )}

                    {/* Store storefront link */}
                    {store?.slug && (
                        <a
                            href={`https://tailorshub.store/stores/${store.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                        >
                            <FiExternalLink size={13} /> Open public storefront
                        </a>
                    )}

                    {/* Products grid */}
                    {products.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No products in this store yet</p>
                    ) : (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Products ({products.length})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {products.map((p) => (
                                    <div key={p._id} className="border border-border rounded-xl overflow-hidden bg-muted/10">
                                        <div className="aspect-square bg-muted/30 overflow-hidden relative">
                                            {p.images?.[0] ? (
                                                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                    <FiPackage size={24} />
                                                </div>
                                            )}
                                            {!p.isAvailable && (
                                                <span className="absolute top-2 left-2 text-[10px] font-semibold bg-red-500/90 text-white px-2 py-0.5 rounded-full">
                                                    Unavailable
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                                            <p className="text-xs text-primary font-bold mt-1 tabular-nums">
                                                Rs. {(p.discountPrice || p.price).toLocaleString('en-PK')}
                                            </p>
                                            <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                                                <span className="flex items-center gap-1"><FiEye size={10} /> {p.viewCount || 0}</span>
                                                <span className="flex items-center gap-1"><FiStar size={10} /> {(p.averageRating || 0).toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MetricTile({ Icon, label, value, accent }) {
    return (
        <div className="bg-muted/20 border border-border rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${accent} flex items-center justify-center mb-3`}>
                <Icon size={16} />
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums leading-none">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{label}</p>
        </div>
    );
}

// ── Page-level loading skeleton ──────────────────────────────────────────────
function ShopDetailSkeleton() {
    return (
        <div className="p-4 md:p-6 space-y-6">
            <Skeleton className="h-3 w-20" />
            <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-3 w-64" />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        </div>
    );
}
