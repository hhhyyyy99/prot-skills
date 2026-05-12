import { AppProviders } from './shell/AppProviders'
import { AppShell } from './shell/AppShell'

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  )
}
