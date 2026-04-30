import './globals.css';

export const metadata = {
  title: 'Pokopia Block Builder',
  description: 'Build layered block layouts in 3D.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
