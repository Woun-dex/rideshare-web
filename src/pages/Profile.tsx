import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Camera, User, ExternalLink } from 'lucide-react';
import { useProfile, useUpdateProfile } from '../api/userApi';
import { useGetTripHistory } from '../hooks/useTripHooks';
import '../profile.css';

export default function Profile() {
    const navigate = useNavigate();
    const { data: profile, isLoading, isError } = useProfile();
    const updateProfileMutation = useUpdateProfile();
    const { data: tripHistory } = useGetTripHistory();

    const [isEditing, setIsEditing] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        // Driver specific
        vehicleInfo: '',
        licenseNumber: ''
    });

    useEffect(() => {
        if (profile) {
            setForm(prev => ({
                ...prev,
                name: profile.name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                vehicleInfo: profile.vehicleInfo || '',
                licenseNumber: profile.licenseNumber || '',
            }));
        }
    }, [profile]);

    const handleSave = () => {
        updateProfileMutation.mutate({
            name: form.name,
            email: form.email,
            phone: form.phone,
            vehicleInfo: form.vehicleInfo,
            licenseNumber: form.licenseNumber
        }, {
            onSuccess: () => {
                setIsEditing(false);
                alert('Profile saved successfully!');
            },
            onError: () => {
                alert('Failed to save profile.');
            }
        });
    };

    if (isLoading) return <div className="profile-layout"><div className="profile-container">Loading profile...</div></div>;
    if (isError) return <div className="profile-layout"><div className="profile-container">Error loading profile.</div></div>;

    const isDriver = profile?.role === 'DRIVER';

    return (
        <div className="profile-layout">
            <div className="profile-container">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                </button>

                <div className="profile-header">
                    <div className="profile-avatar-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={80} color="white" />
                        {isEditing && (
                            <button className="edit-avatar-btn">
                                <Camera size={16} />
                            </button>
                        )}
                    </div>
                    <div className="profile-name">{form.name}</div>
                    <div className={`profile-role-badge ${isDriver ? 'driver' : 'rider'}`}>
                        {isDriver ? 'Driver Partner' : 'Rider'}
                    </div>
                </div>

                <div className="profile-section">
                    <div className="section-title">
                        Personal Information
                        {!isEditing && (
                            <button className="edit-toggle-btn" onClick={() => setIsEditing(true)}>
                                <Edit2 size={14} /> Edit
                            </button>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            disabled={!isEditing}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            disabled={!isEditing}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            disabled={!isEditing}
                        />
                    </div>
                </div>

                {isDriver && (
                    <>
                        <div className="profile-section">
                            <div className="section-title">Driver Statistics</div>
                            <div className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
                                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/driver/history')}>
                                    <div className="stat-value">{tripHistory ? tripHistory.length.toLocaleString() : '0'}</div>
                                    <div className="stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        Total Trips <ExternalLink size={12} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="profile-section">
                            <div className="section-title">Vehicle Information</div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Vehicle Info</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Toyota Camry 2021 (Black)"
                                        value={form.vehicleInfo}
                                        onChange={e => setForm({ ...form, vehicleInfo: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">License Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="ABC-1234567"
                                        value={form.licenseNumber}
                                        onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {isEditing && (
                    <button
                        className="save-btn"
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                    >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>
        </div>
    );
}
