import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { DiscoveryPage } from './pages/DiscoveryPage'
import { MySkillsPage } from './pages/MySkillsPage'
import { ToolsPage } from './pages/ToolsPage'
import { MigratePage } from './pages/MigratePage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const [activePage, setActivePage] = useState('discovery')

  const renderPage = () => {
    switch (activePage) {
      case 'discovery':
        return <DiscoveryPage />
      case 'my-skills':
        return <MySkillsPage />
      case 'tools':
        return <ToolsPage />
      case 'migrate':
        return <MigratePage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DiscoveryPage />
    }
  }

  return (
    <div className="h-screen flex">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <main className="flex-1 overflow-auto bg-gray-50">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
