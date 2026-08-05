"use client";

import React, { useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { AuraLabel } from "./AuraForm";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string | null;
  className?: string;
}

export function AuraPhoneInput({
  value,
  onChange,
  label,
  placeholder = "30 123 456",
  error,
  className = "w-full",
}: PhoneInputProps) {
  const handleChange = (phone: string) => {
  if (!phone) {
    onChange("");
    return;
  }

  const normalizedPhone = phone.startsWith("+")
    ? phone
    : `+${phone}`;

  onChange(normalizedPhone);
};

  return (
    <div className={className}>
      {label && <AuraLabel>{label}</AuraLabel>}
      <div className="w-full relative rounded-xl ring-1 ring-[#1B3A6B]/15 focus-within:ring-2 focus-within:ring-[#1B3A6B] bg-white">
        <PhoneInput
          country={"si"}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          onlyCountries={["si", "hr", "ba", "rs", "me", "ro", "bg", "at", "de", "it", "pl"]}
          inputStyle={{
            width: "100%",
            height: "40px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "transparent",
            fontSize: "13px",
            color: "#334155",
            paddingLeft: "55px",
          }}
          buttonStyle={{
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "12px 0 0 12px",
            padding: "0 12px 0 8px",
          }}
          dropdownStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            width: "300px",
          }}
          containerStyle={{
            width: "100%",
          }}
          searchStyle={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "8px",
          }}
          enableSearch={true}
          disableSearchIcon={true}
          specialLabel={""}
        />
      </div>
      {error && (
        <span className="text-[11px] text-red-500 mt-1 block">{error}</span>
      )}
    </div>
  );
}
