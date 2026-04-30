const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Create splash screens directory
const splashDir = path.join(__dirname, "public", "splash-screens");
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

// Splash screen configurations for iOS
const splashScreens = [
  {
    name: "splash-1242x2688.png",
    width: 1242,
    height: 2688,
    description: "iPhone 14 Pro Max",
  },
  {
    name: "splash-1170x2532.png",
    width: 1170,
    height: 2532,
    description: "iPhone 14 Pro",
  },
  {
    name: "splash-1125x2436.png",
    width: 1125,
    height: 2436,
    description: "iPhone 14/13 Pro Max",
  },
  {
    name: "splash-750x1334.png",
    width: 750,
    height: 1334,
    description: "iPhone SE",
  },
  {
    name: "splash-2048x2732.png",
    width: 2048,
    height: 2732,
    description: "iPad Pro",
  },
];

async function generateSplashScreens() {
  console.log("Generating splash screens...\n");

  for (const splash of splashScreens) {
    try {
      // Create a canvas with background color #e40000 and red text
      const svg = `
        <svg width="${splash.width}" height="${
        splash.height
      }" xmlns="http://www.w3.org/2000/svg">
          <rect width="${splash.width}" height="${
        splash.height
      }" fill="#e40000"/>
          <circle cx="${splash.width / 2}" cy="${
        splash.height / 3
      }" r="100" fill="#ff0000"/>
          <text x="${splash.width / 2}" y="${
        (splash.height * 2) / 3
      }" text-anchor="middle" font-size="80" font-weight="bold" fill="white" font-family="Arial, sans-serif">
            BBMS
          </text>
          <text x="${splash.width / 2}" y="${
        (splash.height * 2) / 3 + 100
      }" text-anchor="middle" font-size="40" fill="white" font-family="Arial, sans-serif">
            Blood Bank
          </text>
        </svg>
      `;

      const outputPath = path.join(splashDir, splash.name);

      await sharp(Buffer.from(svg)).png().toFile(outputPath);

      console.log(
        `✓ Generated ${splash.name} (${splash.width}x${splash.height}) - ${splash.description}`
      );
    } catch (error) {
      console.error(`✗ Error generating ${splash.name}:`, error.message);
    }
  }

  console.log("\n✓ All splash screens generated successfully!");
}

generateSplashScreens().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
