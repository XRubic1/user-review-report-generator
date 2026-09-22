import { NavLink } from 'react-router-dom'
import { FileSpreadsheet, Users } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="navbar" aria-label="Main">
      <NavLink to="/" className="nav-link" title="Report" end>
        <FileSpreadsheet size={22} strokeWidth={1.75} />
      </NavLink>
      <NavLink to="/clients" className="nav-link" title="Clients">
        <Users size={22} strokeWidth={1.75} />
      </NavLink>
    </nav>
  )
}
