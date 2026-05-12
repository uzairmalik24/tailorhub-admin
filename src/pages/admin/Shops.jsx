import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiArrowRight, FiUsers, FiClock, FiSlash, FiCheckCircle } from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';

const STATUS_TABS = [
    { key: '',          label: 'All',       Icon: FiUsers       },
    { key: 'pending',   label: 'Pending',   Icon: FiClock       },
    { key: 'approved',  label: 'Approved',  Icon: FiCheckCircle },
    { key: 'suspended', label: 'Suspended', Icon: FiSlash       },
];

const STATUS_BADGE = {
    approved:  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    pending:   'bg-amber-500/10 text-amber-600 border-amber-500/20',
    suspended: 'bg-red-500/10 text-red-600 border-red-500/20',
};

function formatDate(d) {
    return new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Shops() {
    const { get } = useApi();
    const [shops,    setShops]    = useState([]);
    const [status,   setStatus]   = useState('');
    const [search,   setSearch]   = useState('');
    const [page,     setPage]     = useState(1);
    const [meta,     setMeta]     = useState({ total: 0, pages: 1 });
    const [loading,  setLoading]  = useState(false);

    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(() => {
            (async () => {
                setLoading(true);
                try {
                    const resp = await get('/shops', { status, search, page, limit: 20 }, { showSuccessToast: false });
                    if (cancelled) return;
                    setShops(resp.data?.data?.data || []);
                    setMeta(resp.data?.data?.pagination || { total: 0, pages: 1 });
                } catch { /* toasted */ } finally { setLoading(false); }
            })();
        }, search ? 300 : 0); // debounce search only
        return () => { cancelled = true; clearTimeout(t); };
    }, [status, search, page]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">Shop Owners</h1>
                <p className="text-muted-foreground text-sm">{meta.total.toLocaleString()} total</p>
            </div>

            {/* Status tabs */}
            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map(({ key, label, Icon }) => (
                    <button
                        key={key || 'all'}
                        onClick={() => { setStatus(key); setPage(1); }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            status === key
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Icon size={14} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                    type="text"
                    placeholder="Search by name, email, or phone…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-left">
                            <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <th className="px-5 py-3.5">Shop</th>
                                <th className="px-5 py-3.5">Phone</th>
                                <th className="px-5 py-3.5 text-right">Customers</th>
                                <th className="px-5 py-3.5 text-right">Orders</th>
                                <th className="px-5 py-3.5 text-right">Products</th>
                                <th className="px-5 py-3.5">Status</th>
                                <th className="px-5 py-3.5">Joined</th>
                                <th className="px-5 py-3.5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading && shops.length === 0 ? (
                                <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>
                            ) : shops.length === 0 ? (
                                <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">No shops match these filters</td></tr>
                            ) : (
                                shops.map((s) => (
                                    <tr key={s._id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {s.picture ? (
                                                    <img src={s.picture} alt={s.name} className="w-9 h-9 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold">
                                                        {s.name?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground truncate">{s.name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{s.email || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground tabular-nums">{s.phone}</td>
                                        <td className="px-5 py-4 text-right text-foreground tabular-nums font-medium">{s.counts?.customers ?? 0}</td>
                                        <td className="px-5 py-4 text-right text-foreground tabular-nums font-medium">{s.counts?.orders ?? 0}</td>
                                        <td className="px-5 py-4 text-right text-foreground tabular-nums font-medium">{s.counts?.products ?? 0}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[s.status] || ''}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">{formatDate(s.createdAt)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <Link
                                                to={`/dashboard/shops/${s._id}`}
                                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline whitespace-nowrap"
                                            >
                                                Manage <FiArrowRight size={13} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {meta.pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        Page {page} of {meta.pages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="px-4 py-2 rounded-lg bg-muted/40 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= meta.pages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
