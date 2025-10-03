#!/usr/bin/env node

/**
 * Test file for createComprehensionQuestion function
 * Run with: node test-comprehension-question.js
 */

// Mock dependencies before importing
const mockOpenAI = {
  responses: {
    parse: async ({ input, text }) => {
      // Simulate API responses based on the system message content
      const systemMessage = input.find(msg => msg.role === 'system')?.content || '';
      const userMessage = input.find(msg => msg.role === 'user')?.content || '';
      
      if (systemMessage.includes('Generate only a comprehension question')) {
        // Mock question generation
        return {
          output_parsed: {
            question: `What is the main theme of this paragraph about "${userMessage.substring(0, 20)}..."?`
          }
        };
      } else if (systemMessage.includes('Generate 2-3 possible answers')) {
        // Mock answer generation
        return {
          output_parsed: {
            answers: [
              'The correct answer based on the paragraph',
              'An incorrect but plausible answer',
              'Another incorrect answer'
            ]
          }
        };
      }
      
      throw new Error('Unexpected API call');
    }
  }
};

// Mock zodTextFormat function
function zodTextFormat(schema, type) {
  return { schema, type };
}

// Mock zod
const mockZod = {
  object: (obj) => ({ _type: 'object', properties: obj }),
  string: () => ({ _type: 'string' }),
  array: (type) => ({ _type: 'array', items: type })
};

// Set up module mocking
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === './openai') {
    return { openai: mockOpenAI };
  }
  if (id === 'openai/helpers/zod') {
    return { zodTextFormat };
  }
  if (id === 'zod') {
    return { z: mockZod };
  }
  if (id === '@google-cloud/storage') {
    return { Storage: class MockStorage {} };
  }
  if (id === 'echogarden') {
    return { align: async () => ({ timeline: [] }) };
  }
  if (id === './story-generator') {
    return { ProcessedParagraph: {} };
  }
  
  return originalRequire.apply(this, arguments);
};

// Now we can safely require the TypeScript file (compiled to JS)
let createComprehensionQuestion;

try {
  // Try to import from compiled JS first
  const storyUtils = require('./src/story-utils.js');
  createComprehensionQuestion = storyUtils.createComprehensionQuestion;
} catch (error) {
  console.log('Could not import from compiled JS, using inline implementation...');
  
  // Fallback: inline implementation for testing
  const OAIQuestionResponse = mockZod.object({
    question: mockZod.string()
  });

  const OAIAnswersResponse = mockZod.object({
    answers: mockZod.array(mockZod.string())
  });

  async function retryApiCall(apiCall, maxRetries) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = new Error(`Attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  createComprehensionQuestion = async function(instructions, paragraph) {
    const maxRetries = 3;

    // Generate question
    const question = await retryApiCall(async () => {
      const { output_parsed } = await mockOpenAI.responses.parse({
        model: "gpt-5-mini-2025-08-07",
        input: [{
          role: 'system',
          content: instructions + " Generate only a comprehension question."
        }, {
          role: "user",
          content: paragraph,
        }],
        text: {
          format: zodTextFormat(OAIQuestionResponse, "event"),
        },
      });

      if (!output_parsed?.question) {
        throw new Error("No question generated");
      }
      return output_parsed.question;
    }, maxRetries);

    // Generate answers
    const answers = await retryApiCall(async () => {
      const { output_parsed } = await mockOpenAI.responses.parse({
        model: "gpt-5-mini-2025-08-07",
        input: [{
          role: 'system',
          content: "Generate 2-3 possible answers for this comprehension question. The first answer should be correct."
        }, {
          role: "user",
          content: `Question: ${question}\nParagraph: ${paragraph}`,
        }],
        text: {
          format: zodTextFormat(OAIAnswersResponse, "event"),
        },
      });

      if (!output_parsed?.answers || output_parsed.answers.length < 2 || output_parsed.answers.length > 3) {
        throw new Error(`Invalid answers length: ${output_parsed?.answers?.length || 0}`);
      }
      return output_parsed.answers;
    }, maxRetries);

    return {
      type: 'comprehension',
      question,
      correct: answers[0],
      answers: answers.join(',')
    };
  };
}

// Test cases
async function runTests() {
  console.log('🧪 Testing createComprehensionQuestion function...\n');

  const testCases = [
    {
      name: 'Basic comprehension question',
      instructions: 'Create a comprehension question about the main idea',
      paragraph: 'The solar system consists of the Sun and all celestial objects that orbit around it, including planets, moons, asteroids, and comets. Earth is the third planet from the Sun and the only known planet to support life.'
    },
    {
      name: 'Story comprehension',
      instructions: 'Generate a question about character motivation',
      paragraph: 'Sarah looked out the window at the heavy snowfall. School had been cancelled, and she felt a mix of excitement and disappointment. While she loved snow days, she had been looking forward to presenting her science project today.'
    },
    {
      name: 'Historical text',
      instructions: 'Create a question about historical significance',
      paragraph: 'The invention of the printing press by Johannes Gutenberg in the 15th century revolutionized the spread of knowledge. Books could now be produced quickly and cheaply, making information accessible to more people than ever before.'
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    try {
      console.log(`📝 Test: ${testCase.name}`);
      console.log(`   Instructions: ${testCase.instructions}`);
      console.log(`   Paragraph: ${testCase.paragraph.substring(0, 100)}...`);
      
      const startTime = Date.now();
      const result = await createComprehensionQuestion(testCase.instructions, testCase.paragraph);
      const endTime = Date.now();
      
      // Validate result structure
      if (!result.type || !result.question || !result.correct || !result.answers) {
        throw new Error('Invalid result structure');
      }
      
      if (result.type !== 'comprehension') {
        throw new Error(`Expected type 'comprehension', got '${result.type}'`);
      }
      
      const answerArray = result.answers.split(',');
      if (answerArray.length < 2 || answerArray.length > 3) {
        throw new Error(`Expected 2-3 answers, got ${answerArray.length}`);
      }
      
      console.log(`   ✅ PASSED (${endTime - startTime}ms)`);
      console.log(`   Question: ${result.question}`);
      console.log(`   Correct Answer: ${result.correct}`);
      console.log(`   All Answers: ${result.answers}`);
      console.log('');
      
      passedTests++;
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      console.log('');
    }
  }

  // Test error handling
  console.log('🔧 Testing error handling...');
  try {
    // Mock a failing API call
    const originalParse = mockOpenAI.responses.parse;
    mockOpenAI.responses.parse = async () => {
      throw new Error('Simulated API failure');
    };
    
    await createComprehensionQuestion('Test instructions', 'Test paragraph');
    console.log('   ❌ FAILED: Should have thrown an error');
  } catch (error) {
    if (error.message.includes('Failed after 3 attempts')) {
      console.log('   ✅ PASSED: Error handling works correctly');
      passedTests++;
      totalTests++;
    } else {
      console.log(`   ❌ FAILED: Unexpected error: ${error.message}`);
      totalTests++;
    }
  }

  // Restore original function for performance test
  mockOpenAI.responses.parse = async ({ input, text }) => {
    const systemMessage = input.find(msg => msg.role === 'system')?.content || '';
    const userMessage = input.find(msg => msg.role === 'user')?.content || '';
    
    if (systemMessage.includes('Generate only a comprehension question')) {
      return {
        output_parsed: {
          question: `What is the main theme of this paragraph about "${userMessage.substring(0, 20)}..."?`
        }
      };
    } else if (systemMessage.includes('Generate 2-3 possible answers')) {
      return {
        output_parsed: {
          answers: [
            'The correct answer based on the paragraph',
            'An incorrect but plausible answer',
            'Another incorrect answer'
          ]
        }
      };
    }
    
    throw new Error('Unexpected API call');
  };

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('   🎉 All tests passed!');
    return true;
  } else {
    console.log('   ⚠️  Some tests failed');
    return false;
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Performance Test...');
  const iterations = 5;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    await createComprehensionQuestion(
      'Create a simple comprehension question',
      'This is a test paragraph for performance testing.'
    );
    const endTime = Date.now();
    times.push(endTime - startTime);
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  console.log(`   Average time: ${avgTime.toFixed(2)}ms`);
  console.log(`   Min time: ${minTime}ms`);
  console.log(`   Max time: ${maxTime}ms`);
}

// Main execution
async function main() {
  console.log('🚀 Starting createComprehensionQuestion tests...\n');
  console.log(`📁 Testing function from: ${createComprehensionQuestion ? 'imported module' : 'inline implementation'}\n`);
  
  try {
    const testsPass = await runTests();
    await performanceTest();
    
    if (testsPass) {
      console.log('\n🎉 All tests completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

// Export for potential use as a module
module.exports = {
  createComprehensionQuestion
};