Front Page /src/app/page.tsx

If student setup:
 - Students name; # of storylines completed in the past week; correct answers in the past week
If no student is setup:
- Link to ‘create student’ form modal

If vocabs:
- For each vocab: # of words
Else:
 - link to create a vocab

If storylines for any student attached to the account:
- Student attached; # of pages; Link to storyline

Updated data model with these new queries and use them to generate the front page content:
- Student.completedStorylines (student_id, duration) => return number of storylines attached to that student
- Student.correctAnswers (student_id, duration) => return the number of storyline_progress rows for a given student_id in that duration
- Vocab.numberOfWords (vocab_id) => return the length of the vocab.list value split on ','
- Storyline.student (storyline_id) => get the student that is assigned to the storyline for storyline_id
- Storyline.pages (storyline_id) => return the number of storyline_steps associated with the storyline_id