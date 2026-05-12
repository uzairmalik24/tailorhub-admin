import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    FiUsers, FiPackage, FiShoppingBag, FiUserCheck, FiClock, FiSlash,
    FiTrendingUp, FiEye, FiActivity, FiArrowRight, FiChevronDown,
} from 'react-icons/fi';
import { useApi } from '../../hooks/useApi';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '../../components/ui/dropdown-menu';

const KPI_TILES = [
    { key: 'owners.total',     label: 'Shop Owners',  icon: FiUsers,        accent: 'text-blue-500',    bg: 'bg-blue-500/10' },
    { key: 'owners.pending',   label: 'Pending Approval', icon: FiClock,    accent: 'text-amber-500',   bg: 'bg-amber-500/10' },
    { key: 'owners.suspended', label: 'Suspended',    icon: FiSlash,        accent: 'text-red-500',     bg: 'bg-red-500/10' },
    { key: 'employees',        label: 'Employees',    icon: FiUserCheck,    accent: 'text-purple-500',  bg: 'bg-purple-500/10' },
    { key: 'stores',           label: 'Stores',       icon: FiShoppingBag,  accent: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { key: 'products',         label: 'Products',     icon: FiPackage,      accent: 'text-orange-500',  bg: 'bg-orange-500/10' },
    { key: 'customers',        label: 'Customers',    icon: FiUsers,        accent: 'text-cyan-500',    bg: 'bg-cyan-500/10' },
    { key: 'views',            label: 'Total Views',  icon: FiEye,          accent: 'text-pink-500',    bg: 'bg-pink-500/10' },
];

function getNested(obj, path) {
    return path.split('.').reduce((acc, k) => acc?.[k], obj);
}

function formatActionLabel(action) {
    const map = {
        'shop.approve':       'Approved shop',
        'shop.block':         'Blocked shop',
        'shop.unblock':       'Unblocked shop',
        'shop.delete':        'Deleted shop',
        'shop.update':        'Edited shop',
        'shop.limits.update': 'Updated limits',
        'admin.create':       'Created admin',
        'admin.update':       'Updated admin',
        'admin.delete':       'Deleted admin',
    };
    return map[action] || action;
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60)    return `${seconds}s ago`;
    if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Dashboard() {
    const { get } = useApi();
    const [overview,  setOverview]  = useState(null);
    const [series,    setSeries]    = useState([]);
    const [activity,  setActivity]  = useState([]);
    const [topShops,  setTopShops]  = useState([]);
    const [topMetric, setTopMetric] = useState('orders');
    const [days,      setDays]      = useState(30);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [ov, ts, act, top] = await Promise.all([
                    get('/dashboard/overview',        {},       { showSuccessToast: false }),
                    get('/dashboard/timeseries',      { days }, { showSuccessToast: false }),
                    get('/dashboard/recent-activity', {},       { showSuccessToast: false }),
                    get('/dashboard/top-shops',       { metric: topMetric, limit: 5 }, { showSuccessToast: false }),
                ]);
                if (cancelled) return;
                setOverview(ov.data?.data || null);
                setSeries(ts.data?.data?.series || []);
                setActivity(act.data?.data?.items || []);
                setTopShops(top.data?.data?.items || []);
            } catch { /* useApi already toasted */ }
        })();
        return () => { cancelled = true; };
    }, [days, topMetric]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard</h1>
                    <p className="text-muted-foreground text-sm">Live overview of TailorHub</p>
                </div>
                <div className="flex items-center gap-2">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                days === d
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {KPI_TILES.map(({ key, label, icon: Icon, accent, bg }) => (
                    <div key={key} className="bg-card border border-border rounded-2xl p-5">
                        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                            <Icon className={accent} size={18} />
                        </div>
                        <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                            {overview ? (getNested(overview, key) ?? 0).toLocaleString() : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">{label}</p>
                    </div>
                ))}
            </div>

            {/* Activity chart */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Activity</h3>
                        <p className="text-sm text-muted-foreground">Signups, orders & views over time</p>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={series}>
                        <defs>
                            <linearGradient id="g-signups" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="g-orders" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="g-views" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="date" fontSize={11} tick={{ fill: 'currentColor', opacity: 0.6 }} />
                        <YAxis fontSize={11} tick={{ fill: 'currentColor', opacity: 0.6 }} />
                        <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="signups" stroke="#3b82f6" strokeWidth={2} fill="url(#g-signups)" />
                        <Area type="monotone" dataKey="orders"  stroke="#10b981" strokeWidth={2} fill="url(#g-orders)" />
                        <Area type="monotone" dataKey="views"   stroke="#f59e0b" strokeWidth={2} fill="url(#g-views)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Recent activity + Top shops */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent activity */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Recent admin activity</h3>
                            <p className="text-sm text-muted-foreground">Last 15 actions</p>
                        </div>
                        <Link to="/dashboard/audit" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
                            View all <FiArrowRight size={13} />
                        </Link>
                    </div>
                    {activity.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No activity yet</p>
                    ) : (
                        <div className="divide-y divide-border">
                            {activity.map((a) => (
                                <div key={a._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <FiActivity className="text-primary" size={15} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground">
                                            <span className="font-semibold">{a.adminName}</span>
                                            <span className="text-muted-foreground"> {formatActionLabel(a.action).toLowerCase()} </span>
                                            <span className="font-medium">{a.targetName || a.targetId}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(a.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top shops */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-foreground">Top shops</h3>
                        <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted/40 hover:bg-muted border border-border rounded-lg px-3 py-1.5 text-foreground transition-colors">
                                {topMetric.charAt(0).toUpperCase() + topMetric.slice(1)}
                                <FiChevronDown size={12} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {['orders', 'customers', 'products', 'views'].map((m) => (
                                    <DropdownMenuItem key={m} onSelect={() => setTopMetric(m)}>
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    {topShops.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No data</p>
                    ) : (
                        <div className="space-y-3">
                            {topShops.map((row, i) => (
                                <Link
                                    key={row.shop._id}
                                    to={`/dashboard/shops/${row.shop._id}`}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
                                >
                                    <span className="w-6 text-xs font-bold text-muted-foreground tabular-nums">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{row.shop.name}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{row.shop.phone}</p>
                                    </div>
                                    <span className="text-sm font-bold text-primary tabular-nums">{row.count}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
