import { useEffect, useState } from "react";

export type UserSearchProps = {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export default function UserSearch({ value, placeholder = "Search users…", disabled, onChange }: UserSearchProps) {
  const [localValue, setLocalValue] = useState(value ?? "");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  return (
    <div className="w-full">
      <input
        className="w-full rounded border border-gray-300 px-3 py-2"
        type="search"
        name="user_search"
        autoComplete="off"
        value={localValue}
        onChange={(e) => {
          const next = e.target.value;
          setLocalValue(next);
          onChange(next);
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
