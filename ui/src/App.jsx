import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RobotProvider } from './context/RobotContext'
import { EventBusProvider } from './context/EventBusContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Build from './pages/Build'
import Control from './pages/Control'
import Assets from './pages/Assets'
import Profiles from './pages/Profiles'

export default function App() {
  return (
    <RobotProvider>
      <ThemeProvider>
        <EventBusProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index             element={<Dashboard />} />
                <Route path="build"      element={<Build />} />
                <Route path="configure"  element={<Navigate to="/build" replace />} />
                <Route path="control"    element={<Control />} />
                <Route path="assets"     element={<Assets />} />
                <Route path="profiles"   element={<Profiles />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </EventBusProvider>
      </ThemeProvider>
    </RobotProvider>
  )
}
