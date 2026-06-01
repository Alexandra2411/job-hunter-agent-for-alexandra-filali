import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getJob, updateJobStatus } from '../../../scraper/db.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, recipientEmail, subject, coverLetter } = body;

    if (!id || !recipientEmail || !subject || !coverLetter) {
      return NextResponse.json({ success: false, error: 'Missing required application fields' }, { status: 400 });
    }

    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    const gmailUser = process.env.GMAIL_USER || '';
    const gmailPass = process.env.GMAIL_PASS || ''; // 16-character Gmail App Password

    if (!gmailUser || !gmailPass) {
      console.warn('GMAIL_USER or GMAIL_PASS environment variables not configured. Performing mock email send.');
      
      // Update job status to applied in DB anyway for demo
      await updateJobStatus(id, 'applied');
      
      return NextResponse.json({
        success: true,
        mock: true,
        message: `Simulated: Cover letter successfully submitted to ${recipientEmail}. Set GMAIL_USER and GMAIL_PASS in your environment to send real emails.`
      });
    }

    // Configure Nodemailer transporter with Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    const mailOptions = {
      from: `"${process.env.EMAIL_SENDER_NAME || 'Alexandra Filali'}" <${gmailUser}>`,
      to: recipientEmail,
      subject: subject,
      text: coverLetter
      // Optionally attach CV if a local PDF was provided, but sending cover letter text in the body is standard.
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Update job status to 'applied' in the database
    await updateJobStatus(id, 'applied');

    return NextResponse.json({ success: true, message: `Application email sent successfully to ${recipientEmail}!` });
  } catch (error) {
    console.error('Error sending application email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
