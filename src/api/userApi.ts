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
    const userId = localStorage.getItem('userId')
    const response = await apiClient.get('/api/users/me', { params: { userId } })
    return response.data
}

const updateProfile = async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const userId = localStorage.getItem('userId')
    const response = await apiClient.put('/api/users/me', data, { params: { userId } })
    return response.data
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
            localStorage.removeItem('userId')
            localStorage.removeItem('userRole')
        }
    })
}
