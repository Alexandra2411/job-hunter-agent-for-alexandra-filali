import { NextResponse } from 'next/server';
import { getJob, getSettings, updateJobCoverLetter } from '../../../scraper/db.js';
import { refineCoverLetter } from '../../../scraper/evaluator.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, instructions } = body;

    if (!id || !instructions) {
      return NextResponse.json({ success: false, error: 'Missing id or instructions' }, { status: 400 });
    }

    // 1. Fetch job and settings
    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    const settings = await getSettings();
    const cvText = settings.cv_text;

    // 2. Refine cover letter via AI
    const refinedLetter = await refineCoverLetter(
      job.title,
      job.company,
      job.description,
      cvText,
      job.cover_letter || '',
      instructions
    );

    // 3. Save new cover letter back to DB
    await updateJobCoverLetter(id, refinedLetter);

    return NextResponse.json({ success: true, coverLetter: refinedLetter });
  } catch (error) {
    console.error('Error in letter API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
