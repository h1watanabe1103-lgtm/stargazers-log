import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// HTMLにReactの描画先があることを確認してからアプリを起動する。
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element was not found');

// StrictModeで開発時の副作用も検出しながらルートコンポーネントを描画する。
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)