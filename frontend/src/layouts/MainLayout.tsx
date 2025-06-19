import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Navigation from '../components/Navigation'
import MobileMenu from '../components/MobileMenu'

const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu button */}
      <div className="fixed top-4 right-4 z-50 md:hidden">
        <button
          className="p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </div>
      
      {/* Mobile menu */}
      <MobileMenu isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      
      <div className="flex">
        {/* Sidebar navigation */}
        <Navigation />
        
        {/* Main content */}
        <div className="flex-1 p-4 md:p-8 md:ml-64">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainLayout
