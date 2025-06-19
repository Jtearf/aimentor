import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

interface ProfileFormData {
  name: string
  email: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface ConversationHistory {
  id: string
  persona_name: string
  persona_image: string
  last_message: string
  message_count: number
  created_at: string
}

const Profile = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'conversations' | 'settings'>('profile')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const { register, handleSubmit, formState: { errors }, watch } = useForm<ProfileFormData>({
    defaultValues: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })
  
  // Mock conversation history data
  const conversationHistory: ConversationHistory[] = [
    {
      id: '1',
      persona_name: 'Elon Musk',
      persona_image: '/personas/elon.jpg',
      last_message: 'Focus on product innovation above all else. The market will follow quality.',
      message_count: 12,
      created_at: '2025-05-25T14:30:00Z'
    },
    {
      id: '2',
      persona_name: 'Sara Blakely',
      persona_image: '/personas/sara.jpg',
      last_message: 'Don\'t be afraid to fail. That\'s how you grow and learn what works.',
      message_count: 8,
      created_at: '2025-06-10T09:15:00Z'
    }
  ]
  
  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsUpdating(true)
    
    try {
      // In a real implementation, this would call your API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    
    try {
      // In a real implementation, this would call your API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Account deleted successfully. Redirecting...')
      setTimeout(() => {
        localStorage.removeItem('supabase.auth.token')
        window.location.href = '/'
      }, 1500)
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account. Please try again.')
      setIsDeletingAccount(false)
    }
  }
  
  const handleDeleteConversation = (conversationId: string) => {
    toast.success('Conversation deleted')
  }
  
  const handleViewConversation = (conversationId: string) => {
    // In a real implementation, this would navigate to the conversation
    toast.success('Viewing conversation')
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px" aria-label="Tabs">
          {(['profile', 'conversations', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="p-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit(onSubmitProfile)}>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Profile</h2>
                
                {/* Profile Avatar */}
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xl font-bold text-primary-600 dark:text-primary-400">
                    JD
                  </div>
                  <div className="ml-4">
                    <button type="button" className="text-sm text-primary-600 hover:text-primary-500">
                      Change avatar
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      className="input"
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                  
                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="input"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      className="input"
                      {...register('currentPassword')}
                    />
                  </div>
                  
                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      className="input"
                      {...register('newPassword', {
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters'
                        }
                      })}
                    />
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                    )}
                  </div>
                  
                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="input"
                      {...register('confirmPassword', {
                        validate: (value) => 
                          !watch('newPassword') || value === watch('newPassword') || 'Passwords do not match'
                      })}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-primary px-8"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        )}
        
        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Conversation History</h2>
            
            {conversationHistory.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {conversationHistory.map((conversation) => (
                  <div key={conversation.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start">
                      <div className="h-10 w-10 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${conversation.persona_image})` }}></div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {conversation.persona_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(conversation.created_at)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {conversation.last_message}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {conversation.message_count} messages
                          </p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDeleteConversation(conversation.id)}
                              className="text-xs text-red-600 hover:text-red-500"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => handleViewConversation(conversation.id)}
                              className="text-xs text-primary-600 hover:text-primary-500"
                            >
                              View Conversation
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">You haven't had any conversations yet.</p>
              </div>
            )}
          </div>
        )}
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Settings</h2>
            
            <div className="space-y-8">
              {/* Notification Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="email_notifications"
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="email_notifications" className="font-medium text-gray-700 dark:text-gray-300">
                        Email notifications
                      </label>
                      <p className="text-gray-500 dark:text-gray-400">
                        Receive emails about your account activity and new features.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="marketing_emails"
                        type="checkbox"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="marketing_emails" className="font-medium text-gray-700 dark:text-gray-300">
                        Marketing emails
                      </label>
                      <p className="text-gray-500 dark:text-gray-400">
                        Receive emails about promotions, new features, and updates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Theme Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Appearance</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Theme
                    </label>
                    <select
                      id="theme"
                      className="input"
                      defaultValue="system"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Delete Account */}
              <div>
                <h3 className="text-lg font-medium text-red-600 mb-3">Danger Zone</h3>
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-400">Delete account</h4>
                      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <div className="ml-4">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="inline-flex items-center px-3 py-1.5 border border-red-600 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 dark:bg-transparent dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20"
                      >
                        {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                className="btn btn-primary px-8"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
