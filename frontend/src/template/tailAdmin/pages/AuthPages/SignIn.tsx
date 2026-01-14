import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export type SignInMode = "admin" | "public";

export type SignInProps = {
  mode?: SignInMode;
};

export default function SignIn({ mode = "admin" }: SignInProps) {
  const postLoginRedirectTo =
    mode === "public"
      ? () => "/"
      : (user: { role?: string }) => (user.role === "admin" ? "/admin" : "/");

  return (
    <>
      <AuthLayout>
        <SignInForm postLoginRedirectTo={postLoginRedirectTo} />
      </AuthLayout>
    </>
  );
}
