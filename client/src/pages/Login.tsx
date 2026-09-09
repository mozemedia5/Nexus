import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Shield, Mail, Eye, EyeOff, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { getFirebaseAuth, getFirebaseStatus } from "@/lib/firebase";
import SEO from "@/components/SEO";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const firebaseStatus = getFirebaseStatus();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        toast.error("Firebase is not configured. Please add Firebase credentials in Settings.");
        return;
      }
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back!", { description: "You are now signed in to Nexus." });
      setLocation("/");
    } catch (err: any) {
      const msg = err.code === "auth/user-not-found" || err.code === "auth/invalid-credential"
        ? "Invalid email or password."
        : err.code === "auth/wrong-password"
        ? "Incorrect password."
        : err.code === "auth/invalid-email"
        ? "Invalid email address format."
        : err.code === "auth/too-many-requests"
        ? "Too many failed attempts. Please try again later."
        : "Sign in failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        toast.error("Firebase is not configured. Please add Firebase credentials in Settings.");
        return;
      }
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Store/update user profile in Firestore
      try {
        const { getFirestore, doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const db = getFirestore();
        await setDoc(doc(db, "nexus_users", result.user.uid), {
          uid: result.user.uid,
          fullName: result.user.displayName || "",
          email: result.user.email || "",
          hasDiscountEligible: true,
          lastLoginAt: serverTimestamp(),
        }, { merge: true });
      } catch {}

      toast.success("Welcome!", { description: "Signed in with Google." });
      setLocation("/");
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        return;
      }
      const msg = err.code === "auth/popup-blocked"
        ? "Pop-up blocked by browser. Please allow pop-ups for this site."
        : err.code === "auth/unauthorized-domain"
        ? "This domain is not authorized for Google Sign-In in Firebase Console."
        : err.code === "auth/account-exists-with-different-credential"
        ? "An account already exists with the same email using a different provider."
        : "Google sign-in failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        toast.error("Firebase is not configured. Please add Firebase credentials in Settings.");
        return;
      }
      const { signInWithPopup, OAuthProvider } = await import("firebase/auth");
      const provider = new OAuthProvider("apple.com");
      const result = await signInWithPopup(auth, provider);

      // Store/update user profile in Firestore
      try {
        const { getFirestore, doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const db = getFirestore();
        await setDoc(doc(db, "nexus_users", result.user.uid), {
          uid: result.user.uid,
          fullName: result.user.displayName || "",
          email: result.user.email || "",
          hasDiscountEligible: true,
          lastLoginAt: serverTimestamp(),
        }, { merge: true });
      } catch {}

      toast.success("Welcome!", { description: "Signed in with Apple." });
      setLocation("/");
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        return;
      }
      const msg = err.code === "auth/popup-blocked"
        ? "Pop-up blocked by browser. Please allow pop-ups for this site."
        : err.code === "auth/unauthorized-domain"
        ? "This domain is not authorized for Apple Sign-In in Firebase Console."
        : err.code === "auth/account-exists-with-different-credential"
        ? "An account already exists with the same email using a different provider."
        : "Apple sign-in failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Sign In — Nexus A Liverton Store"
        description="Sign in to your Nexus account to access exclusive deals and track your orders."
        keywords="Nexus login, sign in, account"
        canonicalPath="/login"
      />
      <section className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Nexus Logo" className="h-8 w-auto object-contain" />
              </Link>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome Back</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sign in to access exclusive deals and track your orders.
              </p>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || !firebaseStatus.configured}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <button
                type="button"
                onClick={handleAppleLogin}
                disabled={loading || !firebaseStatus.configured}
                className="w-full py-2.5 px-4 bg-black text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white dark:bg-slate-900 text-slate-400">or sign in with email</span>
              </div>
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !firebaseStatus.configured}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Don't have an account?{" "}
                <Link href="/register" className="text-amber-600 hover:text-amber-700 font-semibold">
                  Create one <ArrowUpRight size={11} className="inline" />
                </Link>
              </p>
            </div>

            {!firebaseStatus.configured && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Firebase is not configured yet. Add your Firebase credentials in the project settings to enable authentication.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
