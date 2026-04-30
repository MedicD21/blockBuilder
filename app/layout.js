import './globals.css';

export const metadata = {
  title: 'Pokopia Block Builder',
  description: 'Build layered block layouts in 3D.',
  icons: {
    icon: '/images/logo/pokopiaplannerdb.png',
    shortcut: '/images/logo/pokopiaplannerdb.png',
    apple: '/images/logo/pokopiaplannerdb.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
