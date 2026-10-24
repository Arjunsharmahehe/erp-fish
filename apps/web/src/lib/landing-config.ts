import { FileTextIcon, MessagesSquareIcon, ListChecksIcon } from "lucide-react";

export const LANDING_COPY = Object.freeze({
  title: "ERP Fish — A clearer way through ERP work",
  description: "Bring an invoice or a task to ERP Fish. Work through the details, clarify what is missing, and prepare your next step in ERPNext.",
  navigation: "Main navigation",
  skip: "Skip to content",
  headline: "Less ERP busywork.",
  headlineAccent: "More room to think.",
  intro: "Turn invoices and everyday ERP tasks into a clear next step. Bring the details, work through the questions, and keep the plan in one place.",
  open: "Open workspace",
  how: "How it works",
  questions: "Questions",
  login: "Log in",
  heroNote: "Built for teams working in ERPNext.",
  example: "Example planning session",
  exampleTitle: "An invoice. A clear way forward.",
  exampleStatus: "Planning",
  exampleFile: "supplier-invoice.pdf",
  exampleFileHint: "Sample invoice",
  examplePrompt: "Help me prepare this invoice for my ERP.",
  exampleReply: "Let’s check the details before the next step.",
  exampleQuestion: "Which warehouse should receive these items?",
  exampleQuestionHint: "Resolve the missing detail before proceeding.",
  exampleCaption: "A preview of the planning experience. No ERP changes are made in planning mode.",
  workflowTitle: "From a loose task to a considered plan.",
  workflowIntro: "Start with what you have. Make the next step clear before you move into your ERP.",
  nextTitle: "Plan today. Automation comes next.",
  nextDescription: "Browser-driven Purchase Orders, Sales Orders, and Stock Entries are the next step for ERP Fish. Agent mode is still in development.",
  partnerLabel: "Browser automation powered by",
  faqTitle: "A few things to know.",
  closingTitle: "Give your next ERP task a little breathing room.",
  closingDescription: "Open the workspace and start with a question.",
  footer: "A calmer place to plan your ERP work.",
  homeLabel: "ERP Fish landing page",
});

export const LANDING_SECTIONS = Object.freeze({
  main: "main-content",
  workflow: "how-it-works",
  questions: "questions",
  workflowLink: "#how-it-works",
  questionsLink: "#questions",
  skipLink: "#main-content",
});

export const LANDING_CHECKS = [
  "Review supplier and invoice details",
  "Check items, quantities, and totals",
  "Clarify what is missing",
];

export const LANDING_STEPS = [
  { icon: FileTextIcon, title: "Bring the task", text: "Start with an invoice PDF or describe the work you need to do in plain language." },
  { icon: MessagesSquareIcon, title: "Work through the details", text: "Use the conversation to review the information and clarify the questions that need an answer." },
  { icon: ListChecksIcon, title: "Leave with a plan", text: "Keep the context and next steps together, ready to return to when you need them." },
];

export const LANDING_QUESTIONS = [
  { title: "Which ERP is this built for?", answer: "ERP Fish is being built around ERPNext. The workspace brings invoice context and planning conversations together." },
  { title: "Will planning change my ERP data?", answer: "No. Planning mode helps you prepare and ask questions. Agent mode for executing ERP workflows is still in development." },
  { title: "What can I explore right now?", answer: "The local preview includes the planning workspace, sample conversations, and navigation. Live planning, PDF parsing, and ERP actions depend on the connected API." },
  { title: "Where does TinyFish fit in?", answer: "TinyFish provides the browser automation for the planned ERP workflows, so the agent can work through the ERP interface." },
];
