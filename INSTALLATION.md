# System2ML Installation & Setup Guide

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ (v20 recommended)
- pnpm 8+ (or npm/yarn)
- Git (optional, for cloning)

### Installation Steps

```bash
# Navigate to project directory
cd /vercel/share/v0-project

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open browser to http://localhost:3000
```

That's it! The application will be running with hot module reloading.

## Detailed Setup

### Step 1: Environment Setup

This project works out-of-the-box with mock data. No environment variables are required for basic functionality.

**Optional**: If you plan to integrate with real services later, create `.env.local`:

```bash
# Database (when ready)
DATABASE_URL=your_database_url

# Authentication (when ready)
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000

# API Keys (when ready)
OPENAI_API_KEY=your_key
```

### Step 2: Install Dependencies

```bash
# Using pnpm (recommended - faster and more reliable)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

Expected output: No warnings, all dependencies installed.

### Step 3: Start Development Server

```bash
pnpm dev
```

Expected output:
```
> next dev
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 1.2s
```

### Step 4: Open Application

- **Local Development**: http://localhost:3000
- **LAN Access**: http://your-ip:3000
- **Production Build**: http://localhost:3000 (after build)

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import GitHub repository
5. Click "Deploy"

That's it! Vercel will automatically build and deploy.

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
```

```bash
# Build image
docker build -t system2ml .

# Run container
docker run -p 3000:3000 system2ml
```

### Other Cloud Platforms

#### AWS (EC2)
```bash
# SSH into instance
ssh -i key.pem ec2-user@your-instance-ip

# Clone and setup
git clone your-repo
cd your-repo
pnpm install
pnpm build
pnpm start
```

#### Google Cloud Run
```bash
# Build and deploy
gcloud run deploy system2ml \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Azure App Service
```bash
# Deploy using Azure CLI
az webapp up --name system2ml --runtime "node|18-lts"
```

## Available Commands

### Development
```bash
pnpm dev          # Start dev server with HMR
pnpm dev -p 3001  # Start on different port
```

### Building
```bash
pnpm build        # Build for production
pnpm start        # Start production build locally
```

### Type Checking
```bash
pnpm type-check   # Run TypeScript type checking
```

### Linting & Formatting
```bash
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
```

## Project Structure

```
system2ml/
├── app/                   # Next.js App Router pages
│   ├── dashboard/        # Dashboard page
│   ├── pipelines/        # Pipeline pages
│   ├── [other features]/
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
│
├── components/           # React components
│   ├── layout/          # Layout components
│   ├── dashboard/       # Dashboard components
│   ├── ui/              # shadcn/ui components
│   └── [features]/      # Feature components
│
├── lib/                  # Utilities and helpers
│   ├── types.ts         # TypeScript types
│   ├── api.ts           # API functions & mock data
│   └── utils.ts         # Utility functions
│
├── public/              # Static files
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
├── next.config.ts       # Next.js configuration
├── package.json         # Dependencies
└── README.md            # Documentation
```

## Customization

### Changing Colors

Edit `app/globals.css` and modify the color variables:

```css
:root {
  --primary: oklch(0.205 0 0);        /* Change primary color */
  --brand-500: #6b8ef4;               /* Change brand color */
  --success-500: #10b981;             /* Change success color */
}
```

### Adding New Pages

1. Create folder: `app/my-feature/`
2. Create file: `app/my-feature/page.tsx`
3. Import DashboardLayout:
```typescript
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function MyPage() {
  return (
    <DashboardLayout>
      {/* Your content */}
    </DashboardLayout>
  )
}
```
4. Update sidebar in `components/layout/sidebar.tsx`

### Adding New Components

1. Create file: `components/my-feature/my-component.tsx`
2. Use in pages:
```typescript
import { MyComponent } from '@/components/my-feature/my-component'
```

### Changing Fonts

Edit `app/layout.tsx`:

```typescript
import { YourFont } from 'next/font/google'

const font = YourFont({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={font.className}>
        {children}
      </body>
    </html>
  )
}
```

## Database Integration

### Connect to Supabase

1. Create Supabase project
2. Add environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

3. Use in components:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const { data } = await supabase
  .from('pipelines')
  .select('*')
```

### Connect to PostgreSQL

1. Install Prisma:
```bash
pnpm add @prisma/client
pnpm add -D prisma
```

2. Initialize:
```bash
pnpm prisma init
```

3. Add DATABASE_URL to `.env.local`

4. Use in API routes:
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const pipelines = await prisma.pipeline.findMany()
```

## Authentication Setup

### Basic Setup with Auth0

1. Create Auth0 account
2. Create application
3. Add environment variables:
```
AUTH0_SECRET=your_secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_secret
```

4. Install Auth.js:
```bash
pnpm add @auth/nextjs @auth/core
```

5. Create route handler and integrate

## Troubleshooting

### Port Already in Use

```bash
# Change port
pnpm dev -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Dependencies Not Installing

```bash
# Clear cache
pnpm store prune

# Reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Build Failures

```bash
# Check TypeScript errors
pnpm type-check

# Check Next.js build
pnpm build

# See detailed error
pnpm build --debug
```

### Hot Module Reloading Not Working

```bash
# Restart dev server
# (Ctrl+C then pnpm dev)

# Or check for unsaved files
```

## Performance Optimization

### Enable Caching

Add to `next.config.ts`:
```typescript
export default nextConfig = {
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
}
```

### Optimize Images

Use Next.js Image component:
```typescript
import Image from 'next/image'

<Image
  src="/image.png"
  alt="Description"
  width={300}
  height={300}
/>
```

### Code Splitting

Automatic with Next.js App Router - each page is its own bundle.

## Production Checklist

- [ ] Environment variables configured
- [ ] Database integrated
- [ ] Authentication enabled
- [ ] Build succeeds: `pnpm build`
- [ ] No TypeScript errors: `pnpm type-check`
- [ ] No console warnings
- [ ] Responsive design tested
- [ ] Performance optimized
- [ ] Security headers configured
- [ ] Deployed and tested in production

## Next Steps

1. **Review** README.md and PROJECT_OVERVIEW.md
2. **Explore** application at http://localhost:3000
3. **Integrate** with your data source
4. **Customize** colors, fonts, and branding
5. **Deploy** to production

## Support & Resources

- **Documentation**: See README.md
- **Component Examples**: Check `components/` directory
- **Types**: Reference `lib/types.ts`
- **Mock Data**: Explore `lib/api.ts`

## Getting Help

1. Check documentation files in project root
2. Review component source code
3. Look at similar implementations in the codebase
4. Refer to Next.js documentation: https://nextjs.org/docs

---

**System2ML is now ready to use!** 🚀

Start by visiting http://localhost:3000 to explore the full platform.
