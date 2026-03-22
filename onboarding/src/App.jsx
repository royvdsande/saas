import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { auth, onAuthStateChanged } from "./utils/firebase";
import ProgressBar from "./components/ProgressBar";
import StepOne from "./components/StepOne";
import StepTwo from "./components/StepTwo";
import StepThree from "./components/StepThree";
import StepFour from "./components/StepFour";

const TOTAL_STEPS = 4;

const pageVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export default function App() {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Onboarding state
  const [formData, setFormData] = useState({
    goal: null,
    activityLevel: null,
    gender: null,
    age: 25,
    weight: 75,
    height: 178,
  });

  // Results from API
  const [plan, setPlan] = useState(null);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        window.location.replace("/auth/signup.html");
        return;
      }
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const nextStep = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  // Generate plan API call
  const generatePlan = useCallback(async () => {
    if (!user) return;
    setStep(3); // Go to loading screen

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goal: formData.goal,
          activityLevel: formData.activityLevel,
          gender: formData.gender,
          age: formData.age,
          weight: formData.weight,
          height: formData.height,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Request failed");
      }

      const data = await res.json();
      setPlan(data.plan);
      setStep(4); // Go to results
    } catch (err) {
      setPlan({ error: err.message || "Could not generate your plan." });
      setStep(4);
    }
  }, [user, formData]);

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center bg-white overflow-x-hidden">
      {/* Progress bar */}
      <ProgressBar step={step} totalSteps={TOTAL_STEPS} />

      {/* Logo */}
      <a
        href="/"
        className="flex items-center gap-2 text-[15px] font-bold py-5 px-6 self-start no-underline text-[#0a0a0a]"
      >
        <div className="w-[26px] h-[26px] bg-[#0a0a0a] rounded-[7px] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white" />
          </svg>
        </div>
        FitFlow
      </a>

      {/* Steps container */}
      <div className="w-full max-w-[640px] px-6 pb-15 flex-1 relative">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <StepOne
                value={formData.goal}
                onChange={(goal) => {
                  updateField("goal", goal);
                  setTimeout(nextStep, 600);
                }}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <StepTwo
                formData={formData}
                updateField={updateField}
                onGenerate={generatePlan}
                onBack={prevStep}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <StepThree />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step-4"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <StepFour plan={plan} formData={formData} user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
