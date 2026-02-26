// Terminal Theme - Shared Styles and Components
// Use this to maintain consistency across all pages

export const terminalTheme = {
  colors: {
    background: '#0a0a0a',
    surface: '#0d1117',
    surfaceElevated: '#161b22',
    border: '#30363d',
    borderHighlight: '#58a6ff',
    text: '#c9d1d9',
    textMuted: '#8b949e',
    textDim: '#6e7681',
    accent: '#58a6ff',
    accentSecondary: '#1f6feb',
    success: '#3fb950',
    warning: '#d29922',
    error: '#f85149',
    cyan: '#39c5cf',
    purple: '#a371f7',
    pink: '#db61a2',
  },
  fonts: {
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  animations: {
    fadeIn: 'terminal-fade-in 0.3s ease-out forwards',
    slideUp: 'terminal-slide-up 0.4s ease-out forwards',
    slideIn: 'terminal-slide-in 0.3s ease-out forwards',
    pulse: 'terminal-pulse 2s ease-in-out infinite',
    blink: 'terminal-blink 1s step-end infinite',
  }
}

export const terminalStyles = `
  @keyframes terminal-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes terminal-slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes terminal-slide-in {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes terminal-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes terminal-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  @keyframes terminal-cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  .terminal-fade-in { animation: terminal-fade-in 0.3s ease-out forwards; }
  .terminal-slide-up { animation: terminal-slide-up 0.4s ease-out forwards; }
  .terminal-slide-in { animation: terminal-slide-in 0.3s ease-out forwards; }
  .terminal-pulse { animation: terminal-pulse 2s ease-in-out infinite; }
  .terminal-blink { animation: terminal-blink 1s step-end infinite; }
  
  /* Scrollbar styling */
  .terminal-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
  .terminal-scrollbar::-webkit-scrollbar-track { background: #0d1117; }
  .terminal-scrollbar::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
  .terminal-scrollbar::-webkit-scrollbar-thumb:hover { background: #484f58; }
  
  /* Code highlighting */
  .code-keyword { color: #ff7b72; }
  .code-string { color: #a5d6ff; }
  .code-number { color: #79c0ff; }
  .code-comment { color: #8b949e; font-style: italic; }
  .code-function { color: #d2a8ff; }
  .code-variable { color: #ffa657; }
  .code-operator { color: #ff7b72; }
  
  /* CRT effect */
  .crt-effect {
    position: relative;
  }
  .crt-effect::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%), linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03));
    background-size: 100% 2px, 3px 100%;
    pointer-events: none;
    z-index: 9999;
  }
`

// Re-export colors for easy use
export const colors = terminalTheme.colors
