# Testing createComprehensionQuestion Function

This directory contains a test file for the `createComprehensionQuestion` function from `src/story-utils.ts`.

## Running the Test

To run the test, execute the following command from the `functions` directory:

```bash
node test-comprehension-question.js
```

## What the Test Does

The test file (`test-comprehension-question.js`) includes:

1. **Mock Setup**: Mocks all external dependencies including:
   - OpenAI API calls
   - Zod schemas
   - Other imports from the original file

2. **Function Testing**: Tests the `createComprehensionQuestion` function with:
   - Basic comprehension questions
   - Story comprehension scenarios
   - Historical text comprehension
   - Error handling scenarios

3. **Performance Testing**: Measures execution time across multiple iterations

4. **Validation**: Ensures the returned object has the correct structure:
   - `type`: Should be 'comprehension'
   - `question`: Should be a non-empty string
   - `correct`: Should be the first answer
   - `answers`: Should be 2-3 comma-separated answers

## Test Output

The test provides detailed output including:
- ✅ Pass/fail status for each test case
- Execution time for each test
- Generated questions and answers
- Performance metrics
- Overall test summary

## Mock Behavior

The mock OpenAI API simulates realistic responses:
- Question generation returns contextual questions based on paragraph content
- Answer generation returns 3 plausible answers with the first being correct
- Error scenarios are tested by temporarily breaking the mock

## Requirements

- Node.js (the test uses standard Node.js features)
- No additional dependencies required (all external deps are mocked)

The test is completely self-contained and can be run independently without setting up the actual OpenAI API or other external services.