// import { NextRequest, NextResponse } from "next/server";
// import fs from "fs";
// import path from "path";

// const MIME_TYPES: Record<string, string> = {
//  ".m3u8": "application/vnd.apple.mpegurl",
//  ".ts": "video/MP2T",
// };

// export async function GET(
//  request: NextRequest,
//  { params }: { params: Promise<{ trackId: string; file: string }> },
// ) {
//  try {
//   const resolvedParams = await params;
//   const { trackId, file } = resolvedParams;

//   // 1. Define the exact paths
//   const folderPath = path.join(process.cwd(), "protected_media", trackId);
//   const filePath = path.join(folderPath, file);

//   // ==========================================
//   // 🛠️ DIAGNOSTIC RADAR: Check your VS Code Terminal!
//   console.log("\n--- SERVER FOLDER CHECK ---");
//   console.log("Looking for file:", filePath);

//   if (!fs.existsSync(folderPath)) {
//    console.log(
//     "❌ ERROR: The folder 'protected_media/track1' DOES NOT EXIST where the server is looking.",
//    );
//   } else {
//    const filesInFolder = fs.readdirSync(folderPath);
//    console.log("✅ Folder found! Files inside this folder are:", filesInFolder);

//    if (!filesInFolder.includes(file)) {
//     console.log(
//      `❌ ERROR: The folder exists, but '${file}' is missing or spelled differently!`,
//     );
//    }
//   }
//   console.log("---------------------------\n");
//   // ==========================================

//   if (!fs.existsSync(filePath)) {
//    return new NextResponse("File not found", { status: 404 });
//   }

//   const ext = path.extname(file);
//   const contentType = MIME_TYPES[ext] || "application/octet-stream";
//   const fileBuffer = fs.readFileSync(filePath);

//   return new NextResponse(fileBuffer, {
//    headers: {
//     "Content-Type": contentType,
//     "Cache-Control": "no-store, no-cache, must-revalidate",
//    },
//   });
//  } catch (error) {
//   console.error("Stream API Error:", error);
//   return new NextResponse("Internal Server Error", { status: 500 });
//  }
// }

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid"; // You may need to run: npm install uuid

// 1. Global Token Storage (In-memory)
// This map stores: TokenID -> { trackId, fileName }
// In production, move this to Redis.
const tokenStore = new Map<string, { trackId: string; file: string }>();

const MIME_TYPES: Record<string, string> = {
 ".m3u8": "application/vnd.apple.mpegurl",
 ".ts": "video/MP2T",
};

export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ trackId: string; file: string }> },
) {
 try {
  const { trackId, file } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const folderPath = path.join(process.cwd(), "protected_media", trackId);
  const filePath = path.join(folderPath, file);

  // --- CASE 1: USER REQUESTS THE PLAYLIST (.m3u8) ---
  if (file.endsWith(".m3u8")) {
   if (!fs.existsSync(filePath))
    return new NextResponse("Playlist not found", { status: 404 });

   let content = fs.readFileSync(filePath, "utf8");

   // DYNAMICALLY INJECT TOKENS:
   // We look for any line ending in .ts and append a unique token
   const lines = content.split("\n");
   const secureLines = lines.map((line) => {
    if (line.trim().endsWith(".ts") && !line.startsWith("#")) {
     const segmentFileName = line.trim();
     const newToken = uuidv4();

     // Store token mapping
     tokenStore.set(newToken, { trackId, file: segmentFileName });

     // Return the new URL with the token
     return `${segmentFileName}?token=${newToken}`;
    }
    return line;
   });

   return new NextResponse(secureLines.join("\n"), {
    headers: { "Content-Type": MIME_TYPES[".m3u8"] },
   });
  }

  // --- CASE 2: USER REQUESTS A SEGMENT (.ts) ---
  if (file.endsWith(".ts")) {
   // VALIDATE TOKEN
   if (!token || !tokenStore.has(token)) {
    console.log(`❌ BLOCK: Unauthorized or Reused token for ${file}`);
    return new NextResponse("Link expired or unauthorized", { status: 403 });
   }

   // CHECK IF TOKEN MATCHES FILE
   const tokenData = tokenStore.get(token);
   if (tokenData?.file !== file || tokenData?.trackId !== trackId) {
    return new NextResponse("Token mismatch", { status: 403 });
   }

   // 🔥 CRITICAL: CONSUME THE TOKEN (Delete it so it can never be used again)
   tokenStore.delete(token);
   console.log(`✅ CONSUMED: Token for ${file}. Link is now dead.`);

   if (!fs.existsSync(filePath))
    return new NextResponse("Segment not found", { status: 404 });

   const fileBuffer = fs.readFileSync(filePath);
   return new NextResponse(fileBuffer, {
    headers: { "Content-Type": MIME_TYPES[".ts"] },
   });
  }

  return new NextResponse("Unsupported file type", { status: 400 });
 } catch (error) {
  console.error("Stream API Error:", error);
  return new NextResponse("Internal Server Error", { status: 500 });
 }
}
