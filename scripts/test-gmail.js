import nodemailer from 'nodemailer';

async function main() {
  const user = process.env.GMAIL_USER || '';
  const pass = process.env.GMAIL_PASS || '';

  console.log('--- Testing Gmail SMTP Configuration ---');
  console.log('GMAIL_USER:', user ? user : '(not set)');
  console.log('GMAIL_PASS:', pass ? '*** (configured)' : '(not set)');

  if (!user || !pass) {
    console.error('Error: Please configure GMAIL_USER and GMAIL_PASS environment variables before running this test.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });

  const mailOptions = {
    from: user,
    to: user, // Send to yourself
    subject: 'Job Hunter Agent - Test SMTP Email Connection',
    text: `Bonjour Alexandra,\n\nCeci est un e-mail de test envoyé par votre Job Hunter Agent pour valider vos paramètres de messagerie SMTP Gmail.\n\nSi vous recevez cet e-mail, cela signifie que votre configuration est 100% opérationnelle !\n\nCordialement,\nJob Hunter Agent`
  };

  try {
    console.log('Sending test email to yourself...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Response:', info.response);
  } catch (error) {
    console.error('Failed to send test email:', error);
    process.exit(1);
  }
}

main();
