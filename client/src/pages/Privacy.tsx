import PolicyPage from "@/pages/PolicyPage";

export default function Privacy() {
  return (
    <PolicyPage
      policyKey="privacyPolicy"
      fallbackTitle="Privacy Policy"
      description="Read the current privacy policy published in our store settings."
      canonicalPath="/privacy"
    />
  );
}
