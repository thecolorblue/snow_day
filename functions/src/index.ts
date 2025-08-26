import { HttpFunction, Request, Response } from '@google-cloud/functions-framework';
import { StoryGenerator, ProcessedParagraph } from './story-generator';

export const generateStory: HttpFunction = async (req: Request, res: Response) => {
  const { storyline_id } = req.body;

  if (!storyline_id || !parseInt(storyline_id)) {
    res.status(400).send('Missing storyline_id');
    return;
  }

  const storyGenerator = new StoryGenerator();

  try {
    const storylineData = await storyGenerator.fetchStoryline(parseInt(storyline_id));
    const paragraphs = await storyGenerator.generateContent(storylineData);

    const paragraphPromises = paragraphs.map((paragraph, index) =>
      storyGenerator.processParagraph(paragraph, storylineData, index)
    );

    const processedParagraphs: ProcessedParagraph[] = await Promise.all(paragraphPromises);

    await storyGenerator.save(storylineData, processedParagraphs);

    res.status(200).send({ success: true, storylineId: storyline_id });
  } catch (error: any) {
    console.error(error);
    res.status(500).send({ success: false, error: error.message });
  }
};