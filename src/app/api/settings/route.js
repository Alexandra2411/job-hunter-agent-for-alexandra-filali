import { NextResponse } from 'next/server';
import { getSettings, saveSetting } from '../../../scraper/db.js';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching settings in API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { cv_text, search_criteria, email_sender } = body;

    if (cv_text !== undefined) {
      await saveSetting('cv_text', cv_text);
    }
    
    if (search_criteria !== undefined) {
      const criteriaStr = typeof search_criteria === 'string' 
        ? search_criteria 
        : JSON.stringify(search_criteria);
      await saveSetting('search_criteria', criteriaStr);
    }

    if (email_sender !== undefined) {
      await saveSetting('email_sender', email_sender);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings in API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
