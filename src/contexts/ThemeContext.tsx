import React, { createContext, useContext, useState } from 'react';

interface Theme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  buy: string;
  sell: string;
  accent: string;
  warning: string;
  success: string;
}

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const darkTheme: Theme = {
  background: '#0d1117',
  surface: '#161b22',
  text: '#ffffff',
  textSecondary: '#8b949e',
  border: '#30363d',
  buy: '#3fb950',
  sell: '#f85149',
  accent: '#58a6ff',
  warning: '#d29922',
  success: '#3fb950',
};

const lightTheme: Theme = {
  background: '#ffffff',
  surface: '#f6f8fa',
  text: '#24292f',
  textSecondary: '#57606a',
  border: '#d1d9e0',
  buy: '#2da44e',
  sell: '#cf222e',
  accent: '#0969da',
  warning: '#9a6700',
  success: '#2da44e',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<Props> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};