import * as fs from "fs";
import * as path from "path";

const errors = [];

function checkDirectory(dir, baseDir = "") {
  const fullPath = path.join(baseDir, dir);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name);
    const relativePath = path.join(baseDir, dir, entry.name);

    if (entry.isDirectory()) {
      // Check for dynamic routes
      if (entry.name.includes("[") && entry.name.includes("]")) {
        // Check if generateStaticParams exists in the dynamic route directory itself
        const dynamicRouteFiles = fs.readdirSync(entryPath);
        const hasGenerateStaticParams = dynamicRouteFiles.some((file) => {
          const filePath = path.join(entryPath, file);
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, "utf-8");
            return content.includes("generateStaticParams");
          }
          return false;
        });

        if (!hasGenerateStaticParams) {
          errors.push(
            `Dynamic route "${relativePath}" found but no generateStaticParams function detected in the route directory`
          );
        }
      }

      // Recursively check subdirectories
      checkDirectory(entry.name, fullPath);
    } else if (entry.isFile()) {
      // Check for SSR/ISR/Edge/API Route patterns
      if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        const content = fs.readFileSync(entryPath, "utf-8");

        // Check for SSR patterns
        const ssrPatterns = [
          "getServerSideProps",
          "getStaticProps",
          "getInitialProps",
          "server-only",
          "next/headers",
          "cookies()",
          "dynamic = 'force-dynamic'",
        ];

        for (const pattern of ssrPatterns) {
          if (content.includes(pattern)) {
            errors.push(
              `SSR/ISR pattern "${pattern}" found in ${relativePath} (not allowed for static export)`
            );
          }
        }

        // Check for API routes
        if (relativePath.includes("/api/") || relativePath.includes("\\api\\")) {
          errors.push(`API route found: ${relativePath} (not allowed for static export)`);
        }
      }
    }
  }
}

console.log("Checking for static export violations...\n");

// Check app directory
checkDirectory("app", ".");

// Check pages directory if it exists
if (fs.existsSync("pages")) {
  checkDirectory("pages", ".");
}

if (errors.length > 0) {
  console.error("❌ Static export check failed:\n");
  errors.forEach((error) => {
    console.error(`  - ${error}`);
  });
  console.error("\n");
  process.exit(1);
} else {
  console.log("✅ Static export check passed!\n");
}

