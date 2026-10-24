import { FileSearchIcon, ListChecksIcon, ScanLineIcon, MessageSquareIcon, BrainIcon, SettingsIcon } from "lucide-react";
import { PLAN_ROUTES } from "@/lib/plan-config";

export const HOME_COPY = Object.freeze({
  workspace: "Workspace",
  planning: "Planning",
  planningDescription: "A clear plan before the next step.",
  welcomeTitle: "What can we take off your plate?",
  welcomeDescription: "Bring an invoice, a question, or a task. Turn the details into a clear plan for your ERP.",
  starterLabel: "Start with a question",
  composerPlaceholder: "Ask about an invoice or describe what you need…",
  composerHint: "Planning helps you prepare. It won’t make changes to your ERP.",
  shortcutHint: "Ctrl / ⌘ + Enter to send",
  modeLabel: "Conversation mode",
  attach: "Attach invoice",
  attachHint: "Add a PDF invoice for context",
  sending: "Working on your plan…",
  threadError: "Conversations couldn’t load.",
  historyError: "This conversation couldn’t load. Try again to continue.",
  retry: "Try again",
  newChat: "New conversation",
  recent: "Conversations",
  noThreads: "A fresh start. Your conversations will appear here.",
  builtWith: "Powered by",
  tinyfishLink: "Learn about TinyFish (opens in a new tab)",
  assistant: "ERP Fish",
});

export const HOME_QUERY = Object.freeze({ thread: "thread", draft: "new" });
export const HOME_KEYS = Object.freeze({ submit: "Enter", first: 0 });

export const HOME_NAVIGATION = [
  { title: HOME_COPY.planning, href: PLAN_ROUTES.home, icon: MessageSquareIcon },
  { title: "Memory", href: PLAN_ROUTES.memory, icon: BrainIcon },
  { title: "Settings", href: PLAN_ROUTES.settings, icon: SettingsIcon },
];

export const STARTER_PROMPTS = [
  { title: "Review an invoice", prompt: "Help me review an invoice. What should I check before entering it in my ERP?", icon: FileSearchIcon },
  { title: "Plan a workflow", prompt: "Help me plan an ERP workflow. Ask me about the task and guide me through the steps.", icon: ListChecksIcon },
  { title: "Find missing details", prompt: "Help me identify missing details before I create an ERP entry. What information do you need?", icon: ScanLineIcon },
];
