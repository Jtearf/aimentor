import { NavLink, useNavigate } from 'react-router-dom'
import { 
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'

const Navigation = () => {
  const navigate = useNavigate()
  const { user, userData, signOut } = useAuth()
  // Navigation items
  const navItems = [
    {
      name: 'Personas',
      href: '/app/personas',
      icon: UserGroupIcon
    },
    {
      name: 'Chat',
      href: '/app/chat',
      icon: ChatBubbleLeftRightIcon
    },
    {
      name: 'Pitch Analyzer',
      href: '/app/pitch-analyzer',
      icon: DocumentTextIcon
    },
    {
      name: 'Subscription',
      href: '/app/subscriptions',
      icon: CreditCardIcon
    },
    {
      name: 'Profile',
      href: '/app/profile',
      icon: UserCircleIcon
    }
  ]
  
  return (
    <nav className="hidden md:block w-64 bg-white dark:bg-gray-800 h-screen fixed left-0 top-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
      <div className="px-6 pt-8">
        <div className="flex items-center justify-center mb-8">
          <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
          <h1 className="ml-3 text-xl font-bold text-primary-600 dark:text-primary-400">
            Billionaire Chat
          </h1>
        </div>
        
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => 
                `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`
              }
            >
              <item.icon className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
      
      <div className="px-6 pt-8 mt-auto">
        {/* User Credits */}
        <div className="mb-4 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                <span className="text-sm font-medium leading-none text-primary-700 dark:text-primary-300">
                  {userData?.credits || 0}
                </span>
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Credits Left
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userData?.plan ? `${userData.plan.charAt(0).toUpperCase()}${userData.plan.slice(1)} plan` : 'Free plan'}
              </p>
            </div>
          </div>
        </div>
        
        {/* User Info & Logout */}
        {user && (
          <div className="mb-6">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {userData?.avatar_url ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={userData.avatar_url}
                      alt={userData?.name || user.email?.split('@')[0] || 'User'}
                    />
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-sm font-medium text-primary-700 dark:text-primary-300">
                      {(userData?.name || user.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="ml-2 truncate">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {userData?.name || user.email?.split('@')[0] || 'User'}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  await signOut()
                  navigate('/login')
                }}
                className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation
