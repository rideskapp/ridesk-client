# Ridesk Client

A modern React frontend application for the Ridesk watersports school management platform, built with TypeScript, Vite, and Tailwind CSS.

## 🚀 Features

- **Modern UI**: Clean, responsive design with custom theming
- **Internationalization**: English and Italian language support
- **Authentication**: Complete login, signup, and logout functionality
- **Type Safety**: Full TypeScript implementation
- **State Management**: Zustand for global state
- **API Integration**: Seamless communication with Ridesk Server
- **Responsive Design**: Optimized for tablet and desktop

## 🛠️ Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router
- **Internationalization**: i18next
- **HTTP Client**: Axios

## 📋 Prerequisites

- Node.js 18 or higher
- npm or yarn
- Ridesk Server running (see ridesk-server README)
- Vercel account (for deployment)

## 🔧 Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd ridesk-client
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# For production, use your deployed server URL:
# VITE_API_BASE_URL=https://your-server.vercel.app/api
```

### 3. Start Development Server

```bash
# Start development server
npm run dev
```

The application will start on `http://localhost:3000`

## 🚀 Vercel Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Configure Environment Variables

In your Vercel dashboard, go to your project settings and add these environment variables:

```env
VITE_API_BASE_URL=https://your-server.vercel.app/api
```

### 4. Deploy

```bash
# Deploy to Vercel
vercel

# For production deployment
vercel --prod
```

### 5. Configure Vercel Settings

Create a `vercel.json` file in the root directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.html"
    }
  ],
  "env": {
    "VITE_API_BASE_URL": "https://your-server.vercel.app/api"
  }
}
```

## 🎨 Theming and Customization

### Color Scheme

The application uses a custom color palette based on the Ridesk logo:

- **Primary**: Magenta (#E91E63)
- **Secondary**: Black (#000000)
- **Background**: White (#FFFFFF)
- **Accent**: Various shades of gray

### Customizing Colors

Edit `tailwind.config.ts` to modify the color scheme:

```typescript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E91E63", // Magenta
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#000000", // Black
          foreground: "#FFFFFF",
        },
      },
    },
  },
};
```

## 🌍 Internationalization

The application supports multiple languages:

### Adding New Languages

1. Create a new locale file in `src/i18n/locales/`
2. Add the locale to `src/i18n/index.ts`
3. Update the language switcher component

### Current Languages

- **English** (`en`) - Default
- **Italian** (`it`) - Available

## 📱 Responsive Design

The application is optimized for:

- **Desktop**: Full feature set with sidebar navigation
- **Tablet**: Responsive layout with collapsible sidebar
- **Mobile**: Mobile-first design (basic support)

## 🏗️ Project Structure

```
ridesk-client/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── auth/          # Authentication components
│   │   └── ui/            # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Internationalization
│   │   └── locales/       # Translation files
│   ├── lib/               # Utility functions
│   ├── pages/             # Page components
│   ├── services/          # API service functions
│   ├── store/             # Zustand stores
│   └── types/             # TypeScript type definitions
├── .env                   # Environment variables (not committed)
├── vercel.json            # Vercel deployment configuration
└── package.json
```

## 🔗 API Integration

The client communicates with the Ridesk Server through:

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### API Client Configuration

Located in `src/lib/api.ts`, the Axios client is configured with:

- Base URL from environment variables
- Request/response interceptors
- Error handling
- Token management

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues

# Type checking
npm run type-check   # Run TypeScript compiler
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm run test
npm run test:coverage
```

## 🔒 Security Considerations

- **Environment Variables**: Never commit `.env` files
- **API Keys**: Store sensitive data in Vercel environment variables
- **CORS**: Ensure proper CORS configuration on the server
- **Token Storage**: JWT tokens are stored securely in memory

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**

   - Check `VITE_API_BASE_URL` environment variable
   - Ensure the server is running
   - Check network connectivity

2. **Build Errors**

   - Run `npm run type-check` to identify TypeScript errors
   - Check for missing dependencies
   - Verify environment variables are set

3. **Styling Issues**

   - Check Tailwind CSS configuration
   - Verify Shadcn UI components are properly imported
   - Check for CSS conflicts

4. **Internationalization Issues**
   - Verify translation files are properly formatted
   - Check language switcher configuration
   - Ensure all text keys are translated

## 🚀 Performance Optimization

- **Code Splitting**: Automatic with Vite
- **Tree Shaking**: Automatic with ES modules
- **Image Optimization**: Use WebP format when possible
- **Bundle Analysis**: Run `npm run build` and check bundle size

## 📞 Support

For issues and questions:

- Check the browser console for errors
- Verify API endpoints are working
- Check environment variable configuration
- Review the server logs

## 📄 License

This project is proprietary software for Ridesk watersports management platform.

## 🔄 Development Workflow

1. **Feature Development**

   - Create feature branch
   - Implement changes
   - Test locally
   - Create pull request

2. **Deployment**

   - Merge to main branch
   - Automatic deployment to Vercel
   - Verify production deployment

3. **Monitoring**
   - Check Vercel deployment logs
   - Monitor API performance
   - Track user feedback
