import './globals.css';
import Image from 'next/image';
import JumpToTopButton from '@/components/JumpToTopButton';

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
      <body>
        {children}
        <JumpToTopButton />
        <a
          aria-label='Buy me a coffee'
          className='bmc-fixed-button'
          href='https://buymeacoffee.com/Dushin'
          rel='noopener noreferrer'
          target='_blank'
        >
          <Image
            alt=''
            aria-hidden='true'
            className='bmc-fixed-icon'
            height={24}
            src='https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg'
            unoptimized
            width={24}
          />
          <span className='bmc-fixed-text'>Buy me a coffee</span>
        </a>
      </body>
    </html>
  );
}
