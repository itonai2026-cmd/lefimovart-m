import React from "react";

export default function AppLogo({ className = "w-28 h-28" }) {
  return (
    <img
      src="/wp/lefimovart/lefi-logo.png"
      alt="LefiMovArt logo"
      className={`${className} object-contain mx-auto`}
      loading="eager"
      decoding="async"
    />
  );
}
