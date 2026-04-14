import { createContext, useContext, useEffect, useState } from "react";
import {
  getLicenseState,
  saveActivationFromCode,
  getTrialInfo,
  subscribeToDeviceId,
  getDeviceId
} from "../utils/license";

const LicenseContext = createContext(null);

export function LicenseProvider({ children }) {
  const [state, setState] = useState(getLicenseState());
  const [trialInfo, setTrialInfo] = useState(getTrialInfo());

  // 🔥 React to device ID changes
  useEffect(() => {
    subscribeToDeviceId(() => {
      const newState = getLicenseState();
      const newTrial = getTrialInfo();
      setState(newState);
      setTrialInfo(newTrial);
    });
  }, []);

  const activate = (code) => {
    const newState = saveActivationFromCode(code);
    setState(newState);
    setTrialInfo(getTrialInfo());
  };

  const refresh = () => {
    setState(getLicenseState());
    setTrialInfo(getTrialInfo());
  };

  return (
    <LicenseContext.Provider value={{ state, activate, refresh, trialInfo }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  return useContext(LicenseContext);
}
