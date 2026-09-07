import { FaBolt } from "react-icons/fa";

interface CaptureFabProps {
  onClick: () => void;
}

export default function CaptureFab({
  onClick,
}: CaptureFabProps) {
  return (
    <button
      type="button"
      aria-label="Open Quick Capture"
      onClick={onClick}
      className="
        fixed
        bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]
        right-4
        z-40

        lg:bottom-8
        lg:right-8

        flex
        h-14
        w-14
        items-center
        justify-center

        lg:h-16
        lg:w-16

        rounded-full

        bg-cyan-500
        text-white
        text-xl

        lg:text-2xl

        shadow-xl
        shadow-cyan-500/40

        transition-all
        duration-300

        hover:scale-110
        hover:bg-cyan-400
        hover:shadow-cyan-400/60

        active:scale-95
      "
    >
      <FaBolt />
    </button>
  );
}
