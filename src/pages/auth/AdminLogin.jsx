import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useApi } from '../../hooks/useApi';
import { toast } from 'toasticom';
import { useNavigate } from 'react-router-dom';
import { setAdminToken } from '../../store/slices/AdminSlice';
import { useDispatch } from 'react-redux';
import { TextInput, PasswordInput, CheckboxInput } from '../../components/ui/FormInputs';


const AdminLogin = () => {
    const [form, setForm] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const { post, isLoading, error, clearError } = useApi();
    const dispatch = useDispatch();

    const headingRef = useRef(null);
    const cardRef = useRef(null);
    const formRef = useRef(null);
    const footerRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(headingRef.current.children, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 });
        tl.fromTo(cardRef.current,             { opacity: 0, y: 24, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.55 }, '-=0.25');
        tl.fromTo(formRef.current.children,    { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 }, '-=0.3');
        tl.fromTo(footerRef.current,           { opacity: 0, y: 8 },  { opacity: 1, y: 0, duration: 0.4 }, '-=0.2');
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};

        if (!form.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(form.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!form.password) {
            newErrors.password = 'Password is required';
        } else if (form.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            try {
                const resp = await post('/admin/login', { email: form.email, password: form.password }, { showSuccessToast: false });
                const body = resp?.data;
                if (body?.success && body?.data?.accessToken) {
                    dispatch(setAdminToken(body.data.accessToken));
                    localStorage.setItem('refreshToken', body.data.refreshToken);
                    toast('success', 'Welcome back');
                    navigate('/dashboard', { replace: true });
                } else {
                    toast('error', body?.message || 'Login failed');
                }
            } catch {
                gsap.to(cardRef.current, {
                    x: [-10, 10, -10, 10, 0],
                    duration: 0.4,
                    ease: 'power2.inOut',
                });
            }
        } else {
            // Shake animation on error
            gsap.to(cardRef.current, {
                x: [-10, 10, -10, 10, 0],
                duration: 0.4,
                ease: 'power2.inOut'
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div ref={headingRef} className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
                        Sign in
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Authorised personnel only
                    </p>
                </div>

                {/* Login Card */}
                <div
                    ref={cardRef}
                    className="bg-card/80 backdrop-blur-xl text-card-foreground rounded-2xl border border-border/50 shadow-2xl shadow-black/5 overflow-hidden"
                >
                    <div className="p-8">
                        <div className="space-y-5">
                            <div ref={formRef} className="space-y-5">
                                {/* Email */}
                                <TextInput
                                    label="Email Address"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    error={errors.email}
                                    required
                                    autoFocus
                                />

                                {/* Password */}
                                <PasswordInput
                                    label="Password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    error={errors.password}
                                    required
                                />

                                {/* Remember & Forgot */}
                                <div className="flex items-center justify-between pt-1">
                                    <CheckboxInput
                                        label="Remember me"
                                        checked={form.rememberMe}
                                        onChange={(e) =>
                                            setForm({ ...form, rememberMe: e.target.checked })
                                        }
                                    />

                                    <a
                                        href="#"
                                        className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                                    >
                                        Forgot password?
                                    </a>
                                </div>

                                {/* Submit Button */}
                                <button
                                    ref={buttonRef}
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="
                                        w-full bg-gradient-to-r from-primary to-primary/90
                                        text-primary-foreground
                                        hover:shadow-lg hover:shadow-primary/25
                                        py-3 rounded-xl font-medium
                                        transition-all duration-300
                                        transform hover:scale-[1.01]
                                        active:scale-[0.99]
                                        relative overflow-hidden
                                        group
                                        mt-6
                                        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                                        flex items-center justify-center gap-2
                                    "
                                >
                                    {isLoading && (
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                    )}
                                    <span className="relative z-10">{isLoading ? 'Signing in…' : 'Sign In'}</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Security note */}
                <div
                    ref={footerRef}
                    className="flex items-center justify-center gap-2 mt-8 text-xs text-muted-foreground/60"
                >
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                        <span>Secured with encryption</span>
                    </div>
                    <span>•</span>
                    <span>Admin access only</span>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;