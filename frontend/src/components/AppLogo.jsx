import React from "react";
import lefiLogo from "../assets/lefi-logo.png";

export default function AppLogo({ className = "w-28 h-28" }) {
  return (
    <img
      src={lefiLogo}
      alt="LefiMovArt logo"
      className={`${className} object-contain mx-auto`}
      loading="eager"
      decoding="async"
    />
  );
}
