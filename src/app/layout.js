import './globals.css';

export const metadata = {
  title: 'VCT Ban/Pick Simulator',
  description: 'Valorant Champions Tour ban/pick simulation tool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
