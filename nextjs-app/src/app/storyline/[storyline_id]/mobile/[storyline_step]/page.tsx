import { notFound } from 'next/navigation';
import StoryPageController from '@/components/StoryPageController';
import { marked } from 'marked';
import { getStorylineStepDetails, getStorylineDetails } from '@/lib/storyline-utils';

// Define the props for the mobile page component
interface MobilePageProps {
  params: Promise<{
    storyline_id: string;
    storyline_step: string;
  }>;
}

function replace_substring(originalString: string, start: number = 0, end: number = 0, replacement: string) {
  if (end === 0) { end = originalString.length; }
  
  return originalString.substring(0, start) + replacement + originalString.substring(end);
}

export default async function MobileStorylineStepPage({ params }: MobilePageProps) {
  const { storyline_id, storyline_step } = await params;
  const storylineId = parseInt(storyline_id, 10);
  const storylineStep = parseInt(storyline_step, 10);

  if (isNaN(storylineId) || isNaN(storylineStep)) {
    notFound(); // Return 404 if IDs are not valid numbers
  }

  const stepDetails = await getStorylineStepDetails(storylineId, storylineStep);
  const storylineDetails = await getStorylineDetails(storylineId);

  if (!stepDetails) {
    notFound(); // Return 404 if step details are not found
  }

  // Ensure the fetched step belongs to the correct storyline
  if (stepDetails.storyline_id !== storylineId) {
     console.warn(`Mismatch: Step ${storylineStep} belongs to storyline ${stepDetails.storyline_id}, not ${storylineId}`);
     notFound();
  }

  let markdown = stepDetails.story.content.replace(/\<play-word\>/g, '').replace(/<\/play-word>/g, '');

  const storyMap = stepDetails.story.map ? JSON.parse(stepDetails.story.map): [];

  [...storyMap].reverse().forEach(({ text, startOffsetUtf32, endOffsetUtf32 }, i) => {
    markdown = replace_substring(markdown, startOffsetUtf32, endOffsetUtf32, `<span class="word-${storyMap.length - i - 1}">${text}</span>`);
  })

  // Parse story content from Markdown to HTML
  let storyHtml = await marked(markdown || '');

  storyHtml = storyHtml.replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&gt;/g, '>')

  // Extract questions from the nested structure
  const questions = stepDetails.story.story_question.map((sq: any) => sq.question);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => window.history.back()}
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold">Story {storylineStep}</h1>
                <p className="text-sm text-gray-500">Storyline {storylineId}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {storylineDetails && Object.keys(storylineDetails.progress).length > 0 && (
                <span>
                  {Object.values(storylineDetails.progress).filter(Boolean).length} / {Object.keys(storylineDetails.progress).length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {storylineDetails && (
        <div className="bg-white border-b">
          <div className="px-4 py-2">
            <div className="flex space-x-1">
              {Object.keys(storylineDetails.progress).map((stepNum) => {
                const step = parseInt(stepNum, 10);
                const isCompleted = storylineDetails.progress[step];
                const isCurrent = step === storylineStep;
                
                return (
                  <div
                    key={step}
                    className={`flex-1 h-2 rounded-full ${
                      isCompleted 
                        ? 'bg-green-500' 
                        : isCurrent 
                          ? 'bg-blue-500' 
                          : 'bg-gray-200'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        <StoryPageController
          storyHtml={storyHtml}
          storyAudio={stepDetails.story.audio}
          textMap={storyMap}
          questions={questions.slice().sort(() => Math.random() - 0.5)}
        />
      </div>

      {/* Mobile Navigation */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex justify-between items-center">
          {storylineStep > 1 && (
            <a
              href={`/storyline/${storylineId}/mobile/${storylineStep - 1}`}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Previous</span>
            </a>
          )}
          
          <div className="flex-1" />
          
          {storylineDetails && storylineStep < Object.keys(storylineDetails.progress).length && (
            <a
              href={`/storyline/${storylineId}/mobile/${storylineStep + 1}`}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="text-sm">Next</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}