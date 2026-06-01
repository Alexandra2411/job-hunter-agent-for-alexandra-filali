import { getSettings, getJobs, saveJobs } from './db.js';
import { scrapeWttj } from './providers/wttj.js';
import { scrapeApec } from './providers/apec.js';
import { scrapeJobteaser } from './providers/jobteaser.js';
import { scrapeLinkedin } from './providers/linkedin.js';
import { scrapeHellowork } from './providers/hellowork.js';
import { evaluateJob } from './evaluator.js';

export async function runScraper() {
  console.log('--- Starting Job Hunter Agent Scraper Run ---');
  console.log('Timestamp:', new Date().toISOString());

  try {
    // 1. Fetch settings (CV and criteria)
    const settings = await getSettings();
    const cvText = settings.cv_text;
    const criteria = JSON.parse(settings.search_criteria || '{}');

    if (!cvText) {
      console.error('No CV found in settings. Please configure your CV before running evaluations.');
      return { success: false, error: 'No CV found' };
    }

    console.log('Search criteria loaded:', criteria);

    // 2. Fetch existing jobs to avoid duplicate evaluations
    const existingJobs = await getJobs();
    const existingIds = new Set(existingJobs.map(j => j.id));
    console.log(`Loaded ${existingJobs.length} existing jobs from database.`);

    // 3. Run all scrapers in parallel
    console.log('Scraping job sites...');
    const results = await Promise.allSettled([
      scrapeWttj(criteria),
      scrapeApec(criteria),
      scrapeJobteaser(criteria),
      scrapeLinkedin(criteria),
      scrapeHellowork(criteria)
    ]);

    const allScrapedJobs = [];
    results.forEach((result, index) => {
      const sites = ['Welcome to the Jungle', 'APEC', 'JobTeaser', 'LinkedIn Jobs', 'HelloWork'];
      if (result.status === 'fulfilled') {
        console.log(`Scraped ${result.value.length} jobs from ${sites[index]}`);
        allScrapedJobs.push(...result.value);
      } else {
        console.error(`Scraper for ${sites[index]} failed:`, result.reason);
      }
    });

    console.log(`Total scraped jobs: ${allScrapedJobs.length}`);

    // Filter down to unique and new jobs
    const seenUrls = new Set();
    const newJobs = allScrapedJobs.filter(job => {
      if (seenUrls.has(job.url)) return false;
      seenUrls.add(job.url);
      return !existingIds.has(job.id);
    });

    console.log(`Found ${newJobs.length} new jobs to evaluate.`);

    if (newJobs.length === 0) {
      console.log('No new jobs to evaluate. Finishing run.');
      return { success: true, evaluatedCount: 0 };
    }

    // Limit new evaluations per run to avoid hitting rate limits / taking too long
    const MAX_EVALUATIONS = 12;
    const jobsToEvaluate = newJobs.slice(0, MAX_EVALUATIONS);
    console.log(`Evaluating top ${jobsToEvaluate.length} new jobs using Gemini AI...`);

    const evaluatedJobs = [];
    for (const job of jobsToEvaluate) {
      console.log(`Evaluating: ${job.title} at ${job.company} (${job.site})`);
      try {
        const evaluation = await evaluateJob(job.title, job.company, job.description, cvText);
        evaluatedJobs.push({
          ...job,
          score: evaluation.score,
          reasoning: evaluation.reasoning,
          cover_letter: evaluation.coverLetter,
          status: 'new'
        });
      } catch (err) {
        console.error(`Failed to evaluate job "${job.title}":`, err);
        // Save with default/error fields instead of completely dropping it
        evaluatedJobs.push({
          ...job,
          score: 5,
          reasoning: JSON.stringify({ pros: [], cons: [], summary: 'Evaluation failed.' }),
          cover_letter: `Dear Hiring Manager,\n\nI am applying for ${job.title} at ${job.company}.\n\nBest regards,\nAlexandra Filali`,
          status: 'new'
        });
      }
    }

    // 4. Save evaluated jobs to the database
    if (evaluatedJobs.length > 0) {
      console.log(`Saving ${evaluatedJobs.length} evaluated jobs to database...`);
      await saveJobs(evaluatedJobs);
    }

    console.log('--- Scraper Run Finished Successfully ---');
    return { success: true, evaluatedCount: evaluatedJobs.length };
  } catch (error) {
    console.error('Fatal error in scraper run:', error);
    return { success: false, error: error.message };
  }
}

// Support running directly from command line (e.g. node src/scraper/scraper.js)
if (process.argv[1]?.endsWith('scraper.js')) {
  runScraper()
    .then(result => {
      if (!result.success) process.exit(1);
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
