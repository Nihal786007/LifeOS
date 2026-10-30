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

        bg-lifeos-accent
        text-lifeos-accent-foreground
        text-xl

        lg:text-2xl

        shadow-md
        shadow-black/10

        transition-all
        duration-150

        hover:scale-105
        hover:bg-lifeos-accent
        hover:shadow-black/15

        active:scale-95
      "
    >
      <FaBolt />
    </button>
  );
}
