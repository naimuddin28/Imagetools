# ImageTools

**Simple Image Editing. Fast. Private. Free.**

ImageTools is a complete, production-quality, modern browser-based image editing web application. It allows users to quickly perform essential image edits entirely within their browser without uploading files to any server.

## Features

- **Crop**: Free crop or snap to popular aspect ratios (1:1, 4:3, 16:9).
- **Resize**: Scale images by pixel dimensions or percentages with optional aspect-ratio locking.
- **Compress**: Fine-tune image quality to reduce file sizes (shows real-time size estimates).
- **Convert**: Seamlessly convert between JPG, PNG, and WebP formats.
- **Rotate & Flip**: Rotate by 90°/180° and flip horizontally or vertically.
- **Undo / Redo**: Built-in history to easily correct mistakes.
- **Responsive**: Fully optimized for desktop, tablet, and mobile viewing.

## Privacy Architecture

🔒 **100% Browser-Based**

**No backend or image API is required.** 
ImageTools processes all images locally on your device using the HTML5 Canvas API and modern JavaScript. Your images never leave your browser, ensuring maximum privacy and security.

## Technology Stack

- HTML5
- CSS3 (Variables, Flexbox, CSS Grid)
- Vanilla JavaScript (ES6+)
- HTML5 Canvas API
- Lucide Icons (via CDN)

No complex frameworks (like React or Vue) and no backend services (like Node.js or Python) are used.

## Project Structure

```text
/
├── index.html        # Main HTML structure and UI
├── style.css         # Styling, themes, and responsiveness
├── script.js         # Core logic, Canvas manipulation, and state
├── README.md         # Documentation
└── assets/
    └── favicon.svg   # Website favicon
```

## How It Works

1. **Upload**: The user selects or drags and drops an image (JPG, PNG, WebP).
2. **Read**: The file is read locally using the `FileReader` API and drawn onto an off-screen HTML5 Canvas.
3. **Edit**: Tools interact directly with the Canvas context to crop, scale, rotate, and manipulate pixel data.
4. **Download**: The final canvas is converted into a Blob (`canvas.toBlob`) and downloaded securely using an Object URL.

## How to Run Locally

Because ImageTools is a purely static website, running it locally is incredibly simple:

1. Clone or download this repository.
2. Open the folder containing the project.
3. Double-click `index.html` to open it in your default web browser.

*Note: For testing certain advanced features (like some cross-origin Blob downloads if you modify the code), you may want to use a local development server like VS Code Live Server, or Python's `python -m http.server`.*

## Deployment

ImageTools is a static site, meaning it can be hosted on almost any platform for free.

### Deploy to GitHub Pages
1. Push the code to a GitHub repository.
2. Go to the repository **Settings**.
3. Navigate to **Pages** in the left sidebar.
4. Select the `main` branch as the source and click **Save**.
5. Your site will be live at `https://[username].github.io/[repo-name]`.

### Deploy to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository containing the ImageTools code.
4. Leave the build settings as default (no framework, no build command) and click **Deploy**.

### Deploy to Netlify
1. Log in to [Netlify](https://netlify.com).
2. Go to the **Sites** tab and click **Add new site** -> **Import an existing project**.
3. Connect your GitHub account and select the repository.
4. Leave build settings blank and click **Deploy site**.

## License & Credits

Developed by [Md Naim Uddin](https://www.linkedin.com/in/mdnaimuddin28/). 
© 2026 ImageTools. All rights reserved.
