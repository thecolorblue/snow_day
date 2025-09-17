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

    storyGenerator.save(storylineData, [firstChapter])
        .then(() => res.status(200).send({ success: true, storylineId: storyline_id }))
        .then(async () => {
          let nextChapter;
          let previousChapter = firstChapter.content;
          let processedChapter;
          let index = 1;
          while(nextChapter = await storyGenerator.chapterGenerator(storylineData, previousChapter, index)) {
            processedChapter = await storyGenerator.processParagraph(nextChapter, storylineData, index);
            await storyGenerator.save(storylineData, [processedChapter]);
            previousChapter = nextChapter;
            index++;
          }
        });

  } catch (error: any) {
    console.error(error);
    res.status(500).send({ success: false, error: error.message });
  }
};