import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLoginUser } from '../api/userApi'

const signInSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})

type SignInData = z.infer<typeof signInSchema>

export default function SignIn() {
    const navigate = useNavigate()
    const { mutateAsync: login } = useLoginUser()
    const [loginError, setLoginError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInData>({
        resolver: zodResolver(signInSchema),
    })

    const onSubmit = async (data: SignInData) => {
        try {
            setLoginError(null)
            const response = await login(data)

            const userRole = response.role

            if (userRole === 'DRIVER') {
                navigate('/driver')
            } else {
                navigate('/request-trip')
            }
        } catch (error: any) {
            setLoginError(error.response?.data?.message || 'Failed to sign in. Please check your credentials.')
            console.error('Sign in error:', error)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Brand */}
                <div className="auth-brand">
                    <div className="auth-brand-icon">🚗</div>
                    <h1>Welcome Back</h1>
                    <p>Sign in to your RideShare account</p>
                </div>

                {loginError && (
                    <div className="auth-error-message" style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
                        {loginError}
                    </div>
                )}

                {/* Form */}
                <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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

                    <a href="#" className="forgot-link">Forgot password?</a>

                    <button type="submit" className="auth-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                {/* Footer */}
                <div className="auth-footer">
                    Don't have an account? <Link to="/signup">Sign Up</Link>
                </div>
            </div>
        </div>
    )
}
