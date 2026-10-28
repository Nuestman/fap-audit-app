import { redirect } from "next/navigation";

export default async function PostIndexPage({ params }: PageProps<"/audits/[auditId]/posts/[postId]">) {
  const { auditId, postId } = await params;
  redirect(`/audits/${auditId}/posts/${postId}/details`);
}
