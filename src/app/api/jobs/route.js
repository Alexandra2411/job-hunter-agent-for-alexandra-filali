import { NextResponse } from 'next/server';
import { getJobs, updateJobStatus } from '../../../scraper/db.js';
import { runScraper } from '../../../scraper/scraper.js';

export async function GET() {
  try {
    const jobs = await getJobs();
    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error('Error fetching jobs in API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Missing id or status' }, { status: 400 });
    }

    await updateJobStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating job status in API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT() {
  try {
    // Run the scraper orchestrator directly from the web request
    const result = await runScraper();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error triggering scraper in API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
