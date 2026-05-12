import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaCamera, FaUser, FaLock, FaSave } from 'react-icons/fa';
import gsap from 'gsap';
import { PasswordInput, TextInput } from '../../components/ui/FormInputs';
import AdminBreadcrumb from '../../components/ui/BreadCrumb';
import { useApi } from '../../hooks/useApi';
import { selectAdmin, setAdminToken } from '../../store/slices/AdminSlice';

const AdminSettings = () => {
    const dispatch = useDispatch();
    const admin    = useSelector(selectAdmin);
    const { post, patch, isLoading } = useApi();

    const [profileData, setProfileData] = useState({
        name:  admin?.name  || '',
        email: admin?.email || '',
        role:  admin?.isSuperAdmin ? 'Super Admin' : 'Admin',
        profileImage: null,
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [errors, setErrors] = useState({});
    const [previewImage, setPreviewImage] = useState(admin?.picture || null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const fileInputRef = useRef(null);
    const profileSectionRef = useRef(null);
    const passwordSectionRef = useRef(null);
    const imageContainerRef = useRef(null);

    // Re-hydrate when admin changes (e.g. after profile save → new JWT → new admin)
    useEffect(() => {
        if (!admin) return;
        setProfileData((p) => ({
            ...p,
            name:  admin.name  || '',
            email: admin.email || '',
            role:  admin.isSuperAdmin ? 'Super Admin' : 'Admin',
        }));
        if (admin.picture) setPreviewImage(admin.picture);
    }, [admin?._id, admin?.name, admin?.email, admin?.picture, admin?.isSuperAdmin]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(profileSectionRef.current,  { opacity: 0, y: 20, duration: 0.5, ease: 'power2.out' });
            gsap.from(passwordSectionRef.current, { opacity: 0, y: 20, duration: 0.5, delay: 0.1, ease: 'power2.out' });
        });
        return () => ctx.revert();
    }, []);

    const handleImageClick = () => fileInputRef.current?.click();

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setErrors({ ...errors, image: 'Image size should be less than 5MB' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewImage(reader.result);
            setProfileData({ ...profileData, profileImage: file });
            setErrors({ ...errors, image: null });
            if (imageContainerRef.current) {
                gsap.fromTo(
                    imageContainerRef.current,
                    { scale: 0.85, opacity: 0.6 },
                    { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' }
                );
            }
        };
        reader.readAsDataURL(file);
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!profileData.name.trim()) {
            setErrors({ ...errors, name: 'Name is required' });
            return;
        }

        setSavingProfile(true);
        try {
            const formData = new FormData();
            formData.append('name', profileData.name);
            if (profileData.email) formData.append('email', profileData.email);
            if (profileData.profileImage) formData.append('picture', profileData.profileImage);

            const resp = await patch('/admin/update-info', formData, {
                contentType: 'multipart',
                successMessage: 'Profile updated successfully',
            });

            // Backend returns new tokens with updated payload — refresh Redux + storage
            const body = resp?.data;
            if (body?.success && body?.data?.accessToken) {
                dispatch(setAdminToken(body.data.accessToken));
                if (body.data.refreshToken) {
                    localStorage.setItem('refreshToken', body.data.refreshToken);
                }
                setProfileData((p) => ({ ...p, profileImage: null }));
            }
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!passwordData.currentPassword) newErrors.currentPassword = 'Current password is required';
        if (!passwordData.newPassword)     newErrors.newPassword     = 'New password is required';
        else if (passwordData.newPassword.length < 8) newErrors.newPassword = 'Must be at least 8 characters';
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

        setSavingPassword(true);
        try {
            const resp = await patch('/admin/change-password', {
                oldPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            }, { successMessage: 'Password changed successfully' });

            const body = resp?.data;
            if (body?.success && body?.data?.accessToken) {
                dispatch(setAdminToken(body.data.accessToken));
                if (body.data.refreshToken) {
                    localStorage.setItem('refreshToken', body.data.refreshToken);
                }
            }
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <>
            <AdminBreadcrumb
                title="Settings"
                items={[{ label: 'Dashboard', href: '/dashboard' }]}
                currentPage="Settings"
                showBack={true}
            />

            <div className="p-4 sm:p-6">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Profile */}
                    <div ref={profileSectionRef} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <FaUser className="text-primary text-lg" />
                                </div>
                                <h2 className="text-lg font-semibold text-card-foreground">
                                    Profile Information
                                </h2>
                            </div>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
                                <div className="flex flex-col items-center gap-3">
                                    <div ref={imageContainerRef} className="relative group cursor-pointer" onClick={handleImageClick}>
                                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-border bg-muted flex items-center justify-center">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl font-bold text-muted-foreground">
                                                    {profileData.name?.[0]?.toUpperCase() || 'A'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                            <FaCamera className="text-white text-xl sm:text-2xl" />
                                        </div>
                                    </div>

                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

                                    <button
                                        type="button"
                                        onClick={handleImageClick}
                                        className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                                    >
                                        Change Photo
                                    </button>

                                    {errors.image && <p className="text-xs text-red-600 text-center">{errors.image}</p>}
                                </div>

                                <div className="flex-1 w-full space-y-4">
                                    <TextInput
                                        label="Name"
                                        type="text"
                                        value={profileData.name}
                                        onChange={(e) => { setProfileData({ ...profileData, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: null }); }}
                                        error={errors.name}
                                        placeholder="Enter your name"
                                        required
                                    />

                                    <TextInput
                                        label="Email"
                                        type="email"
                                        value={profileData.email}
                                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                        placeholder="Enter your email"
                                    />

                                    <div>
                                        <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">Role</label>
                                        <input
                                            type="text"
                                            value={profileData.role}
                                            disabled
                                            className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-border">
                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                                >
                                    <FaSave />
                                    {savingProfile ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Password */}
                    <div ref={passwordSectionRef} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <FaLock className="text-primary text-lg" />
                                </div>
                                <h2 className="text-lg font-semibold text-card-foreground">Change Password</h2>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="p-4 sm:p-6 space-y-4">
                            <PasswordInput
                                label="Current Password"
                                value={passwordData.currentPassword}
                                onChange={(e) => { setPasswordData({ ...passwordData, currentPassword: e.target.value }); if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' }); }}
                                error={errors.currentPassword}
                                placeholder="Enter current password"
                                required
                            />
                            <PasswordInput
                                label="New Password"
                                value={passwordData.newPassword}
                                onChange={(e) => { setPasswordData({ ...passwordData, newPassword: e.target.value }); if (errors.newPassword) setErrors({ ...errors, newPassword: '' }); }}
                                error={errors.newPassword}
                                placeholder="At least 8 characters"
                                required
                            />
                            <PasswordInput
                                label="Confirm New Password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => { setPasswordData({ ...passwordData, confirmPassword: e.target.value }); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' }); }}
                                error={errors.confirmPassword}
                                placeholder="Re-type new password"
                                required
                            />

                            <div className="pt-2">
                                <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        <strong className="text-foreground">Password requirements:</strong> Must be at least 8 characters long.
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingPassword}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                                    >
                                        <FaLock />
                                        {savingPassword ? 'Updating…' : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminSettings;
