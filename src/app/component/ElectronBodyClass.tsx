// components/ElectronBodyClass.tsx
"use client";

import { useEffect } from "react";

const isElectron = () =>
    typeof window !== "undefined" &&
    window.process?.versions?.electron;

const ElectronBodyClass = () => {
    useEffect(() => {
        if (isElectron()) {
            document.body.classList.add("electron");
        } else {
            document.body.classList.remove("electron");
        }
    }, []);
    return null;
};

export default ElectronBodyClass;
