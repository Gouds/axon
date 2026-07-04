import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RobotProvider } from './context/RobotContext'
import { EventBusProvider } from './context/EventBusContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Build from './pages/Build'
import Configure from './pages/Configure'
import Control from './pages/Control'
import Assets from './pages/Assets'

export default function App() {
  return (
    <RobotProvider>
      <EventBusProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dashboard"  element={<Dashboard />} />
              <Route path="build"      element={<Build />} />
              <Route path="configure"  element={<Configure />} />
              <Route path="control"    element={<Control />} />
              <Route path="assets"     element={<Assets />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </EventBusProvider>
    </RobotProvider>
  )
}
