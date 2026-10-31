import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/profile";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getUserProfile(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your account details and profile picture for this app."
      />
      <Card className="p-5">
        <ProfileForm
          name={user.name}
          email={user.email}
          jobTitle={profile.jobTitle}
          organisation={profile.organisation}
          phone={profile.phone}
          hasAvatar={profile.hasAvatar}
        />
      </Card>
    </div>
  );
}
