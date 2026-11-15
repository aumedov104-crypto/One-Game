import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.__setPreloaderProgress?.(78);
createRoot(document.getElementById('root')!).render(<App />);
