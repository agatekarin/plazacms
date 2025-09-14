import { handlers } from "../../../../lib/auth";

// Ensure Node.js runtime (pg adapter requires Node, not Edge)
export const runtime = "nodejs";

// Expose NextAuth route handlers
export const { GET, POST } = handlers; 
