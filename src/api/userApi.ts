import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

// --- Types ---
export interface RegisterRequest {
    name: string
    email: string
    phone: string
    password: string
    role: 'RIDER' | 'DRIVER'
    licence_number?: string
    vehicle_info?: string
}

export interface RegisterResponse {
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
    userId: string
    name: string
    email: string
    role: string
}

export interface UserProfile {
    id: string
    name: string
    email: string
    phone: string
    role: 'RIDER' | 'DRIVER'
    vehicleInfo?: string
    licenseNumber?: string
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
    const userId = localStorage.getItem('userId')
    const response = await apiClient.get('/api/users/me', { params: { userId } })
    return response.data
}

const updateProfile = async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const userId = localStorage.getItem('userId')
    const response = await apiClient.put('/api/users/me', data, { params: { userId } })
    return response.data
}

const getUserById = async (id: string): Promise<UserProfile> => {
    const response = await apiClient.get(`/api/users/${id}`)
    const raw = response.data
    return {
        id: raw.userId || raw.id || id,
        name: raw.name,
        email: raw.email,
        phone: raw.phone || '+1 (555) 123-4567',
        role: raw.role,
        vehicleInfo: raw.vehicleInfo || 'Toyota Camry (Blue)',
        licenseNumber: raw.licenseNumber || 'NYC-7829',
    }
}

const deleteProfile = async (): Promise<void> => {
    const userId = localStorage.getItem('userId')
    await apiClient.delete('/api/users/me', { params: { userId } })
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
            localStorage.setItem('userId', data.userId)
            localStorage.setItem('userRole', data.role)
        }
    })
}

export const useProfile = () => {
    return useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        retry: false,
    })
}

export const useUserById = (id: string, enabled = true) => {
    return useQuery({
        queryKey: ['user', id],
        queryFn: () => getUserById(id),
        enabled: !!id && enabled,
        staleTime: 60_000, 
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
            localStorage.removeItem('userId')
            localStorage.removeItem('userRole')
        }
    })
}
