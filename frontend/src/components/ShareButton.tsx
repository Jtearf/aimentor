import { useState } from 'react';
import html2canvas from 'html2canvas';
import { ShareIcon } from '@heroicons/react/24/outline';

interface ShareButtonProps {
  elementId: string;
  fileName?: string;
  title?: string;
  text?: string;
}

const ShareButton = ({ 
  elementId, 
  fileName = 'billionaire-chat-conversation.png',
  title = 'My Billionaire Chat Conversation',
  text = 'Check out my conversation with a billionaire mentor!'
}: ShareButtonProps) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID "${elementId}" not found`);
      }

      // Generate screenshot using html2canvas
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        useCORS: true,
        scale: 2,
        logging: false
      });
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => 
        canvas.toBlob(
          (blob) => resolve(blob as Blob),
          'image/png', 
          0.85
        )
      );
      
      // Check if Web Share API is available
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        const shareData = {
          title,
          text,
          files: [file]
        };
        
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          // Fallback for devices that support sharing but not files
          await navigator.share({ title, text });
          // Also offer download as fallback
          downloadImage(canvas, fileName);
        }
      } else {
        // Fallback for browsers without Web Share API
        downloadImage(canvas, fileName);
      }
      
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };
  
  const downloadImage = (canvas: HTMLCanvasElement, fileName: string) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  
  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className="flex items-center gap-1 text-primary-600 hover:text-primary-500 text-sm font-medium rounded-md px-2 py-1 hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors"
      title="Share conversation"
    >
      {isSharing ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Sharing...
        </span>
      ) : (
        <>
          <ShareIcon className="h-4 w-4" />
          Share
        </>
      )}
    </button>
  );
};

export default ShareButton;
