import { auth } from "@/lib/auth"; // path to your auth file
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export const { GET, POST } = handler;
