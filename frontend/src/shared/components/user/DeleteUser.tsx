export type DeleteUserProps = {
  disabled?: boolean;
  label?: string;
  confirmText?: string;
  onDelete: () => Promise<void> | void;
};

export default function DeleteUser({
  disabled,
  label = "Delete",
  confirmText = "Delete this user?",
  onDelete,
}: DeleteUserProps) {
  const onClick = async () => {
    const ok = confirm(confirmText);
    if (!ok) return;
    await onDelete();
  };

  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-lg transition px-3 py-2 text-xs bg-red-600 text-white shadow-theme-xs hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => void onClick()}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
