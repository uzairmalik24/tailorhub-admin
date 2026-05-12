import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiActivity, FiArrowRight, FiChevronDown, FiFilter } from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '../../components/ui/dropdown-menu';

const ACTIONS = [
    '', // all
    'shop.approve', 'shop.block', 'shop.unblock', 'shop.delete',
    'shop.update', 'shop.limits.update',
    'admin.create', 'admin.update', 'admin.delete',
];

const ACTION_BADGE = {
    'shop.approve':       'bg-emerald-500/10 text-emerald-600',
    'shop.unblock':       'bg-emerald-500/10 text-emerald-600',
    'shop.block':         'bg-red-500/10 text-red-600',
    'shop.delete':        'bg-red-500/10 text-red-600',
    'admin.delete':       'bg-red-500/10 text-red-600',
    'shop.update':        'bg-blue-500/10 text-blue-600',
    'shop.limits.update': 'bg-amber-500/10 text-amber-600',
    'admin.create':       'bg-purple-500/10 text-purple-600',
    'admin.update':       'bg-blue-500/10 text-blue-600',
};

export default function AuditLog() {
    const { get } = useApi();
    const [items,   setItems]   = useState([]);
    const [meta,    setMeta]    = useState({ total: 0, pages: 1 });
    const [action,  setAction]  = useState('');
    const [search,  setSearch]  = useState('');
    const [page,    setPage]    = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(() => {
            (async () => {
                setLoading(true);
                try {
                    const resp = await get('/audit', { action, search, page, limit: 30 }, { showSuccessToast: false });
                    if (cancelled) return;
                    setItems(resp.data?.data?.data || []);
                    setMeta(resp.data?.data?.pagination || { total: 0, pages: 1 });
                } catch { /* toasted */ } finally { setLoading(false); }
            })();
        }, search ? 300 : 0);
        return () => { cancelled = true; clearTimeout(t); };
    }, [action, search, page]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">Audit Log</h1>
                <p className="text-muted-foreground text-sm">{meta.total.toLocaleString()} entries</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                    <input
                        type="text"
                        placeholder="Search admin name, target…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground hover:border-primary/40 transition-colors">
                        <FiFilter size={13} />
                        {action || 'All actions'}
                        <FiChevronDown size={13} className="ml-auto opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        {ACTIONS.map((a) => (
                            <DropdownMenuItem key={a || 'all'} onSelect={() => { setAction(a); setPage(1); }}>
                                {a || 'All actions'}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* List */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {loading && items.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
                ) : items.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground text-sm">No entries match these filters</div>
                ) : (
                    <div className="divide-y divide-border">
                        {items.map((log) => (
                            <div key={log._id} className="flex items-start gap-4 p-5 hover:bg-muted/20 transition-colors">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <FiActivity size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="font-semibold text-foreground text-sm">{log.adminName}</span>
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ACTION_BADGE[log.action] || 'bg-muted/40 text-muted-foreground'}`}>
                                            {log.action}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                        Target:{' '}
                                        {log.targetType === 'shop' ? (
                                            <Link to={`/dashboard/shops/${log.targetId}`} className="text-foreground font-medium hover:text-primary">
                                                {log.targetName || log.targetId}
                                            </Link>
                                        ) : (
                                            <span className="text-foreground font-medium">{log.targetName || log.targetId}</span>
                                        )}
                                    </p>
                                    {log.metadata && (
                                        <details className="mt-2">
                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Metadata</summary>
                                            <pre className="mt-2 p-3 bg-muted/30 rounded-lg text-[11px] text-foreground overflow-x-auto">
                                                {JSON.stringify(log.metadata, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                    {new Date(log.createdAt).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {meta.pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Page {page} of {meta.pages}</p>
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
