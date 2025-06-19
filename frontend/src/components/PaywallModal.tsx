import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingMessages?: number;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ 
  isOpen, 
  onClose,
  remainingMessages = 0
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/app/subscriptions');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                  Upgrade Your Account
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    {remainingMessages <= 0 ? (
                      "You've used all your free messages. Upgrade to our premium plan to continue chatting with billionaire mentors!"
                    ) : (
                      `You have ${remainingMessages} free ${remainingMessages === 1 ? 'message' : 'messages'} remaining. Upgrade now for unlimited access to all billionaire mentors!`
                    )}
                  </p>
                  
                  <div className="mt-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">Premium Benefits:</h4>
                    <ul className="mt-2 list-disc pl-5 text-sm text-gray-500 dark:text-gray-300 space-y-1">
                      <li>Unlimited conversations with all billionaire mentors</li>
                      <li>Priority access to new features and personas</li>
                      <li>Save and revisit all your past conversations</li>
                      <li>Share conversation screenshots on social media</li>
                      <li>Get detailed pitch evaluation feedback</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 sm:ml-3 sm:w-auto"
              onClick={handleUpgrade}
            >
              Upgrade Now
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={onClose}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
