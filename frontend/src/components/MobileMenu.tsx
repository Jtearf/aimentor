import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { NavLink } from 'react-router-dom'
import { 
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'

interface MobileMenuProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

const MobileMenu = ({ isOpen, setIsOpen }: MobileMenuProps) => {
  const { user, userData, signOut } = useAuth()
  // Navigation items - same as in Navigation.tsx
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
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-40 md:hidden" onClose={setIsOpen}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 z-40 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-gray-800 pt-5 pb-4">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </Transition.Child>
              
              <div className="flex flex-shrink-0 items-center justify-center px-4">
                <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
                <h1 className="ml-3 text-xl font-bold text-primary-600 dark:text-primary-400">
                  Billionaire Chat
                </h1>
              </div>
              
              <div className="mt-5 h-0 flex-1 overflow-y-auto px-2">
                <nav className="space-y-1 px-2">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) => 
                        `group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`
                      }
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon
                        className="mr-4 h-6 w-6 flex-shrink-0"
                        aria-hidden="true"
                      />
                      {item.name}
                    </NavLink>
                  ))}
                </nav>
                
                {/* Credits information */}
                <div className="mt-8 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg mx-2">
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
                
                {/* User profile */}
                {user && (
                  <div className="mt-4 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg mx-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
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
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {userData?.name || user.email?.split('@')[0] || 'User'}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          await signOut();
                          setIsOpen(false);
                        }}
                        className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Sign out"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
          <div className="w-14 flex-shrink-0" aria-hidden="true">
            {/* Dummy element to force sidebar to shrink to fit close icon */}
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export default MobileMenu
