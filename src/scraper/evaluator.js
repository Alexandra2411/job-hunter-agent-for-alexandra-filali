import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const apiKey = process.env.GEMINI_API_KEY || '';
// Use global configuration or fallback
const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Evaluates a job description against the user's CV.
 * Returns: { score (1-10), reasoning: { pros: [], cons: [], summary: "" }, coverLetter: "" }
 */
export async function evaluateJob(jobTitle, company, description, cvText) {
  if (!ai) {
    console.warn('GEMINI_API_KEY is not set. Using mock evaluation.');
    // Return a mock evaluation if API key is not available
    const score = Math.floor(Math.random() * 5) + 6; // Mock score 6-10
    return {
      score,
      reasoning: JSON.stringify({
        pros: [`Matches experience in marketing`, `Located in a relevant region`],
        cons: [`Might require more experience than listed in CV`],
        summary: `This is a mock evaluation because GEMINI_API_KEY is not configured. Please add your key to see real compatibility scores.`
      }),
      coverLetter: `Dear Hiring Manager at ${company},\n\nI am writing to express my interest in the ${jobTitle} position at ${company}. Having reviewed your job description and matching it with my background in marketing research, I believe I can make a meaningful impact.\n\nSincerely,\nAlexandra Filali`
    };
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
You are an expert recruitment assistant evaluating a job description against a candidate's CV.
Candidate's CV:
"""
${cvText}
"""

Job Details:
Title: ${jobTitle}
Company: ${company}
Description:
"""
${description}
"""

Analyze the compatibility of the candidate for this job. You must output a JSON response in the following format:
{
  "score": <integer between 1 and 10 based on how well the candidate's education and experience align with the job requirements. Be honest and rigorous.>,
  "reasoning": {
    "pros": [<list of 2-3 specific reasons why the candidate is a good fit>],
    "cons": [<list of 1-2 gaps or requirements that the candidate lacks or needs to develop>],
    "summary": "<a 2-3 sentence overview explaining the fit and recommendation>"
  },
  "coverLetter": "<A highly tailored, professional cover letter in French (since the candidate is French and the job might be in France/Belgium, write in French by default unless the job description is fully in English. Make it engaging, concise, and focused on how her experiences like Alternance at Lilly France or events sales at Wyndham Hotel apply to this specific job. Keep placeholders like [Date], [Hiring Manager], etc. if needed, but personalize the body text completely. Do not use generic sentences.>"
}

Ensure your response is valid JSON only. Do not wrap it in markdown code blocks.
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    return {
      score: parseInt(data.score, 10) || 5,
      reasoning: JSON.stringify(data.reasoning),
      coverLetter: data.coverLetter
    };
  } catch (error) {
    console.error('Error during AI job evaluation:', error);
    return {
      score: 5,
      reasoning: JSON.stringify({
        pros: [],
        cons: [],
        summary: `Error evaluating job: ${error.message}`
      }),
      coverLetter: `Dear Hiring Manager,\n\nI am writing to apply for the ${jobTitle} position at ${company}.\n\nBest regards,\nAlexandra Filali`
    };
  }
}

/**
 * Regenerates or refines a cover letter with custom instructions from the user.
 */
export async function refineCoverLetter(jobTitle, company, description, cvText, coverLetter, userInstructions) {
  if (!ai) {
    return coverLetter + `\n\n(Note: Custom instructions could not be applied because GEMINI_API_KEY is not set.)`;
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
You are an expert cover letter writer.
Candidate's CV:
"""
${cvText}
"""

Job Details:
Title: ${jobTitle}
Company: ${company}
Description:
"""
${description}
"""

Current Cover Letter:
"""
${coverLetter}
"""

User requests the following modifications:
"${userInstructions}"

Please update the cover letter to incorporate the requested changes, keeping it professional, engaging, and highly targeted. Return ONLY the new cover letter text.
Do not wrap it in JSON or markdown blocks. Just output the cover letter.
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error refining cover letter:', error);
    return coverLetter;
  }
}
