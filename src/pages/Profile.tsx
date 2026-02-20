import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Camera, Star } from 'lucide-react';
import '../profile.css';

export default function Profile() {
    const navigate = useNavigate();

    // Mock initial user state
    const [isDriver, setIsDriver] = useState(false); // Toggle for demo purposes
    const [isEditing, setIsEditing] = useState(false);

    const [form, setForm] = useState({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        // Driver specific
        vehicleMake: 'Tesla',
        vehicleModel: 'Model 3',
        vehicleYear: '2022',
        licensePlate: '7YJR842',
        color: 'Midnight Silver'
    });

    const driverStats = {
        rating: 4.98,
        totalTrips: 2450,
        yearsActive: 2
    };

    const handleSave = () => {
        // Here you would make an API call to PUT /api/users/profile or similar
        setIsEditing(false);
        alert('Profile saved successfully!');
    };

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
                    <div className="profile-name">{form.firstName} {form.lastName}</div>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">First Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={form.firstName}
                                onChange={e => setForm({ ...form, firstName: e.target.value })}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={form.lastName}
                                onChange={e => setForm({ ...form, lastName: e.target.value })}
                                disabled={!isEditing}
                            />
                        </div>
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
                    <button className="save-btn" onClick={handleSave}>
                        Save Changes
                    </button>
                )}

                {/* For Demonstration ONLY - toggle user role view */}
                <div className="role-toggle">
                    Demo: Viewing as {isDriver ? 'Driver' : 'Rider'}.
                    <button onClick={() => setIsDriver(!isDriver)}>
                        Switch to {isDriver ? 'Rider' : 'Driver'} view
                    </button>
                </div>
            </div>
        </div>
    );
}
