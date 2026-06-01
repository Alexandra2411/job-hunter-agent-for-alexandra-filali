import { runScraper } from '../src/scraper/scraper.js';
import { getJobs } from '../src/scraper/db.js';

async function main() {
  console.log('Running scraper test...');
  
  // Set temporary environment path for SQLite to current directory
  process.env.SQLITE_PATH = './jobs.db';
  
  const result = await runScraper();
  console.log('Run Result:', result);
  
  if (result.success) {
    const jobs = await getJobs();
    console.log(`\nJobs currently in database: ${jobs.length}`);
    console.log('Displaying first 3 jobs in database:');
    jobs.slice(0, 3).forEach((job, index) => {
      console.log(`\n[Job #${index + 1}]`);
      console.log(`Title: ${job.title}`);
      console.log(`Company: ${job.company}`);
      console.log(`Site: ${job.site}`);
      console.log(`Score: ${job.score}/10`);
      try {
        const reasoning = JSON.parse(job.reasoning);
        console.log(`Reasoning Summary: ${reasoning.summary}`);
      } catch (e) {
        console.log(`Reasoning: ${job.reasoning}`);
      }
    });
  } else {
    console.error('Scraper execution failed:', result.error);
  }
}

main().catch(err => {
  console.error('Test execution crash:', err);
});
