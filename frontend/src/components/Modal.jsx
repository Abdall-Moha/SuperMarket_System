import { X } from "lucide-react";

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07111F]/50 p-4">
      <div
        className={
          "w-full min-w-0 max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl " +
          (wide ? "max-w-3xl" : "max-w-lg")
        }
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-[#07111F]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 text-slate-500 hover:text-[#07111F]"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
