import { useState, useEffect } from "react";

const ONBOARDING_KEY = "overraprep_onboarding_completed";

export const useOnboarding = (userId: string | undefined) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsChecked(true);
      return;
    }

    const completedUsers = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || "[]");
    const hasCompleted = completedUsers.includes(userId);
    
    setShowOnboarding(!hasCompleted);
    setIsChecked(true);
  }, [userId]);

  const completeOnboarding = () => {
    if (!userId) return;
    
    const completedUsers = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || "[]");
    if (!completedUsers.includes(userId)) {
      completedUsers.push(userId);
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(completedUsers));
    }
    setShowOnboarding(false);
  };

  return {
    showOnboarding,
    isChecked,
    completeOnboarding,
  };
};
