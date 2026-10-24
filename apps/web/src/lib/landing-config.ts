import { FileTextIcon, MessagesSquareIcon, ListChecksIcon } from "lucide-react";

export const LANDING_COPY = Object.freeze({
  title: "ERP Fish — A clearer way through ERP work",
  description: "Bring an invoice or a task to ERP Fish. Work through the details, clarify what is missing, and prepare your next step in ERPNext.",
  navigation: "Main navigation",
  skip: "Skip to content",
  headline: "ERP work,",
  headlineAccent: "with a clearer way forward.",
  intro: "Bring an invoice. Untangle the details. Turn everyday ERP work into a plan you can follow, all in one conversation.",
  open: "Open workspace",
  how: "How it works",
  questions: "Questions",
  login: "Log in",
  heroNote: "Built around ERPNext. Designed around your work.",
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
  workflowTitle: "The details belong together.",
  workflowIntro: "An invoice, a question, a next step. Keep the whole conversation in view before you move into your ERP.",
  nextTitle: "Plan today. Automation comes next.",
  nextDescription: "Browser-driven Purchase Orders, Sales Orders, and Stock Entries are the next step for ERP Fish. Agent mode is still in development.",
  partnerLabel: "Browser automation powered by",
  faqTitle: "A few things to know.",
  closingTitle: "Less back and forth. More forward.",
  closingDescription: "Your next ERP task starts with a conversation.",
  footer: "A calmer place to plan your ERP work.",
  homeLabel: "ERP Fish landing page",
  productLinks: "Workspace",
  exploreLinks: "Explore",
  createAccount: "Create account",
  footerNavigation: "Footer navigation",
  previewLabel: "Planning preview",
  previewNote: "Sample data · No ERP writes",
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
  { number: "01", title: "Which ERP is this built for?", answer: "ERP Fish is being built around ERPNext. The workspace brings invoice context and planning conversations together." },
  { number: "02", title: "Will planning change my ERP data?", answer: "No. Planning mode helps you prepare and ask questions. Agent mode for executing ERP workflows is still in development." },
  { number: "03", title: "What can I explore right now?", answer: "Explore the planning workspace and sample conversations in the local preview. Live planning, invoice parsing, and ERP actions are still being connected." },
  { number: "04", title: "Where does TinyFish fit in?", answer: "TinyFish provides the browser automation for the planned ERP workflows, so the agent can work through the ERP interface." },
];

export const LANDING_FACTS = [
  { title: "ERPNext", description: "Your ERP, in context" },
  { title: "Planning first", description: "Prepare before making changes" },
  { title: "One conversation", description: "Keep the details together" },
];
