import ModalShell from "@/components/ModalShell";
import { modalPrimaryButtonClass } from "@/components/uiClasses";

type CreateFolderModalProps = {
  creatingFolder: boolean;
  isOpen: boolean;
  newFolderName: string;
  onClose: () => void;
  onCreateFolder: () => void;
  onNewFolderNameChange: (name: string) => void;
};

export default function CreateFolderModal({
  creatingFolder,
  isOpen,
  newFolderName,
  onClose,
  onCreateFolder,
  onNewFolderNameChange,
}: CreateFolderModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      title="New Folder"
      onClose={onClose}
      closeLabel="Close new folder modal"
      footer={
        <button
          type="button"
          onClick={onCreateFolder}
          className={modalPrimaryButtonClass}
          disabled={creatingFolder || !newFolderName.trim()}
        >
          {creatingFolder ? "Creating..." : "Create Folder"}
        </button>
      }
    >
      <label className="block text-[11px] font-medium text-[var(--text-secondary)]">
        Folder name
      </label>
      <input
        value={newFolderName}
        onChange={(event) => onNewFolderNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCreateFolder();
          }
        }}
        autoFocus
        className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
        placeholder="Client Favorites"
      />
    </ModalShell>
  );
}
