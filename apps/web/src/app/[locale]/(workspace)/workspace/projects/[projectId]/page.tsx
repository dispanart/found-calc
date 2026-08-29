import { notFound } from "next/navigation";

import { ProjectDetail } from "@/components/workspace/project-detail";
import { isLocale } from "@/i18n/locales";
import { isWorkspaceId } from "@/lib/workspace/contracts";

export default async function WorkspaceProjectPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  if (!isLocale(locale) || !isWorkspaceId(projectId)) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-18">
      <ProjectDetail locale={locale} projectId={projectId} />
    </main>
  );
}
