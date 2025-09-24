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
    const firstChapter = await storyGenerator.chapterGenerator(storylineData)
      .then((paragraph: string | null) => storyGenerator.processParagraph(paragraph || '', storylineData, 0));

    console.info(`Chapter 1 completed`);
    res.write(`Chapter 1 completed`);

    storyGenerator.save(storylineData, [firstChapter])
        .then(async () => {
          let nextChapter;
          let previousChapter = firstChapter.content;
          let processedChapter;
          let index = 1;
          while(nextChapter = await storyGenerator.chapterGenerator(storylineData, previousChapter, index)) {
            processedChapter = await storyGenerator.processParagraph(nextChapter, storylineData, index);
            await storyGenerator.save(storylineData, [processedChapter], index);
            previousChapter = nextChapter;
            index++;
            console.info(`Chapter ${index} completed`);
            res.write(`Chapter ${index} completed`);
          }
        })
        .then(() => res.send({ success: true, storylineId: storyline_id }));

  } catch (error: any) {
    console.error(error);
    res.status(500).send({ success: false, error: error.message });
  }
};