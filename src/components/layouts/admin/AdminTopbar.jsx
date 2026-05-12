import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../../../store';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
    FiSun, FiMoon, FiSettings, FiLogOut, FiUser,
} from 'react-icons/fi';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { clearAdmin, selectAdmin } from '../../../store/slices/AdminSlice';

const AdminTopbar = () => {
    const dispatch = useDispatch();
    const { current: theme } = useSelector((state) => state.theme);
    const admin = useSelector(selectAdmin);

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const profileRef = useRef(null);
    const themeToggleRef = useRef(null);

    // Real admin from JWT-decoded Redux state
    const user = {
        name:   admin?.name  || 'Admin',
        email:  admin?.email || '',
        avatar: admin?.picture || null,
        role:   admin?.isSuperAdmin ? 'Super Admin' : 'Admin',
    };

    // Theme toggle animation with reset
    const handleThemeToggle = () => {
        const element = themeToggleRef.current;

        // Reset rotation first
        gsap.set(element, { rotation: 0 });

        // Animate rotation
        gsap.to(element, {
            rotation: 360,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => {
                // Reset rotation after animation
                gsap.set(element, { rotation: 0 });
            }
        });

        setTimeout(() => {
            dispatch(toggleTheme());
        }, 100);
    };

    // Close profile dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Animate profile dropdown
    useEffect(() => {
        if (isProfileOpen && profileRef.current) {
            const dropdown = profileRef.current.querySelector('.dropdown-menu');
            gsap.fromTo(
                dropdown,
                { opacity: 0, y: -10, scale: 0.95 },
                { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'power2.out' }
            );
        }
    }, [isProfileOpen]);

    return (
        <header className="sticky top-0 z-40 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="h-full flex items-center justify-between px-4 md:px-6">
                {/* Left side */}
                <div className="flex items-center gap-4">
                    {/* Mobile sidebar toggle */}
                    {/* <button
                        onClick={onToggleSidebar}
                        className="md:hidden p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                        <FiMenu size={20} />
                    </button> */}

                    {/* Search bar */}
                    {/* <div className="hidden md:flex items-center gap-2 bg-muted/30 rounded-lg px-4 py-2 w-80 border border-border/40 focus-within:border-primary/60 transition-all duration-200">
                        <FiSearch className="text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
                        />
                    </div> */}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <button
                        ref={themeToggleRef}
                        onClick={handleThemeToggle}
                        className="p-2.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200 relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-primary/5 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-lg"></div>
                        {theme === 'dark' ? (
                            <FiSun className="relative z-10" size={18} />
                        ) : (
                            <FiMoon className="relative z-10" size={18} />
                        )}
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-3 p-1.5 pr-3 rounded-lg hover:bg-muted/50 transition-all duration-200 group"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-semibold flex-shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                                ) : (
                                    user.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-sm font-medium text-foreground leading-none">
                                    {user.name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {user.email}
                                </p>
                            </div>
                        </button>

                        {/* Profile Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="dropdown-menu absolute right-0 mt-2 w-64 bg-card backdrop-blur-xl rounded-xl border border-border shadow-xl overflow-hidden z-50">
                                {/* User Info */}
                                <div className="p-4 border-b border-border/30 bg-card">
                                    <p className="font-semibold text-foreground">{user.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                                    <p className="text-xs text-primary mt-1">{user.role}</p>
                                </div>

                                {/* Menu Items */}
                                <div className="py-2 bg-card">
                                    {/* <Link
                                        to="/dashboard/profile"
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-foreground"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        <FiUser size={16} className="text-muted-foreground" />
                                        <span className="text-sm">My Profile</span>
                                    </Link> */}
                                    <Link
                                        to="/dashboard/settings"
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-foreground"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        <FiSettings size={16} className="text-muted-foreground" />
                                        <span className="text-sm">Settings</span>
                                    </Link>
                                </div>

                                {/* Logout */}
                                <div className="border-t border-border/30 py-2 bg-card">
                                    <button
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-destructive/10 transition-colors text-destructive w-full"
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            setIsModalOpen(true);
                                            // Handle logout
                                        }}
                                    >
                                        <FiLogOut size={16} />
                                        <span className="text-sm font-medium">Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {isModalOpen && (
                <ConfirmationModal
                    title='Logout'
                    isOpen={isModalOpen}
                    message='Are you sure you want to logout?'
                    onConfirm={() => {
                        dispatch(clearAdmin());
                        localStorage.removeItem('refreshToken');
                        setIsModalOpen(false);
                        navigate('/login', { replace: true });
                    }}
                    onClose={() => setIsModalOpen(false)}
                    confirmButtonVariant="danger"
                    type="danger"
                />
            )}

            {/* <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: hsl(var(--border) / 0.3);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--border) / 0.5);
                }
            `}</style> */}
        </header>
    );
};

export default AdminTopbar;