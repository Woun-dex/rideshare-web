import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'

const signInSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})

type SignInData = z.infer<typeof signInSchema>

export default function SignIn() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInData>({
        resolver: zodResolver(signInSchema),
    })

    const onSubmit = async (data: SignInData) => {
        // TODO: integrate with API
        console.log('Sign in:', data)
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
