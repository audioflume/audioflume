import ModalShell from "@/components/ModalShell";
import {
  modalFieldLabelClass,
  modalInputClass,
  modalPrimaryButtonClass,
} from "@/components/uiClasses";

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
      <label className={modalFieldLabelClass}>
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
        className={modalInputClass}
        placeholder="Client Favorites"
      />
    </ModalShell>
  );
}
