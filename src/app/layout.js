import './globals.css';

export const metadata = {
  title: 'Ban/Pick Simulator',
  description: 'Ban/pick simulation tool for Valorant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
