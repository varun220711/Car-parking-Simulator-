import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import faviconUrl from './assets/images/car_park_icon_64.png';

const iconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
if (iconLink) {
  iconLink.href = faviconUrl;
}

createRoot(document.getElementById('root')!).render(<App />);
