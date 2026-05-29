import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const audioPath = join(process.cwd(), "public", "audio", "din-chadheya.mp3");

export async function GET() {
  try {
    const audio = await readFile(audioPath);
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "Song file not found" }, { status: 404 });
  }
}

export async function HEAD() {
  try {
    const audioStats = await stat(audioPath);
    return new NextResponse(null, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioStats.size),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
