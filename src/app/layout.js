import "./globals.css";

export const metadata = {
  title: "Job Hunter Agent for Alexandra Filali",
  description: "Premium automated job search, evaluation, and application dashboard for marketing & research roles.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
