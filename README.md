<div align="center">
  <img src="public/glu.svg" alt="Glu Logo" width="120" height="120">
  
  # Glu
  
  **Real-Time Speech Analysis & Speaker Diarization for Call Centers**
  
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
  [![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev)
  [![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://docker.com)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎤 **Real-Time Transcription** | Ultra-low latency speech-to-text with Soniox AI |
| 👥 **Speaker Diarization** | Automatic speaker separation with call center optimized UI |
| 🌐 **Multi-Language Support** | Configurable language detection for diarization mode |
| 🔄 **Live Translation** | Real-time translation between languages (side-by-side view) |
| 📱 **Responsive Design** | Works on desktop and mobile devices |
| 🎨 **Customizable Subtitles** | Fonts, sizes, and colors |
| ⚡ **On-Demand Connection** | WebSocket connects only when recording starts (saves resources) |
| 🔔 **Connection Status** | Real-time connection indicator and disconnection alerts |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Soniox API Key](https://soniox.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/glu.git
cd glu

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your SONIOX API key

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Using Docker CLI

```bash
# Build image
docker build -t glu:latest .

# Run container
docker run -d -p 3000:80 --name glu glu:latest

# Stop container
docker stop glu && docker rm glu
```

---

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
VITE_SONIOX_API_KEY=your_soniox_api_key_here
```

You can also configure the API key directly in the app's Settings panel.

---

## 🏗️ Project Structure

```
glu/
├── public/              # Static assets
│   └── glu.svg         # App logo
├── src/
│   ├── api/            # Soniox WebSocket client
│   ├── components/
│   │   ├── LiveStream/ # Main transcription UI
│   │   ├── Settings/   # Configuration dialog
│   │   └── ui/         # Reusable UI components
│   ├── hooks/          # React hooks
│   ├── store/          # Zustand state management
│   └── db/             # IndexedDB for local storage
├── Dockerfile          # Production Docker image
├── docker-compose.yml  # Docker Compose config
└── nginx.conf          # Nginx configuration
```

---

## 🎯 Operating Modes

### 1. Transcription Mode
Standard speech-to-text in the selected language.

### 2. Translation Mode
Real-time translation showing original and translated text side-by-side.

### 3. Speaker Diarization Mode
Optimized for call centers:
- **Two-column layout** (Agent | Customer)
- **Auto-scroll** per speaker column
- **Speaking indicator** showing who's active
- **Message timestamps** for quick reference

---

## 🛠️ Development

```bash
# Start dev server with hot reload
npm run dev

# Type checking
npm run build

# Linting
npm run lint

# Production preview
npm run preview
```

---

## 📦 Build

```bash
# Create production build
npm run build

# Output will be in ./dist
```

---

## 🔧 Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI Framework with latest features |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tool and dev server |
| **Zustand** | Lightweight state management |
| **TailwindCSS** | Utility-first styling |
| **Framer Motion** | Smooth animations |
| **Dexie.js** | IndexedDB wrapper for local storage |
| **Soniox API** | Real-time speech recognition |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Built with ❤️ for Call Centers</strong>
</div>
