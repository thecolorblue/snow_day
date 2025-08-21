# Snow Day

## LLM generated vocabulary quizzes

![Screen Recording 2025-08-21 at 1 58 09 PM](https://github.com/user-attachments/assets/9de34d06-7d82-4f83-90a4-9c7143716654)

Generates a story, audio, and quiz based off a set of preferences and a list of vocabulary. Quiz timing and accuracy is recorded for later. 

## Deploy

Snow Day defaults to using Inngest for background tasks, Supabase for a database, and Vercel for hosting. It is pretty easy to replace Supabase with another Postgresql host, but Inngest and Vercel are pretty tightly coupled with the code. 

All Vercel deployments are done through integration with the code host. You will want to connect Vercel to the code repository, and then Vercel can handle the deployment from there. 

## Code Structure

Most of the code right now, and all of the code eventually, will live in the `nextjs-app` folder as part of the next.js app. There are still a couple python scripts for generating and testing stories, audio and quizzes that live in the `src` or `generators` folders. 

## Development

### Inngest

Inngest has a handy CLI for starting the local function runner. You will start this up as a separate process from the next.js app.

### Next.js

The next.js app can be started in developer mode with `npm run dev`.

### Python Scripts

Python scripts were developed with Python 3.13.6. All python scripts will soon be deprecated. 
