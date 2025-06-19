import { useState } from 'react'
import toast from 'react-hot-toast'

interface PitchEvaluation {
  id: string
  persona_name: string
  persona_image: string
  score: number
  feedback: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  created_at: string
}

const PitchAnalyzer = () => {
  const [pitchText, setPitchText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [evaluations, setEvaluations] = useState<PitchEvaluation[]>([])
  const [showResults, setShowResults] = useState(false)
  const maxChars = 2000
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (pitchText.trim().length < 100) {
      toast.error('Please enter a more detailed pitch (at least 100 characters)')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // In a real implementation, this would call your API endpoint
      // For development, we'll use mock data after a delay
      setTimeout(() => {
        const mockEvaluations: PitchEvaluation[] = [
          {
            id: '1',
            persona_name: 'Elon Musk',
            persona_image: '/personas/elon.jpg',
            score: 7.5,
            feedback: "Your pitch shows promise with some innovative thinking, but I'm not seeing enough focus on scalability and differentiation. Tech ventures need a clear 10x improvement over existing solutions to truly disrupt a market. The market analysis is solid, but your execution strategy lacks specific technical milestones and talent acquisition plans. Keep iterating on the core value proposition until it's undeniably compelling.",
            strengths: [
              'Clear problem statement',
              'Market size and opportunity well defined',
              'Initial monetization strategy identified'
            ],
            weaknesses: [
              'Value proposition not differentiated enough',
              'Technical feasibility concerns',
              'Timeline appears overly optimistic'
            ],
            suggestions: [
              'Develop a more concrete technical roadmap',
              'Clarify your unique technological advantage',
              'Consider a more aggressive go-to-market strategy'
            ],
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            persona_name: 'Oprah Winfrey',
            persona_image: '/personas/oprah.jpg',
            score: 8.0,
            feedback: "I appreciate the passion behind your vision and how you've identified a real need in the market. Your storytelling approach is effective, but I'm curious about how you plan to build a community around your product. The most successful ventures connect with people on an emotional level and create a sense of belonging. Think about how your brand voice will resonate with your target audience and the values you want to embody.",
            strengths: [
              'Authentic founder story and motivation',
              'Strong emotional appeal to target audience',
              'Clear vision for positive impact'
            ],
            weaknesses: [
              'Brand identity needs refinement',
              'Community building strategy is vague',
              'Marketing budget seems insufficient'
            ],
            suggestions: [
              'Develop a comprehensive brand story',
              'Consider partnerships with aligned influencers',
              'Create a community engagement roadmap'
            ],
            created_at: new Date().toISOString()
          },
          {
            id: '3',
            persona_name: 'Jeff Bezos',
            persona_image: '/personas/jeff.jpg',
            score: 8.5,
            feedback: "Your pitch demonstrates good customer focus, which is essential. I see potential in your business model, but I'm concerned about your long-term competitive advantage and operational efficiency. The best businesses are built for durability and can withstand competitive pressures. Think more about how you'll achieve operational excellence and maintain low costs while delivering exceptional customer value. Remember, it's Day 1.",
            strengths: [
              'Customer-centric approach',
              'Scalable business model',
              'Reasonable unit economics'
            ],
            weaknesses: [
              'Insufficient focus on operational efficiency',
              'Long-term competitive moat not clearly defined',
              'Customer acquisition costs need more analysis'
            ],
            suggestions: [
              'Develop more detailed operational metrics',
              'Create a long-term competitive advantage strategy',
              'Consider how to reduce friction in customer experience'
            ],
            created_at: new Date().toISOString()
          }
        ]
        
        setEvaluations(mockEvaluations)
        setShowResults(true)
        setIsSubmitting(false)
      }, 3000)
    } catch (error) {
      console.error('Error submitting pitch:', error)
      toast.error('Failed to analyze pitch. Please try again.')
      setIsSubmitting(false)
    }
  }
  
  const resetAnalysis = () => {
    setShowResults(false)
    setPitchText('')
    setEvaluations([])
  }
  
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pitch Analyzer</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Get feedback on your startup pitch from multiple billionaire personas
        </p>
      </div>
      
      {!showResults ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="pitch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your pitch
                </label>
                <textarea
                  id="pitch"
                  rows={10}
                  value={pitchText}
                  onChange={(e) => setPitchText(e.target.value.slice(0, maxChars))}
                  placeholder="Describe your startup idea, business model, target market, and what makes your solution unique..."
                  className="w-full rounded-md border-gray-300 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600"
                  disabled={isSubmitting}
                ></textarea>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {pitchText.length}/{maxChars} characters
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  This will use 3 credits
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || pitchText.trim().length < 100}
                  className="btn btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Pitch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analysis Results</h2>
              <button 
                onClick={resetAnalysis}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Analyze Another Pitch
              </button>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Your Pitch</h3>
              <p className="text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm">
                {pitchText}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Overall Rating</h3>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                  const averageScore = evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length
                  return (
                    <div
                      key={rating}
                      className={`h-2 w-8 rounded-sm ${
                        rating <= Math.round(averageScore)
                          ? 'bg-primary-500'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    ></div>
                  )
                })}
                <span className="ml-2 text-xl font-bold">
                  {(evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length).toFixed(1)}/10
                </span>
              </div>
            </div>
          </div>
          
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="flex items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="h-12 w-12 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${evaluation.persona_image})` }}></div>
                <div className="ml-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">{evaluation.persona_name}</h3>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Score: </span>
                    <span className="ml-1 text-sm font-medium">{evaluation.score}/10</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Feedback</h4>
                  <p className="text-gray-800 dark:text-gray-200">{evaluation.feedback}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Strengths</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {evaluation.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-gray-800 dark:text-gray-200">{strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Areas to Improve</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {evaluation.weaknesses.map((weakness, index) => (
                        <li key={index} className="text-sm text-gray-800 dark:text-gray-200">{weakness}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Suggestions</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {evaluation.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-800 dark:text-gray-200">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PitchAnalyzer
