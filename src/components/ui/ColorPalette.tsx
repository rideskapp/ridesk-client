import React from "react";
import { Check } from "lucide-react";

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  disabled?: boolean;
}

// Predefined palette of 10 colors
export const COLOR_PALETTE = [
  "#EC4899", 
  "#10B981", 
  "#F59E0B", 
  "#EF4444", 
  "#8B5CF6", 
  "#3B82F6", 
  "#994d00", 
  "#6B7280", 
  "#990000", 
  "#00ff00", 
];

export const DEFAULT_COLOR = COLOR_PALETTE[0]; 

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorSelect,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => !disabled && onColorSelect(color)}
            disabled={disabled}
            className={`
              relative w-12 h-12 rounded-md border-2 transition-all
              ${selectedColor === color 
                ? "border-gray-900 scale-110 shadow-md" 
                : "border-gray-300 hover:border-gray-400"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            style={{ backgroundColor: color }}
            title={color}
          >
            {selectedColor === color && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="w-5 h-5 text-white drop-shadow-lg" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

