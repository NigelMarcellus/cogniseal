import ExamPageClient from "./ExamPageClient";

// Generate static params for exams 1-100
// This covers most use cases. If you have more than 100 exams,
// increase the range or use dynamicParams: true (but that may not work with static export)
export function generateStaticParams() {
  // Generate params for exams 1-100
  // In a real scenario, you might want to query the contract at build time
  // or use a reasonable maximum based on your use case
  return Array.from({ length: 100 }, (_, i) => ({
    examId: String(i + 1),
  }));
}

export default function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  return <ExamPageClient params={params} />;
}
