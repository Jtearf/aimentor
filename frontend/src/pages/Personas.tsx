import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface Persona {
  id: string
  name: string
  title: string
  description: string
  image_url: string
  expertise: string[]
  created_at: string
}

const Personas = () => {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        // In a real implementation, this would fetch from your API
        // For development, we'll use mock data
        const mockPersonas: Persona[] = [
          {
            id: '1',
            name: 'Elon Musk',
            title: 'Tech Visionary & Entrepreneur',
            description: 'Advice on technology, innovation, and scaling businesses to global markets.',
            image_url: '/personas/elon.jpg',
            expertise: ['Technology', 'Innovation', 'Electric Vehicles', 'Space Technology'],
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Oprah Winfrey',
            title: 'Media Mogul & Philanthropist',
            description: 'Guidance on building a personal brand, media strategy, and meaningful impact.',
            image_url: '/personas/oprah.jpg',
            expertise: ['Media', 'Personal Branding', 'Philanthropy', 'Public Speaking'],
            created_at: new Date().toISOString()
          },
          {
            id: '3',
            name: 'Jeff Bezos',
            title: 'E-commerce Pioneer & Investor',
            description: 'Insights on customer obsession, scalable systems, and long-term thinking.',
            image_url: '/personas/jeff.jpg',
            expertise: ['E-commerce', 'Customer Experience', 'Logistics', 'Leadership'],
            created_at: new Date().toISOString()
          },
          {
            id: '4',
            name: 'Sara Blakely',
            title: 'Spanx Founder & Self-made Billionaire',
            description: 'Advice on product innovation, bootstrapping, and women-led entrepreneurship.',
            image_url: '/personas/sara.jpg',
            expertise: ['Product Innovation', 'Retail', 'Bootstrapping', 'Female Entrepreneurship'],
            created_at: new Date().toISOString()
          },
          {
            id: '5',
            name: 'Richard Branson',
            title: 'Serial Entrepreneur & Adventurer',
            description: 'Guidance on disruptive thinking, company culture, and bold business moves.',
            image_url: '/personas/richard.jpg',
            expertise: ['Branding', 'Airlines', 'Music Industry', 'Leadership', 'Adventure'],
            created_at: new Date().toISOString()
          }
        ]
        
        setPersonas(mockPersonas)
      } catch (error) {
        console.error('Error fetching personas:', error)
        toast.error('Failed to load mentors. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPersonas()
  }, [])
  
  const handleSelectPersona = (persona: Persona) => {
    // Store the selected persona in localStorage (in a real app you might use state management)
    localStorage.setItem('selectedPersona', JSON.stringify(persona))
    navigate('/app/chat')
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }
  
  return (
    <div className="px-2 sm:px-4 md:px-6">
      <div className="text-center mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Choose Your Mentor</h1>
        <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300">
          Select a billionaire mentor and start chatting to get personalized advice for your business
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <div 
            key={persona.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 card transform hover:-translate-y-1"
            onClick={() => handleSelectPersona(persona)}
          >
            <div className="h-36 sm:h-48 overflow-hidden relative">
              <div 
                className="absolute inset-0 bg-center bg-cover"
                style={{ 
                  backgroundImage: `url(${persona.image_url})`,
                  backgroundPosition: 'center top',
                }}
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 p-3 sm:p-4 text-white">
                <h3 className="font-bold text-lg sm:text-xl">{persona.name}</h3>
                <p className="text-xs sm:text-sm opacity-90">{persona.title}</p>
              </div>
            </div>
            
            <div className="p-3 sm:p-5">
              <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-3">
                {persona.description}
              </p>
              
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Expertise
                </h4>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {persona.expertise.slice(0, 4).map((skill) => (
                    <span 
                      key={skill} 
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300"
                    >
                      {skill}
                    </span>
                  ))}
                  {persona.expertise.length > 4 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      +{persona.expertise.length - 4}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-4 sm:mt-5 flex justify-center">
                <button 
                  className="btn btn-primary w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectPersona(persona)
                  }}
                >
                  Chat with {persona.name.split(' ')[0]}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Personas
