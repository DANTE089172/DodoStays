"use client";

interface Props {
  value: "Guest" | "Host";
  onChange: (role: "Guest" | "Host") => void;
}

export function RolePicker({ value, onChange }: Props) {
  return (
    <fieldset className="grid grid-cols-2 gap-2">
      <label className={`cursor-pointer rounded border p-3 text-center ${value === "Guest" ? "border-black" : "border-gray-300"}`}>
        <input
          type="radio"
          name="role"
          value="Guest"
          checked={value === "Guest"}
          onChange={() => onChange("Guest")}
          className="sr-only"
        />
        I&apos;m a guest
      </label>
      <label className={`cursor-pointer rounded border p-3 text-center ${value === "Host" ? "border-black" : "border-gray-300"}`}>
        <input
          type="radio"
          name="role"
          value="Host"
          checked={value === "Host"}
          onChange={() => onChange("Host")}
          className="sr-only"
        />
        I&apos;m a host
      </label>
    </fieldset>
  );
}
