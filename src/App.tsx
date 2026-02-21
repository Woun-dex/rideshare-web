import { Routes, Route, Navigate } from 'react-router-dom'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import RequestTrip from './pages/RequestTrip'
import TripTracking from './pages/TripTracking'
import DriverDashboard from './pages/DriverDashboard'
import DriverTracking from './pages/DriverTracking'
import DriverHistory from './pages/DriverHistory'
import Profile from './pages/Profile'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/request-trip" element={<RequestTrip />} />
      <Route path="/track/:tripId" element={<TripTracking />} />
      <Route path="/driver" element={<DriverDashboard />} />
      <Route path="/driver/track/:tripId" element={<DriverTracking />} />
      <Route path="/driver/history" element={<DriverHistory />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  )
}

export default App
