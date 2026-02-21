import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Camera, Star } from 'lucide-react';
import { useProfile, useUpdateProfile } from '../api/userApi';
import '../profile.css';

export default function Profile() {
    const navigate = useNavigate();
    const { data: profile, isLoading, isError } = useProfile();
    const updateProfileMutation = useUpdateProfile();

    const [isEditing, setIsEditing] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        // Driver specific
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        licensePlate: '',
        color: ''
    });

    useEffect(() => {
        if (profile) {
            setForm(prev => ({
                ...prev,
                name: profile.name || '',
                email: profile.email || '',
                phone: profile.phone || '',
            }));
        }
    }, [profile]);

    const driverStats = {
        rating: 4.98, // Keeping stats static for now as they aren't in the base user profile
        totalTrips: 2450,
        yearsActive: 2
    };

    const handleSave = () => {
        updateProfileMutation.mutate({
            name: form.name,
            email: form.email,
            phone: form.phone
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
                    <div className="profile-avatar-wrapper">
                        <img src="https://i.pravatar.cc/200?img=11" alt="Profile" />
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
                            <div className="section-title">Driver Statistics (View Only)</div>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#f59e0b' }}>
                                        <Star fill="#f59e0b" size={24} /> {driverStats.rating}
                                    </div>
                                    <div className="stat-label">Rating</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{driverStats.totalTrips.toLocaleString()}</div>
                                    <div className="stat-label">Total Trips</div>
                                </div>
                            </div>
                        </div>

                        <div className="profile-section">
                            <div className="section-title">Vehicle Information</div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Make</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.vehicleMake}
                                        onChange={e => setForm({ ...form, vehicleMake: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Model</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.vehicleModel}
                                        onChange={e => setForm({ ...form, vehicleModel: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Year</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.vehicleYear}
                                        onChange={e => setForm({ ...form, vehicleYear: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Plate</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.licensePlate}
                                        onChange={e => setForm({ ...form, licensePlate: e.target.value })}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Color</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.color}
                                        onChange={e => setForm({ ...form, color: e.target.value })}
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
