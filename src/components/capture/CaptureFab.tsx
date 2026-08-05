import { FaBolt } from "react-icons/fa";

interface CaptureFabProps {
  onClick: () => void;
}

export default function CaptureFab({
  onClick,
}: CaptureFabProps) {
  return (
    <button
      onClick={onClick}
      className="
        fixed
        bottom-8
        right-8
        z-50

        flex
        h-16
        w-16
        items-center
        justify-center

        rounded-full

        bg-cyan-500
        text-white
        text-2xl

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