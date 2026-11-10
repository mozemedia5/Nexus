import PolicyPage from "@/pages/PolicyPage";

export default function Terms() {
  return (
    <PolicyPage
      policyKey="termsOfService"
      fallbackTitle="Terms of Service"
      description="Read the current terms of service published in our store settings."
      canonicalPath="/terms"
    />
  );
}
