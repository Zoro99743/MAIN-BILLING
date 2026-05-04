import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Smartphone, User, KeyRound, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useStaff } from "@/components/AuthGuard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Staff Login — Billing System For PlayHouse Cafe" },
      { name: "description", content: "Secure staff login with mobile OTP." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { staff, setStaff } = useStaff();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [issuedOtp, setIssuedOtp] = useState("");

  useEffect(() => { if (staff) nav({ to: "/" }); }, [staff, nav]);

  const requestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter your name");
    if (!/^\d{10}$/.test(mobile)) return toast.error("Enter a 10-digit mobile number");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setIssuedOtp(code);
    setStep("otp");
    toast.success(`OTP sent (dev mode): ${code}`, { duration: 8000 });
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== issuedOtp) return toast.error("Invalid OTP");
    setStaff({ name: name.trim(), mobile, loggedInAt: Date.now() });
    toast.success("Welcome");
    nav({ to: "/" });
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="glass-strong w-full max-w-md rounded-3xl p-8 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold">Billing System</h1>
            <p className="text-sm text-muted-foreground">For PlayHouse Cafe — Staff Login</p>
          </div>

          {step === "details" ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <Field icon={<User className="h-4 w-4" />} label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="w-full bg-transparent outline-none" />
              </Field>
              <Field icon={<Smartphone className="h-4 w-4" />} label="Mobile Number">
                <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" inputMode="numeric" className="w-full bg-transparent outline-none" />
              </Field>
              <PrimaryButton>Send OTP <ArrowRight className="h-4 w-4" /></PrimaryButton>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Enter the 6-digit code sent to <span className="font-medium text-foreground">{mobile}</span>
              </p>
              <Field icon={<KeyRound className="h-4 w-4" />} label="One-Time Password">
                <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" inputMode="numeric" className="w-full bg-transparent text-center text-2xl tracking-[0.5em] outline-none" />
              </Field>
              <PrimaryButton>Verify & Continue</PrimaryButton>
              <button type="button" onClick={() => setStep("details")} className="w-full text-xs text-muted-foreground hover:text-foreground">
                Change details
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
    </label>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:scale-[1.01] active:scale-[0.99]" style={{ background: "var(--gradient-primary)" }}>
      {children}
    </button>
  );
}
