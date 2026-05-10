import { Suspense } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";

export const metadata = {
  title: "Chat with Alto",
  description: "Skip the broker. Get the best deal.",
};

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInterface />
    </Suspense>
  );
}
