import { useState } from 'react'
import toast from 'react-hot-toast'

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  credits: number
  features: string[]
  isPopular?: boolean
}

const Subscriptions = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  
  // Mock subscription plans
  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      credits: 5,
      features: [
        '5 messages per month',
        'Access to all personas',
        'Basic pitch analysis',
      ]
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      credits: 50,
      features: [
        '50 messages per month',
        'Access to all personas',
        'Detailed pitch analysis',
        'Save & export conversations',
      ],
      isPopular: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 19.99,
      credits: 150,
      features: [
        'Unlimited messages',
        'Access to all personas',
        'Advanced pitch analysis',
        'Save & export conversations',
        'Priority support',
      ]
    }
  ]
  
  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId)
    setIsProcessing(true)
    
    // Simulate API call
    setTimeout(() => {
      // This would usually redirect to payment provider
      toast.success('Redirecting to payment gateway...')
      window.open('https://paystack.com', '_blank')
      setIsProcessing(false)
    }, 1500)
  }
  
  const currentPlan = 'free' // This would come from user state in a real app
  
  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Plans</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Upgrade your plan to get more credits and advanced features
        </p>
      </div>
      
      {/* Current subscription status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Your Current Subscription</h2>
        <div className="flex items-center">
          <div className="mr-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
              <span className="text-xl font-medium leading-none text-primary-700 dark:text-primary-300">5</span>
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Credits Remaining</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Free Plan • Renews on July 18, 2025</p>
          </div>
          <div className="ml-auto">
            <button className="text-sm text-primary-600 hover:text-primary-500 mr-4">
              Purchase Credits
            </button>
          </div>
        </div>
      </div>
      
      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden relative ${
              plan.isPopular ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs font-bold py-1 px-3 rounded-bl-lg">
                MOST POPULAR
              </div>
            )}
            
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h2>
              <div className="mt-4 flex items-baseline">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                <span className="ml-1 text-gray-500 dark:text-gray-400">/month</span>
              </div>
              
              <p className="mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium">
                {plan.credits} credits per month
              </p>
              
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8">
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isProcessing || plan.id === currentPlan}
                  className={`w-full btn ${
                    plan.id === currentPlan
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed'
                      : plan.isPopular 
                        ? 'btn-primary' 
                        : 'btn-outline'
                  }`}
                >
                  {isProcessing && selectedPlan === plan.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : plan.id === currentPlan ? (
                    'Current Plan'
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Payment history */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">Payment History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plan
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  June 18, 2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  $0.00
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  Free Plan
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400">
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Subscriptions
