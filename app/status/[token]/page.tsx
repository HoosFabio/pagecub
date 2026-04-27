import { StatusClient } from "@/components/StatusClient";

export default function StatusPage({ params }: { params: { token: string } }) {
  return (
    <main className="page-shell py-14">
      <StatusClient token={params.token} />
    </main>
  );
}
