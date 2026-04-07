export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class', // Enable manual dark mode toggle, but defaulting to light
  theme: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    extend: {
      colors: {
        // Core Enterprise Palette Action/Status
        primary: '#2563EB',
        critical: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        
        // Structure and Borders
        borderline: '#E2E8F0', // strict 0.5px border color
        
        // Neutral Surfaces (Light)
        surface: {
          50: '#F8FAFC',  // Main app background
          100: '#FFFFFF', // Panel/Card background
          200: '#F1F5F9', // Hovers/Subtle accents
        },
        
        // Text Colors
        content: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#64748B',
        }
      },
      boxShadow: {
        // Enforcing no shadow
        none: 'none',
      },
      borderWidth: {
        px: '0.5px', // Map standard border to 0.5px
      },
      borderRadius: {
        card: '8px',
      }
    },
  },
  plugins: [],
};
