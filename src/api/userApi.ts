import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

// --- Types ---
export interface RegisterRequest {
    name: string
    email: string
    phone: string
    password: string
    role: 'RIDER' | 'DRIVER'
    // Driver specific fields
    licence_number?: string
    vehicle_info?: string
}

export interface RegisterResponse {
    // Assuming the backend returns some info, adjust as needed
    id: string
    name: string
    email: string
    role: string
    token?: string
}

export interface LoginRequest {
    email: string
    password: string
}

export interface LoginResponse {
    token: string
    user: UserProfile
}

export interface UserProfile {
    id: string
    name: string
    email: string
    phone: string
    role: 'RIDER' | 'DRIVER'
    // other fields depending on the role
}

// --- API Functions ---
const registerUser = async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post('/api/users/register', data)
    return response.data
}

const loginUser = async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/api/auth/login', data)
    return response.data
}

const getProfile = async (): Promise<UserProfile> => {
    const response = await apiClient.get('/api/users/me')
    return response.data
}

const updateProfile = async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await apiClient.put('/api/users/me', data)
    return response.data
}

const deleteProfile = async (): Promise<void> => {
    await apiClient.delete('/api/users/me')
}

// --- Hooks ---

export const useRegisterUser = () => {
    return useMutation({
        mutationFn: registerUser,
    })
}

export const useLoginUser = () => {
    return useMutation({
        mutationFn: loginUser,
        onSuccess: (data) => {
            if (data.token) {
                localStorage.setItem('token', data.token)
            }
        }
    })
}

export const useProfile = () => {
    return useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        // Optional: don't retry if it fails due to 401 Unauthorized
        retry: false,
    })
}

export const useUpdateProfile = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        }
    })
}

export const useDeleteProfile = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteProfile,
        onSuccess: () => {
            queryClient.clear() // Clear cache
            localStorage.removeItem('token') // Clean up token
        }
    })
}
