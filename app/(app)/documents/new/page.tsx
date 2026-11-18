import { requirePermission } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Ajukan Surat" };

export default async function NewDocumentPage() {
  await requirePermission("documents:create");
  return (
    <>
      <PageHeader title="Ajukan surat baru" description="Lengkapi metadata dan unggah berkas PDF/DOCX (maks. 10 MB). Surat langsung masuk antrean review Ketua Pelaksana." />
      <UploadForm />
    </>
  );
}
