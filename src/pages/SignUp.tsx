import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useRegisterUser } from '../api/userApi'

const signUpSchema = z
    .object({
        fullName: z.string().min(1, 'Full name is required'),
        email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
        phone: z.string().min(5, 'Phone number is required'),
        role: z.enum(['RIDER', 'DRIVER'], {
            message: 'Please select a role'
        }),
        password: z
            .string()
            .min(1, 'Password is required')
            .min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Confirm your password'),
        licenseNumber: z.string().optional(),
        vehicleInfo: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    })
    .superRefine((data, ctx) => {
        if (data.role === 'DRIVER') {
            if (!data.licenseNumber) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'License number is required', path: ['licenseNumber'] })
            }
            if (!data.vehicleInfo) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vehicle information is required', path: ['vehicleInfo'] })
            }
        }
    })

type SignUpData = z.infer<typeof signUpSchema>

export default function SignUp() {
    const navigate = useNavigate()
    const { mutate: registerUser, isPending: isRegistering, error: registerError } = useRegisterUser()
    const [step, setStep] = useState<1 | 2>(1)

    const {
        register,
        handleSubmit,
        trigger,
        getValues,
        watch,
        formState: { errors },
    } = useForm<SignUpData>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            // Unset so user is forced to pick
            role: undefined,
        },
    })

    const handleNext = async () => {
        // Run validation only on Step 1 fields before transitioning
        const isValid = await trigger(['fullName', 'email', 'phone', 'role', 'password', 'confirmPassword'])
        if (isValid) {
            const selectedRole = getValues('role')
            if (selectedRole === 'DRIVER') {
                setStep(2)
            } else {
                // For riders, we can just submit the form since step 2 is not needed.
                handleSubmit(onSubmit)()
            }
        }
    }

    const onSubmit = (data: SignUpData) => {
        registerUser(
            {
                name: data.fullName,
                email: data.email,
                phone: data.phone,
                password: data.password,
                role: data.role,
                licence_number: data.licenseNumber,
                vehicle_info: data.vehicleInfo,
            },
            {
                onSuccess: () => {
                    // Navigate to signin on success
                    navigate('/signin')
                },
                onError: (err) => {
                    console.error("Registration failed: ", err)
                }
            }
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Brand */}
                <div className="auth-brand">
                    <div className="auth-brand-icon">🚗</div>
                    <h1>Create Account</h1>
                    <p>Join RideShare today</p>
                </div>

                {/* Form */}
                <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    {step === 1 && (
                        <>
                            {/* Full Name */}
                            <div className="field-group">
                                <label htmlFor="fullName">Full Name</label>
                                <input
                                    id="fullName"
                                    type="text"
                                    placeholder="John Doe"
                                    className={errors.fullName ? 'input-error' : ''}
                                    {...register('fullName')}
                                />
                                {errors.fullName && <span className="field-error">{errors.fullName.message}</span>}
                            </div>

                            {/* Email */}
                            <div className="field-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    className={errors.email ? 'input-error' : ''}
                                    {...register('email')}
                                />
                                {errors.email && <span className="field-error">{errors.email.message}</span>}
                            </div>

                            {/* Phone Number */}
                            <div className="field-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    placeholder="+1 234 567 890"
                                    className={errors.phone ? 'input-error' : ''}
                                    {...register('phone')}
                                />
                                {errors.phone && <span className="field-error">{errors.phone.message}</span>}
                            </div>

                            {/* Role Selector */}
                            <div className="role-selector">
                                <span>I am a</span>
                                <div className="role-options">
                                    <div className="role-option">
                                        <input type="radio" id="role-rider" value="RIDER" {...register('role')} />
                                        <label htmlFor="role-rider">
                                            <span className="role-icon">🧑‍💼</span>
                                            Rider
                                        </label>
                                    </div>
                                    <div className="role-option">
                                        <input type="radio" id="role-driver" value="DRIVER" {...register('role')} />
                                        <label htmlFor="role-driver">
                                            <span className="role-icon">🚘</span>
                                            Driver
                                        </label>
                                    </div>
                                </div>
                                {errors.role && <span className="field-error">{errors.role.message}</span>}
                            </div>

                            {/* Password */}
                            <div className="field-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className={errors.password ? 'input-error' : ''}
                                    {...register('password')}
                                />
                                {errors.password && <span className="field-error">{errors.password.message}</span>}
                            </div>

                            {/* Confirm Password */}
                            <div className="field-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    className={errors.confirmPassword ? 'input-error' : ''}
                                    {...register('confirmPassword')}
                                />
                                {errors.confirmPassword && (
                                    <span className="field-error">{errors.confirmPassword.message}</span>
                                )}
                            </div>

                            <button type="button" className="auth-btn" onClick={handleNext} disabled={isRegistering}>
                                {isRegistering ? 'Registering...' : watch('role') === 'DRIVER' ? 'Continue' : 'Create Account'}
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="step-back" style={{ marginBottom: '1rem' }}>
                                <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#ebb305', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}>
                                    ← Back to basic info
                                </button>
                            </div>

                            <div className="field-group">
                                <label htmlFor="licenseNumber">Driver's License Number</label>
                                <input
                                    id="licenseNumber"
                                    type="text"
                                    placeholder="ABC-1234567"
                                    className={errors.licenseNumber ? 'input-error' : ''}
                                    {...register('licenseNumber')}
                                />
                                {errors.licenseNumber && <span className="field-error">{errors.licenseNumber.message}</span>}
                            </div>

                            <div className="field-group">
                                <label htmlFor="vehicleInfo">Vehicle Information</label>
                                <input
                                    id="vehicleInfo"
                                    type="text"
                                    placeholder="Toyota Camry 2021 (Black)"
                                    className={errors.vehicleInfo ? 'input-error' : ''}
                                    {...register('vehicleInfo')}
                                />
                                {errors.vehicleInfo && <span className="field-error">{errors.vehicleInfo.message}</span>}
                            </div>

                            <button type="submit" className="auth-btn" disabled={isRegistering}>
                                {isRegistering ? 'Creating driver account…' : 'Complete Registration'}
                            </button>
                        </>
                    )}

                    {registerError && (
                        <div className="field-error" style={{ marginTop: '1rem', textAlign: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
                            {(registerError as any).response?.data?.message || 'Registration failed. Please try again.'}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="auth-footer">
                    Already have an account? <Link to="/signin">Sign In</Link>
                </div>
            </div>
        </div>
    )
}
