import "./globals.css";

export const metadata = {
  title: "E-Vote Commission",
  description: "Secure Election Management with Grievance Analytics",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body className="font-sans antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col" style={{ colorScheme: 'light' }}>
        {children}
      </body>
    </html>
  );
}
