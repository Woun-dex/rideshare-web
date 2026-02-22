import axios from 'axios'

// Define the base URL for the API
// In a real application, this would likely come from import.meta.env.VITE_API_URL
const API_BASE_URL = 'http://localhost:8090' // Using default spring boot port as placeholder

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Optional: Add request/response interceptors here (e.g., to attach auth tokens)
apiClient.interceptors.request.use((config) => {
    // No JWT for MVP — userId passed as query param per request
    return config
})

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle global errors here
        if (error.response?.status === 401) {
            // e.g. redirect to login
        }
        return Promise.reject(error)
    }
)
