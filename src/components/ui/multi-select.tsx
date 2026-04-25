import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[] | ((prev: string[]) => string[])) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
}

const MultiSelectChip = React.memo(({
  option,
  onRemove,
  removeLabel
}: {
  option: MultiSelectOption;
  onRemove: (value: string, e: React.MouseEvent) => void;
  removeLabel: string;
}) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-medium"
  >
    {option.label}
    <button
      type="button"
      onClick={(e) => onRemove(option.value, e)}
      className="cursor-pointer hover:bg-secondary-foreground/20 rounded-full p-0.5 transition-colors"
      aria-label={removeLabel}
    >
      <X className="h-3 w-3" />
    </button>
  </span>
));
MultiSelectChip.displayName = "MultiSelectChip";

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  disabled = false,
  id,
  "aria-describedby": ariaDescribedBy,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  // Generate unique ID for accessibility if not provided
  const uniqueId = React.useId();
  const contentId = `${id || uniqueId}-content`;

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = React.useCallback((value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange((prev) => prev.filter((item) => item !== value));
  }, [onChange]);

  const selectedOptions = options.filter((opt) => selected.includes(opt.value));

  const handleCheckedChange = React.useCallback((value: string) => () => {
    handleToggle(value);
  }, [handleToggle]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          id={id}
          aria-describedby={ariaDescribedBy}
          aria-expanded={open}
          aria-controls={open ? contentId : undefined}
          variant="outline"
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between h-auto min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-left font-normal ring-offset-background placeholder:text-muted-foreground hover:bg-background/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1 mr-2">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedOptions.length <= 2 ? (
              selectedOptions.map((opt) => (
                <MultiSelectChip
                  key={opt.value}
                  option={opt}
                  onRemove={handleRemove}
                  removeLabel={t("common.removeOption")}
                />
              ))
            ) : (
              <>
                {selectedOptions.slice(0, 2).map((opt) => (
                  <MultiSelectChip
                    key={opt.value}
                    option={opt}
                    onRemove={handleRemove}
                    removeLabel={t("common.removeOption")}
                  />
                ))}
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-medium">
                  {t("common.moreSelected", { count: selectedOptions.length - 2 })}
                </span>
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent id={contentId} className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            {t("common.noOptions")}
          </div>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={handleCheckedChange(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
