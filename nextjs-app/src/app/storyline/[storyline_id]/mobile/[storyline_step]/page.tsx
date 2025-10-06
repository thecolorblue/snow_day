import { notFound } from 'next/navigation';
import StoryPageController from '@/components/StoryPageController';
import BackButton from '@/components/BackButton';
import { marked } from 'marked';
import { getStorylineStepDetails, getStorylineDetails } from '@/lib/storyline-utils';
import { QuestionsProvider } from '@/components/QuestionsContext';
import StoryContentWrapper from '@/components/StoryContentWrapper';
import StorylineNavigationButtons from '@/components/StorylineNavigationButtons';
import OpenReplayWrapper from '@/lib/OpenReplayWrapper';

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

  const storyMap = stepDetails.story.map ? JSON.parse(stepDetails.story.map): [];
  console.log(`step questions:`, JSON.stringify(stepDetails.story.story_question, null, 4));
  const questions = stepDetails.story.story_question.map((sq) => sq.question);

  // Ensure the fetched step belongs to the correct storyline
  if (stepDetails.storyline_id !== storylineId) {
     console.warn(`Mismatch: Step ${storylineStep} belongs to storyline ${stepDetails.storyline_id}, not ${storylineId}`);
     notFound();
  }

  return (
    <OpenReplayWrapper
      storylineId={storylineId}
      storylineStep={storylineStep}>
    <QuestionsProvider>
      <div className="story-page min-h-screen bg-white">
      {/* Mobile Header */}
      <div className="bg-white">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BackButton />
              <div>
                <h1 className="text-lg font-semibold">Story {storylineStep}</h1>
                <p className="text-sm text-white">Storyline {storylineId}</p>
              </div>
            </div>
            <div className="text-sm text-white">
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
        <div className="bg-white">
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
          storyHtml={stepDetails.story.content}
          storyAudio={stepDetails.story.audio}
          storyMap={storyMap}
          questions={questions.slice().sort(() => Math.random() - 0.5)}
        />
      </div>

      {/* Mobile Navigation */}
      {storylineDetails && <StorylineNavigationButtons
        storylineId={storylineId}
        studentId={storylineDetails.studentId}
        stepDetails={stepDetails}
        storylineDetails={storylineDetails}
      />}
      </div>
    </QuestionsProvider></OpenReplayWrapper>
  );
}