import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  size?: "xsm" | "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "delete" | "secondary" | "ghost";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  fullWidth?: boolean;
}


import { useRef } from "react";

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  fullWidth = false,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Size Classes
  const sizeClasses = {
    xsm: "px-2 py-1 text-xs",
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-1.5 text-sm",
    lg: "px-4 py-2 text-sm",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
    outline:
      "bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800",
    delete:
      "border border-red-600 text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:border-red-400 dark:text-red-400 dark:hover:text-red-300",
    secondary:
      "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
    ghost:
      "text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 dark:text-gray-300 dark:hover:bg-gray-800",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (onClick) onClick();
    // Blur after click to remove focus ring
    if (buttonRef.current) buttonRef.current.blur();
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition ${
        fullWidth ? "w-full" : ""
      } ${sizeClasses[size]} ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`.trim()}
      onClick={handleClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
