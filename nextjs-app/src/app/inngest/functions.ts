import { inngest } from '@/app/inngest/client';
import { StoryGenerator } from '../../lib/story-generator';
import { ProcessedParagraph } from '../../lib/story-generator';

export const generateStory = inngest.createFunction(
  { id: 'generate-story' },
  { event: 'story/generate' },
  async ({ event, step }: { event: { data: { storylineId: number } }, step: any }) => {
    const { storylineId } = event.data;
    
    // Create an instance of StoryGenerator
    const storyGenerator = new StoryGenerator();
    
    // Fetch storyline using the new class method
    const storylineData = await step.run('fetch-storyline', async () => {
      return storyGenerator.fetchStoryline(storylineId);
    });

    // Generate content using the new class method
    const paragraphs = await step.run('generate-story-content', async () => {
      return storyGenerator.generateContent(storylineData);
    });

    // Process paragraphs using the new class method
    const paragraphPromises = [];
    for (const [index, paragraph] of paragraphs.entries()) {
      paragraphPromises.push(step.run(`process-paragraph-${index}`, async () => {
        // We need to pass the index for audio generation
        return storyGenerator.processParagraph(paragraph, storylineData, index);
      }));
    }
    const processedParagraphs: ProcessedParagraph[] = await Promise.all(paragraphPromises);

    // Save using the new class method
    await step.run('save-to-database', async () => {
      return storyGenerator.save(storylineData, processedParagraphs);
    });

    return { success: true, storylineId };
  }
);